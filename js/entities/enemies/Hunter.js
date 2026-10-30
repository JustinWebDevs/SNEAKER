import { Vector2, randomRange } from '../../utils.js';
import { CONFIG } from '../../config.js';
import { drawGlow } from '../../render.js';

export class Hunter {
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
        // Frame rate normalization factor (base: 60 FPS = 16.67ms per frame)
        const frameMultiplier = deltaTime / 16.67;

        const speed = timeWarpActive ? this.speed * 0.3 : this.speed;
        const direction = snake.head.subtract(this.position).normalize();
        this.velocity = direction.multiply(speed * frameMultiplier);
        this.position = this.position.add(this.velocity);
    }

    draw(ctx) {
        const color = CONFIG.colors.enemy;
        const r = this.radius;

        ctx.save();
        drawGlow(ctx, this.position.x, this.position.y, r * 3, color, 0.4);

        ctx.translate(this.position.x, this.position.y);
        const angle = Math.atan2(this.velocity.y, this.velocity.x);
        ctx.rotate(angle);

        // Exhaust flicker
        ctx.fillStyle = 'rgba(255, 140, 60, 0.8)';
        ctx.beginPath();
        ctx.moveTo(-r * 0.6, -r * 0.35);
        ctx.lineTo(-r * (1.3 + Math.random() * 0.6), 0);
        ctx.lineTo(-r * 0.6, r * 0.35);
        ctx.closePath();
        ctx.fill();

        // Arrowhead hull with a notched tail
        ctx.beginPath();
        ctx.moveTo(r * 1.2, 0);
        ctx.lineTo(-r, r);
        ctx.lineTo(-r * 0.45, 0);
        ctx.lineTo(-r, -r);
        ctx.closePath();
        ctx.fillStyle = '#2a0610';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.strokeStyle = color;
        ctx.stroke();

        // Eye slit
        ctx.fillStyle = '#ffd0d0';
        ctx.fillRect(r * 0.15, -1.5, r * 0.45, 3);

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
