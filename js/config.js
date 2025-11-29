// ==================== GAME CONFIGURATION ====================
export const CONFIG = {
    canvas: {
        width: 1200,
        height: 800
    },
    snake: {
        baseSpeed: 3,
        rotationSpeed: 0.08,
        segmentSize: 12,
        segmentSpacing: 3,
        dashSpeedMultiplier: 2,
        dashDuration: 500,
        dashCooldown: 3000,
        dashInvulnerability: 500
    },
    game: {
        initialLevel: 1,
        levelUpScore: 100,  // 10 food * 10 points = 100 points per level
        speedIncreasePerLevel: 0.3,
        enemySpawnInterval: 5000,
        minLevelForTurrets: 2,  // Turrets only spawn from level 2+
        foodValue: 10,
        coinValue: 1,
        hardModeLevel: 10,  // HARD MODE starts at level 10
        hardModeScoreMultiplier: 1.5,  // 1.5x points in HARD MODE
        hardModeCoinMultiplier: 2,  // 2x coins in HARD MODE
        hardModeBonus: 100,  // 100 coins for reaching HARD MODE
        newLevelBonus: 50  // 50 coins for reaching a new personal best level
    },
    powerups: {
        spawnInterval: 15000,
        maxActive: 2,
        // Durations by level (ms)
        durations: {
            level1: {
                ghost: 3000,
                timeWarp: 4000,
                magneto: 5000,
                turret: 6000,
                shield: 3000
            },
            level2: {
                ghost: 5000,
                timeWarp: 6000,
                magneto: 8000,
                turret: 10000,
                shield: 5000
            },
            level3: {
                ghost: 7000,
                timeWarp: 8000,
                magneto: 11000,
                turret: 14000,
                shield: 7000
            }
        },
        // Upgrade costs
        upgradeCosts: {
            level1: 0,    // Free (default)
            level2: 50,   // Unlock level 2
            level3: 70    // Unlock level 3
        }
    },
    colors: {
        snake: '#00ffff',
        snakeGlow: '#0099ff',
        food: '#ffff00',
        enemy: '#ff0000',
        turret: '#ff6600',
        virus: '#9900ff',
        powerup: '#ff00ff',
        adversePowerup: '#ff4444',  // Red-orange warning color for adverse powerups
        gunProjectile: '#0088ff'  // Blue color for gun projectiles
    },
    gun: {
        fireRate: 1000,           // 1 second between shots
        damage: 1,                // Damage per projectile
        projectileSpeed: 10,      // Speed of projectiles
        projectileRadius: 4,      // Radius for collision detection
        range: 300                // Maximum targeting range
    },
    skins: {
        default: {
            name: 'Clásica',
            bodyColor: '#00ffff',
            glowColor: '#0099ff',
            headColor: '#00ffff',
            unlocked: true
        },
        skinFire: {
            name: 'Fuego',
            bodyColor: '#ff4500',
            glowColor: '#ff8c00',
            headColor: '#ff0000',
            price: 300
        },
        skinRobot: {
            name: 'Robótica',
            bodyColor: '#c0c0c0',
            glowColor: '#ffffff',
            headColor: '#808080',
            price: 300
        },
        skinMercy: {
            name: 'Mercy',
            bodyColor: '#9d4edd',
            glowColor: '#c77dff',
            headColor: '#7b2cbf',
            code: 'm3rcy'
        },
        skinGold: {
            name: 'Dorada',
            bodyColor: '#ffd700',
            glowColor: '#ffed4e',
            headColor: '#ffb700',
            mission: 'reach_level_10'
        },
        skinDark: {
            name: 'Oscura',
            bodyColor: '#1a1a2e',
            glowColor: '#16213e',
            headColor: '#0f0f1e',
            mission: 'score_10000'
        },
        skinAlien: {
            name: 'Super Alien',
            bodyColor: '#00ff88',
            glowColor: '#00ffaa',
            headColor: '#00ff66',
            code: 'w1s3v1l'
        },
        skinCow: {
            name: 'Muuub',
            bodyColor: '#ffffff',
            glowColor: '#f0f0f0',
            headColor: '#e0e0e0',
            code: 'm000000b'
        }
    },
    gun: {
        fireRate: 1000,  // 1 second between shots
        projectileSpeed: 8,
        projectileRadius: 5,
        damage: 1
    }
};

// Secret codes
export const SECRET_CODES = {
    'm3rcy': 'skinMercy',
    'w1s3v1l': 'skinAlien',
    'm000000b': 'skinCow'
};
