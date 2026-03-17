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

        // Shield bubble effect
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

        this._drawBody(ctx, skinData);
        this._drawHead(ctx, skinData);
    }

    _drawBody(ctx, skinData) {
        if (this.segments.length < 2) return;
        const ds = skinData.drawStyle || {};
        const ghost = this.powerups.ghost.active;
        const baseAlpha = ghost ? 0.4 : 1.0;
        const r = CONFIG.snake.segmentSize;

        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Outer glow pass
        ctx.globalAlpha = baseAlpha * 0.28;
        ctx.strokeStyle = skinData.glowColor;
        ctx.lineWidth = r * 2 + 10;
        ctx.shadowBlur = 20;
        ctx.shadowColor = skinData.glowColor;
        this._strokeSegments(ctx);

        // Main body pass
        ctx.globalAlpha = baseAlpha;
        ctx.shadowBlur = 10;
        ctx.shadowColor = skinData.glowColor;
        ctx.lineWidth = r * 2;

        if (ds.body === 'gradient' && ds.gradientColors) {
            const head = this.segments[0];
            const tail = this.segments[this.segments.length - 1];
            const grad = ctx.createLinearGradient(head.x, head.y, tail.x, tail.y);
            grad.addColorStop(0, ds.gradientColors[0]);
            grad.addColorStop(1, ds.gradientColors[1]);
            ctx.strokeStyle = grad;
        } else {
            ctx.strokeStyle = skinData.bodyColor;
        }
        this._strokeSegments(ctx);

        // Highlight stripe (thin bright line on top)
        if (ds.highlight) {
            ctx.globalAlpha = baseAlpha;
            ctx.strokeStyle = ds.highlight;
            ctx.lineWidth = r * 0.55;
            ctx.shadowBlur = 0;
            this._strokeSegments(ctx);
        }

        ctx.restore();

        // Pattern overlays
        if (ds.scalePattern) this._drawScales(ctx, skinData, baseAlpha);
        if (ds.body === 'striped') this._drawStripes(ctx, skinData, baseAlpha);
        if (ds.body === 'spotted') this._drawSpots(ctx, skinData, baseAlpha);
    }

    _strokeSegments(ctx) {
        const threshold = CONFIG.snake.segmentSize * 5;
        ctx.beginPath();
        ctx.moveTo(this.segments[0].x, this.segments[0].y);
        for (let i = 1; i < this.segments.length; i++) {
            const prev = this.segments[i - 1];
            const curr = this.segments[i];
            if (Math.abs(curr.x - prev.x) > threshold || Math.abs(curr.y - prev.y) > threshold) {
                ctx.moveTo(curr.x, curr.y);
            } else {
                ctx.lineTo(curr.x, curr.y);
            }
        }
        ctx.stroke();
    }

    _drawScales(ctx, skinData, baseAlpha) {
        const ds = skinData.drawStyle;
        const segs = this.segments;
        if (segs.length < 2) return;
        const threshold = CONFIG.snake.segmentSize * 5;

        ctx.save();
        ctx.globalAlpha = baseAlpha * 0.85;
        ctx.fillStyle = ds.scaleColor || 'rgba(255,255,255,0.2)';
        ctx.shadowBlur = 0;

        for (let i = 0; i < segs.length - 1; i += 3) {
            const seg = segs[i];
            const next = segs[i + 1];
            if (Math.abs(next.x - seg.x) > threshold || Math.abs(next.y - seg.y) > threshold) continue;

            const angle = Math.atan2(next.y - seg.y, next.x - seg.x);
            ctx.save();
            ctx.translate(seg.x, seg.y);
            ctx.rotate(angle);

            if (ds.scalePattern === 'diamond') {
                ctx.beginPath();
                ctx.moveTo(6, 0);
                ctx.lineTo(0, -5);
                ctx.lineTo(-6, 0);
                ctx.lineTo(0, 5);
                ctx.closePath();
                ctx.fill();
            } else if (ds.scalePattern === 'dots') {
                ctx.beginPath();
                ctx.arc(0, -4, 2.5, 0, Math.PI * 2);
                ctx.arc(0, 4, 2.5, 0, Math.PI * 2);
                ctx.fill();
            } else if (ds.scalePattern === 'oval') {
                ctx.beginPath();
                ctx.ellipse(0, 0, 7, 4, 0, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        }
        ctx.restore();
    }

    _drawStripes(ctx, skinData, baseAlpha) {
        const ds = skinData.drawStyle;
        const segs = this.segments;
        const threshold = CONFIG.snake.segmentSize * 5;
        const r = CONFIG.snake.segmentSize;

        ctx.save();
        ctx.globalAlpha = baseAlpha * 0.6;
        ctx.strokeStyle = ds.stripeColor || 'rgba(0,0,0,0.3)';
        ctx.lineWidth = ds.stripeWidth || 3;
        ctx.lineCap = 'round';
        ctx.shadowBlur = 0;

        for (let i = 0; i < segs.length - 1; i += 3) {
            const seg = segs[i];
            const next = segs[i + 1];
            if (Math.abs(next.x - seg.x) > threshold || Math.abs(next.y - seg.y) > threshold) continue;

            const angle = Math.atan2(next.y - seg.y, next.x - seg.x);
            const perp = angle + Math.PI / 2;
            ctx.beginPath();
            ctx.moveTo(seg.x + Math.cos(perp) * r, seg.y + Math.sin(perp) * r);
            ctx.lineTo(seg.x - Math.cos(perp) * r, seg.y - Math.sin(perp) * r);
            ctx.stroke();
        }
        ctx.restore();
    }

    _drawSpots(ctx, skinData, baseAlpha) {
        const ds = skinData.drawStyle;
        const segs = this.segments;
        const threshold = CONFIG.snake.segmentSize * 5;
        const r = CONFIG.snake.segmentSize;

        // Spot layout: [offsetAlongBody, sideOffset (-1=left,+1=right), widthScale, heightScale]
        // Defined as repeating pattern every 14 segments
        const spotPattern = [
            [0,   -0.5,  0.55, 0.38],
            [2,    0.6,  0.45, 0.60],
            [4,   -0.15, 0.65, 0.42],
            [5,    0.4,  0.40, 0.50],
            [7,   -0.6,  0.50, 0.35],
            [9,    0.1,  0.60, 0.45],
            [10,  -0.4,  0.42, 0.55],
            [12,   0.55, 0.52, 0.38],
        ];
        const patternLen = 14;

        ctx.save();
        ctx.globalAlpha = baseAlpha * 0.88;
        ctx.fillStyle = ds.spotColor || '#000000';
        ctx.shadowBlur = 0;

        for (let base = 0; base < segs.length - 2; base += patternLen) {
            for (const [offset, side, sw, sh] of spotPattern) {
                const idx = base + offset;
                if (idx >= segs.length - 1) continue;

                const seg = segs[idx];
                const next = segs[idx + 1];
                if (Math.abs(next.x - seg.x) > threshold || Math.abs(next.y - seg.y) > threshold) continue;

                const angle = Math.atan2(next.y - seg.y, next.x - seg.x);
                const perp = angle + Math.PI / 2;

                ctx.save();
                ctx.translate(
                    seg.x + Math.cos(perp) * side * r,
                    seg.y + Math.sin(perp) * side * r
                );
                ctx.rotate(angle + (((base + offset) % 3) - 1) * 0.3);
                ctx.beginPath();
                ctx.ellipse(0, 0, r * sw, r * sh, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }
        ctx.restore();
    }

    _drawHead(ctx, skinData) {
        const ds = skinData.drawStyle || {};
        const ghost = this.powerups.ghost.active;
        const r = CONFIG.snake.segmentSize + 2;

        ctx.save();
        ctx.translate(this.head.x, this.head.y);
        ctx.rotate(this.angle);
        if (ghost) ctx.globalAlpha = 0.5;

        // Glow
        ctx.shadowBlur = 30;
        ctx.shadowColor = this.isDashing ? '#ffffff' : skinData.glowColor;
        ctx.fillStyle = skinData.headColor;

        // Head shape
        if (ds.headShape === 'pointed') {
            ctx.beginPath();
            ctx.ellipse(3, 0, r + 4, r - 2, 0, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.fill();
        }

        // Inner gradient highlight on head
        if (ds.body === 'gradient' && ds.gradientColors) {
            const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 0, 0, 0, r);
            grad.addColorStop(0, ds.gradientColors[0] + 'cc');
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.shadowBlur = 0;
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.fill();
        }

        // Tongue (flicks in and out)
        const tongueOut = Math.sin(Date.now() * 0.007) > 0.1;
        if (ds.tongueColor && tongueOut) {
            this._drawTongue(ctx, ds.tongueColor, r);
        }

        // Eyes
        this._drawEyes(ctx, ds, r);

        // Robot antenna (drawn last, on top)
        if (ds.eyeStyle === 'robot') {
            this._drawRobotAntenna(ctx, ds, r);
        }

        ctx.restore();
    }

    _drawTongue(ctx, color, headR) {
        const base = headR + 1;
        const mid = base + 7;
        const tip = mid + 5;

        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 4;
        ctx.shadowColor = color;
        ctx.lineCap = 'round';
        // Stem
        ctx.beginPath();
        ctx.moveTo(base, 0);
        ctx.lineTo(mid, 0);
        ctx.stroke();
        // Fork
        ctx.beginPath();
        ctx.moveTo(mid, 0);
        ctx.lineTo(tip, -3);
        ctx.moveTo(mid, 0);
        ctx.lineTo(tip, 3);
        ctx.stroke();
        ctx.restore();
    }

    _drawEyes(ctx, ds, headR) {
        const eyeX = headR * 0.35;
        const eyeY = headR * 0.38;
        const eyeR = headR * 0.22;

        if (ds.eyeStyle === 'robot') {
            ctx.fillStyle = ds.eyeColor || '#00ff00';
            ctx.shadowColor = ds.eyeColor || '#00ff00';
            ctx.shadowBlur = 12;
            [-eyeY, eyeY].forEach(y => {
                ctx.fillRect(eyeX - 2.5, y - 2.5, 5, 5);
            });
            return;
        }

        if (ds.eyeStyle === 'alien') {
            ctx.fillStyle = '#ff0000';
            ctx.shadowColor = '#ff0000';
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.ellipse(eyeX, -eyeY, eyeR * 1.6, eyeR * 0.9, 0, 0, Math.PI * 2);
            ctx.ellipse(eyeX, eyeY, eyeR * 1.6, eyeR * 0.9, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#000000';
            ctx.shadowBlur = 0;
            ctx.beginPath();
            ctx.arc(eyeX + 3, -eyeY, eyeR * 0.5, 0, Math.PI * 2);
            ctx.arc(eyeX + 3, eyeY, eyeR * 0.5, 0, Math.PI * 2);
            ctx.fill();
            return;
        }

        // White sclera
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(eyeX, -eyeY, eyeR, 0, Math.PI * 2);
        ctx.arc(eyeX, eyeY, eyeR, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;

        if (ds.eyeStyle === 'slit') {
            ctx.fillStyle = ds.eyeColor || '#000000';
            [-eyeY, eyeY].forEach(y => {
                ctx.save();
                ctx.translate(eyeX, y);
                ctx.beginPath();
                ctx.ellipse(0, 0, eyeR * 0.22, eyeR * 0.85, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            });
        } else if (ds.eyeStyle === 'glow') {
            ctx.fillStyle = ds.eyeColor || '#4466ff';
            ctx.shadowColor = ds.eyeColor || '#4466ff';
            ctx.shadowBlur = 14;
            ctx.beginPath();
            ctx.arc(eyeX, -eyeY, eyeR * 0.75, 0, Math.PI * 2);
            ctx.arc(eyeX, eyeY, eyeR * 0.75, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // round pupil
            ctx.fillStyle = ds.eyeColor || '#000000';
            ctx.beginPath();
            ctx.arc(eyeX + eyeR * 0.2, -eyeY, eyeR * 0.52, 0, Math.PI * 2);
            ctx.arc(eyeX + eyeR * 0.2, eyeY, eyeR * 0.52, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    _drawRobotAntenna(ctx, ds, headR) {
        const color = ds.antennaColor || '#00ffff';
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, -headR);
        ctx.lineTo(0, -headR - 9);
        ctx.stroke();
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, -headR - 9, 2.5, 0, Math.PI * 2);
        ctx.fill();
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
