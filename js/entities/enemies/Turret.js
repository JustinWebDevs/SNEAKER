import { Vector2, randomRange } from '../../utils.js';
import { CONFIG } from '../../config.js';
import { drawGlow, polygonPath } from '../../render.js';

export class Turret {
    constructor() {
        this.position = new Vector2(
            randomRange(100, CONFIG.canvas.width - 100),
            randomRange(100, CONFIG.canvas.height - 100)
        );
        this.radius = 15;
        this.shootInterval = 2000;
        this.lastShot = 0;
        this.projectiles = [];
        this.hp = 3;  // Turrets have 3 HP
        this.aimAngle = -Math.PI / 2;  // Visual only: barrel direction of the last shot
    }

    update(deltaTime, snake, timeWarpActive) {
        const interval = timeWarpActive ? this.shootInterval * 2 : this.shootInterval;
        this.lastShot += deltaTime;

        if (this.lastShot >= interval) {
            this.shoot(snake);
            this.lastShot = 0;
        }

        // Frame rate normalization factor (base: 60 FPS = 16.67ms per frame)
        const frameMultiplier = deltaTime / 16.67;

        this.projectiles.forEach(proj => {
            const speed = timeWarpActive ? 2 : 5;
            const velocity = Vector2.fromAngle(proj.angle).multiply(speed * frameMultiplier);
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
        this.aimAngle = angle;

        this.projectiles.push({
            position: new Vector2(this.position.x, this.position.y),
            angle: angle,
            radius: 4
        });
    }

    draw(ctx) {
        const color = CONFIG.colors.turret;
        const { x, y } = this.position;
        const r = this.radius;
        const t = Date.now();
        // Charge-up: the core brightens as the next shot approaches
        const charge = Math.min(this.lastShot / this.shootInterval, 1);

        ctx.save();
        drawGlow(ctx, x, y, r * 2.8, color, 0.3 + charge * 0.3);

        // Rotating dashed outer ring
        ctx.setLineDash([6, 5]);
        ctx.lineDashOffset = t * 0.02;
        ctx.strokeStyle = 'rgba(255, 170, 80, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, y, r + 7, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Octagonal armored body
        polygonPath(ctx, x, y, r, 8, Math.PI / 8);
        ctx.fillStyle = '#2b1404';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = color;
        ctx.stroke();

        // Barrel aimed where it last fired
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(this.aimAngle);
        ctx.fillStyle = color;
        ctx.fillRect(0, -3, r + 6, 6);
        ctx.restore();

        // Core
        ctx.fillStyle = `rgba(255, ${Math.round(200 + charge * 55)}, ${Math.round(120 + charge * 120)}, 1)`;
        ctx.beginPath();
        ctx.arc(x, y, r * 0.35 + charge * 2, 0, Math.PI * 2);
        ctx.fill();

        this.projectiles.forEach(proj => {
            const px = proj.position.x;
            const py = proj.position.y;
            drawGlow(ctx, px, py, proj.radius * 3.5, color, 0.6);
            ctx.fillStyle = '#ffe2c0';
            ctx.beginPath();
            ctx.arc(px, py, proj.radius * 0.8, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.restore();
    }

    checkCollision(snake) {
        if (snake.powerups.ghost.active || snake.isInvulnerable || snake.powerups.shield.active) return false;

        for (let proj of this.projectiles) {
            if (proj.position.distance(snake.head) < proj.radius + CONFIG.snake.segmentSize) {
                return true;
            }
        }
        return false;
    }

    // Check if snake body collides with turret (turret is solid unless ghost mode)
    checkBodyCollision(snake) {
        if (snake.powerups.ghost.active) return false;  // Can pass through in ghost mode
        if (snake.isInvulnerable || snake.powerups.shield.active) return false;

        return this.position.distance(snake.head) < this.radius + CONFIG.snake.segmentSize;
    }

    isDead() {
        return this.hp <= 0;
    }
}
