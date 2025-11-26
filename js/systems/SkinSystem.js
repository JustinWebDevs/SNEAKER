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

        // Clear canvas
        ctx.fillStyle = 'rgba(10, 10, 30, 0.9)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Update rotation
        this.previewAngle += 0.02;

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const segmentSize = 15;
        const segmentCount = 5;

        // Draw mini snake segments
        for (let i = segmentCount - 1; i >= 0; i--) {
            const angle = this.previewAngle + (i * 0.3);
            const distance = i * 20;
            const x = centerX + Math.cos(angle) * distance;
            const y = centerY + Math.sin(angle) * distance;
            const alpha = (i / segmentCount) * 0.7 + 0.3;

            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = skinData.bodyColor;
            ctx.shadowBlur = 15;
            ctx.shadowColor = skinData.glowColor;

            ctx.beginPath();
            ctx.arc(x, y, segmentSize, 0, Math.PI * 2);
            ctx.fill();

            // Robot shine
            if (skinId === 'skinRobot') {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.beginPath();
                ctx.arc(x - 3, y - 3, segmentSize * 0.4, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        }

        // Draw head
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(this.previewAngle);

        ctx.fillStyle = skinData.headColor;
        ctx.shadowBlur = 25;
        ctx.shadowColor = skinData.glowColor;

        ctx.beginPath();
        ctx.arc(0, 0, segmentSize + 3, 0, Math.PI * 2);
        ctx.fill();

        // Skin-specific effects
        if (skinId === 'skinFire') {
            ctx.fillStyle = '#ffff00';
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#ff8c00';
            ctx.beginPath();
            ctx.arc(0, 0, segmentSize * 0.6, 0, Math.PI * 2);
            ctx.fill();
        } else if (skinId === 'skinRobot') {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.beginPath();
            ctx.arc(-2, -2, segmentSize * 0.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, -10);
            ctx.lineTo(0, -15);
            ctx.stroke();
            ctx.fillStyle = '#00ffff';
            ctx.beginPath();
            ctx.arc(0, -15, 2, 0, Math.PI * 2);
            ctx.fill();
        } else if (skinId === 'skinMercy') {
            const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, segmentSize);
            gradient.addColorStop(0, '#e0aaff');
            gradient.addColorStop(1, '#c77dff');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(0, 0, segmentSize * 0.7, 0, Math.PI * 2);
            ctx.fill();
        } else if (skinId === 'skinGold') {
            ctx.fillStyle = '#ffed4e';
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#ffd700';
            ctx.beginPath();
            ctx.arc(0, 0, segmentSize * 0.6, 0, Math.PI * 2);
            ctx.fill();
        }

        // Eyes
        ctx.fillStyle = skinId === 'skinFire' ? '#000000' : '#ffffff';
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.arc(6, -5, 2.5, 0, Math.PI * 2);
        ctx.arc(6, 5, 2.5, 0, Math.PI * 2);
        ctx.fill();

        if (skinId === 'skinRobot') {
            ctx.fillStyle = '#00ff00';
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#00ff00';
            ctx.beginPath();
            ctx.arc(6, -5, 2, 0, Math.PI * 2);
            ctx.arc(6, 5, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
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
