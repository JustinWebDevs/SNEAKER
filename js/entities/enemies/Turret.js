import { Vector2, randomRange } from '../../utils.js';
import { CONFIG } from '../../config.js';

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
    }

    update(deltaTime, snake, timeWarpActive) {
        const interval = timeWarpActive ? this.shootInterval * 2 : this.shootInterval;
        this.lastShot += deltaTime;

        if (this.lastShot >= interval) {
            this.shoot(snake);
            this.lastShot = 0;
        }

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
        if (snake.powerups.ghost.active || snake.isInvulnerable || snake.powerups.shield.active) return false;

        for (let proj of this.projectiles) {
            if (proj.position.distance(snake.head) < proj.radius + CONFIG.snake.segmentSize) {
                return true;
            }
        }
        return false;
    }

    isDead() {
        return false;
    }
}
