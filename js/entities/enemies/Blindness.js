import { Vector2, randomRange } from '../../utils.js';
import { CONFIG } from '../../config.js';

export class Blindness {
    constructor() {
        this.position = new Vector2(
            randomRange(50, CONFIG.canvas.width - 50),
            randomRange(50, CONFIG.canvas.height - 50)
        );
        this.radius = 12;
        this.lifetime = 15000;  // 15 seconds before it disappears
        this.duration = 5000;   // 5 seconds of blindness effect
    }

    update(deltaTime, snake, timeWarpActive) {
        this.lifetime -= deltaTime;
    }

    draw(ctx) {
        ctx.save();
        // Red-orange warning color for adverse powerups
        ctx.fillStyle = CONFIG.colors.adversePowerup;
        ctx.shadowBlur = 20;
        ctx.shadowColor = CONFIG.colors.adversePowerup;

        const pulse = Math.sin(Date.now() * 0.01) * 2;
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.radius + pulse, 0, Math.PI * 2);
        ctx.fill();

        // Eye icon
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('👁️', this.position.x, this.position.y);

        ctx.restore();
    }

    checkCollision(snake) {
        return this.position.distance(snake.head) < this.radius + CONFIG.snake.segmentSize;
    }

    isDead() {
        return this.lifetime <= 0;
    }
}
