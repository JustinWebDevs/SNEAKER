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
        // Frame rate normalization factor (base: 60 FPS = 16.67ms per frame)
        const frameMultiplier = deltaTime / 16.67;

        this.x += this.velocity.x * frameMultiplier;
        this.y += this.velocity.y * frameMultiplier;
        this.lifetime -= deltaTime;
        // Apply friction with normalized decay
        const friction = Math.pow(0.98, frameMultiplier);
        this.velocity = this.velocity.multiply(friction);
    }

    // Called inside ParticleSystem.draw, which sets additive blending once for all particles
    draw(ctx) {
        const life = this.lifetime / this.maxLifetime;
        const size = this.size * (0.4 + life * 0.6);
        ctx.fillStyle = this.color;

        // Soft halo, then a bright core
        ctx.globalAlpha = life * 0.25;
        ctx.beginPath();
        ctx.arc(this.x, this.y, size * 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = life;
        ctx.beginPath();
        ctx.arc(this.x, this.y, size, 0, Math.PI * 2);
        ctx.fill();
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
        if (this.particles.length === 0) return;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        this.particles.forEach(p => p.draw(ctx));
        ctx.restore();
    }
}
