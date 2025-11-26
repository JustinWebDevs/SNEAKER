import { Game } from './Game.js';

// Initialize game when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
    window.game = new Game();
    console.log('🐍 SNEAKER initialized!');
});
