import { Vector2 } from '../utils.js';
import { CONFIG } from '../config.js';
import { drawSnake } from '../systems/SnakeRenderer.js';

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

        // Blindness effect
        this.blindness = { active: false, duration: 0 };
    }

    update(deltaTime, input, levelMultiplier) {
        // Frame rate normalization factor (base: 60 FPS = 16.67ms per frame)
        const frameMultiplier = deltaTime / 16.67;

        // Handle rotation (normalized)
        if (input.left) this.angle -= CONFIG.snake.rotationSpeed * frameMultiplier;
        if (input.right) this.angle += CONFIG.snake.rotationSpeed * frameMultiplier;

        // Handle dash
        if (input.dash && this.dashEnergy >= 100 && !this.isDashing) {
            this.startDash();
        }

        // Update dash state (already uses deltaTime correctly)
        if (this.isDashing) {
            this.dashEnergy = Math.max(0, this.dashEnergy - deltaTime * 0.2);
        } else {
            const rechargeRate = this.upgrades.dashRecharge ? 0.033 : 0.03;
            this.dashEnergy = Math.min(100, this.dashEnergy + deltaTime * rechargeRate);
        }

        // Calculate speed
        const currentSpeed = (this.speed + levelMultiplier) *
            (this.isDashing ? CONFIG.snake.dashSpeedMultiplier : 1);

        // Move head (normalized for consistent speed across different refresh rates)
        const direction = Vector2.fromAngle(this.angle);
        const velocity = direction.multiply(currentSpeed * frameMultiplier);
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

        // Update blindness effect
        if (this.blindness.active) {
            this.blindness.duration -= deltaTime;
            if (this.blindness.duration <= 0) {
                this.blindness.active = false;
            }
        }
    }

    draw(ctx) {
        const skinData = CONFIG.skins[this.skin] || CONFIG.skins.default;
        const r = CONFIG.snake.segmentSize;

        drawSnake(ctx, this.segments.length ? this.segments : [this.head], this.angle, skinData, {
            radius: r,
            alpha: this.powerups.ghost.active ? 0.45 : 1,
            boosting: this.isDashing
        });

        // Shield bubble: a translucent sphere with a bright rim
        if ((this.isInvulnerable || this.powerups.shield.active) && !this.isDashing) {
            const pulse = Math.sin(Date.now() * 0.008) * 0.15 + 0.85;
            const bubbleR = (r + 14) * pulse;
            ctx.save();
            const bubble = ctx.createRadialGradient(this.head.x, this.head.y, bubbleR * 0.5, this.head.x, this.head.y, bubbleR);
            bubble.addColorStop(0, 'rgba(61, 255, 168, 0)');
            bubble.addColorStop(0.85, 'rgba(61, 255, 168, 0.18)');
            bubble.addColorStop(1, 'rgba(61, 255, 168, 0.45)');
            ctx.fillStyle = bubble;
            ctx.beginPath();
            ctx.arc(this.head.x, this.head.y, bubbleR, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(160, 255, 210, 0.8)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.restore();
        }
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
