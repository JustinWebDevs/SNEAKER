# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the Game

No build step or package manager — open `index.html` directly in a browser, or serve with any static file server (required for ES6 module imports):

```bash
npx serve .
# or
python -m http.server 8080
```

Deployment is automatic to GitHub Pages when pushing to `main` (see `.github/workflows/static.yml`).

## Architecture

Vanilla JS with ES6 modules. No framework, no bundler.

**Entry point**: `index.html` → `js/main.js` → creates `window.game = new Game()`

**Core loop** (`js/Game.js`): `requestAnimationFrame` → `gameLoop(currentTime)` → `update(deltaTime)` + `draw()`. Uses `effectiveDelta` (= `deltaTime * 0.3` during Time Warp) for enemies, while the snake always uses real `deltaTime`.

**Module map**:
- `js/config.js` — Single source of truth for all constants (`CONFIG`) and `SECRET_CODES`. Touch this to tune gameplay values, colors, skin definitions, and upgrade costs.
- `js/Game.js` — Orchestrates everything: state machine (`menu` / `playing` / `paused` / `gameover`), entity arrays, collision resolution, enemy spawning with pre-spawn visual warnings, and UI updates.
- `js/entities/Snake.js` — Snake movement (angle-based rotation, not grid), segment chain, dash mechanic with energy bar, power-up state tracking, and skin rendering.
- `js/entities/Food.js`, `js/entities/PowerUp.js` — Collectibles that Snake can eat.
- `js/entities/enemies/` — `Hunter` (chases snake from edges), `Turret` (static, shoots projectiles, has HP bar), `Virus` (inverts controls on contact), `Blindness` (vignette overlay on contact).
- `js/systems/ProgressionSystem.js` — Persists stats, missions, and unlocked skins to `localStorage`.
- `js/systems/SkinSystem.js` — Equip/preview skins; reads unlock state from `ProgressionSystem`.
- `js/systems/ShopSystem.js` — Coin economy, permanent upgrades, power-up duration upgrades, secret code redemption.
- `js/systems/ParticleSystem.js` — Visual-only particle emitter.
- `js/utils.js` — `Vector2` class + `randomInt` / `randomRange` helpers.

**State persistence**: `localStorage` keys are prefixed `cyberSerpent_*`.

**Skin unlocks**: three paths — default (free), shop purchase (coins), secret codes (`SECRET_CODES` in `config.js`), and mission completion.

**Hard Mode**: activates at level 10, doubles coin rewards and adds 1.5× score multiplier with increased enemy spawn rate.

**Enemy spawn flow**: most enemies (Turret, Virus, Blindness) go through `pendingEnemySpawns` — a 1.5-second visual warning shown at the target position before the entity actually spawns. Hunters spawn immediately from canvas edges.
