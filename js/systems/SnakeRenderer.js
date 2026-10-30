// ==================== SNAKE RENDERER ====================
// Draws a snake as a chain of overlapping, glossy shaded beads (tail first, head on top),
// with banded colors per skin, a tapered tail, big eyes and a boost glow.
// Shared by the in-game Snake and the inventory/shop previews so skins look identical everywhere.

import { CONFIG } from '../config.js';

const spriteCache = new Map();

function parseHex(hex) {
    const h = hex.replace('#', '');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function shade(hex, amount) {
    // amount > 0 mixes toward white, < 0 toward black
    const [r, g, b] = parseHex(hex);
    const target = amount > 0 ? 255 : 0;
    const t = Math.abs(amount);
    const mix = c => Math.round(c + (target - c) * t);
    return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

function rgba(hex, alpha) {
    const [r, g, b] = parseHex(hex);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// A pre-rendered shaded sphere, cached per color and (integer) radius.
function beadSprite(color, radius) {
    const key = `${color}|${radius}`;
    let sprite = spriteCache.get(key);
    if (sprite) return sprite;

    const pad = 3;
    const size = (radius + pad) * 2;
    sprite = document.createElement('canvas');
    sprite.width = size;
    sprite.height = size;
    const g = sprite.getContext('2d');
    const c = size / 2;

    // Contact shadow so overlapping beads read as separate segments
    const shadow = g.createRadialGradient(c, c + 1.5, radius * 0.6, c, c + 1.5, radius + pad);
    shadow.addColorStop(0, 'rgba(0, 0, 0, 0.45)');
    shadow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    g.fillStyle = shadow;
    g.beginPath();
    g.arc(c, c + 1.5, radius + pad, 0, Math.PI * 2);
    g.fill();

    // Body shading: lit from the top-left
    const body = g.createRadialGradient(c - radius * 0.35, c - radius * 0.4, radius * 0.1, c, c, radius);
    body.addColorStop(0, shade(color, 0.45));
    body.addColorStop(0.45, color);
    body.addColorStop(1, shade(color, -0.45));
    g.fillStyle = body;
    g.beginPath();
    g.arc(c, c, radius, 0, Math.PI * 2);
    g.fill();

    // Specular highlight
    const spec = g.createRadialGradient(c - radius * 0.38, c - radius * 0.42, 0, c - radius * 0.38, c - radius * 0.42, radius * 0.45);
    spec.addColorStop(0, 'rgba(255, 255, 255, 0.55)');
    spec.addColorStop(1, 'rgba(255, 255, 255, 0)');
    g.fillStyle = spec;
    g.beginPath();
    g.arc(c, c, radius, 0, Math.PI * 2);
    g.fill();

    spriteCache.set(key, sprite);
    return sprite;
}

function glowSprite(color, radius) {
    const key = `glow|${color}|${radius}`;
    let sprite = spriteCache.get(key);
    if (sprite) return sprite;

    const size = radius * 2;
    sprite = document.createElement('canvas');
    sprite.width = size;
    sprite.height = size;
    const g = sprite.getContext('2d');
    const grad = g.createRadialGradient(radius, radius, 0, radius, radius, radius);
    grad.addColorStop(0, rgba(color, 0.55));
    grad.addColorStop(0.5, rgba(color, 0.18));
    grad.addColorStop(1, rgba(color, 0));
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);

    spriteCache.set(key, sprite);
    return sprite;
}

function beadColor(ds, skin, index) {
    const bands = ds.bands;
    if (!bands || bands.length === 0) return skin.bodyColor;
    const bandLength = ds.bandLength || 3;
    return bands[Math.floor(index / bandLength) % bands.length];
}

// Radius of bead i: full size along most of the body, tapering over the last stretch
function beadRadius(base, index, count) {
    const taperStart = Math.max(4, Math.floor(count * 0.6));
    if (index < taperStart || count <= taperStart) return base;
    const t = (index - taperStart) / (count - taperStart);
    return base * (1 - t * 0.45);
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {{x:number,y:number}[]} segments  head first
 * @param {number} angle                   heading of the head, radians
 * @param {object} skin                    entry from CONFIG.skins
 * @param {object} [opts]
 * @param {number} [opts.radius]            base bead radius
 * @param {number} [opts.alpha]             overall opacity (ghost mode)
 * @param {boolean} [opts.boosting]         draw the dash glow
 * @param {number} [opts.wrapThreshold]     skip glow links across screen wrap
 */
export function drawSnake(ctx, segments, angle, skin, opts = {}) {
    if (!segments.length) return;
    const ds = skin.drawStyle || {};
    const base = opts.radius || CONFIG.snake.segmentSize;
    const alpha = opts.alpha ?? 1;
    const count = segments.length;
    const time = Date.now();

    ctx.save();
    ctx.globalAlpha = alpha;

    // Boost / ambient glow under the body
    const glowColor = skin.glowColor || skin.bodyColor;
    // Halos overlap heavily, so keep each one faint or additive blending saturates to white
    const glowStrength = opts.boosting ? 0.32 : 0.14;
    ctx.globalCompositeOperation = 'lighter';
    const glowR = Math.round(base * (opts.boosting ? 2.6 : 2));
    const glow = glowSprite(glowColor, glowR);
    const glowStep = opts.boosting ? 2 : 3;
    for (let i = count - 1; i >= 0; i -= glowStep) {
        const s = segments[i];
        // Boosting makes the glow ripple down the body
        const pulse = opts.boosting ? 0.6 + 0.4 * Math.sin(time * 0.02 - i * 0.6) : 1;
        ctx.globalAlpha = alpha * glowStrength * pulse;
        ctx.drawImage(glow, s.x - glowR, s.y - glowR);
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = alpha;

    // Body beads, tail first so the head ends on top
    for (let i = count - 1; i >= 1; i--) {
        const s = segments[i];
        const r = Math.max(3, Math.round(beadRadius(base, i, count)));
        const sprite = beadSprite(beadColor(ds, skin, i), r);
        const half = sprite.width / 2;
        ctx.drawImage(sprite, s.x - half, s.y - half);

        if (ds.body === 'spotted') drawSpot(ctx, ds, s, r, i);
        else if (ds.scalePattern && i % 2 === 0) drawMark(ctx, ds, s, segments[i - 1], r);
    }

    drawHead(ctx, segments[0], angle, skin, base * 1.18, time);
    ctx.restore();
}

// Cow-like patches: deterministic blobs on some beads
function drawSpot(ctx, ds, s, r, i) {
    const hash = (i * 73) % 11;
    if (hash > 4) return;
    const ox = ((hash % 3) - 1) * r * 0.35;
    const oy = (((hash * 5) % 3) - 1) * r * 0.35;
    ctx.fillStyle = ds.spotColor || '#1a1a1a';
    ctx.beginPath();
    ctx.ellipse(s.x + ox, s.y + oy, r * (0.45 + hash * 0.06), r * (0.35 + hash * 0.04), hash, 0, Math.PI * 2);
    ctx.fill();
}

// Small accent mark on the top of a bead, aligned with the body direction
function drawMark(ctx, ds, s, prev, r) {
    const angle = Math.atan2(prev.y - s.y, prev.x - s.x);
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(angle);
    ctx.fillStyle = ds.scaleColor || 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    if (ds.scalePattern === 'diamond') {
        ctx.moveTo(r * 0.45, 0);
        ctx.lineTo(0, -r * 0.3);
        ctx.lineTo(-r * 0.45, 0);
        ctx.lineTo(0, r * 0.3);
        ctx.closePath();
    } else if (ds.scalePattern === 'oval') {
        ctx.ellipse(0, 0, r * 0.4, r * 0.24, 0, 0, Math.PI * 2);
    } else {
        ctx.arc(0, -r * 0.42, r * 0.17, 0, Math.PI * 2);
        ctx.arc(0, r * 0.42, r * 0.17, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.restore();
}

function drawHead(ctx, head, angle, skin, r, time) {
    const ds = skin.drawStyle || {};
    const headR = Math.round(r);

    // Head bead
    const sprite = beadSprite(skin.headColor || skin.bodyColor, headR);
    const half = sprite.width / 2;
    ctx.drawImage(sprite, head.x - half, head.y - half);

    ctx.save();
    ctx.translate(head.x, head.y);
    ctx.rotate(angle);

    if (ds.tongueColor && Math.sin(time * 0.007) > 0.35) {
        drawTongue(ctx, ds.tongueColor, r);
    }
    if (ds.eyeStyle === 'robot') drawRobotAntenna(ctx, ds, r);
    drawEyes(ctx, ds, r, time);

    ctx.restore();
}

function drawTongue(ctx, color, r) {
    const base = r * 0.9;
    const mid = base + r * 0.6;
    const tip = mid + r * 0.35;
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1.5, r * 0.12);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(base, 0);
    ctx.lineTo(mid, 0);
    ctx.lineTo(tip, -r * 0.22);
    ctx.moveTo(mid, 0);
    ctx.lineTo(tip, r * 0.22);
    ctx.stroke();
}

// Big, friendly eyes placed toward the front-sides of the head
function drawEyes(ctx, ds, r, time) {
    const eyeX = r * 0.32;
    const eyeY = r * 0.48;
    const eyeR = r * 0.4;
    // Occasional blink
    const blink = (time % 4200) < 120 ? 0.15 : 1;

    [-eyeY, eyeY].forEach(y => {
        ctx.save();
        ctx.translate(eyeX, y);
        ctx.scale(1, blink);

        if (ds.eyeStyle === 'robot') {
            ctx.fillStyle = '#0b0f14';
            roundRect(ctx, -eyeR * 0.9, -eyeR * 0.75, eyeR * 1.8, eyeR * 1.5, eyeR * 0.35);
            ctx.fill();
            ctx.fillStyle = ds.eyeColor || '#00ff66';
            roundRect(ctx, -eyeR * 0.15, -eyeR * 0.45, eyeR * 0.85, eyeR * 0.9, eyeR * 0.2);
            ctx.fill();
            ctx.restore();
            return;
        }

        if (ds.eyeStyle === 'alien') {
            ctx.rotate(y < 0 ? -0.5 : 0.5);
            ctx.fillStyle = '#0a0a0a';
            ctx.beginPath();
            ctx.ellipse(0, 0, eyeR * 1.25, eyeR * 0.8, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = ds.eyeColor || '#ff0033';
            ctx.beginPath();
            ctx.ellipse(eyeR * 0.3, 0, eyeR * 0.45, eyeR * 0.3, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            return;
        }

        // Sclera
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, eyeR, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Pupil looks forward (toward the heading)
        const px = eyeR * 0.38;
        if (ds.eyeStyle === 'slit') {
            ctx.fillStyle = '#ffcc00';
            ctx.beginPath();
            ctx.arc(px * 0.6, 0, eyeR * 0.7, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = ds.eyeColor || '#000000';
            ctx.beginPath();
            ctx.ellipse(px * 0.7, 0, eyeR * 0.16, eyeR * 0.6, 0, 0, Math.PI * 2);
            ctx.fill();
        } else if (ds.eyeStyle === 'glow') {
            ctx.fillStyle = '#0a0a18';
            ctx.beginPath();
            ctx.arc(0, 0, eyeR, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = ds.eyeColor || '#4466ff';
            ctx.beginPath();
            ctx.arc(px * 0.5, 0, eyeR * 0.55, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
        } else {
            ctx.fillStyle = ds.eyeColor || '#101030';
            ctx.beginPath();
            ctx.arc(px, 0, eyeR * 0.55, 0, Math.PI * 2);
            ctx.fill();
        }

        // Catchlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.beginPath();
        ctx.arc(px * 0.3, -eyeR * 0.3, eyeR * 0.18, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
}

function drawRobotAntenna(ctx, ds, r) {
    const color = ds.antennaColor || '#00ffff';
    ctx.strokeStyle = '#8a9099';
    ctx.lineWidth = Math.max(1.5, r * 0.12);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-r * 0.3, 0);
    ctx.lineTo(-r * 0.9, 0);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(-r * 0.95, 0, r * 0.2, 0, Math.PI * 2);
    ctx.fill();
}

function roundRect(ctx, x, y, w, h, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
}

// A slithering sine-wave body for previews, head at (headX, y) moving right
export function previewSegments(headX, y, count, spacing, amplitude, phase) {
    const segs = [];
    for (let i = 0; i < count; i++) {
        const x = headX - i * spacing;
        segs.push({ x, y: y + Math.sin(phase - i * 0.32) * amplitude * Math.min(1, 0.35 + i / 10) });
    }
    return segs;
}
