import { Vector2, randomRange } from '../../utils.js';
import { CONFIG } from '../../config.js';

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
        const speed = timeWarpActive ? this.speed * 0.3 : this.speed;
        const direction = snake.head.subtract(this.position).normalize();
        this.velocity = direction.multiply(speed);
        this.position = this.position.add(this.velocity);
    }

    draw(ctx) {
        ctx.save();
        ctx.fillStyle = CONFIG.colors.enemy;
        ctx.shadowBlur = 15;
        ctx.shadowColor = CONFIG.colors.enemy;

        ctx.translate(this.position.x, this.position.y);
        const angle = Math.atan2(this.velocity.y, this.velocity.x);
        ctx.rotate(angle);

        ctx.beginPath();
        ctx.moveTo(this.radius, 0);
        ctx.lineTo(-this.radius, this.radius);
        ctx.lineTo(-this.radius, -this.radius);
        ctx.closePath();
        ctx.fill();

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
