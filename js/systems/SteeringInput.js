// ==================== STEERING INPUT ====================
// Resolves left/right steering with "last input priority":
// - every held direction source (A, D, arrows, touch buttons) is kept in press order
// - the most recently pressed one that is still held decides the direction
// - releasing a key only removes that key, so the previous held key takes over again
// - a tap shorter than one frame still turns for MIN_TAP_MS, so quick taps are never lost

const MIN_TAP_MS = 50;

export const LEFT = -1;
export const RIGHT = 1;

export class SteeringInput {
    constructor() {
        this.held = [];        // [{ id, dir }] oldest first
        this.lastTap = null;   // { dir, time } of the most recent press
    }

    press(id, dir) {
        if (this.held.some(h => h.id === id)) return;  // already held (key auto-repeat)
        this.held.push({ id, dir });
        this.lastTap = { dir, time: performance.now() };
    }

    release(id) {
        this.held = this.held.filter(h => h.id !== id);
    }

    clear() {
        this.held = [];
        this.lastTap = null;
    }

    // -1 = left, 1 = right, 0 = straight
    getDirection(now = performance.now()) {
        if (this.held.length > 0) {
            return this.held[this.held.length - 1].dir;
        }
        if (this.lastTap && now - this.lastTap.time < MIN_TAP_MS) {
            return this.lastTap.dir;
        }
        return 0;
    }
}
