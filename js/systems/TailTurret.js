// ==================== TAIL TURRET (power-up) ====================
// While active, the tip of the snake's tail becomes a small cannon that fires on its own
// at the nearest killable enemy (Hunters and Turrets) within CONFIG.gun.range, once per
// CONFIG.gun.fireRate. This module owns the targeting and makes all of it visible:
// the cannon aims (or scans when idle), the range is outlined, the target gets a lock-on
// reticle, a laser sight appears just before each shot, and the shot has a muzzle flash.

import { CONFIG } from '../config.js';
import { ICONS } from '../icons.js';
import { drawGlow } from '../render.js';

const LASER_WINDOW = 0.3;   // fraction of the fire cycle before a shot when the laser shows
const FLASH_MS = 110;
const SCAN_SPEED = 0.035;   // rad per 60fps frame while no target is in range

export class TailTurret {
    constructor() {
        this.target = null;
        this.aimAngle = 0;
        this.firedAt = -Infinity;
    }

    // Killable enemies have hp; Virus and Blindness pickups do not
    findTarget(tail, enemies) {
        let nearest = null;
        let minDist = CONFIG.gun.range;
        enemies.forEach(enemy => {
            if (enemy.hp === undefined || enemy.hp <= 0) return;
            const dist = tail.distance(enemy.position);
            if (dist < minDist) {
                minDist = dist;
                nearest = enemy;
            }
        });
        return nearest;
    }

    update(snake, enemies, frameMultiplier) {
        const tail = snake.segments[snake.segments.length - 1];
        if (!tail || snake.segments.length < 2) {
            this.target = null;
            return;
        }
        this.target = this.findTarget(tail, enemies);

        if (this.target) {
            // Ease the barrel toward the target so it visibly tracks it
            const desired = Math.atan2(this.target.position.y - tail.y, this.target.position.x - tail.x);
            let diff = desired - this.aimAngle;
            diff = Math.atan2(Math.sin(diff), Math.cos(diff));
            this.aimAngle += diff * Math.min(1, 0.3 * frameMultiplier);
        } else {
            this.aimAngle += SCAN_SPEED * frameMultiplier;
        }
    }

    onFire() {
        this.firedAt = performance.now();
    }

    // 0 right after a shot, 1 when the next shot is due
    cycleProgress(lastShot) {
        return Math.min(1, (Date.now() - lastShot) / CONFIG.gun.fireRate);
    }

    // Drawn under the snake: the range the cannon covers
    drawRange(ctx, snake, visibility) {
        const tail = snake.segments[snake.segments.length - 1];
        if (!tail || snake.segments.length < 2) return;
        const color = ICONS.turret.color;

        ctx.save();
        ctx.globalAlpha = (this.target ? 0.22 : 0.12) * visibility;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 10]);
        ctx.lineDashOffset = -Date.now() * 0.02;
        ctx.beginPath();
        ctx.arc(tail.x, tail.y, CONFIG.gun.range, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    // Drawn over the snake: laser sight, lock-on reticle, the cannon and its muzzle flash
    draw(ctx, snake, lastShot, visibility) {
        const tail = snake.segments[snake.segments.length - 1];
        if (!tail || snake.segments.length < 2) return;
        const color = ICONS.turret.color;
        const now = performance.now();
        const progress = this.cycleProgress(lastShot);

        ctx.save();
        ctx.globalAlpha = visibility;

        if (this.target) {
            const tp = this.target.position;

            // Laser sight right before the shot, growing brighter as it is about to fire
            if (progress > 1 - LASER_WINDOW) {
                const charge = (progress - (1 - LASER_WINDOW)) / LASER_WINDOW;
                ctx.strokeStyle = `rgba(125, 200, 255, ${0.25 + charge * 0.6})`;
                ctx.lineWidth = 1 + charge * 1.5;
                ctx.beginPath();
                ctx.moveTo(tail.x + Math.cos(this.aimAngle) * 14, tail.y + Math.sin(this.aimAngle) * 14);
                ctx.lineTo(tp.x, tp.y);
                ctx.stroke();
            }

            // Lock-on reticle: four corner brackets that tighten as the shot charges
            const size = 22 - progress * 6;
            const arm = 6;
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.save();
            ctx.translate(tp.x, tp.y);
            ctx.rotate(Date.now() * 0.002);
            [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([sx, sy]) => {
                ctx.beginPath();
                ctx.moveTo(sx * size, sy * (size - arm));
                ctx.lineTo(sx * size, sy * size);
                ctx.lineTo(sx * (size - arm), sy * size);
                ctx.stroke();
            });
            ctx.restore();
        }

        // Cannon: a small base on the tail and a barrel that recoils when firing
        const sinceFire = now - this.firedAt;
        const recoil = sinceFire < FLASH_MS ? (1 - sinceFire / FLASH_MS) * 5 : 0;
        drawGlow(ctx, tail.x, tail.y, 22, color, 0.35);

        ctx.save();
        ctx.translate(tail.x, tail.y);
        ctx.rotate(this.aimAngle);
        ctx.fillStyle = '#0b1a33';
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.rect(4 - recoil, -3.5, 14, 7);
        ctx.fill();
        ctx.stroke();

        if (sinceFire < FLASH_MS) {
            const f = 1 - sinceFire / FLASH_MS;
            ctx.fillStyle = `rgba(200, 235, 255, ${f})`;
            ctx.beginPath();
            ctx.moveTo(18 - recoil, -6 * f);
            ctx.lineTo(18 - recoil + 14 * f, 0);
            ctx.lineTo(18 - recoil, 6 * f);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();

        ctx.fillStyle = '#0b1a33';
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(tail.x, tail.y, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = `rgba(160, 210, 255, ${0.4 + progress * 0.6})`;
        ctx.beginPath();
        ctx.arc(tail.x, tail.y, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

// Tail-turret projectile: glowing core with a short tracer behind it
export function drawTurretShot(ctx, proj) {
    const color = ICONS.turret.color;
    const tailX = proj.position.x - proj.velocity.x * 2.5;
    const tailY = proj.position.y - proj.velocity.y * 2.5;

    ctx.save();
    const tracer = ctx.createLinearGradient(tailX, tailY, proj.position.x, proj.position.y);
    tracer.addColorStop(0, 'rgba(95, 182, 255, 0)');
    tracer.addColorStop(1, 'rgba(160, 215, 255, 0.9)');
    ctx.strokeStyle = tracer;
    ctx.lineWidth = proj.radius * 1.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(proj.position.x, proj.position.y);
    ctx.stroke();

    drawGlow(ctx, proj.position.x, proj.position.y, proj.radius * 4, color, 0.6);
    ctx.fillStyle = '#e6f4ff';
    ctx.beginPath();
    ctx.arc(proj.position.x, proj.position.y, proj.radius * 1.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

// White flash over an enemy that was just hit
export function drawHitFlash(ctx, enemy) {
    if (!enemy.hitFlashAt) return;
    const since = performance.now() - enemy.hitFlashAt;
    if (since > 140) return;
    ctx.save();
    ctx.globalAlpha = 0.8 * (1 - since / 140);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(enemy.position.x, enemy.position.y, (enemy.radius || 12) + 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}
