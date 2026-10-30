// Rive-driven UI layer: animated menu backdrop, title logo, HUD and game-over title.
// Source lives in rive-ui/ (RML) and is built to assets/rive/sneaker-ui.riv with the Rive CLI.
// If the runtime or the file fails to load, the game falls back to the plain DOM UI.

const RIV_PATH = 'assets/rive/sneaker-ui.riv';

const VIEWS = {
    background: { canvasId: 'rive-bg', artboard: 'Background', stateMachine: 'Background SM', fit: 'Cover' },
    logo: { canvasId: 'rive-logo', artboard: 'Logo', stateMachine: 'Logo SM', fit: 'Contain' },
    hud: { canvasId: 'rive-hud', artboard: 'Hud', stateMachine: 'Hud SM', fit: 'Contain', bind: true },
    gameOver: { canvasId: 'rive-gameover', artboard: 'GameOver', stateMachine: 'GameOver SM', fit: 'Contain' }
};

// Which view replays its intro when a screen opens, and which views stay frozen on it
const SCREENS = {
    menu: { intro: 'logo', frozen: [] },
    playing: { intro: 'hud', frozen: ['background'] },  // the arena covers most of the backdrop
    gameover: { intro: 'gameOver', frozen: [] },
    other: { intro: null, frozen: [] }
};

export class RiveUI {
    constructor() {
        this.instances = {};
        this.loaded = new Set();
        this.screen = 'menu';
        this.hudVm = null;
        this.hudValues = {};

        if (!window.rive) {
            this.fallback('runtime not loaded');
            return;
        }

        fetch(RIV_PATH)
            .then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.arrayBuffer();
            })
            .then(buffer => this.createInstances(buffer))
            .catch(err => this.fallback(err.message));

        window.addEventListener('resize', () => this.syncVisibility());
    }

    fallback(reason) {
        console.warn(`[RiveUI] using DOM fallback: ${reason}`);
        document.body.classList.add('no-rive');
    }

    createInstances(buffer) {
        const { Rive, Layout, Fit, Alignment } = window.rive;

        Object.entries(VIEWS).forEach(([key, view]) => {
            const canvas = document.getElementById(view.canvasId);
            if (!canvas) return;

            const instance = new Rive({
                buffer,
                canvas,
                artboard: view.artboard,
                stateMachine: view.stateMachine,
                autoplay: false,
                autoBind: !!view.bind,
                layout: new Layout({ fit: Fit[view.fit], alignment: Alignment.Center }),
                onLoad: () => {
                    this.loaded.add(key);
                    if (view.bind) this.captureViewModel(instance);
                    this.syncVisibility();
                },
                onLoadError: () => this.fallback(`could not load artboard ${view.artboard}`)
            });
            this.instances[key] = instance;
        });
    }

    captureViewModel(instance) {
        this.hudVm = instance.viewModelInstance;
        this.hudValues = {};
    }

    isVisible(key) {
        const canvas = document.getElementById(VIEWS[key].canvasId);
        return !!canvas && canvas.offsetWidth > 0 && canvas.offsetHeight > 0;
    }

    // Views inside hidden screens have a 0x0 canvas, and drawing into one crashes the WebGL2
    // renderer, so hidden views are paused and visible ones resized before they resume.
    syncVisibility() {
        const frozen = SCREENS[this.screen].frozen;
        Object.entries(this.instances).forEach(([key, instance]) => {
            if (!this.loaded.has(key)) return;
            if (this.isVisible(key) && !frozen.includes(key)) {
                instance.resizeDrawingSurfaceToCanvas();
                instance.play();
            } else {
                instance.pause();
            }
        });
    }

    // Call after the DOM for a screen ('menu', 'playing', 'gameover', 'other') is shown.
    showScreen(screen) {
        this.screen = SCREENS[screen] ? screen : 'other';
        this.syncVisibility();

        const key = SCREENS[this.screen].intro;
        if (key && this.loaded.has(key) && this.isVisible(key)) {
            this.replay(key);
        }
    }

    // Restart a view's state machine so its intro animation plays again.
    replay(key) {
        const instance = this.instances[key];
        const view = VIEWS[key];
        instance.reset({ artboard: view.artboard, stateMachines: view.stateMachine, autoplay: true, autoBind: !!view.bind });
        instance.resizeDrawingSurfaceToCanvas();
        if (view.bind) this.captureViewModel(instance);
    }

    // Push HUD values into the Hud view model, writing only what changed.
    updateHud({ score, level, energy, hardMode }) {
        if (!this.hudVm) return;
        this.writeNumber('score', score);
        this.writeNumber('level', level);
        this.writeNumber('energy', Math.round(energy));
        if (this.hudValues.hardMode !== hardMode) {
            const prop = this.hudVm.boolean('hardMode');
            if (prop) prop.value = hardMode;
            this.hudValues.hardMode = hardMode;
        }
    }

    writeNumber(name, value) {
        if (this.hudValues[name] === value) return;
        const prop = this.hudVm.number(name);
        if (prop) prop.value = value;
        this.hudValues[name] = value;
    }
}
