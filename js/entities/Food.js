import { Vector2, randomRange } from '../utils.js';
import { CONFIG } from '../config.js';
import { drawGlow } from '../render.js';

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
        const { x, y } = this.position;
        const t = Date.now();
        const pulse = Math.sin(t * 0.005) * 2;
        const color = CONFIG.colors.food;

        ctx.save();
        drawGlow(ctx, x, y, this.radius * 4 + pulse * 2, color, 0.5);

        // Energy core
        const core = ctx.createRadialGradient(x - 2, y - 2, 0, x, y, this.radius + pulse);
        core.addColorStop(0, '#ffffff');
        core.addColorStop(0.45, '#fff6a0');
        core.addColorStop(1, color);
        ctx.fillStyle = core;
        ctx.beginPath();
        ctx.arc(x, y, this.radius + pulse, 0, Math.PI * 2);
        ctx.fill();

        // Two sparks orbiting the core
        ctx.fillStyle = '#fffbe0';
        for (let i = 0; i < 2; i++) {
            const a = t * 0.004 + i * Math.PI;
            ctx.beginPath();
            ctx.arc(x + Math.cos(a) * (this.radius + 8), y + Math.sin(a) * (this.radius + 8) * 0.55, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    checkCollision(snake) {
        const range = (this.radius + CONFIG.snake.segmentSize) * CONFIG.game.foodPickupRangeMultiplier;
        return this.position.distance(snake.head) < range;
    }
}
