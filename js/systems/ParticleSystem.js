import { Vector2, randomRange } from '../utils.js';

export class Particle {
    constructor(x, y, color, velocity, lifetime) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.velocity = velocity;
        this.lifetime = lifetime;
        this.maxLifetime = lifetime;
        this.size = randomRange(2, 6);
    }

    update(deltaTime) {
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        this.lifetime -= deltaTime;
        this.velocity = this.velocity.multiply(0.98); // Friction
    }

    draw(ctx) {
        const alpha = this.lifetime / this.maxLifetime;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    isDead() {
        return this.lifetime <= 0;
    }
}

export class ParticleSystem {
    constructor() {
        this.particles = [];
    }

    emit(x, y, color, count = 10) {
        for (let i = 0; i < count; i++) {
            const angle = randomRange(0, Math.PI * 2);
            const speed = randomRange(2, 8);
            const velocity = Vector2.fromAngle(angle).multiply(speed);
            const lifetime = randomRange(300, 800);
            this.particles.push(new Particle(x, y, color, velocity, lifetime));
        }
    }

    update(deltaTime) {
        this.particles.forEach(p => p.update(deltaTime));
        this.particles = this.particles.filter(p => !p.isDead());
    }

    draw(ctx) {
        this.particles.forEach(p => p.draw(ctx));
    }
}
