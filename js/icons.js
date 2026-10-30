// ==================== NEON LINE ICONS ====================
// One set of 24x24 stroke paths shared by the canvas (Path2D) and the DOM (inline SVG),
// so pickups, HUD chips, the shop and the controls screen all show the same glyphs.

export const ICONS = {
    ghost: {
        label: 'GHOST',
        color: '#b69cff',
        paths: [
            'M5 21V11a7 7 0 0 1 14 0v10l-2.33-1.6L14.33 21 12 19.4 9.67 21 7.33 19.4z',
            'M9.5 10.5v1.5M14.5 10.5v1.5'
        ]
    },
    timeWarp: {
        label: 'TIME WARP',
        color: '#7df9ff',
        paths: [
            'M6 3h12M6 21h12',
            'M7.5 3c0 4.5 9 5.5 9 9s-9 4.5-9 9M16.5 3c0 4.5-9 5.5-9 9s9 4.5 9 9',
            'M10 18h4'
        ]
    },
    magneto: {
        label: 'MAGNETO',
        color: '#ff5ae0',
        paths: [
            'M5 4h4.5v8a2.5 2.5 0 0 0 5 0V4H19v8a7 7 0 0 1-14 0z',
            'M5 8h4.5M14.5 8H19'
        ]
    },
    turret: {
        label: 'TURRET',
        color: '#5fb6ff',
        paths: [
            'M12 5.5a6.5 6.5 0 1 0 0 13a6.5 6.5 0 1 0 0-13',
            'M12 2v5M12 17v5M2 12h5M17 12h5',
            'M12 11v2M11 12h2'
        ]
    },
    cutTail: {
        label: 'CUT TAIL',
        color: '#ffd23f',
        paths: [
            'M12 2.5l1.9 5.2 5.3-2.3-2.3 5.3 5.2 1.9-5.2 1.9 2.3 5.3-5.3-2.3L12 21.5l-1.9-5.2-5.3 2.3 2.3-5.3L1.9 12.6l5.2-1.9-2.3-5.3 5.3 2.3z'
        ]
    },
    shield: {
        label: 'SHIELD',
        color: '#3dffa8',
        paths: [
            'M12 2.5l7.5 3v5.5c0 5-3.2 8.6-7.5 10.5-4.3-1.9-7.5-5.5-7.5-10.5V5.5z',
            'M8.5 12l2.5 2.5 4.5-5'
        ]
    },
    // Debuffs
    virus: {
        label: 'INVERTIDO',
        color: '#ff4d6d',
        paths: [
            'M4 8h14M14.5 4.5L18 8l-3.5 3.5',
            'M20 16H6M9.5 12.5L6 16l3.5 3.5'
        ]
    },
    blindness: {
        label: 'CEGUERA',
        color: '#ff4d6d',
        paths: [
            'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z',
            'M12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6',
            'M4 4l16 16'
        ]
    },
    flame: {
        label: 'HARD MODE',
        color: '#ff2bd6',
        paths: [
            'M12 2.5c1 3.5 5.5 5.5 5.5 11a5.5 5.5 0 0 1-11 0c0-2.5 1.2-4 2.3-5 .2 1.8 1 2.8 2.2 3.3-.4-3.5.3-6.6 1-9.3z'
        ]
    }
};

const path2dCache = {};

function getPaths(name) {
    if (!path2dCache[name]) {
        path2dCache[name] = ICONS[name].paths.map(d => new Path2D(d));
    }
    return path2dCache[name];
}

// Draw an icon centered at (x, y), `size` pixels wide, with a soft neon bloom under a crisp line.
export function drawIcon(ctx, name, x, y, size, color = ICONS[name].color, rotation = 0) {
    if (!ICONS[name]) return;
    const scale = size / 24;
    const paths = getPaths(name);

    ctx.save();
    ctx.translate(x, y);
    if (rotation) ctx.rotate(rotation);
    ctx.scale(scale, scale);
    ctx.translate(-12, -12);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;

    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 5;
    paths.forEach(p => ctx.stroke(p));

    ctx.globalAlpha = 1;
    ctx.lineWidth = 2;
    paths.forEach(p => ctx.stroke(p));
    ctx.restore();
}

// Inline SVG markup for DOM use; colored through CSS `color` (currentColor).
export function iconSvg(name, className = 'icon') {
    const icon = ICONS[name];
    if (!icon) return '';
    const d = icon.paths.map(p => `<path d="${p}"/>`).join('');
    return `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
}

// Fill every <... data-icon="name"> placeholder in the static HTML.
export function hydrateIcons(root = document) {
    root.querySelectorAll('[data-icon]').forEach(el => {
        const name = el.dataset.icon;
        if (!ICONS[name]) return;
        el.innerHTML = iconSvg(name);
        el.style.setProperty('--icon-color', ICONS[name].color);
    });
}
