import { CONFIG } from '../config.js';
import { drawSnake, previewSegments } from './SnakeRenderer.js';

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

    // Match the backing store to the CSS size so the preview stays crisp on HiDPI screens
    fitCanvas(canvas) {
        const dpr = window.devicePixelRatio || 1;
        const w = Math.round(canvas.clientWidth * dpr);
        const h = Math.round(canvas.clientHeight * dpr);
        if (w && h && (canvas.width !== w || canvas.height !== h)) {
            canvas.width = w;
            canvas.height = h;
        }
        return dpr;
    }

    drawPreview(skinId) {
        if (!this.previewCtx) return;

        const ctx = this.previewCtx;
        const canvas = this.previewCanvas;
        const dpr = this.fitCanvas(canvas);
        const w = canvas.width / dpr;
        const h = canvas.height / dpr;
        const skinData = CONFIG.skins[skinId] || CONFIG.skins.default;
        const glow = skinData.glowColor || skinData.bodyColor;

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);

        // Stage: perspective floor lines fading toward a horizon
        const horizon = h * 0.42;
        ctx.save();
        ctx.lineWidth = 1;
        for (let i = -10; i <= 10; i++) {
            ctx.strokeStyle = `rgba(0, 229, 255, ${0.12 - Math.abs(i) * 0.008})`;
            ctx.beginPath();
            ctx.moveTo(w / 2 + i * 14, horizon);
            ctx.lineTo(w / 2 + i * 90, h);
            ctx.stroke();
        }
        const scroll = (Date.now() * 0.03) % 1;
        for (let k = 0; k < 7; k++) {
            const t = (k + scroll) / 7;
            const y = horizon + (h - horizon) * t * t;
            ctx.strokeStyle = `rgba(255, 43, 214, ${0.04 + t * 0.12})`;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }

        // Spotlight in the skin's glow color
        const spot = ctx.createRadialGradient(w / 2, h * 0.62, 0, w / 2, h * 0.62, w * 0.45);
        spot.addColorStop(0, this.hexAlpha(glow, 0.28));
        spot.addColorStop(1, this.hexAlpha(glow, 0));
        ctx.fillStyle = spot;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();

        // The worm slithers in place, head to the right
        this.previewAngle += 0.06;
        const r = Math.min(18, h * 0.085);
        const count = 30;
        const spacing = r * 0.72;
        const headX = w / 2 + (count * spacing) / 2 - r;
        const segs = previewSegments(headX, h * 0.56, count, spacing, r * 1.3, this.previewAngle);
        const heading = Math.atan2(segs[0].y - segs[1].y, segs[0].x - segs[1].x);

        drawSnake(ctx, segs, heading, skinData, { radius: r });
    }

    // Static mini worm for skin cards
    drawThumb(canvas, skinId) {
        const ctx = canvas.getContext('2d');
        const dpr = this.fitCanvas(canvas);
        const w = canvas.width / dpr;
        const h = canvas.height / dpr;
        const skinData = CONFIG.skins[skinId] || CONFIG.skins.default;

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);
        const r = Math.min(9, h * 0.2);
        const count = 14;
        const spacing = r * 0.75;
        const segs = previewSegments(w / 2 + (count * spacing) / 2 - r, h / 2, count, spacing, r * 0.9, 1.2);
        const heading = Math.atan2(segs[0].y - segs[1].y, segs[0].x - segs[1].x);
        drawSnake(ctx, segs, heading, skinData, { radius: r });
    }

    hexAlpha(hex, alpha) {
        const h = hex.replace('#', '');
        return `rgba(${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)}, ${alpha})`;
    }

    startPreviewAnimation(skinId) {
        if (!this.previewCtx) return;

        // Caption follows the skin on stage: equipped, or one being hovered
        const nameEl = document.getElementById('equipped-skin-name');
        const labelEl = nameEl?.previousElementSibling;
        if (nameEl) nameEl.textContent = this.getSkinName(skinId);
        if (labelEl) labelEl.textContent = skinId === this.currentSkin ? 'Skin equipada' : 'Vista previa';

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
