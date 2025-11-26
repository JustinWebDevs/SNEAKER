import { Vector2, randomRange } from '../utils.js';
import { CONFIG } from '../config.js';

export class PowerUp {
    constructor(type) {
        this.type = type;
        this.position = new Vector2(
            randomRange(50, CONFIG.canvas.width - 50),
            randomRange(50, CONFIG.canvas.height - 50)
        );
        this.radius = 10;
        this.lifetime = 10000;
        this.icons = {
            ghost: '👻',
            timeWarp: '⏱️',
            magneto: '🧲',
            turret: '🔫',
            cutTail: '💥',
            shield: '🛡️'
        };
    }

    update(deltaTime) {
        this.lifetime -= deltaTime;
    }

    draw(ctx) {
        ctx.save();
        ctx.fillStyle = CONFIG.colors.powerup;
        ctx.shadowBlur = 25;
        ctx.shadowColor = CONFIG.colors.powerup;

        const pulse = Math.sin(Date.now() * 0.008) * 3;
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.radius + pulse, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.icons[this.type] || '⭐', this.position.x, this.position.y);

        ctx.restore();
    }

    checkCollision(snake) {
        return this.position.distance(snake.head) < this.radius + CONFIG.snake.segmentSize;
    }

    isDead() {
        return this.lifetime <= 0;
    }
}
