import { CONFIG } from './config.js';
import { randomInt } from './utils.js';
import { Snake } from './entities/Snake.js';
import { Food } from './entities/Food.js';
import { PowerUp } from './entities/PowerUp.js';
import { Hunter } from './entities/enemies/Hunter.js';
import { Turret } from './entities/enemies/Turret.js';
import { Virus } from './entities/enemies/Virus.js';
import { ParticleSystem } from './systems/ParticleSystem.js';
import { ProgressionSystem } from './systems/ProgressionSystem.js';
import { SkinSystem } from './systems/SkinSystem.js';
import { ShopSystem } from './systems/ShopSystem.js';

export class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = CONFIG.canvas.width;
        this.canvas.height = CONFIG.canvas.height;

        this.input = {
            left: false,
            right: false,
            dash: false
        };

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

        // Game entities
        this.snake = null;
        this.food = null;
        this.powerups = [];
        this.enemies = [];

        // Timers
        this.lastTime = 0;
        this.lastEnemySpawn = 0;
        this.lastPowerupSpawn = 0;

        // Controls
        this.controlsInverted = false;
        this.controlsInvertedTimer = 0;

        this.setupEventListeners();
        this.skinSystem.initializePreview('preview-canvas');
        this.updateUI();
        this.showMainMenu();
    }

    setupEventListeners() {
        window.addEventListener('keydown', (e) => {
            if (this.state !== 'playing') return;

            const left = this.controlsInverted;

            if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
                this.input[left ? 'right' : 'left'] = true;
            }
            if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
                this.input[left ? 'left' : 'right'] = true;
            }
            if (e.key === ' ') {
                e.preventDefault();
                this.input.dash = true;
            }
            if (e.key === 'Escape') {
                this.pauseGame();
            }
        });

        window.addEventListener('keyup', (e) => {
            if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
                this.input.left = false;
                this.input.right = false;
            }
            if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
                this.input.left = false;
                this.input.right = false;
            }
            if (e.key === ' ') {
                this.input.dash = false;
            }
        });
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
        this.particles = new ParticleSystem();

        this.lastTime = performance.now();
        this.lastEnemySpawn = 0;
        this.lastPowerupSpawn = 0;
        this.controlsInverted = false;
        this.controlsInvertedTimer = 0;

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

        // Update snake
        const levelMultiplier = (this.level - 1) * CONFIG.game.speedIncreasePerLevel;
        this.snake.update(effectiveDelta, this.input, levelMultiplier);

        // Check self-collision
        if (this.snake.checkSelfCollision()) {
            this.gameOver();
            return;
        }

        // Update food
        if (this.food.checkCollision(this.snake)) {
            this.eatFood();
        }

        // Magneto effect
        if (this.snake.powerups.magneto.active) {
            const distance = this.food.position.distance(this.snake.head);
            if (distance < 150) {
                const direction = this.snake.head.subtract(this.food.position).normalize();
                this.food.position = this.food.position.add(direction.multiply(5));
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
                this.particles.emit(enemy.position.x, enemy.position.y, CONFIG.colors.virus, 20);
            }

            // Hunter/Turret collision
            if ((enemy instanceof Hunter || enemy instanceof Turret) && enemy.checkCollision(this.snake)) {
                if (!this.snake.isInvulnerable && !this.snake.powerups.ghost.active &&
                    !this.snake.powerups.shield.active) {
                    this.gameOver();
                }
            }

            // Body collision for hunters
            if (enemy instanceof Hunter && enemy.checkBodyCollision(this.snake)) {
                this.snake.cut(0.2);
                enemy.hp = 0;
                this.enemiesKilled++;
                this.particles.emit(enemy.position.x, enemy.position.y, CONFIG.colors.enemy, 15);
            }
        });

        // Turret shooting
        if (this.snake.powerups.turret.active) {
            const now = Date.now();
            if (now - this.snake.powerups.turret.lastShot > 500) {
                this.shootFromTail();
                this.snake.powerups.turret.lastShot = now;
            }
        }

        this.enemies = this.enemies.filter(e => !e.isDead());

        // Update particles
        this.particles.update(deltaTime);

        // Update inverted controls
        if (this.controlsInverted) {
            this.controlsInvertedTimer -= deltaTime;
            if (this.controlsInvertedTimer <= 0) {
                this.controlsInverted = false;
            }
        }

        this.updateUI();
    }

    draw() {
        this.ctx.fillStyle = 'rgba(10, 10, 30, 0.3)';
        this.ctx.fillRect(0, 0, CONFIG.canvas.width, CONFIG.canvas.height);

        // Grid
        this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.05)';
        this.ctx.lineWidth = 1;
        for (let i = 0; i < CONFIG.canvas.width; i += 40) {
            this.ctx.beginPath();
            this.ctx.moveTo(i, 0);
            this.ctx.lineTo(i, CONFIG.canvas.height);
            this.ctx.stroke();
        }
        for (let i = 0; i < CONFIG.canvas.height; i += 40) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, i);
            this.ctx.lineTo(CONFIG.canvas.width, i);
            this.ctx.stroke();
        }

        this.food.draw(this.ctx);
        this.powerups.forEach(p => p.draw(this.ctx));
        this.enemies.forEach(e => e.draw(this.ctx));
        this.snake.draw(this.ctx);
        this.particles.draw(this.ctx);
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

    showHardModeNotification() {
        // Visual notification for HARD MODE
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(255, 0, 255, 0.9);
            border: 3px solid #ff00ff;
            border-radius: 15px;
            padding: 2rem;
            font-size: 2rem;
            color: #fff;
            text-shadow: 0 0 20px #ff00ff;
            z-index: 10000;
            animation: pulse 0.5s ease-in-out 3;
        `;
        notification.textContent = `🔥 HARD MODE ACTIVADO 🔥\n+${CONFIG.game.hardModeBonus} MONEDAS`;
        document.body.appendChild(notification);

        setTimeout(() => notification.remove(), 3000);
    }

    showNewLevelBonus() {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20%;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 255, 0, 0.9);
            border: 2px solid #00ff00;
            border-radius: 10px;
            padding: 1rem 2rem;
            font-size: 1.5rem;
            color: #fff;
            text-shadow: 0 0 10px #00ff00;
            z-index: 10000;
        `;
        notification.textContent = `🎉 ¡Nuevo Nivel! +${CONFIG.game.newLevelBonus} Monedas`;
        document.body.appendChild(notification);

        setTimeout(() => notification.remove(), 2000);
    }

    collectPowerup(powerup) {
        this.particles.emit(powerup.position.x, powerup.position.y, CONFIG.colors.powerup, 25);

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
        if (rand < 0.6) {
            this.enemies.push(new Hunter());
        } else if (rand < 0.85) {
            this.enemies.push(new Turret());
        } else {
            this.enemies.push(new Virus());
        }
    }

    shootFromTail() {
        if (this.snake.segments.length < 2 || this.enemies.length === 0) return;

        const tail = this.snake.segments[this.snake.segments.length - 1];

        let nearest = null;
        let minDist = Infinity;

        this.enemies.forEach(enemy => {
            const dist = tail.distance(enemy.position);
            if (dist < minDist && dist < 300) {
                minDist = dist;
                nearest = enemy;
            }
        });

        if (nearest) {
            if (nearest.hp !== undefined) {
                nearest.hp--;
                if (nearest.hp <= 0) {
                    this.enemiesKilled++;
                }
            }
            this.particles.emit(nearest.position.x, nearest.position.y, '#ffff00', 10);
        }
    }

    screenShake() {
        this.canvas.classList.add('shake');
        setTimeout(() => {
            this.canvas.classList.remove('shake');
        }, 500);
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

        // Show mission completions
        if (newUnlocks.length > 0) {
            setTimeout(() => {
                let message = '¡Misiones completadas!\n\n';
                newUnlocks.forEach(unlock => {
                    message += `${unlock.mission}: Skin "${unlock.skin}" desbloqueada!\n`;
                });
                alert(message);
            }, 500);
        }
    }

    pauseGame() {
        // TODO: Implement pause
    }

    updateUI() {
        document.getElementById('score').textContent = this.score;
        const levelText = this.isHardMode ? `${this.level} 🔥 HARD MODE` : this.level;
        document.getElementById('level').textContent = levelText;
        document.getElementById('high-score').textContent = this.progressionSystem.getStats().maxScore;
        this.shopSystem.updateCoinsDisplay();

        const energyFill = document.getElementById('energy-fill');
        if (energyFill && this.snake) {
            energyFill.style.width = `${this.snake.dashEnergy}%`;
        }

        const powerupsDiv = document.getElementById('active-powerups');
        if (powerupsDiv && this.snake) {
            powerupsDiv.innerHTML = '';
            Object.keys(this.snake.powerups).forEach(key => {
                if (this.snake.powerups[key].active) {
                    const div = document.createElement('div');
                    div.className = 'powerup-indicator';
                    const time = Math.ceil(this.snake.powerups[key].duration / 1000);
                    div.textContent = `${key.toUpperCase()} (${time}s)`;
                    powerupsDiv.appendChild(div);
                }
            });

            if (this.controlsInverted) {
                const div = document.createElement('div');
                div.className = 'powerup-indicator';
                div.style.borderColor = '#ff0000';
                div.style.color = '#ff0000';
                const time = Math.ceil(this.controlsInvertedTimer / 1000);
                div.textContent = `INVERTED (${time}s)`;
                powerupsDiv.appendChild(div);
            }
        }
    }

    showMainMenu() {
        this.hideAllMenus();
        this.state = 'menu';
        document.getElementById('main-menu').classList.add('active');
        this.updateUI();
    }

    showShop() {
        this.hideAllMenus();
        document.getElementById('shop-menu').classList.add('active');
        this.shopSystem.renderShop();
    }

    showInventory() {
        this.hideAllMenus();
        document.getElementById('inventory-menu').classList.add('active');
        this.renderInventory();
    }

    showControls() {
        this.hideAllMenus();
        document.getElementById('controls-menu').classList.add('active');
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
            div.className = 'shop-item' + (isEquipped ? ' owned' : '');
            div.style.borderColor = skinData.bodyColor;

            div.innerHTML = `
                <h3 style="color: ${skinData.bodyColor}">${skinData.name}</h3>
                <button ${isEquipped ? 'disabled' : ''} 
                        onmouseover="game.skinSystem.startPreviewAnimation('${skinId}')"
                        onclick="game.skinSystem.equipSkin('${skinId}') && game.renderInventory() && game.updateEquippedSkinName()">
                    ${isEquipped ? 'EQUIPADA' : 'EQUIPAR'}
                </button>
            `;
            container.appendChild(div);
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
            div.style.cssText = `
                padding: 1rem;
                margin: 0.5rem 0;
                background: rgba(0, 255, 255, 0.05);
                border: 2px solid ${mission.completed ? '#00ff00' : '#00ffff'};
                border-radius: 10px;
            `;

            div.innerHTML = `
                <h4 style="color: ${mission.completed ? '#00ff00' : '#00ffff'}; margin: 0 0 0.5rem 0;">
                    ${mission.name} ${mission.completed ? '✓' : ''}
                </h4>
                <p style="font-size: 0.9rem; margin: 0.3rem 0;">${mission.description}</p>
                <p style="font-size: 0.85rem; color: #ffff00; margin: 0.3rem 0;">
                    Recompensa: Skin ${CONFIG.skins[mission.reward]?.name || mission.reward}
                </p>
                <div style="background: rgba(0,0,0,0.3); border-radius: 5px; height: 8px; margin-top: 0.5rem; overflow: hidden;">
                    <div style="background: linear-gradient(90deg, #00ffff, #00ff00); height: 100%; width: ${mission.progressPercent}%; transition: width 0.3s;"></div>
                </div>
                <p style="font-size: 0.8rem; margin: 0.3rem 0; text-align: right;">
                    ${mission.progress} / ${mission.target}
                </p>
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
        messageEl.style.color = result.success ? '#00ff00' : '#ff0000';

        if (result.success) {
            input.value = '';
            this.renderInventory();
        }

        setTimeout(() => {
            messageEl.textContent = '';
        }, 3000);
    }
}
