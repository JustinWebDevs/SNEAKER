import { CONFIG } from '../config.js';
import { Vector2 } from '../utils.js';

export class SkinSystem {
    constructor(progressionSystem) {
        this.progressionSystem = progressionSystem;
        this.currentSkin = this.loadCurrentSkin();
        this.previewCanvas = null;
        this.previewCtx = null;
        this.previewAngle = 0;
    }

    loadCurrentSkin() {
        return localStorage.getItem('cyberSerpent_skin') || 'default';
    }

    saveCurrentSkin() {
        localStorage.setItem('cyberSerpent_skin', this.currentSkin);
    }

    equipSkin(skinId) {
        if (this.progressionSystem.isSkinUnlocked(skinId)) {
            this.currentSkin = skinId;
            this.saveCurrentSkin();
            return true;
        }
        return false;
    }

    initializePreview(canvasId) {
        this.previewCanvas = document.getElementById(canvasId);
        if (this.previewCanvas) {
            this.previewCtx = this.previewCanvas.getContext('2d');
        }
    }

    drawPreview(skinId) {
        if (!this.previewCtx) return;

        const ctx = this.previewCtx;
        const canvas = this.previewCanvas;
        const skinData = CONFIG.skins[skinId] || CONFIG.skins.default;
        const ds = skinData.drawStyle || {};

        ctx.fillStyle = 'rgba(10, 10, 30, 0.9)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        this.previewAngle += 0.02;

        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const r = 15;
        const segCount = 8;

        // Build fake segments array (spiral curve)
        const segs = [];
        for (let i = 0; i < segCount; i++) {
            const a = this.previewAngle + i * 0.38;
            const dist = i * 18;
            segs.push({ x: cx + Math.cos(a) * dist, y: cy + Math.sin(a) * dist });
        }

        // Body glow pass
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.globalAlpha = 0.28;
        ctx.strokeStyle = skinData.glowColor;
        ctx.lineWidth = r * 2 + 10;
        ctx.shadowBlur = 20;
        ctx.shadowColor = skinData.glowColor;
        this._previewStrokePath(ctx, segs);

        // Main body
        ctx.globalAlpha = 1.0;
        ctx.lineWidth = r * 2;
        ctx.shadowBlur = 10;
        ctx.shadowColor = skinData.glowColor;

        if (ds.body === 'gradient' && ds.gradientColors) {
            const grad = ctx.createLinearGradient(segs[0].x, segs[0].y, segs[segCount-1].x, segs[segCount-1].y);
            grad.addColorStop(0, ds.gradientColors[0]);
            grad.addColorStop(1, ds.gradientColors[1]);
            ctx.strokeStyle = grad;
        } else {
            ctx.strokeStyle = skinData.bodyColor;
        }
        this._previewStrokePath(ctx, segs);

        // Highlight stripe
        if (ds.highlight) {
            ctx.strokeStyle = ds.highlight;
            ctx.lineWidth = r * 0.55;
            ctx.shadowBlur = 0;
            this._previewStrokePath(ctx, segs);
        }
        ctx.restore();

        // Scale/stripe/spot patterns on body
        ctx.save();
        if (ds.scalePattern) {
            ctx.fillStyle = ds.scaleColor || 'rgba(255,255,255,0.2)';
            ctx.shadowBlur = 0;
            for (let i = 0; i < segs.length - 1; i += 2) {
                const seg = segs[i];
                const next = segs[i + 1];
                const angle = Math.atan2(next.y - seg.y, next.x - seg.x);
                ctx.save();
                ctx.translate(seg.x, seg.y);
                ctx.rotate(angle);
                if (ds.scalePattern === 'diamond') {
                    ctx.beginPath();
                    ctx.moveTo(6, 0); ctx.lineTo(0, -5); ctx.lineTo(-6, 0); ctx.lineTo(0, 5);
                    ctx.closePath(); ctx.fill();
                } else if (ds.scalePattern === 'dots') {
                    ctx.beginPath();
                    ctx.arc(0, -4, 2.5, 0, Math.PI * 2);
                    ctx.arc(0, 4, 2.5, 0, Math.PI * 2);
                    ctx.fill();
                } else if (ds.scalePattern === 'oval') {
                    ctx.beginPath();
                    ctx.ellipse(0, 0, 7, 4, 0, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
            }
        }
        if (ds.body === 'striped') {
            ctx.strokeStyle = ds.stripeColor || 'rgba(0,0,0,0.3)';
            ctx.lineWidth = ds.stripeWidth || 3;
            ctx.lineCap = 'round';
            ctx.shadowBlur = 0;
            for (let i = 0; i < segs.length - 1; i += 3) {
                const seg = segs[i];
                const next = segs[i + 1];
                const angle = Math.atan2(next.y - seg.y, next.x - seg.x);
                const perp = angle + Math.PI / 2;
                ctx.beginPath();
                ctx.moveTo(seg.x + Math.cos(perp) * r, seg.y + Math.sin(perp) * r);
                ctx.lineTo(seg.x - Math.cos(perp) * r, seg.y - Math.sin(perp) * r);
                ctx.stroke();
            }
        }
        if (ds.body === 'spotted') {
            ctx.fillStyle = ds.spotColor || '#000000';
            ctx.shadowBlur = 0;
            const spotPattern = [
                [0,   -0.5,  0.55, 0.38],
                [2,    0.6,  0.45, 0.60],
                [4,   -0.15, 0.65, 0.42],
                [5,    0.4,  0.40, 0.50],
                [7,   -0.6,  0.50, 0.35],
            ];
            const patternLen = 7;
            for (let base = 0; base < segs.length - 2; base += patternLen) {
                for (const [offset, side, sw, sh] of spotPattern) {
                    const idx = base + offset;
                    if (idx >= segs.length - 1) continue;
                    const seg = segs[idx];
                    const next = segs[idx + 1];
                    const angle = Math.atan2(next.y - seg.y, next.x - seg.x);
                    const perp = angle + Math.PI / 2;
                    ctx.save();
                    ctx.translate(seg.x + Math.cos(perp) * side * r, seg.y + Math.sin(perp) * side * r);
                    ctx.rotate(angle + (((base + offset) % 3) - 1) * 0.3);
                    ctx.beginPath();
                    ctx.ellipse(0, 0, r * sw, r * sh, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
            }
        }
        ctx.restore();

        // Head
        const headAngle = this.previewAngle - Math.PI; // facing direction
        ctx.save();
        ctx.translate(segs[0].x, segs[0].y);
        ctx.rotate(headAngle);

        ctx.shadowBlur = 28;
        ctx.shadowColor = skinData.glowColor;
        ctx.fillStyle = skinData.headColor;

        if (ds.headShape === 'pointed') {
            ctx.beginPath();
            ctx.ellipse(3, 0, r + 4, r - 2, 0, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.fill();
        }

        if (ds.body === 'gradient' && ds.gradientColors) {
            const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 0, 0, 0, r);
            grad.addColorStop(0, ds.gradientColors[0] + 'cc');
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.shadowBlur = 0;
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.fill();
        }

        // Tongue
        const tongueOut = Math.sin(Date.now() * 0.007) > 0.1;
        if (ds.tongueColor && tongueOut) {
            ctx.strokeStyle = ds.tongueColor;
            ctx.lineWidth = 1.5;
            ctx.lineCap = 'round';
            ctx.shadowBlur = 4;
            ctx.shadowColor = ds.tongueColor;
            ctx.beginPath();
            ctx.moveTo(r + 1, 0);
            ctx.lineTo(r + 8, 0);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(r + 8, 0);
            ctx.lineTo(r + 13, -3);
            ctx.moveTo(r + 8, 0);
            ctx.lineTo(r + 13, 3);
            ctx.stroke();
        }

        // Eyes
        const eyeX = r * 0.35;
        const eyeY = r * 0.38;
        const eyeR = r * 0.22;

        if (ds.eyeStyle === 'robot') {
            ctx.fillStyle = ds.eyeColor || '#00ff00';
            ctx.shadowColor = ds.eyeColor || '#00ff00';
            ctx.shadowBlur = 12;
            ctx.fillRect(eyeX - 2.5, -eyeY - 2.5, 5, 5);
            ctx.fillRect(eyeX - 2.5, eyeY - 2.5, 5, 5);
            ctx.strokeStyle = ds.antennaColor || '#00ffff';
            ctx.lineWidth = 2;
            ctx.shadowColor = ds.antennaColor || '#00ffff';
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(0, -r);
            ctx.lineTo(0, -r - 9);
            ctx.stroke();
            ctx.fillStyle = ds.antennaColor || '#00ffff';
            ctx.beginPath();
            ctx.arc(0, -r - 9, 2.5, 0, Math.PI * 2);
            ctx.fill();
        } else if (ds.eyeStyle === 'alien') {
            ctx.fillStyle = '#ff0000';
            ctx.shadowColor = '#ff0000';
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.ellipse(eyeX, -eyeY, eyeR * 1.6, eyeR * 0.9, 0, 0, Math.PI * 2);
            ctx.ellipse(eyeX, eyeY, eyeR * 1.6, eyeR * 0.9, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#000000';
            ctx.shadowBlur = 0;
            ctx.beginPath();
            ctx.arc(eyeX + 3, -eyeY, eyeR * 0.5, 0, Math.PI * 2);
            ctx.arc(eyeX + 3, eyeY, eyeR * 0.5, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = '#ffffff';
            ctx.shadowBlur = 4;
            ctx.beginPath();
            ctx.arc(eyeX, -eyeY, eyeR, 0, Math.PI * 2);
            ctx.arc(eyeX, eyeY, eyeR, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            if (ds.eyeStyle === 'slit') {
                ctx.fillStyle = ds.eyeColor || '#000000';
                [-eyeY, eyeY].forEach(y => {
                    ctx.save();
                    ctx.translate(eyeX, y);
                    ctx.beginPath();
                    ctx.ellipse(0, 0, eyeR * 0.22, eyeR * 0.85, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                });
            } else if (ds.eyeStyle === 'glow') {
                ctx.fillStyle = ds.eyeColor || '#4466ff';
                ctx.shadowColor = ds.eyeColor || '#4466ff';
                ctx.shadowBlur = 14;
                ctx.beginPath();
                ctx.arc(eyeX, -eyeY, eyeR * 0.75, 0, Math.PI * 2);
                ctx.arc(eyeX, eyeY, eyeR * 0.75, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.fillStyle = ds.eyeColor || '#000000';
                ctx.beginPath();
                ctx.arc(eyeX + eyeR * 0.2, -eyeY, eyeR * 0.52, 0, Math.PI * 2);
                ctx.arc(eyeX + eyeR * 0.2, eyeY, eyeR * 0.52, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.restore();
    }

    _previewStrokePath(ctx, segs) {
        ctx.beginPath();
        ctx.moveTo(segs[0].x, segs[0].y);
        for (let i = 1; i < segs.length; i++) {
            ctx.lineTo(segs[i].x, segs[i].y);
        }
        ctx.stroke();
    }

    startPreviewAnimation(skinId) {
        if (!this.previewCtx) return;

        const animate = () => {
            this.drawPreview(skinId);
            this.animationFrame = requestAnimationFrame(animate);
        };

        this.stopPreviewAnimation();
        animate();
    }

    stopPreviewAnimation() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }

    getCurrentSkin() {
        return this.currentSkin;
    }

    getSkinName(skinId) {
        return CONFIG.skins[skinId]?.name || 'Desconocida';
    }
}
