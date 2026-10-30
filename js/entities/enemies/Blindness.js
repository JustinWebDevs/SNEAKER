import { Vector2, randomRange } from '../../utils.js';
import { CONFIG } from '../../config.js';
import { drawHazard } from '../../render.js';

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
        drawHazard(ctx, this.position, this.radius, 'blindness');
    }

    checkCollision(snake) {
        return this.position.distance(snake.head) < this.radius + CONFIG.snake.segmentSize;
    }

    isDead() {
        return this.lifetime <= 0;
    }
}
