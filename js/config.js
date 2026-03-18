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
            unlocked: true,
            drawStyle: {
                body: 'solid',
                highlight: 'rgba(255,255,255,0.25)',
                scalePattern: 'dots',
                scaleColor: 'rgba(255,255,255,0.2)',
                headShape: 'round',
                eyeStyle: 'round',
                eyeColor: '#000088',
                tongueColor: '#ff6666'
            }
        },
        skinFire: {
            name: 'Fuego',
            bodyColor: '#ff4500',
            glowColor: '#ff8c00',
            headColor: '#ff2200',
            price: 300,
            drawStyle: {
                body: 'gradient',
                gradientColors: ['#ff6600', '#ffee00'],
                highlight: 'rgba(255,220,0,0.3)',
                scalePattern: 'diamond',
                scaleColor: 'rgba(255,200,0,0.35)',
                headShape: 'pointed',
                eyeStyle: 'slit',
                eyeColor: '#000000',
                tongueColor: '#ffff00'
            }
        },
        skinRobot: {
            name: 'Robótica',
            bodyColor: '#c0c0c0',
            glowColor: '#ffffff',
            headColor: '#888888',
            price: 300,
            drawStyle: {
                body: 'striped',
                stripeColor: 'rgba(0,0,0,0.3)',
                stripeWidth: 3,
                highlight: 'rgba(255,255,255,0.45)',
                scalePattern: false,
                headShape: 'round',
                eyeStyle: 'robot',
                eyeColor: '#00ff00',
                antennaColor: '#00ffff',
                tongueColor: null
            }
        },
        skinMercy: {
            name: 'Mercy',
            bodyColor: '#9d4edd',
            glowColor: '#c77dff',
            headColor: '#7b2cbf',
            code: 'm3rcy',
            drawStyle: {
                body: 'gradient',
                gradientColors: ['#c77dff', '#7b2cbf'],
                highlight: 'rgba(224,170,255,0.3)',
                scalePattern: 'dots',
                scaleColor: 'rgba(255,255,255,0.18)',
                headShape: 'round',
                eyeStyle: 'round',
                eyeColor: '#220044',
                tongueColor: '#e0aaff'
            }
        },
        skinGold: {
            name: 'Dorada',
            bodyColor: '#ffd700',
            glowColor: '#ffed4e',
            headColor: '#ffb700',
            mission: 'reach_level_10',
            drawStyle: {
                body: 'gradient',
                gradientColors: ['#ffd700', '#aa6600'],
                highlight: 'rgba(255,255,200,0.5)',
                scalePattern: 'diamond',
                scaleColor: 'rgba(160,100,0,0.45)',
                headShape: 'round',
                eyeStyle: 'round',
                eyeColor: '#442200',
                tongueColor: '#ff6666'
            }
        },
        skinDark: {
            name: 'Oscura',
            bodyColor: '#1a1a2e',
            glowColor: '#3333aa',
            headColor: '#0f0f1e',
            mission: 'score_10000',
            drawStyle: {
                body: 'solid',
                highlight: 'rgba(80,80,220,0.2)',
                scalePattern: 'diamond',
                scaleColor: 'rgba(60,60,180,0.5)',
                headShape: 'round',
                eyeStyle: 'glow',
                eyeColor: '#4466ff',
                tongueColor: '#4466ff'
            }
        },
        skinAlien: {
            name: 'Super Alien',
            bodyColor: '#00ff88',
            glowColor: '#00ffaa',
            headColor: '#00cc55',
            code: 'w1s3v1l',
            drawStyle: {
                body: 'gradient',
                gradientColors: ['#00ff88', '#006633'],
                highlight: 'rgba(100,255,180,0.3)',
                scalePattern: 'oval',
                scaleColor: 'rgba(0,80,30,0.55)',
                headShape: 'pointed',
                eyeStyle: 'alien',
                eyeColor: '#ff0000',
                tongueColor: '#00ffcc'
            }
        },
        skinCow: {
            name: 'Muuub',
            bodyColor: '#f0f0f0',
            glowColor: '#cccccc',
            headColor: '#e8e8e8',
            code: 'm000000b',
            drawStyle: {
                body: 'spotted',
                spotColor: '#1a1a1a',
                highlight: 'rgba(255,255,255,0.4)',
                scalePattern: false,
                headShape: 'round',
                eyeStyle: 'round',
                eyeColor: '#222222',
                tongueColor: '#ff9999'
            }
        }
    }
};

// Secret codes
export const SECRET_CODES = {
    'm3rcy': 'skinMercy',
    'w1s3v1l': 'skinAlien',
    'm000000b': 'skinCow'
};
