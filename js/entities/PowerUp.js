import { Vector2, randomRange } from '../utils.js';
import { CONFIG } from '../config.js';
import { drawGlow, polygonPath, hexToRgba } from '../render.js';
import { ICONS, drawIcon } from '../icons.js';

export class PowerUp {
    constructor(type) {
        this.type = type;
        this.position = new Vector2(
            randomRange(50, CONFIG.canvas.width - 50),
            randomRange(50, CONFIG.canvas.height - 50)
        );
        this.radius = 10;
        this.lifetime = 10000;
        this.maxLifetime = this.lifetime;
    }

    update(deltaTime) {
        this.lifetime -= deltaTime;
    }

    draw(ctx) {
        const { x, y } = this.position;
        const t = Date.now();
        const color = ICONS[this.type]?.color || CONFIG.colors.powerup;
        const bob = Math.sin(t * 0.004) * 2;
        const size = this.radius + 9;

        // Blink during the last two seconds so the player knows it is about to vanish
        if (this.lifetime < 2000 && Math.floor(t / 120) % 2 === 0) return;

        ctx.save();
        drawGlow(ctx, x, y + bob, size * 2.4, color, 0.4);

        // Hexagon badge: dark tinted core, bright rim, slow rotation
        polygonPath(ctx, x, y + bob, size, 6, t * 0.0008);
        const fill = ctx.createRadialGradient(x, y + bob - size * 0.4, 0, x, y + bob, size);
        fill.addColorStop(0, hexToRgba(color, 0.35));
        fill.addColorStop(1, 'rgba(10, 8, 26, 0.92)');
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = color;
        ctx.stroke();

        // Remaining-lifetime ring
        ctx.beginPath();
        ctx.arc(x, y + bob, size + 6, -Math.PI / 2, -Math.PI / 2 + (this.lifetime / this.maxLifetime) * Math.PI * 2);
        ctx.strokeStyle = hexToRgba(color, 0.75);
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.stroke();

        drawIcon(ctx, this.type, x, y + bob, 23, '#ffffff');
        ctx.restore();
    }

    checkCollision(snake) {
        const range = (this.radius + CONFIG.snake.segmentSize) * CONFIG.game.pickupRangeMultiplier;
        return this.position.distance(snake.head) < range;
    }

    isDead() {
        return this.lifetime <= 0;
    }
}
