// ==================== SHARED CANVAS DRAWING HELPERS ====================
// Radial-gradient halos are much cheaper than ctx.shadowBlur and look softer.
import { CONFIG } from './config.js';
import { drawIcon } from './icons.js';

export function hexToRgba(hex, alpha) {
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function drawGlow(ctx, x, y, radius, color, intensity = 0.55) {
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, hexToRgba(color, intensity));
    gradient.addColorStop(0.45, hexToRgba(color, intensity * 0.35));
    gradient.addColorStop(1, hexToRgba(color, 0));
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
}

export function polygonPath(ctx, x, y, radius, sides, rotation = 0) {
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
        const a = rotation + (i / sides) * Math.PI * 2;
        const px = x + Math.cos(a) * radius;
        const py = y + Math.sin(a) * radius;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.closePath();
}

// Adverse pickups (Virus, Blindness): a spinning spiky orb in the warning color with an icon
export function drawHazard(ctx, position, radius, iconName) {
    const { x, y } = position;
    const t = Date.now();
    const color = CONFIG.colors.adversePowerup;
    const pulse = Math.sin(t * 0.01) * 2;

    ctx.save();
    drawGlow(ctx, x, y, radius * 3, color, 0.45);

    spikyPath(ctx, x, y, radius + pulse, radius + 7 + pulse, 9, t * 0.0015);
    ctx.fillStyle = 'rgba(60, 8, 12, 0.9)';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;
    ctx.stroke();

    drawIcon(ctx, iconName, x, y, 20, '#ffd0d8');
    ctx.restore();
}

export function spikyPath(ctx, x, y, inner, outer, spikes, rotation = 0) {
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
        const r = i % 2 === 0 ? outer : inner;
        const a = rotation + (i / (spikes * 2)) * Math.PI * 2;
        const px = x + Math.cos(a) * r;
        const py = y + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.closePath();
}
