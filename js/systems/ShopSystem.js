import { CONFIG, SECRET_CODES } from '../config.js';

export class ShopSystem {
    constructor(progressionSystem, skinSystem) {
        this.progressionSystem = progressionSystem;
        this.skinSystem = skinSystem;
        this.coins = this.loadCoins();
        this.upgrades = this.loadUpgrades();
        this.powerupLevels = this.loadPowerupLevels();
        this.explosionBoostLevel = this.loadExplosionBoost();
    }

    loadCoins() {
        return parseInt(localStorage.getItem('cyberSerpent_coins') || '0');
    }

    saveCoins() {
        localStorage.setItem('cyberSerpent_coins', this.coins.toString());
    }

    addCoins(amount) {
        this.coins += amount;
        this.saveCoins();
    }

    loadUpgrades() {
        const saved = localStorage.getItem('cyberSerpent_upgrades');
        if (saved) {
            return JSON.parse(saved);
        }
        return {
            dashRecharge: false,
            speedBoost: false,
            shieldSpawner: false,
            skinFire: false,
            skinRobot: false
        };
    }

    saveUpgrades() {
        localStorage.setItem('cyberSerpent_upgrades', JSON.stringify(this.upgrades));
    }

    loadExplosionBoost() {
        const saved = localStorage.getItem('cyberSerpent_explosionBoost');
        return saved ? parseInt(saved) : 0;  // Level 0 = base spawn rate
    }

    saveExplosionBoost() {
        localStorage.setItem('cyberSerpent_explosionBoost', this.explosionBoostLevel.toString());
    }

    loadPowerupLevels() {
        const saved = localStorage.getItem('cyberSerpent_powerupLevels');
        if (saved) {
            return JSON.parse(saved);
        }
        return {
            ghost: 1,
            timeWarp: 1,
            magneto: 1,
            turret: 1,
            shield: 1
        };
    }

    savePowerupLevels() {
        localStorage.setItem('cyberSerpent_powerupLevels', JSON.stringify(this.powerupLevels));
    }

    buyUpgrade(upgradeId, price) {
        if (this.coins >= price && !this.upgrades[upgradeId]) {
            this.coins -= price;
            this.upgrades[upgradeId] = true;
            this.saveCoins();
            this.saveUpgrades();

            // Unlock skin if it's a skin purchase
            if (upgradeId.startsWith('skin')) {
                this.progressionSystem.unlockSkin(upgradeId);
            }

            return true;
        }
        return false;
    }

    upgradePowerup(powerupType, level) {
        const cost = CONFIG.powerups.upgradeCosts[`level${level}`];

        if (this.coins >= cost && this.powerupLevels[powerupType] < level) {
            this.coins -= cost;
            this.powerupLevels[powerupType] = level;
            this.saveCoins();
            this.savePowerupLevels();
            return true;
        }
        return false;
    }

    redeemCode(code) {
        const lowercaseCode = code.toLowerCase().trim();
        const skinId = SECRET_CODES[lowercaseCode];

        if (skinId) {
            const unlocked = this.progressionSystem.unlockSkin(skinId);
            if (unlocked) {
                return {
                    success: true,
                    message: `¡Skin "${CONFIG.skins[skinId].name}" desbloqueada!`
                };
            } else {
                return {
                    success: false,
                    message: 'Ya tienes esta skin desbloqueada'
                };
            }
        }

        return {
            success: false,
            message: 'Código inválido'
        };
    }

    getPowerupDuration(powerupType) {
        const level = this.powerupLevels[powerupType] || 1;
        return CONFIG.powerups.durations[`level${level}`][powerupType];
    }

    renderShop() {
        this.renderPowerupUpgrades();
        this.renderPermanentUpgrades();
        this.renderSkinUnlocks();
        this.updateCoinsDisplay();
    }

    renderPowerupUpgrades() {
        const container = document.getElementById('powerup-upgrades');
        if (!container) return;

        container.innerHTML = '';

        const powerups = ['ghost', 'timeWarp', 'magneto', 'turret', 'shield'];
        const icons = {
            ghost: '👻',
            timeWarp: '⏱️',
            magneto: '🧲',
            turret: '🔫',
            shield: '🛡️'
        };

        powerups.forEach(powerupType => {
            const currentLevel = this.powerupLevels[powerupType];
            const nextLevel = currentLevel + 1;

            if (nextLevel <= 3) {
                const div = document.createElement('div');
                div.className = 'shop-item';

                const currentDuration = CONFIG.powerups.durations[`level${currentLevel}`][powerupType] / 1000;
                const nextDuration = CONFIG.powerups.durations[`level${nextLevel}`][powerupType] / 1000;
                const cost = CONFIG.powerups.upgradeCosts[`level${nextLevel}`];

                div.innerHTML = `
                    <h3>${icons[powerupType]} ${powerupType.charAt(0).toUpperCase() + powerupType.slice(1)}</h3>
                    <p style="font-size: 0.85rem; margin: 0.5rem 0;">
                        Nivel ${currentLevel} → ${nextLevel}<br>
                        ${currentDuration}s → ${nextDuration}s
                    </p>
                    <p class="price">${cost} monedas</p>
                    <button ${this.coins < cost ? 'disabled' : ''} 
                            onclick="game.shopSystem.upgradePowerup('${powerupType}', ${nextLevel}) && game.shopSystem.renderShop()">
                        MEJORAR
                    </button>
                `;
                container.appendChild(div);
            } else {
                const div = document.createElement('div');
                div.className = 'shop-item owned';
                const duration = CONFIG.powerups.durations.level3[powerupType] / 1000;

                div.innerHTML = `
                    <h3>${icons[powerupType]} ${powerupType.charAt(0).toUpperCase() + powerupType.slice(1)}</h3>
                    <p style="font-size: 0.85rem; margin: 0.5rem 0;">
                        Nivel MAX<br>
                        Duración: ${duration}s
                    </p>
                    <button disabled>MÁXIMO</button>
                `;
                container.appendChild(div);
            }
        });
    }

    renderPermanentUpgrades() {
        const container = document.getElementById('shop-items');
        if (!container) return;

        container.innerHTML = '';

        const items = [
            {
                name: 'Dash Recarga +10%',
                price: 100,
                upgrade: 'dashRecharge',
                owned: this.upgrades.dashRecharge,
                desc: 'Recarga de energía más rápida'
            },
            {
                name: 'Velocidad Base +5%',
                price: 150,
                upgrade: 'speedBoost',
                owned: this.upgrades.speedBoost,
                desc: 'Velocidad permanente aumentada'
            },
            {
                name: 'Shield Spawner',
                price: 200,
                upgrade: 'shieldSpawner',
                owned: this.upgrades.shieldSpawner,
                desc: 'Aparecen power-ups de escudo'
            },
            {
                name: `Explosión Rate +${this.explosionBoostLevel * 10}%`,
                price: 200,
                upgrade: 'explosionBoost',
                owned: this.explosionBoostLevel >= 3,  // Max level 3
                desc: `Más apariciones de explosión (Nivel ${this.explosionBoostLevel}/3)`,
                isExplosionBoost: true,
                currentLevel: this.explosionBoostLevel
            }
        ];

        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'shop-item' + (item.owned ? ' owned' : '');

            if (item.isExplosionBoost) {
                const canUpgrade = this.explosionBoostLevel < 3 && this.coins >= item.price;
                div.innerHTML = `
                    <h3>${item.name}</h3>
                    <p style="font-size: 0.85rem; margin: 0.5rem 0;">${item.desc}</p>
                    <p class="price">${item.price} monedas</p>
                    <button ${!canUpgrade ? 'disabled' : ''} 
                            onclick="game.shopSystem.upgradeExplosionBoost() && game.shopSystem.renderShop() && game.updateUI()">
                        ${this.explosionBoostLevel >= 3 ? 'MÁXIMO' : 'MEJORAR'}
                    </button>
                `;
            } else {
                div.innerHTML = `
                    <h3>${item.name}</h3>
                    <p style="font-size: 0.85rem; margin: 0.5rem 0;">${item.desc}</p>
                    <p class="price">${item.price} monedas</p>
                    <button ${item.owned || this.coins < item.price ? 'disabled' : ''} 
                            onclick="game.shopSystem.buyUpgrade('${item.upgrade}', ${item.price}) && game.shopSystem.renderShop() && game.updateUI()">
                        ${item.owned ? 'COMPRADO' : 'COMPRAR'}
                    </button>
                `;
            }
            container.appendChild(div);
        });
    }

    upgradeExplosionBoost() {
        if (this.explosionBoostLevel < 3 && this.coins >= 200) {
            this.coins -= 200;
            this.explosionBoostLevel++;
            this.saveCoins();
            this.saveExplosionBoost();
            return true;
        }
        return false;
    }

    renderSkinUnlocks() {
        const container = document.getElementById('skin-unlocks');
        if (!container) return;

        container.innerHTML = '';

        const skins = [
            { id: 'skinFire', price: 300 },
            { id: 'skinRobot', price: 300 }
        ];

        skins.forEach(({ id, price }) => {
            const skinData = CONFIG.skins[id];
            const owned = this.upgrades[id];

            const div = document.createElement('div');
            div.className = 'shop-item' + (owned ? ' owned' : '');
            div.style.borderColor = skinData.bodyColor;

            div.innerHTML = `
                <h3 style="color: ${skinData.bodyColor}">${skinData.name}</h3>
                <p style="font-size: 0.85rem; margin: 0.5rem 0;">Skin exclusiva</p>
                <p class="price">${price} monedas</p>
                <button ${owned || this.coins < price ? 'disabled' : ''} 
                        onclick="game.shopSystem.buyUpgrade('${id}', ${price}) && game.shopSystem.renderShop()">
                    ${owned ? 'COMPRADA' : 'COMPRAR'}
                </button>
            `;
            container.appendChild(div);
        });
    }

    updateCoinsDisplay() {
        const coinElements = ['shop-coins', 'total-coins'];
        coinElements.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = this.coins;
        });
    }

    getCoins() {
        return this.coins;
    }

    getUpgrades() {
        return { ...this.upgrades };
    }

    getPowerupLevels() {
        return { ...this.powerupLevels };
    }
}
