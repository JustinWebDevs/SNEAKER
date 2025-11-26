import { CONFIG } from '../config.js';

export class ProgressionSystem {
    constructor() {
        this.stats = this.loadStats();
        this.missions = this.initializeMissions();
        this.unlockedSkins = this.loadUnlockedSkins();
    }

    initializeMissions() {
        return {
            reach_level_10: {
                id: 'reach_level_10',
                name: 'Maestro de Niveles',
                description: 'Alcanza el nivel 10 en una partida',
                reward: 'skinGold',
                completed: false,
                progress: 0,
                target: 10,
                check: (stats) => stats.maxLevel >= 10
            },
            score_10000: {
                id: 'score_10000',
                name: 'Campeón de Puntos',
                description: 'Consigue 10,000 puntos en una partida',
                reward: 'skinDark',
                completed: false,
                progress: 0,
                target: 10000,
                check: (stats) => stats.maxScore >= 10000
            },
            survive_5min: {
                id: 'survive_5min',
                name: 'Sobreviviente',
                description: 'Sobrevive 5 minutos en una partida',
                reward: 'skinNeon',
                completed: false,
                progress: 0,
                target: 300,
                check: (stats) => stats.longestGame >= 300000
            }
        };
    }

    loadStats() {
        const saved = localStorage.getItem('cyberSerpent_stats');
        if (saved) {
            return JSON.parse(saved);
        }
        return {
            gamesPlayed: 0,
            maxLevel: 0,
            maxScore: 0,
            longestGame: 0,
            totalCoinsEarned: 0,
            totalEnemiesKilled: 0
        };
    }

    saveStats() {
        localStorage.setItem('cyberSerpent_stats', JSON.stringify(this.stats));
    }

    loadUnlockedSkins() {
        const saved = localStorage.getItem('cyberSerpent_unlockedSkins');
        if (saved) {
            return JSON.parse(saved);
        }
        return ['default'];
    }

    saveUnlockedSkins() {
        localStorage.setItem('cyberSerpent_unlockedSkins', JSON.stringify(this.unlockedSkins));
    }

    updateGameStats(gameData) {
        this.stats.gamesPlayed++;
        this.stats.maxLevel = Math.max(this.stats.maxLevel, gameData.level);
        this.stats.maxScore = Math.max(this.stats.maxScore, gameData.score);
        this.stats.longestGame = Math.max(this.stats.longestGame, gameData.gameDuration);
        this.stats.totalCoinsEarned += gameData.coinsEarned;
        this.stats.totalEnemiesKilled += gameData.enemiesKilled || 0;

        this.saveStats();
        this.checkMissions();
    }

    checkMissions() {
        let newUnlocks = [];

        Object.values(this.missions).forEach(mission => {
            if (!mission.completed && mission.check(this.stats)) {
                mission.completed = true;
                mission.progress = mission.target;

                if (!this.unlockedSkins.includes(mission.reward)) {
                    this.unlockedSkins.push(mission.reward);
                    newUnlocks.push({
                        mission: mission.name,
                        skin: CONFIG.skins[mission.reward]?.name || mission.reward
                    });
                }
            } else if (!mission.completed) {
                // Update progress
                if (mission.id === 'reach_level_10') {
                    mission.progress = Math.min(this.stats.maxLevel, mission.target);
                } else if (mission.id === 'score_10000') {
                    mission.progress = Math.min(this.stats.maxScore, mission.target);
                } else if (mission.id === 'survive_5min') {
                    mission.progress = Math.min(Math.floor(this.stats.longestGame / 1000), mission.target);
                }
            }
        });

        if (newUnlocks.length > 0) {
            this.saveUnlockedSkins();
        }

        return newUnlocks;
    }

    unlockSkin(skinId) {
        if (!this.unlockedSkins.includes(skinId)) {
            this.unlockedSkins.push(skinId);
            this.saveUnlockedSkins();
            return true;
        }
        return false;
    }

    isSkinUnlocked(skinId) {
        return this.unlockedSkins.includes(skinId);
    }

    getMissionProgress() {
        return Object.values(this.missions).map(mission => ({
            ...mission,
            progressPercent: (mission.progress / mission.target) * 100
        }));
    }

    getStats() {
        return { ...this.stats };
    }
}
