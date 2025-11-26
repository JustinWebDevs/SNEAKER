import { Vector2, randomRange } from '../utils.js';
import { CONFIG } from '../config.js';

export class Food {
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

        const pulse = Math.sin(Date.now() * 0.005) * 2;
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.radius + pulse, 0, Math.PI * 2);
        ctx.fill();

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
