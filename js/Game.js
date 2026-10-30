import { CONFIG } from './config.js';
import { randomInt, randomRange, Vector2 } from './utils.js';
import { Snake } from './entities/Snake.js';
import { Food } from './entities/Food.js';
import { PowerUp } from './entities/PowerUp.js';
import { Hunter } from './entities/enemies/Hunter.js';
import { Turret } from './entities/enemies/Turret.js';
import { Virus } from './entities/enemies/Virus.js';
import { Blindness } from './entities/enemies/Blindness.js';
import { ParticleSystem } from './systems/ParticleSystem.js';
import { ProgressionSystem } from './systems/ProgressionSystem.js';
import { SkinSystem } from './systems/SkinSystem.js';
import { ShopSystem } from './systems/ShopSystem.js';
import { RiveUI } from './systems/RiveUI.js';
import { SteeringInput, LEFT, RIGHT } from './systems/SteeringInput.js';
import { TailTurret, drawTurretShot, drawHitFlash } from './systems/TailTurret.js';
import { ICONS, iconSvg, hydrateIcons } from './icons.js';
import { EXPIRY_WARNING_MS } from './render.js';

const MAGNETO_RANGE = 150;  // px: food closer than this is pulled toward the head

const HINTS_STORAGE_KEY = 'cyberSerpent_powerupHints';
const HINT_TIMES = 1;           // pickups per power-up that still show its hint
const HINT_DURATION_MS = 2600;

export class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = CONFIG.canvas.width;
        this.canvas.height = CONFIG.canvas.height;

        // Snake reads left/right from here; they are derived from this.steering every frame
        this.input = {
            left: false,
            right: false,
            dash: false
        };
        this.steering = new SteeringInput();

        this.state = 'menu';
        this.score = 0;
        this.level = 1;
        this.gameStartTime = 0;
        this.gameTime = 0;
        this.enemiesKilled = 0;
        this.isHardMode = false;
        this.hardModeRewardGiven = false;
        this.maxLevelReached = this.loadMaxLevel();

        // Systems
        this.progressionSystem = new ProgressionSystem();
        this.skinSystem = new SkinSystem(this.progressionSystem);
        this.shopSystem = new ShopSystem(this.progressionSystem, this.skinSystem);
        this.particles = new ParticleSystem();
        this.riveUI = new RiveUI();
        this.gridLayer = this.createGridLayer();

        // Game entities
        this.snake = null;
        this.food = null;
        this.powerups = [];
        this.enemies = [];
        this.pendingEnemySpawns = [];  // Visual warnings before enemy spawns
        this.gunProjectiles = [];  // Visual projectiles for gun powerup
        this.tailTurret = new TailTurret();

        // Timers
        this.lastTime = 0;
        this.lastEnemySpawn = 0;
        this.lastPowerupSpawn = 0;

        // Controls
        this.controlsInverted = false;
        this.controlsInvertedTimer = 0;

        // Mobile controls
        this.isMobile = this.detectMobile();

        hydrateIcons();
        this.setupEventListeners();
        this.setupMobileControls();
        this.skinSystem.initializePreview('preview-canvas');
        this.updateUI();
        this.showMainMenu();
    }

    setupEventListeners() {
        // Physical key codes, so it works with any keyboard layout and with Caps Lock on
        const steerKeys = {
            KeyA: LEFT,
            ArrowLeft: LEFT,
            KeyD: RIGHT,
            ArrowRight: RIGHT
        };

        window.addEventListener('keydown', (e) => {
            if (steerKeys[e.code] !== undefined) {
                // Held keys are tracked in every state, so a key held through a pause or restart keeps working
                if (this.state === 'playing') e.preventDefault();
                if (!e.repeat) this.steering.press(e.code, steerKeys[e.code]);
                return;
            }

            if (e.code === 'Space' && (this.state === 'playing' || this.state === 'gameover')) {
                e.preventDefault();
                if (e.repeat) return;
                if (this.state === 'playing') {
                    this.input.dash = true;
                } else if (this.state === 'gameover') {
                    // Quick restart
                    this.startGame();
                }
                return;
            }

            if (e.code === 'Escape' && this.state === 'playing') {
                this.togglePause();
            }
        });

        window.addEventListener('keyup', (e) => {
            if (steerKeys[e.code] !== undefined) {
                this.steering.release(e.code);
            }
            if (e.code === 'Space') {
                this.input.dash = false;
            }
        });

        // Keyups are never delivered while the window is unfocused; forget held keys so none get stuck
        const releaseAll = () => {
            this.steering.clear();
            this.input.dash = false;
        };
        window.addEventListener('blur', releaseAll);
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) releaseAll();
        });
    }

    detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
            window.innerWidth <= 768;
    }

    setupMobileControls() {
        const mobileControls = document.getElementById('mobile-controls');
        if (!this.isMobile) {
            // Hide mobile controls on desktop
            if (mobileControls) mobileControls.style.display = 'none';
            return;
        }
        if (mobileControls) mobileControls.style.display = 'block';

        // Pointer events give every finger its own id, so each thumb is tracked separately
        // and the steering buttons follow the same "last pressed wins" rule as the keyboard.
        // Keep receiving this finger's events even if it slides off the button.
        // Capture can fail on some browsers; the press must still count.
        const capturePointer = (el, e) => {
            try { el.setPointerCapture(e.pointerId); } catch { /* not capturable */ }
        };
        const bindSteerButton = (id, dir) => {
            const button = document.getElementById(id);
            if (!button) return;
            button.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                capturePointer(button, e);
                this.steering.press(`pointer-${e.pointerId}`, dir);
            });
            const release = (e) => this.steering.release(`pointer-${e.pointerId}`);
            button.addEventListener('pointerup', release);
            button.addEventListener('pointercancel', release);
            button.addEventListener('lostpointercapture', release);
        };
        bindSteerButton('left-arrow', LEFT);
        bindSteerButton('right-arrow', RIGHT);

        const dashButton = document.getElementById('dash-button');
        if (dashButton) {
            dashButton.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                capturePointer(dashButton, e);
                if (this.state === 'playing') this.input.dash = true;
            });
            const endDash = () => { this.input.dash = false; };
            dashButton.addEventListener('pointerup', endDash);
            dashButton.addEventListener('pointercancel', endDash);
            dashButton.addEventListener('lostpointercapture', endDash);
        }
    }

    loadMaxLevel() {
        return parseInt(localStorage.getItem('cyberSerpent_maxLevel') || '0');
    }

    saveMaxLevel() {
        localStorage.setItem('cyberSerpent_maxLevel', this.maxLevelReached.toString());
    }

    startGame() {
        this.hideAllMenus();
        this.canvas.style.display = 'block';
        document.getElementById('hud').classList.add('active');

        this.state = 'playing';
        this.score = 0;
        this.level = 1;
        this.gameStartTime = performance.now();
        this.gameTime = 0;
        this.enemiesKilled = 0;
        this.isHardMode = false;
        this.hardModeRewardGiven = false;

        const currentSkin = this.skinSystem.getCurrentSkin();
        const upgrades = this.shopSystem.getUpgrades();
        const powerupLevels = this.shopSystem.getPowerupLevels();

        this.snake = new Snake(
            CONFIG.canvas.width / 2,
            CONFIG.canvas.height / 2,
            upgrades,
            currentSkin,
            powerupLevels
        );

        this.food = new Food();
        this.powerups = [];
        this.enemies = [];
        this.pendingEnemySpawns = [];  // Reset pending spawns
        this.gunProjectiles = [];  // Reset gun projectiles
        this.tailTurret = new TailTurret();
        this.powerupHint = null;
        this.particles = new ParticleSystem();

        this.lastTime = performance.now();
        this.lastEnemySpawn = 0;
        this.lastPowerupSpawn = 0;
        this.controlsInverted = false;
        this.controlsInvertedTimer = 0;

        this.riveUI.showScreen('playing');

        this.updateUI();
        this.gameLoop(this.lastTime);
    }

    gameLoop(currentTime) {
        if (this.state !== 'playing') return;

        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        this.gameTime = currentTime - this.gameStartTime;

        this.update(deltaTime);
        this.draw();

        requestAnimationFrame((time) => this.gameLoop(time));
    }

    update(deltaTime) {
        const timeWarp = this.snake.powerups.timeWarp.active;
        const effectiveDelta = timeWarp ? deltaTime * 0.3 : deltaTime;

        // Update snake (uses normal deltaTime - timeWarp should NOT affect player)
        // Resolve steering now, so the Virus inversion applies even to keys already held
        const steer = this.steering.getDirection() * (this.controlsInverted ? -1 : 1);
        this.input.left = steer < 0;
        this.input.right = steer > 0;

        const levelMultiplier = (this.level - 1) * CONFIG.game.speedIncreasePerLevel;
        this.snake.update(deltaTime, this.input, levelMultiplier);

        // Check self-collision
        if (this.snake.checkSelfCollision()) {
            this.gameOver();
            return;
        }

        // Update food
        if (this.food.checkCollision(this.snake)) {
            this.eatFood();
        }

        // Frame rate normalization factors (base: 60 FPS = 16.67ms per frame)
        const frameMultiplier = deltaTime / 16.67;  // For player-related things
        const enemyFrameMultiplier = effectiveDelta / 16.67;  // For enemies (affected by timeWarp)

        // Magneto effect (normalized - uses player's normal time)
        if (this.snake.powerups.magneto.active) {
            const distance = this.food.position.distance(this.snake.head);
            if (distance < MAGNETO_RANGE) {
                const direction = this.snake.head.subtract(this.food.position).normalize();
                this.food.position = this.food.position.add(direction.multiply(5 * frameMultiplier));
            }
        }

        // Update power-ups
        this.powerups.forEach(powerup => powerup.update(effectiveDelta));
        this.powerups = this.powerups.filter(p => !p.isDead());

        this.powerups.forEach(powerup => {
            if (powerup.checkCollision(this.snake)) {
                this.collectPowerup(powerup);
                this.powerups = this.powerups.filter(p => p !== powerup);
            }
        });

        // Spawn power-ups
        this.lastPowerupSpawn += deltaTime;
        if (this.lastPowerupSpawn > CONFIG.powerups.spawnInterval &&
            this.powerups.length < CONFIG.powerups.maxActive) {
            this.spawnPowerup();
            this.lastPowerupSpawn = 0;
        }

        // Update enemies (spawn faster in HARD MODE)
        this.lastEnemySpawn += deltaTime;
        const spawnMultiplier = this.isHardMode ? 2 : 1; // 2x enemy spawn rate in HARD MODE
        const spawnInterval = CONFIG.game.enemySpawnInterval / (this.level * spawnMultiplier);

        if (this.lastEnemySpawn > spawnInterval) {
            this.spawnEnemy();
            // Spawn extra enemy in HARD MODE
            if (this.isHardMode && Math.random() < 0.5) {
                this.spawnEnemy();
            }
            this.lastEnemySpawn = 0;
        }

        this.enemies.forEach(enemy => {
            enemy.update(effectiveDelta, this.snake, timeWarp);

            // Virus collision
            if (enemy instanceof Virus && enemy.checkCollision(this.snake)) {
                this.controlsInverted = true;
                this.controlsInvertedTimer = 3000;
                enemy.lifetime = 0;
                this.particles.emit(enemy.position.x, enemy.position.y, CONFIG.colors.adversePowerup, 20);
            }

            // Blindness collision
            if (enemy instanceof Blindness && enemy.checkCollision(this.snake)) {
                this.snake.blindness.active = true;
                this.snake.blindness.duration = enemy.duration;
                this.snake.blindness.total = enemy.duration;
                enemy.lifetime = 0;
                this.particles.emit(enemy.position.x, enemy.position.y, CONFIG.colors.adversePowerup, 20);
            }

            // Hunter/Turret projectile collision
            if ((enemy instanceof Hunter || enemy instanceof Turret) && enemy.checkCollision(this.snake)) {
                if (!this.snake.isInvulnerable && !this.snake.powerups.ghost.active &&
                    !this.snake.powerups.shield.active) {
                    this.gameOver();
                }
            }

            // Turret body collision (turrets are solid unless in ghost mode)
            if (enemy instanceof Turret && enemy.checkBodyCollision(this.snake)) {
                this.gameOver();
            }

            // Ghost mode: damage turrets on collision
            if (this.snake.powerups.ghost.active && enemy instanceof Turret) {
                if (enemy.position.distance(this.snake.head) < enemy.radius + CONFIG.snake.segmentSize) {
                    enemy.hp -= 1;
                    if (enemy.hp <= 0) {
                        this.enemiesKilled++;
                    }
                    this.particles.emit(enemy.position.x, enemy.position.y, CONFIG.colors.turret, 10);
                }
            }

            // Body collision for hunters (but NOT in ghost mode)
            if (enemy instanceof Hunter && enemy.checkBodyCollision(this.snake)) {
                // Only reduce size if NOT in ghost mode
                if (!this.snake.powerups.ghost.active) {
                    this.snake.cut(0.2);
                }
                enemy.hp = 0;
                this.enemiesKilled++;
                this.particles.emit(enemy.position.x, enemy.position.y, CONFIG.colors.enemy, 15);
            }
        });

        // Tail turret: track the nearest target every frame (drives the visuals), fire on cadence
        if (this.snake.powerups.turret.active) {
            this.tailTurret.update(this.snake, this.enemies, frameMultiplier);
            const now = Date.now();
            // Reduced fire rate to 1 second (1000ms)
            if (now - this.snake.powerups.turret.lastShot > CONFIG.gun.fireRate) {
                this.shootFromTail();
                this.snake.powerups.turret.lastShot = now;
            }
        }

        this.enemies = this.enemies.filter(e => !e.isDead());

        // Update particles
        this.particles.update(deltaTime);

        // Update gun projectiles (normalized)
        this.gunProjectiles.forEach(proj => {
            proj.position = proj.position.add(proj.velocity.multiply(frameMultiplier));
            proj.lifetime -= deltaTime;

            // Check collision with target
            if (proj.target && proj.position.distance(proj.target.position) < proj.radius + 10) {
                if (proj.target.hp !== undefined) {
                    proj.target.hp -= CONFIG.gun.damage;
                    proj.target.hitFlashAt = performance.now();
                    if (proj.target.hp <= 0) {
                        this.enemiesKilled++;
                    }
                }
                this.particles.emit(proj.target.position.x, proj.target.position.y, CONFIG.colors.gunProjectile, 10);
                proj.lifetime = 0;
            }
        });
        this.gunProjectiles = this.gunProjectiles.filter(p => p.lifetime > 0);

        // Update pending enemy spawns (visual warnings)
        this.updatePendingSpawns(deltaTime);

        // Update inverted controls
        if (this.controlsInverted) {
            this.controlsInvertedTimer -= deltaTime;
            if (this.controlsInvertedTimer <= 0) {
                this.controlsInverted = false;
            }
        }

        this.updateUI();
    }

    // Pre-render the arena floor (grid, major lines, vignette) once instead of stroking it every frame
    createGridLayer() {
        const { width, height } = CONFIG.canvas;
        const layer = document.createElement('canvas');
        layer.width = width;
        layer.height = height;
        const g = layer.getContext('2d');

        g.lineWidth = 1;
        for (let i = 0; i <= width; i += 40) {
            g.strokeStyle = i % 200 === 0 ? 'rgba(0, 229, 255, 0.11)' : 'rgba(0, 229, 255, 0.04)';
            g.beginPath();
            g.moveTo(i + 0.5, 0);
            g.lineTo(i + 0.5, height);
            g.stroke();
        }
        for (let i = 0; i <= height; i += 40) {
            g.strokeStyle = i % 200 === 0 ? 'rgba(255, 43, 214, 0.10)' : 'rgba(0, 229, 255, 0.04)';
            g.beginPath();
            g.moveTo(0, i + 0.5);
            g.lineTo(width, i + 0.5);
            g.stroke();
        }

        // Small crosses at major intersections
        g.strokeStyle = 'rgba(125, 249, 255, 0.25)';
        for (let x = 200; x < width; x += 200) {
            for (let y = 200; y < height; y += 200) {
                g.beginPath();
                g.moveTo(x - 4, y + 0.5);
                g.lineTo(x + 5, y + 0.5);
                g.moveTo(x + 0.5, y - 4);
                g.lineTo(x + 0.5, y + 5);
                g.stroke();
            }
        }

        const vignette = g.createRadialGradient(width / 2, height / 2, height * 0.35, width / 2, height / 2, width * 0.7);
        vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
        vignette.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
        g.fillStyle = vignette;
        g.fillRect(0, 0, width, height);

        return layer;
    }

    draw() {
        // Translucent clear keeps short motion trails behind moving entities
        this.ctx.fillStyle = 'rgba(8, 6, 22, 0.35)';
        this.ctx.fillRect(0, 0, CONFIG.canvas.width, CONFIG.canvas.height);
        this.ctx.drawImage(this.gridLayer, 0, 0);

        // Draw pending spawn warnings (before other entities so they appear behind)
        this.drawPendingSpawns();

        this.food.draw(this.ctx);
        this.powerups.forEach(p => p.draw(this.ctx));
        this.enemies.forEach(e => {
            e.draw(this.ctx);
            drawHitFlash(this.ctx, e);
            // Draw HP bars for turrets
            if (e instanceof Turret && e.hp > 0) {
                this.ctx.save();
                const barWidth = 30;
                const barHeight = 4;
                const x = e.position.x - barWidth / 2;
                const y = e.position.y - e.radius - 10;

                // Background
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                this.ctx.fillRect(x, y, barWidth, barHeight);

                // HP segments
                const segmentWidth = barWidth / 3;
                for (let i = 0; i < e.hp; i++) {
                    const gradient = this.ctx.createLinearGradient(x + i * segmentWidth, y, x + (i + 1) * segmentWidth, y);
                    gradient.addColorStop(0, '#ffaa00');
                    gradient.addColorStop(1, '#ff6600');
                    this.ctx.fillStyle = gradient;
                    this.ctx.fillRect(x + i * segmentWidth + 1, y + 1, segmentWidth - 2, barHeight - 2);
                }

                // Border
                this.ctx.strokeStyle = CONFIG.colors.turret;
                this.ctx.lineWidth = 1;
                this.ctx.strokeRect(x, y, barWidth, barHeight);
                this.ctx.restore();
            }
        });

        this.gunProjectiles.forEach(proj => drawTurretShot(this.ctx, proj));

        const turretActive = this.snake.powerups.turret.active;
        const turretVisibility = turretActive ? this.snake.effectVisibility('turret', 0.35) : 0;
        if (turretActive) this.tailTurret.drawRange(this.ctx, this.snake, turretVisibility);

        this.drawMagnetoField();
        this.snake.draw(this.ctx);
        if (turretActive) {
            this.tailTurret.draw(this.ctx, this.snake, this.snake.powerups.turret.lastShot, turretVisibility);
        }
        this.particles.draw(this.ctx);
        this.drawTimeWarpTint();
        this.drawGhostEndingWarning();
        this.drawPowerupHint();

        // Blindness: darkness outside the vision radius
        if (this.snake && this.snake.blindness.active) {
            this.drawBlindness();
        }
    }

    // Magneto: animated dashed field line pulling the food toward the head while it is in range
    drawMagnetoField() {
        const magneto = this.snake.powerups.magneto;
        if (!magneto.active) return;
        const food = this.food.position;
        const head = this.snake.head;
        if (food.distance(head) >= MAGNETO_RANGE) return;

        const color = ICONS.magneto.color;
        this.ctx.save();
        this.ctx.globalAlpha = 0.7 * this.snake.effectVisibility('magneto', 0.25);
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 2;
        this.ctx.lineCap = 'round';
        this.ctx.setLineDash([4, 8]);
        this.ctx.lineDashOffset = Date.now() * 0.06;  // dashes flow from the food to the head
        // Two slightly bowed lines read as a field rather than a rope
        const mid = { x: (food.x + head.x) / 2, y: (food.y + head.y) / 2 };
        const nx = -(head.y - food.y) * 0.18;
        const ny = (head.x - food.x) * 0.18;
        [1, -1].forEach(side => {
            this.ctx.beginPath();
            this.ctx.moveTo(food.x, food.y);
            this.ctx.quadraticCurveTo(mid.x + nx * side, mid.y + ny * side, head.x, head.y);
            this.ctx.stroke();
        });
        this.ctx.restore();
    }

    // Time Warp: a cool tint over the arena while the world is slowed; it flickers before ending
    drawTimeWarpTint() {
        if (!this.snake.powerups.timeWarp.active) return;
        this.ctx.save();
        this.ctx.globalAlpha = 0.07 * this.snake.effectVisibility('timeWarp', 0.15);
        this.ctx.fillStyle = ICONS.timeWarp.color;
        this.ctx.fillRect(0, 0, CONFIG.canvas.width, CONFIG.canvas.height);
        this.ctx.restore();
    }

    // Ghost is the one effect whose end can kill you (inside a turret or your own body),
    // so its last second also pulses the arena edges red.
    drawGhostEndingWarning() {
        const ghost = this.snake.powerups.ghost;
        if (!ghost.active || ghost.duration > 1000) return;
        const { width, height } = CONFIG.canvas;
        const pulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.025);
        const edge = this.ctx.createRadialGradient(width / 2, height / 2, height * 0.45, width / 2, height / 2, width * 0.65);
        edge.addColorStop(0, 'rgba(255, 77, 109, 0)');
        edge.addColorStop(1, `rgba(255, 77, 109, ${0.12 + pulse * 0.13})`);
        this.ctx.save();
        this.ctx.fillStyle = edge;
        this.ctx.fillRect(0, 0, width, height);
        this.ctx.restore();
    }

    // Blindness: everything outside a small circle around the head is fully dark,
    // so food, power-ups, enemies and spawn warnings out there cannot be seen.
    drawBlindness() {
        const { blindness, head } = this.snake;
        const visionR = CONFIG.game.blindnessVisionRadius;
        const fade = 400;  // ms to fade the darkness in and out
        const elapsed = (blindness.total || blindness.duration) - blindness.duration;
        const strength = Math.max(0, Math.min(1, elapsed / fade, blindness.duration / fade));
        const darkness = strength;

        const gradient = this.ctx.createRadialGradient(head.x, head.y, visionR * 0.55, head.x, head.y, visionR);
        gradient.addColorStop(0, 'rgba(2, 2, 8, 0)');
        gradient.addColorStop(1, `rgba(2, 2, 8, ${darkness})`);

        this.ctx.save();
        // Clear vision inside the circle, soft edge, then solid darkness to the borders
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(head.x, head.y, visionR, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.fillStyle = `rgba(2, 2, 8, ${darkness})`;
        this.ctx.beginPath();
        this.ctx.rect(0, 0, CONFIG.canvas.width, CONFIG.canvas.height);
        this.ctx.arc(head.x, head.y, visionR, 0, Math.PI * 2, true);
        this.ctx.fill('evenodd');

        // Faint red rim marks the edge of vision
        this.ctx.strokeStyle = `rgba(255, 77, 109, ${0.35 * strength})`;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(head.x, head.y, visionR, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.restore();
    }

    eatFood() {
        // Apply HARD MODE multiplier if active
        const scoreValue = this.isHardMode ?
            CONFIG.game.foodValue * CONFIG.game.hardModeScoreMultiplier :
            CONFIG.game.foodValue;
        const coinValue = this.isHardMode ?
            CONFIG.game.coinValue * CONFIG.game.hardModeCoinMultiplier :
            CONFIG.game.coinValue;

        this.score += scoreValue;
        this.shopSystem.addCoins(coinValue);
        this.snake.grow(2);
        this.food.respawn();
        this.particles.emit(this.food.position.x, this.food.position.y, CONFIG.colors.food, 20);

        // Level up logic
        if (this.score >= this.level * CONFIG.game.levelUpScore) {
            // Check if entering HARD MODE
            if (this.level === CONFIG.game.hardModeLevel - 1) {
                this.level++;
                this.isHardMode = true;
                this.particles.emit(this.snake.head.x, this.snake.head.y, '#ff00ff', 50);

                // HARD MODE bonus
                if (!this.hardModeRewardGiven) {
                    this.shopSystem.addCoins(CONFIG.game.hardModeBonus);
                    this.hardModeRewardGiven = true;
                    this.showHardModeNotification();
                }
            }
            // In HARD MODE, level doesn't increase but score keeps going
            else if (!this.isHardMode) {
                this.level++;
                this.particles.emit(this.snake.head.x, this.snake.head.y, '#00ff00', 30);

                // New level bonus
                if (this.level > this.maxLevelReached) {
                    this.maxLevelReached = this.level;
                    this.shopSystem.addCoins(CONFIG.game.newLevelBonus);
                    this.saveMaxLevel();
                    this.showNewLevelBonus();
                }
            }
        }
    }

    // Animated toast; variant picks the accent color (see .toast-* in styles.css)
    showToast(title, subtitle = '', variant = 'info', duration = 2500) {
        const container = document.getElementById('toasts');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${variant}`;
        toast.innerHTML = `<strong>${title}</strong>${subtitle ? `<span>${subtitle}</span>` : ''}`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('leaving');
            toast.addEventListener('animationend', () => toast.remove(), { once: true });
        }, duration);
    }

    showHardModeNotification() {
        this.showToast(`${iconSvg('flame')} HARD MODE ACTIVADO`, `+${CONFIG.game.hardModeBonus} monedas`, 'hard', 3000);
    }

    showNewLevelBonus() {
        this.showToast('¡Nuevo nivel récord!', `+${CONFIG.game.newLevelBonus} monedas`, 'success', 2200);
    }

    // The first few times a power-up is collected, a short label above the head says what it does
    maybeShowPowerupHint(type) {
        let seen = {};
        try {
            seen = JSON.parse(localStorage.getItem(HINTS_STORAGE_KEY) || '{}');
        } catch { /* corrupted or blocked storage: show the hint */ }

        if ((seen[type] || 0) >= HINT_TIMES) return;
        seen[type] = (seen[type] || 0) + 1;
        try {
            localStorage.setItem(HINTS_STORAGE_KEY, JSON.stringify(seen));
        } catch { /* storage unavailable */ }

        this.powerupHint = { type, start: performance.now() };
    }

    drawPowerupHint() {
        const hint = this.powerupHint;
        if (!hint) return;
        const age = performance.now() - hint.start;
        if (age > HINT_DURATION_MS) {
            this.powerupHint = null;
            return;
        }

        const icon = ICONS[hint.type];
        const fade = Math.min(1, age / 180, (HINT_DURATION_MS - age) / 300);
        const rise = (1 - Math.min(1, age / 250)) * 8;
        const x = this.snake.head.x;
        const y = this.snake.head.y - 46 + rise;
        const text = `${icon.label} · ${icon.hint}`;

        this.ctx.save();
        this.ctx.globalAlpha = fade;
        this.ctx.font = '700 13px Montserrat, sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        const w = this.ctx.measureText(text).width + 22;
        const left = Math.max(4, Math.min(CONFIG.canvas.width - w - 4, x - w / 2));

        this.ctx.fillStyle = 'rgba(8, 8, 24, 0.85)';
        this.ctx.strokeStyle = icon.color;
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        this.ctx.roundRect(left, y - 13, w, 26, 13);
        this.ctx.fill();
        this.ctx.stroke();

        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillText(text, left + w / 2, y + 1);
        this.ctx.restore();
    }

    collectPowerup(powerup) {
        this.particles.emit(powerup.position.x, powerup.position.y, CONFIG.colors.powerup, 25);
        this.maybeShowPowerupHint(powerup.type);

        const duration = this.shopSystem.getPowerupDuration(powerup.type);

        switch (powerup.type) {
            case 'ghost':
            case 'timeWarp':
            case 'magneto':
            case 'turret':
            case 'shield':
                this.snake.activatePowerup(powerup.type, duration);
                if (powerup.type === 'turret') {
                    this.snake.powerups.turret.lastShot = Date.now();
                }
                break;
            case 'cutTail':
                this.snake.cut(0.3);
                this.enemies = [];
                this.particles.emit(this.snake.head.x, this.snake.head.y, '#ffffff', 50);
                this.screenShake();
                break;
        }
    }

    spawnPowerup() {
        const types = ['ghost', 'timeWarp', 'magneto', 'turret', 'cutTail'];

        // Add shield if unlocked
        if (this.shopSystem.getUpgrades().shieldSpawner) {
            types.push('shield');
        }

        const type = types[randomInt(0, types.length)];
        this.powerups.push(new PowerUp(type));
    }

    spawnEnemy() {
        const rand = Math.random();
        // Turrets only spawn from level 2+
        const canSpawnTurrets = this.level >= CONFIG.game.minLevelForTurrets;

        if (rand < 0.6) {
            // Hunters spawn from edges - no warning needed
            this.enemies.push(new Hunter());
        } else if (rand < 0.85 && canSpawnTurrets) {
            // Turret - shows warning before spawning
            this.createPendingSpawn('turret');
        } else if (rand < 0.92) {
            // Virus - shows warning before spawning
            this.createPendingSpawn('virus');
        } else {
            // Blindness - shows warning before spawning
            this.createPendingSpawn('blindness');
        }
    }

    createPendingSpawn(type) {
        const position = new Vector2(
            randomRange(100, CONFIG.canvas.width - 100),
            randomRange(100, CONFIG.canvas.height - 100)
        );

        this.pendingEnemySpawns.push({
            type: type,
            position: position,
            timeRemaining: 1500,  // 1.5 seconds warning
            totalTime: 1500
        });
    }

    updatePendingSpawns(deltaTime) {
        this.pendingEnemySpawns.forEach(spawn => {
            spawn.timeRemaining -= deltaTime;

            if (spawn.timeRemaining <= 0) {
                // Spawn the actual enemy at the predetermined position
                switch (spawn.type) {
                    case 'turret':
                        const turret = new Turret();
                        turret.position = spawn.position;
                        this.enemies.push(turret);
                        break;
                    case 'virus':
                        const virus = new Virus();
                        virus.position = spawn.position;
                        this.enemies.push(virus);
                        break;
                    case 'blindness':
                        const blindness = new Blindness();
                        blindness.position = spawn.position;
                        this.enemies.push(blindness);
                        break;
                }
            }
        });

        // Remove completed spawns
        this.pendingEnemySpawns = this.pendingEnemySpawns.filter(s => s.timeRemaining > 0);
    }

    drawPendingSpawns() {
        this.pendingEnemySpawns.forEach(spawn => {
            const progress = 1 - (spawn.timeRemaining / spawn.totalTime);
            const pulse = Math.sin(Date.now() * 0.015) * 0.3 + 0.7;

            this.ctx.save();

            // Outer warning circle (grows as time passes)
            const maxRadius = 50;
            const currentRadius = maxRadius * progress;

            // Color based on enemy type
            let color;
            switch (spawn.type) {
                case 'turret':
                    color = CONFIG.colors.turret;
                    break;
                case 'virus':
                case 'blindness':
                    color = CONFIG.colors.adversePowerup;
                    break;
                default:
                    color = '#ff0000';
            }

            // Pulsing warning circle
            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = 3;
            this.ctx.globalAlpha = pulse * (0.5 + progress * 0.5);
            this.ctx.beginPath();
            this.ctx.arc(spawn.position.x, spawn.position.y, currentRadius, 0, Math.PI * 2);
            this.ctx.stroke();

            // Rotating dashed lock-on ring at full size
            this.ctx.lineWidth = 1.5;
            this.ctx.setLineDash([8, 8]);
            this.ctx.lineDashOffset = -Date.now() * 0.05;
            this.ctx.globalAlpha = 0.35 + progress * 0.4;
            this.ctx.beginPath();
            this.ctx.arc(spawn.position.x, spawn.position.y, maxRadius, 0, Math.PI * 2);
            this.ctx.stroke();
            this.ctx.setLineDash([]);

            // Inner crosshair
            this.ctx.globalAlpha = pulse;
            this.ctx.beginPath();
            this.ctx.moveTo(spawn.position.x - 10, spawn.position.y);
            this.ctx.lineTo(spawn.position.x + 10, spawn.position.y);
            this.ctx.moveTo(spawn.position.x, spawn.position.y - 10);
            this.ctx.lineTo(spawn.position.x, spawn.position.y + 10);
            this.ctx.stroke();

            // Warning text
            this.ctx.fillStyle = color;
            this.ctx.font = '700 14px Montserrat, sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('⚠', spawn.position.x, spawn.position.y - 25);

            this.ctx.restore();
        });
    }

    shootFromTail() {
        if (this.snake.segments.length < 2) return;

        const tail = this.snake.segments[this.snake.segments.length - 1];
        const target = this.tailTurret.findTarget(tail, this.enemies);
        if (!target) return;

        const direction = target.position.subtract(tail).normalize();
        this.gunProjectiles.push({
            position: new Vector2(tail.x, tail.y),
            velocity: direction.multiply(CONFIG.gun.projectileSpeed),
            target,
            radius: CONFIG.gun.projectileRadius,
            lifetime: 1000
        });
        this.tailTurret.onFire();
    }

    gameOver() {
        this.state = 'gameover';
        this.canvas.style.display = 'none';
        document.getElementById('hud').classList.remove('active');

        const coinsEarned = this.score / CONFIG.game.foodValue * CONFIG.game.coinValue;

        // Update progression
        const gameData = {
            level: this.level,
            score: this.score,
            gameDuration: this.gameTime,
            coinsEarned: coinsEarned,
            enemiesKilled: this.enemiesKilled
        };

        const newUnlocks = this.progressionSystem.updateGameStats(gameData);

        document.getElementById('final-score').textContent = this.score;
        document.getElementById('final-level').textContent = this.level;
        document.getElementById('coins-earned').textContent = Math.floor(coinsEarned);
        document.getElementById('game-over').classList.add('active');
        this.riveUI.showScreen('gameover');

        // Show mission completions
        if (newUnlocks && Array.isArray(newUnlocks) && newUnlocks.length > 0) {
            newUnlocks.forEach((unlock, i) => {
                setTimeout(() => {
                    this.showToast(`Misión completada: ${unlock.mission}`, `Skin "${unlock.skin}" desbloqueada`, 'success', 4000);
                }, 600 + i * 400);
            });
        }
    }

    screenShake() {
        this.canvas.classList.add('shake');
        setTimeout(() => {
            this.canvas.classList.remove('shake');
        }, 500);
    }

    togglePause() {
        if (this.state === 'playing') {
            this.state = 'paused';
            document.getElementById('pause-menu').classList.add('active');
        } else if (this.state === 'paused') {
            this.state = 'playing';
            document.getElementById('pause-menu').classList.remove('active');
            this.lastTime = performance.now();  // Reset time to avoid big deltaTime jump
            this.gameLoop(this.lastTime);
        }
    }

    pauseGame() {
        // Legacy method - redirects to toggle
        this.togglePause();
    }

    updateUI() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('level').innerHTML = this.isHardMode ? `${this.level} ${iconSvg('flame')} HARD MODE` : this.level;
        document.getElementById('high-score').textContent = this.progressionSystem.getStats().maxScore;
        this.shopSystem.updateCoinsDisplay();

        const energyFill = document.getElementById('energy-fill');
        if (energyFill && this.snake) {
            energyFill.style.width = `${this.snake.dashEnergy}%`;
        }

        if (this.snake) {
            this.riveUI.updateHud({
                score: this.score,
                level: this.level,
                energy: this.snake.dashEnergy,
                hardMode: this.isHardMode
            });
        }

        const powerupsDiv = document.getElementById('active-powerups');
        if (powerupsDiv && this.snake) {
            const chips = [];
            Object.keys(this.snake.powerups).forEach(key => {
                const powerup = this.snake.powerups[key];
                if (powerup.active) {
                    chips.push({ key, time: Math.ceil(powerup.duration / 1000), expiring: powerup.duration < EXPIRY_WARNING_MS });
                }
            });
            if (this.controlsInverted) {
                chips.push({ key: 'virus', time: Math.ceil(this.controlsInvertedTimer / 1000), adverse: true });
            }
            if (this.snake.blindness.active) {
                chips.push({ key: 'blindness', time: Math.ceil(this.snake.blindness.duration / 1000), adverse: true });
            }

            // Rebuild only when the visible text changes, not every frame
            const signature = chips.map(c => `${c.key}:${c.time}:${c.expiring ? 1 : 0}`).join('|');
            if (signature !== this.powerupSignature) {
                this.powerupSignature = signature;
                powerupsDiv.innerHTML = chips.map(c => {
                    const icon = ICONS[c.key];
                    const label = icon ? icon.label : c.key.toUpperCase();
                    const color = icon ? icon.color : CONFIG.colors.powerup;
                    return `<div class="powerup-indicator${c.adverse ? ' adverse' : ''}${c.expiring ? ' expiring' : ''}" style="--icon-color: ${color}">` +
                        `${iconSvg(c.key)}${label}<span>${c.time}s</span></div>`;
                }).join('');
            }
        }
    }

    showMainMenu() {
        this.hideAllMenus();
        this.state = 'menu';
        document.getElementById('main-menu').classList.add('active');
        this.riveUI.showScreen('menu');
        this.updateUI();
    }

    showShop() {
        this.hideAllMenus();
        document.getElementById('shop-menu').classList.add('active');
        this.riveUI.showScreen('other');
        this.shopSystem.renderShop();
    }

    showInventory() {
        this.hideAllMenus();
        document.getElementById('inventory-menu').classList.add('active');
        this.riveUI.showScreen('other');
        this.renderInventory();
    }

    showControls() {
        this.hideAllMenus();
        document.getElementById('controls-menu').classList.add('active');
        this.riveUI.showScreen('other');
    }

    hideAllMenus() {
        document.querySelectorAll('.menu').forEach(menu => {
            menu.classList.remove('active');
        });
        this.canvas.style.display = 'none';
        document.getElementById('hud').classList.remove('active');
        this.skinSystem.stopPreviewAnimation();
    }

    renderInventory() {
        this.renderSkinInventory();
        this.renderMissions();
    }

    renderSkinInventory() {
        const container = document.getElementById('skin-inventory');
        if (!container) return;

        container.innerHTML = '';

        const unlockedSkins = this.progressionSystem.unlockedSkins;
        const currentSkin = this.skinSystem.getCurrentSkin();

        unlockedSkins.forEach(skinId => {
            const skinData = CONFIG.skins[skinId];
            if (!skinData) return;

            const div = document.createElement('div');
            const isEquipped = currentSkin === skinId;
            div.className = 'shop-item skin-card' + (isEquipped ? ' owned equipped' : '');
            div.style.setProperty('--skin-color', skinData.glowColor || skinData.bodyColor);

            div.innerHTML = `
                <canvas class="skin-thumb"></canvas>
                <h3>${skinData.name}</h3>
                <button ${isEquipped ? 'disabled' : ''}
                        onclick="game.skinSystem.equipSkin('${skinId}') && game.renderInventory() && game.updateEquippedSkinName()">
                    ${isEquipped ? 'EQUIPADA' : 'EQUIPAR'}
                </button>
            `;
            // Hovering a card previews it on the stage; leaving returns to the equipped skin
            div.addEventListener('mouseenter', () => this.skinSystem.startPreviewAnimation(skinId));
            div.addEventListener('mouseleave', () => this.skinSystem.startPreviewAnimation(this.skinSystem.getCurrentSkin()));
            container.appendChild(div);
            this.skinSystem.drawThumb(div.querySelector('.skin-thumb'), skinId);
        });

        this.updateEquippedSkinName();

        // Start preview for current skin
        if (unlockedSkins.length > 0) {
            this.skinSystem.startPreviewAnimation(currentSkin);
        }
    }

    updateEquippedSkinName() {
        const currentSkin = this.skinSystem.getCurrentSkin();
        const skinName = this.skinSystem.getSkinName(currentSkin);
        document.getElementById('equipped-skin-name').textContent = skinName;
    }

    renderMissions() {
        const container = document.getElementById('missions-list');
        if (!container) return;

        container.innerHTML = '';

        const missions = this.progressionSystem.getMissionProgress();

        missions.forEach(mission => {
            const div = document.createElement('div');
            div.className = 'mission-card' + (mission.completed ? ' completed' : '');

            div.innerHTML = `
                <h4>${mission.name} ${mission.completed ? '✓' : ''}</h4>
                <p class="mission-desc">${mission.description}</p>
                <p class="mission-reward">Recompensa: Skin ${CONFIG.skins[mission.reward]?.name || mission.reward}</p>
                <div class="mission-bar"><div style="width: ${mission.progressPercent}%"></div></div>
                <p class="mission-progress">${mission.progress} / ${mission.target}</p>
            `;

            container.appendChild(div);
        });
    }

    redeemCode() {
        const input = document.getElementById('secret-code-input');
        const messageEl = document.getElementById('code-message');

        if (!input || !messageEl) return;

        const code = input.value;
        const result = this.shopSystem.redeemCode(code);

        messageEl.textContent = result.message;
        messageEl.style.color = result.success ? '#3dffa8' : '#ff4d6d';

        if (result.success) {
            input.value = '';
            this.renderInventory();
        }

        setTimeout(() => {
            messageEl.textContent = '';
        }, 3000);
    }
}
