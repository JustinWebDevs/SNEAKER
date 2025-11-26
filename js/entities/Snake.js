import { Vector2 } from '../utils.js';
import { CONFIG } from '../config.js';

export class Snake {
    constructor(x, y, upgrades = {}, skin = 'default', powerupLevels = {}) {
        this.head = new Vector2(x, y);
        this.segments = [new Vector2(x, y)];
        this.angle = 0;
        this.speed = CONFIG.snake.baseSpeed;
        this.isDashing = false;
        this.isInvulnerable = false;
        this.dashEnergy = 100;
        this.trail = [];
        this.length = 5;
        this.skin = skin;
        this.powerupLevels = powerupLevels;

        // Apply upgrades
        this.upgrades = upgrades;
        if (upgrades.speedBoost) {
            this.speed *= 1.05;
        }

        // Power-ups
        this.powerups = {
            ghost: { active: false, duration: 0 },
            timeWarp: { active: false, duration: 0 },
            magneto: { active: false, duration: 0 },
            turret: { active: false, duration: 0, lastShot: 0 },
            shield: { active: false, duration: 0 }
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
            const rechargeRate = this.upgrades.dashRecharge ? 0.033 : 0.03;
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

        // Update segments
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
        const skinData = CONFIG.skins[this.skin] || CONFIG.skins.default;
        const { bodyColor, glowColor, headColor } = skinData;

        // Shield effect
        if ((this.isInvulnerable || this.powerups.shield.active) && !this.isDashing) {
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

            if (this.powerups.ghost.active) {
                ctx.globalAlpha = alpha * 0.5;
            }

            ctx.fillStyle = bodyColor;
            ctx.shadowBlur = 20;
            ctx.shadowColor = glowColor;

            ctx.beginPath();
            ctx.arc(segment.x, segment.y, CONFIG.snake.segmentSize, 0, Math.PI * 2);
            ctx.fill();

            // Special skin effects
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

        ctx.fillStyle = headColor;
        ctx.shadowBlur = 30;
        ctx.shadowColor = this.isDashing ? '#ffffff' : glowColor;

        ctx.beginPath();
        ctx.arc(0, 0, CONFIG.snake.segmentSize + 2, 0, Math.PI * 2);
        ctx.fill();

        // Skin-specific head details
        if (this.skin === 'skinFire') {
            ctx.fillStyle = '#ffff00';
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#ff8c00';
            ctx.beginPath();
            ctx.arc(0, 0, CONFIG.snake.segmentSize * 0.6, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.skin === 'skinRobot') {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.beginPath();
            ctx.arc(-2, -2, CONFIG.snake.segmentSize * 0.5, 0, Math.PI * 2);
            ctx.fill();

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
        } else if (this.skin === 'skinMercy') {
            // Purple gradient center
            const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, CONFIG.snake.segmentSize);
            gradient.addColorStop(0, '#e0aaff');
            gradient.addColorStop(1, '#c77dff');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(0, 0, CONFIG.snake.segmentSize * 0.7, 0, Math.PI * 2);
            ctx.fill();
        }

        // Eyes
        ctx.fillStyle = this.skin === 'skinFire' ? '#000000' : '#ffffff';
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.arc(5, -4, 2, 0, Math.PI * 2);
        ctx.arc(5, 4, 2, 0, Math.PI * 2);
        ctx.fill();

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
        if (this.powerups.ghost.active || this.isInvulnerable || this.powerups.shield.active) return false;

        for (let i = 10; i < this.segments.length; i++) {
            if (this.head.distance(this.segments[i]) < CONFIG.snake.segmentSize) {
                return true;
            }
        }
        return false;
    }
}
