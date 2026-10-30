import { Vector2 } from '../utils.js';
import { CONFIG } from '../config.js';
import { drawSnake } from '../systems/SnakeRenderer.js';
import { ICONS } from '../icons.js';
import { expiryBlink, EXPIRY_WARNING_MS } from '../render.js';

// Inner to outer order of the timer rings around the head
const RING_ORDER = ['ghost', 'shield', 'timeWarp', 'magneto', 'turret'];

// Shield crack polylines as [angle, distance from center as a fraction of the radius]
const SHIELD_CRACKS = [
    [[-2.4, 1], [-2.2, 0.7], [-2.5, 0.45], [-2.1, 0.2]],
    [[0.5, 1], [0.7, 0.72], [0.4, 0.5], [0.75, 0.3]],
    [[2.0, 1], [1.8, 0.75], [2.1, 0.55]]
];

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
            this.powerups[type].total = duration;  // for the timer ring around the head
        }
    }

    // 1 while the power-up is comfortably active; blinks between 1 and a dim value
    // during its last seconds so the player sees it is about to end.
    effectVisibility(type, dim = 0.2) {
        return expiryBlink(this.powerups[type].duration, dim);
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

        // Ghost: see-through; in its last seconds it flickers solid, warning that collisions are coming back
        let alpha = 1;
        if (this.powerups.ghost.active) {
            alpha = this.effectVisibility('ghost', 0) === 1 ? 0.45 : 1;
        }

        drawSnake(ctx, this.segments.length ? this.segments : [this.head], this.angle, skinData, {
            radius: r,
            alpha,
            boosting: this.isDashing
        });

        this.drawShieldBubble(ctx, r);
        this.drawEffectRings(ctx, r);
    }

    // Shield bubble: a translucent sphere with a bright rim; it flickers and cracks before it ends
    drawShieldBubble(ctx, r) {
        const shield = this.powerups.shield;
        if (!(this.isInvulnerable || shield.active) || this.isDashing) return;

        const fromDashOnly = !shield.active;
        const visibility = fromDashOnly ? 1 : this.effectVisibility('shield', 0.25);
        const expiring = !fromDashOnly && shield.duration < EXPIRY_WARNING_MS;
        const pulse = Math.sin(Date.now() * 0.008) * 0.15 + 0.85;
        const bubbleR = (r + 14) * pulse;
        const { x, y } = this.head;

        ctx.save();
        ctx.globalAlpha = visibility;
        const bubble = ctx.createRadialGradient(x, y, bubbleR * 0.5, x, y, bubbleR);
        bubble.addColorStop(0, 'rgba(61, 255, 168, 0)');
        bubble.addColorStop(0.85, 'rgba(61, 255, 168, 0.18)');
        bubble.addColorStop(1, 'rgba(61, 255, 168, 0.45)');
        ctx.fillStyle = bubble;
        ctx.beginPath();
        ctx.arc(x, y, bubbleR, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(160, 255, 210, 0.8)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        if (expiring) {
            // Fixed jagged cracks across the bubble
            ctx.strokeStyle = 'rgba(220, 255, 240, 0.9)';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            SHIELD_CRACKS.forEach(crack => {
                crack.forEach(([a, d], i) => {
                    const px = x + Math.cos(a) * bubbleR * d;
                    const py = y + Math.sin(a) * bubbleR * d;
                    if (i === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                });
            });
            ctx.stroke();
        }
        ctx.restore();
    }

    // One thin arc per active power-up around the head, in its color, emptying like a clock.
    // Arcs blink faster and faster during the last seconds.
    drawEffectRings(ctx, r) {
        const active = RING_ORDER.filter(type => this.powerups[type].active);
        if (active.length === 0) return;

        const { x, y } = this.head;
        ctx.save();
        ctx.lineCap = 'round';
        active.forEach((type, i) => {
            const p = this.powerups[type];
            const fraction = Math.max(0, Math.min(1, p.duration / (p.total || p.duration)));
            const ringR = r + 12 + i * 6;
            const color = ICONS[type].color;

            // Faint full track, then the remaining time on top
            ctx.globalAlpha = 0.18;
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(x, y, ringR, 0, Math.PI * 2);
            ctx.stroke();

            ctx.globalAlpha = this.effectVisibility(type);
            ctx.beginPath();
            ctx.arc(x, y, ringR, -Math.PI / 2, -Math.PI / 2 + fraction * Math.PI * 2);
            ctx.stroke();
        });
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
