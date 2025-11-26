// ==================== GAME CONFIGURATION ====================
const CONFIG = {
    canvas: {
        width: 1200,
        height: 800
    },
    snake: {
        baseSpeed: 3,
        rotationSpeed: 0.08,
        segmentSize: 12,
        segmentSpacing: 3,
        dashSpeedMultiplier: 2,
        dashDuration: 500,
        dashCooldown: 3000,
        dashInvulnerability: 500
    },
    game: {
        initialLevel: 1,
        levelUpScore: 500,
        speedIncreasePerLevel: 0.3,
        enemySpawnInterval: 5000,
        foodValue: 10,
        coinValue: 1
    },
    colors: {
        snake: '#00ffff',
        snakeGlow: '#0099ff',
        food: '#ffff00',
        enemy: '#ff0000',
        turret: '#ff6600',
        virus: '#9900ff',
        powerup: '#ff00ff'
    }
};

// ==================== UTILITY FUNCTIONS ====================
class Vector2 {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    add(v) {
        return new Vector2(this.x + v.x, this.y + v.y);
    }

    subtract(v) {
        return new Vector2(this.x - v.x, this.y - v.y);
    }

    multiply(scalar) {
        return new Vector2(this.x * scalar, this.y * scalar);
    }

    magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    normalize() {
        const mag = this.magnitude();
        if (mag === 0) return new Vector2(0, 0);
        return new Vector2(this.x / mag, this.y / mag);
    }

    distance(v) {
        return this.subtract(v).magnitude();
    }

    static fromAngle(angle) {
        return new Vector2(Math.cos(angle), Math.sin(angle));
    }
}

function randomRange(min, max) {
    return Math.random() * (max - min) + min;
}

function randomInt(min, max) {
    return Math.floor(randomRange(min, max));
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

// ==================== PARTICLE SYSTEM ====================
class Particle {
    constructor(x, y, color, velocity, lifetime) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.velocity = velocity;
        this.lifetime = lifetime;
        this.maxLifetime = lifetime;
        this.size = randomRange(2, 6);
    }

    update(deltaTime) {
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        this.lifetime -= deltaTime;
        this.velocity = this.velocity.multiply(0.98); // Friction
    }

    draw(ctx) {
        const alpha = this.lifetime / this.maxLifetime;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    isDead() {
        return this.lifetime <= 0;
    }
}

class ParticleSystem {
    constructor() {
        this.particles = [];
    }

    emit(x, y, color, count = 10) {
        for (let i = 0; i < count; i++) {
            const angle = randomRange(0, Math.PI * 2);
            const speed = randomRange(2, 8);
            const velocity = Vector2.fromAngle(angle).multiply(speed);
            const lifetime = randomRange(300, 800);
            this.particles.push(new Particle(x, y, color, velocity, lifetime));
        }
    }

    update(deltaTime) {
        this.particles.forEach(p => p.update(deltaTime));
        this.particles = this.particles.filter(p => !p.isDead());
    }

    draw(ctx) {
        this.particles.forEach(p => p.draw(ctx));
    }
}

// ==================== SNAKE ====================
class Snake {
    constructor(x, y, upgrades = {}, skin = 'default') {
        this.head = new Vector2(x, y);
        this.segments = [new Vector2(x, y)];
        this.angle = 0;
        this.speed = CONFIG.snake.baseSpeed;
        this.isDashing = false;
        this.isInvulnerable = false;
        this.dashEnergy = 100;
        this.trail = []; // Store positions for tail to follow
        this.length = 5;
        this.skin = skin;

        // Apply upgrades
        this.upgrades = upgrades;
        if (upgrades.speedBoost) {
            this.speed *= 1.05; // 5% speed boost
        }
        if (upgrades.startShield) {
            this.isInvulnerable = true;
            setTimeout(() => {
                this.isInvulnerable = false;
            }, 5000); // 5 seconds of protection
        }

        // Power-ups
        this.powerups = {
            ghost: { active: false, duration: 0 },
            timeWarp: { active: false, duration: 0 },
            magneto: { active: false, duration: 0 },
            turret: { active: false, duration: 0, lastShot: 0 }
        };
    }

    update(deltaTime, input, levelMultiplier) {
        // Handle rotation
        if (input.left) this.angle -= CONFIG.snake.rotationSpeed;
        if (input.right) this.angle += CONFIG.snake.rotationSpeed;

        // Handle dash
        if (input.dash && this.dashEnergy >= 100 && !this.isDashing) {
            this.startDash();
        }

        // Update dash state
        if (this.isDashing) {
            this.dashEnergy = Math.max(0, this.dashEnergy - deltaTime * 0.2);
        } else {
            // Apply dash recharge upgrade
            const rechargeRate = this.upgrades.dashRecharge ? 0.033 : 0.03; // 10% faster
            this.dashEnergy = Math.min(100, this.dashEnergy + deltaTime * rechargeRate);
        }

        // Calculate speed
        const currentSpeed = (this.speed + levelMultiplier) *
            (this.isDashing ? CONFIG.snake.dashSpeedMultiplier : 1);

        // Move head
        const direction = Vector2.fromAngle(this.angle);
        const velocity = direction.multiply(currentSpeed);
        this.head = this.head.add(velocity);

        // Wrap around screen
        if (this.head.x < 0) this.head.x = CONFIG.canvas.width;
        if (this.head.x > CONFIG.canvas.width) this.head.x = 0;
        if (this.head.y < 0) this.head.y = CONFIG.canvas.height;
        if (this.head.y > CONFIG.canvas.height) this.head.y = 0;

        // Update trail
        this.trail.push({ x: this.head.x, y: this.head.y });
        if (this.trail.length > this.length * CONFIG.snake.segmentSpacing) {
            this.trail.shift();
        }

        // Update segments to follow trail
        this.updateSegments();

        // Update power-ups
        this.updatePowerups(deltaTime);
    }

    updateSegments() {
        this.segments = [];
        for (let i = 0; i < this.length; i++) {
            const index = Math.max(0, this.trail.length - 1 - (i * CONFIG.snake.segmentSpacing));
            if (this.trail[index]) {
                this.segments.push(new Vector2(this.trail[index].x, this.trail[index].y));
            }
        }
    }

    startDash() {
        this.isDashing = true;
        this.isInvulnerable = true;

        setTimeout(() => {
            this.isDashing = false;
        }, CONFIG.snake.dashDuration);

        setTimeout(() => {
            this.isInvulnerable = false;
        }, CONFIG.snake.dashInvulnerability);
    }

    grow(amount = 3) {
        this.length += amount;
    }

    cut(percentage = 0.3) {
        this.length = Math.max(5, Math.floor(this.length * (1 - percentage)));
    }

    activatePowerup(type, duration) {
        if (this.powerups[type]) {
            this.powerups[type].active = true;
            this.powerups[type].duration = duration;
        }
    }

    updatePowerups(deltaTime) {
        Object.keys(this.powerups).forEach(key => {
            if (this.powerups[key].active) {
                this.powerups[key].duration -= deltaTime;
                if (this.powerups[key].duration <= 0) {
                    this.powerups[key].active = false;
                }
            }
        });
    }

    draw(ctx) {
        // Get skin colors
        let bodyColor = CONFIG.colors.snake;
        let glowColor = CONFIG.colors.snakeGlow;
        let headColor = CONFIG.colors.snake;

        if (this.skin === 'skinFire') {
            bodyColor = '#ff4500';
            glowColor = '#ff8c00';
            headColor = '#ff0000';
        } else if (this.skin === 'skinRobot') {
            bodyColor = '#c0c0c0';
            glowColor = '#ffffff';
            headColor = '#808080';
        }

        // Shield effect
        if (this.isInvulnerable && !this.isDashing) {
            const pulse = Math.sin(Date.now() * 0.01) * 0.3 + 0.7;
            ctx.save();
            ctx.globalAlpha = pulse * 0.3;
            ctx.fillStyle = '#00ffff';
            ctx.shadowBlur = 30;
            ctx.shadowColor = '#00ffff';
            ctx.beginPath();
            ctx.arc(this.head.x, this.head.y, CONFIG.snake.segmentSize + 15, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Draw segments (tail)
        for (let i = this.segments.length - 1; i >= 0; i--) {
            const segment = this.segments[i];
            const alpha = (i / this.segments.length) * 0.7 + 0.3;

            ctx.save();
            ctx.globalAlpha = alpha;

            // Ghost effect
            if (this.powerups.ghost.active) {
                ctx.globalAlpha = alpha * 0.5;
            }

            ctx.fillStyle = bodyColor;
            ctx.shadowBlur = 20;
            ctx.shadowColor = glowColor;

            ctx.beginPath();
            ctx.arc(segment.x, segment.y, CONFIG.snake.segmentSize, 0, Math.PI * 2);
            ctx.fill();

            // Robot skin - add metal shine
            if (this.skin === 'skinRobot') {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.beginPath();
                ctx.arc(segment.x - 3, segment.y - 3, CONFIG.snake.segmentSize * 0.4, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        }

        // Draw head
        ctx.save();
        ctx.translate(this.head.x, this.head.y);
        ctx.rotate(this.angle);

        if (this.powerups.ghost.active) {
            ctx.globalAlpha = 0.5;
        }

        // Head glow
        ctx.fillStyle = headColor;
        ctx.shadowBlur = 30;
        ctx.shadowColor = this.isDashing ? '#ffffff' : glowColor;

        // Head body
        ctx.beginPath();
        ctx.arc(0, 0, CONFIG.snake.segmentSize + 2, 0, Math.PI * 2);
        ctx.fill();

        // Fire skin - add flame effect
        if (this.skin === 'skinFire') {
            ctx.fillStyle = '#ffff00';
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#ff8c00';
            ctx.beginPath();
            ctx.arc(0, 0, CONFIG.snake.segmentSize * 0.6, 0, Math.PI * 2);
            ctx.fill();
        }

        // Robot skin - add metal shine and details
        if (this.skin === 'skinRobot') {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.beginPath();
            ctx.arc(-2, -2, CONFIG.snake.segmentSize * 0.5, 0, Math.PI * 2);
            ctx.fill();

            // Robot antenna
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, -8);
            ctx.lineTo(0, -12);
            ctx.stroke();
            ctx.fillStyle = '#00ffff';
            ctx.beginPath();
            ctx.arc(0, -12, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        // Eyes
        ctx.fillStyle = this.skin === 'skinFire' ? '#000000' : '#ffffff';
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.arc(5, -4, 2, 0, Math.PI * 2);
        ctx.arc(5, 4, 2, 0, Math.PI * 2);
        ctx.fill();

        // Robot eyes glow
        if (this.skin === 'skinRobot') {
            ctx.fillStyle = '#00ff00';
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#00ff00';
            ctx.beginPath();
            ctx.arc(5, -4, 1.5, 0, Math.PI * 2);
            ctx.arc(5, 4, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    checkSelfCollision() {
        if (this.powerups.ghost.active || this.isInvulnerable) return false;

        for (let i = 10; i < this.segments.length; i++) {
            if (this.head.distance(this.segments[i]) < CONFIG.snake.segmentSize) {
                return true;
            }
        }
        return false;
    }
}

// ==================== FOOD ====================
class Food {
    constructor() {
        this.respawn();
    }

    respawn() {
        this.position = new Vector2(
            randomRange(50, CONFIG.canvas.width - 50),
            randomRange(50, CONFIG.canvas.height - 50)
        );
        this.radius = 8;
    }

    draw(ctx) {
        ctx.save();
        ctx.fillStyle = CONFIG.colors.food;
        ctx.shadowBlur = 20;
        ctx.shadowColor = CONFIG.colors.food;

        // Pulsating effect
        const pulse = Math.sin(Date.now() * 0.005) * 2;
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.radius + pulse, 0, Math.PI * 2);
        ctx.fill();

        // Inner glow
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.radius * 0.4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    checkCollision(snake) {
        return this.position.distance(snake.head) < this.radius + CONFIG.snake.segmentSize;
    }
}

// ==================== POWER-UPS ====================
class PowerUp {
    constructor(type) {
        this.type = type;
        this.position = new Vector2(
            randomRange(50, CONFIG.canvas.width - 50),
            randomRange(50, CONFIG.canvas.height - 50)
        );
        this.radius = 10;
        this.lifetime = 10000; // 10 seconds
        this.icons = {
            ghost: '👻',
            timeWarp: '⏱️',
            magneto: '🧲',
            turret: '🔫',
            cutTail: '💥'
        };
    }

    update(deltaTime) {
        this.lifetime -= deltaTime;
    }

    draw(ctx) {
        ctx.save();
        ctx.fillStyle = CONFIG.colors.powerup;
        ctx.shadowBlur = 25;
        ctx.shadowColor = CONFIG.colors.powerup;

        const pulse = Math.sin(Date.now() * 0.008) * 3;
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.radius + pulse, 0, Math.PI * 2);
        ctx.fill();

        // Draw icon
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.icons[this.type] || '⭐', this.position.x, this.position.y);

        ctx.restore();
    }

    checkCollision(snake) {
        return this.position.distance(snake.head) < this.radius + CONFIG.snake.segmentSize;
    }

    isDead() {
        return this.lifetime <= 0;
    }
}

// ==================== ENEMIES ====================
class Hunter {
    constructor() {
        this.position = new Vector2(
            Math.random() > 0.5 ? -20 : CONFIG.canvas.width + 20,
            randomRange(0, CONFIG.canvas.height)
        );
        this.velocity = new Vector2(0, 0);
        this.speed = 2;
        this.radius = 10;
        this.hp = 1;
    }

    update(deltaTime, snake, timeWarpActive) {
        const speed = timeWarpActive ? this.speed * 0.3 : this.speed;
        const direction = snake.head.subtract(this.position).normalize();
        this.velocity = direction.multiply(speed);
        this.position = this.position.add(this.velocity);
    }

    draw(ctx) {
        ctx.save();
        ctx.fillStyle = CONFIG.colors.enemy;
        ctx.shadowBlur = 15;
        ctx.shadowColor = CONFIG.colors.enemy;

        // Draw triangle
        ctx.translate(this.position.x, this.position.y);
        const angle = Math.atan2(this.velocity.y, this.velocity.x);
        ctx.rotate(angle);

        ctx.beginPath();
        ctx.moveTo(this.radius, 0);
        ctx.lineTo(-this.radius, this.radius);
        ctx.lineTo(-this.radius, -this.radius);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    checkCollision(snake) {
        return this.position.distance(snake.head) < this.radius + CONFIG.snake.segmentSize;
    }

    checkBodyCollision(snake) {
        for (let segment of snake.segments) {
            if (this.position.distance(segment) < this.radius + CONFIG.snake.segmentSize) {
                return true;
            }
        }
        return false;
    }

    isDead() {
        return this.hp <= 0 ||
            this.position.x < -50 || this.position.x > CONFIG.canvas.width + 50 ||
            this.position.y < -50 || this.position.y > CONFIG.canvas.height + 50;
    }
}

class Turret {
    constructor() {
        this.position = new Vector2(
            randomRange(100, CONFIG.canvas.width - 100),
            randomRange(100, CONFIG.canvas.height - 100)
        );
        this.radius = 15;
        this.shootInterval = 2000;
        this.lastShot = 0;
        this.projectiles = [];
    }

    update(deltaTime, snake, timeWarpActive) {
        const interval = timeWarpActive ? this.shootInterval * 2 : this.shootInterval;
        this.lastShot += deltaTime;

        if (this.lastShot >= interval) {
            this.shoot(snake);
            this.lastShot = 0;
        }

        // Update projectiles
        this.projectiles.forEach(proj => {
            const speed = timeWarpActive ? 2 : 5;
            const velocity = Vector2.fromAngle(proj.angle).multiply(speed);
            proj.position = proj.position.add(velocity);
        });

        this.projectiles = this.projectiles.filter(proj =>
            proj.position.x > 0 && proj.position.x < CONFIG.canvas.width &&
            proj.position.y > 0 && proj.position.y < CONFIG.canvas.height
        );
    }

    shoot(snake) {
        const direction = snake.head.subtract(this.position);
        const angle = Math.atan2(direction.y, direction.x);

        this.projectiles.push({
            position: new Vector2(this.position.x, this.position.y),
            angle: angle,
            radius: 4
        });
    }

    draw(ctx) {
        // Draw turret
        ctx.save();
        ctx.fillStyle = CONFIG.colors.turret;
        ctx.shadowBlur = 15;
        ctx.shadowColor = CONFIG.colors.turret;

        ctx.beginPath();
        ctx.rect(
            this.position.x - this.radius,
            this.position.y - this.radius,
            this.radius * 2,
            this.radius * 2
        );
        ctx.fill();

        // Draw projectiles
        this.projectiles.forEach(proj => {
            ctx.fillStyle = '#ffff00';
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#ffff00';
            ctx.beginPath();
            ctx.arc(proj.position.x, proj.position.y, proj.radius, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.restore();
    }

    checkCollision(snake) {
        if (snake.powerups.ghost.active || snake.isInvulnerable) return false;

        for (let proj of this.projectiles) {
            if (proj.position.distance(snake.head) < proj.radius + CONFIG.snake.segmentSize) {
                return true;
            }
        }
        return false;
    }

    isDead() {
        return false; // Turrets never die naturally
    }
}

class Virus {
    constructor() {
        this.position = new Vector2(
            randomRange(50, CONFIG.canvas.width - 50),
            randomRange(50, CONFIG.canvas.height - 50)
        );
        this.radius = 12;
        this.lifetime = 15000; // Virus lasts 15 seconds
    }

    update(deltaTime, snake, timeWarpActive) {
        this.lifetime -= deltaTime;
    }

    draw(ctx) {
        ctx.save();
        ctx.fillStyle = CONFIG.colors.virus;
        ctx.shadowBlur = 20;
        ctx.shadowColor = CONFIG.colors.virus;

        // Pulsating virus
        const pulse = Math.sin(Date.now() * 0.01) * 2;
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.radius + pulse, 0, Math.PI * 2);
        ctx.fill();

        // Draw hazard symbol
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('☣️', this.position.x, this.position.y);

        ctx.restore();
    }

    checkCollision(snake) {
        return this.position.distance(snake.head) < this.radius + CONFIG.snake.segmentSize;
    }

    isDead() {
        return this.lifetime <= 0;
    }
}

// ==================== MAIN GAME ====================
class Game {
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

        this.state = 'menu'; // menu, playing, paused, gameover
        this.score = 0;
        this.level = 1;
        this.coins = 0;
        this.totalCoins = this.loadCoins();
        this.highScore = this.loadHighScore();

        this.snake = null;
        this.food = null;
        this.powerups = [];
        this.enemies = [];
        this.particles = new ParticleSystem();

        this.lastTime = 0;
        this.lastEnemySpawn = 0;
        this.lastPowerupSpawn = 0;

        this.controlsInverted = false;
        this.controlsInvertedTimer = 0;

        this.upgrades = this.loadUpgrades();
        this.currentSkin = this.loadSkin();

        this.setupEventListeners();
        this.updateUI();
        this.showMainMenu();
    }

    setupEventListeners() {
        // Keyboard input
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

    startGame() {
        this.hideAllMenus();
        this.canvas.style.display = 'block';
        document.getElementById('hud').classList.add('active');

        this.state = 'playing';
        this.score = 0;
        this.level = 1;
        this.coins = 0;

        // Apply upgrades and skin
        this.snake = new Snake(
            CONFIG.canvas.width / 2,
            CONFIG.canvas.height / 2,
            this.upgrades,
            this.currentSkin
        );

        this.food = new Food();
        this.powerups = [];
        this.enemies = [];
        this.particles = new ParticleSystem();

        this.lastTime = performance.now();
        this.lastEnemySpawn = 0;
        this.lastPowerupSpawn = 0;

        this.updateUI();
        this.gameLoop(this.lastTime);
    }

    gameLoop(currentTime) {
        if (this.state !== 'playing') return;

        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

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
        if (this.lastPowerupSpawn > 15000 && this.powerups.length < 2) {
            this.spawnPowerup();
            this.lastPowerupSpawn = 0;
        }

        // Update enemies
        this.lastEnemySpawn += deltaTime;
        if (this.lastEnemySpawn > CONFIG.game.enemySpawnInterval / this.level) {
            this.spawnEnemy();
            this.lastEnemySpawn = 0;
        }

        this.enemies.forEach(enemy => {
            enemy.update(effectiveDelta, this.snake, timeWarp);

            // Virus collision - inverts controls
            if (enemy instanceof Virus && enemy.checkCollision(this.snake)) {
                this.controlsInverted = true;
                this.controlsInvertedTimer = 3000;
                enemy.lifetime = 0; // Mark for removal
                this.particles.emit(enemy.position.x, enemy.position.y, CONFIG.colors.virus, 20);
            }

            // Hunter/Turret collision with head
            if ((enemy instanceof Hunter || enemy instanceof Turret) && enemy.checkCollision(this.snake)) {
                if (!this.snake.isInvulnerable && !this.snake.powerups.ghost.active) {
                    this.gameOver();
                }
            }

            // Body collision for hunters
            if (enemy instanceof Hunter && enemy.checkBodyCollision(this.snake)) {
                this.snake.cut(0.2);
                enemy.hp = 0;
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

        // Update UI
        this.updateUI();
    }

    draw() {
        // Clear canvas
        this.ctx.fillStyle = 'rgba(10, 10, 30, 0.3)';
        this.ctx.fillRect(0, 0, CONFIG.canvas.width, CONFIG.canvas.height);

        // Draw grid (subtle)
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

        // Draw game objects
        this.food.draw(this.ctx);
        this.powerups.forEach(p => p.draw(this.ctx));
        this.enemies.forEach(e => e.draw(this.ctx));
        this.snake.draw(this.ctx);
        this.particles.draw(this.ctx);
    }

    eatFood() {
        this.score += CONFIG.game.foodValue;
        this.coins++;
        this.totalCoins++;
        this.snake.grow(2);
        this.food.respawn();
        this.particles.emit(this.food.position.x, this.food.position.y, CONFIG.colors.food, 20);

        // Level up
        if (this.score >= this.level * CONFIG.game.levelUpScore) {
            this.level++;
            this.particles.emit(this.snake.head.x, this.snake.head.y, '#00ff00', 30);
        }

        this.saveCoins();
    }

    collectPowerup(powerup) {
        this.particles.emit(powerup.position.x, powerup.position.y, CONFIG.colors.powerup, 25);

        switch (powerup.type) {
            case 'ghost':
                this.snake.activatePowerup('ghost', 5000);
                break;
            case 'timeWarp':
                this.snake.activatePowerup('timeWarp', 6000);
                break;
            case 'magneto':
                this.snake.activatePowerup('magneto', 8000);
                break;
            case 'turret':
                this.snake.activatePowerup('turret', 10000);
                this.snake.powerups.turret.lastShot = Date.now();
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

        // Find nearest enemy
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
            nearest.hp--;
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

        if (this.score > this.highScore) {
            this.highScore = this.score;
            this.saveHighScore();
        }

        document.getElementById('final-score').textContent = this.score;
        document.getElementById('final-level').textContent = this.level;
        document.getElementById('coins-earned').textContent = this.coins;
        document.getElementById('game-over').classList.add('active');
    }

    pauseGame() {
        // TODO: Implement pause menu
    }

    updateUI() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('level').textContent = this.level;
        document.getElementById('high-score').textContent = this.highScore;
        document.getElementById('total-coins').textContent = this.totalCoins;
        document.getElementById('shop-coins').textContent = this.totalCoins;

        // Update energy bar
        const energyFill = document.getElementById('energy-fill');
        if (energyFill) {
            energyFill.style.width = this.snake ? `${this.snake.dashEnergy}%` : '100%';
        }

        // Update active powerups
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
        this.renderShop();
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
    }

    renderShop() {
        // Render skin selector
        const skinSelector = document.getElementById('skin-selector');
        skinSelector.innerHTML = '';

        const skins = [
            { name: 'Clásica', id: 'default', owned: true, color: '#00ffff' },
            { name: 'Fuego', id: 'skinFire', owned: this.upgrades.skinFire, color: '#ff4500' },
            { name: 'Robótica', id: 'skinRobot', owned: this.upgrades.skinRobot, color: '#c0c0c0' }
        ];

        skins.forEach(skin => {
            if (skin.owned) {
                const div = document.createElement('div');
                const isActive = this.currentSkin === skin.id;
                div.className = 'shop-item' + (isActive ? ' owned' : '');
                div.style.borderColor = skin.color;
                div.innerHTML = `
                    <h3 style="color: ${skin.color}">${skin.name}</h3>
                    <button ${isActive ? 'disabled' : ''} 
                            onclick="game.equipSkin('${skin.id}')">
                        ${isActive ? 'EQUIPADA' : 'EQUIPAR'}
                    </button>
                `;
                skinSelector.appendChild(div);
            }
        });

        // Update active skin name
        const activeSkinName = skins.find(s => s.id === this.currentSkin)?.name || 'Clásica';
        document.getElementById('active-skin-name').textContent = activeSkinName;

        // Render upgrades
        const shopItems = document.getElementById('shop-items');
        shopItems.innerHTML = '';

        const items = [
            { name: 'Dash Recarga +10%', price: 100, upgrade: 'dashRecharge', owned: this.upgrades.dashRecharge, desc: 'Recarga de energía más rápida' },
            { name: 'Velocidad Base +5%', price: 150, upgrade: 'speedBoost', owned: this.upgrades.speedBoost, desc: 'Velocidad permanente aumentada' },
            { name: 'Escudo Inicial', price: 200, upgrade: 'startShield', owned: this.upgrades.startShield, desc: '5 segundos de invulnerabilidad al iniciar' },
            { name: 'Skin: Serpiente de Fuego', price: 300, upgrade: 'skinFire', owned: this.upgrades.skinFire, desc: 'Desbloquea apariencia de fuego' },
            { name: 'Skin: Serpiente Robótica', price: 300, upgrade: 'skinRobot', owned: this.upgrades.skinRobot, desc: 'Desbloquea apariencia robótica' }
        ];

        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'shop-item' + (item.owned ? ' owned' : '');
            div.innerHTML = `
                <h3>${item.name}</h3>
                <p style="font-size: 0.85rem; margin: 0.5rem 0;">${item.desc}</p>
                <p class="price">${item.price} monedas</p>
                <button ${item.owned || this.totalCoins < item.price ? 'disabled' : ''} 
                        onclick="game.buyUpgrade('${item.upgrade}', ${item.price})">
                    ${item.owned ? 'COMPRADO' : 'COMPRAR'}
                </button>
            `;
            shopItems.appendChild(div);
        });
    }

    equipSkin(skinId) {
        this.currentSkin = skinId;
        this.saveSkin();
        this.renderShop();
    }

    buyUpgrade(upgrade, price) {
        if (this.totalCoins >= price && !this.upgrades[upgrade]) {
            this.totalCoins -= price;
            this.upgrades[upgrade] = true;
            this.saveUpgrades();
            this.saveCoins();
            this.renderShop();
            this.updateUI();
        }
    }

    // LocalStorage functions
    saveHighScore() {
        localStorage.setItem('cyberSerpent_highScore', this.highScore.toString());
    }

    loadHighScore() {
        return parseInt(localStorage.getItem('cyberSerpent_highScore') || '0');
    }

    saveCoins() {
        localStorage.setItem('cyberSerpent_coins', this.totalCoins.toString());
    }

    loadCoins() {
        return parseInt(localStorage.getItem('cyberSerpent_coins') || '0');
    }

    saveUpgrades() {
        localStorage.setItem('cyberSerpent_upgrades', JSON.stringify(this.upgrades));
    }

    loadUpgrades() {
        const saved = localStorage.getItem('cyberSerpent_upgrades');
        return saved ? JSON.parse(saved) : {
            dashRecharge: false,
            speedBoost: false,
            startShield: false,
            skinFire: false,
            skinRobot: false
        };
    }

    saveSkin() {
        localStorage.setItem('cyberSerpent_skin', this.currentSkin);
    }

    loadSkin() {
        return localStorage.getItem('cyberSerpent_skin') || 'default';
    }
}

// ==================== INITIALIZE GAME ====================
let game;
window.addEventListener('DOMContentLoaded', () => {
    game = new Game();
});
