// Player data management with localStorage
class PlayerDataManager {
    constructor() {
        this.data = this.loadData();
    }

    loadData() {
        const savedData = localStorage.getItem('gagaball_data');
        if (savedData) {
            return JSON.parse(savedData);
        }

        // Default player data
        return {
            coins: 0,
            wins: 0,
            totalMatches: 0,
            eliminations: 0,
            bestTime: 0,
            currentSkin: 'default',
            currentArena: 'classic',
            ownedSkins: ['default'],
            ownedArenas: ['classic'],
            achievements: {},
            stats: {
                totalPlayTime: 0,
                longestWinStreak: 0,
                currentWinStreak: 0,
                totalHits: 0,
                dodges: 0
            },
            dailyReward: {
                lastClaimed: null,
                streak: 0
            },
            settings: {
                soundEnabled: true,
                musicEnabled: true,
                vibrationEnabled: true
            },
            createdAt: Date.now()
        };
    }

    saveData() {
        localStorage.setItem('gagaball_data', JSON.stringify(this.data));
    }

    addCoins(amount) {
        this.data.coins += amount;
        this.saveData();
    }

    spendCoins(amount) {
        if (this.data.coins >= amount) {
            this.data.coins -= amount;
            this.saveData();
            return true;
        }
        return false;
    }

    recordWin(eliminationCount, matchDuration) {
        this.data.wins++;
        this.data.totalMatches++;
        this.data.eliminations += eliminationCount;
        this.data.stats.currentWinStreak++;

        if (this.data.stats.currentWinStreak > this.data.stats.longestWinStreak) {
            this.data.stats.longestWinStreak = this.data.stats.currentWinStreak;
        }

        if (this.data.bestTime === 0 || matchDuration < this.data.bestTime) {
            this.data.bestTime = matchDuration;
        }

        this.checkAchievements(eliminationCount, matchDuration);
        this.saveData();
    }

    recordLoss() {
        this.data.totalMatches++;
        this.data.stats.currentWinStreak = 0;
        this.saveData();
    }

    checkAchievements(eliminationCount, matchDuration) {
        const newAchievements = [];

        // First win
        if (this.data.wins === 1 && !this.data.achievements.firstWin) {
            this.data.achievements.firstWin = true;
            newAchievements.push('firstWin');
        }

        // Speed demon
        if (matchDuration < 20 && !this.data.achievements.speedDemon) {
            this.data.achievements.speedDemon = true;
            newAchievements.push('speedDemon');
        }

        // Eliminator
        if (eliminationCount >= 5 && !this.data.achievements.eliminator) {
            this.data.achievements.eliminator = true;
            newAchievements.push('eliminator');
        }

        // Champion
        if (this.data.wins >= 10 && !this.data.achievements.champion) {
            this.data.achievements.champion = true;
            newAchievements.push('champion');
        }

        // Legend
        if (this.data.wins >= 50 && !this.data.achievements.legend) {
            this.data.achievements.legend = true;
            newAchievements.push('legend');
        }

        // Award coins for achievements
        newAchievements.forEach(achievement => {
            this.addCoins(ACHIEVEMENTS[achievement].reward);
        });

        return newAchievements;
    }

    claimDailyReward() {
        const now = Date.now();
        const lastClaimed = this.data.dailyReward.lastClaimed;

        if (!lastClaimed) {
            // First time claiming
            this.data.dailyReward.streak = 1;
            this.data.dailyReward.lastClaimed = now;
            const reward = GAME_CONFIG.DAILY_REWARD_BASE;
            this.addCoins(reward);
            return { claimed: true, reward, streak: 1 };
        }

        const hoursSinceLastClaim = (now - lastClaimed) / (1000 * 60 * 60);

        // Must wait 24 hours
        if (hoursSinceLastClaim < 24) {
            return { claimed: false, hoursRemaining: 24 - hoursSinceLastClaim };
        }

        // Check if streak continues (within 48 hours)
        if (hoursSinceLastClaim <= 48) {
            this.data.dailyReward.streak++;
        } else {
            this.data.dailyReward.streak = 1;
        }

        this.data.dailyReward.lastClaimed = now;
        const reward = GAME_CONFIG.DAILY_REWARD_BASE * this.data.dailyReward.streak;
        this.addCoins(reward);
        this.saveData();

        return { claimed: true, reward, streak: this.data.dailyReward.streak };
    }

    unlockSkin(skinId) {
        if (!this.data.ownedSkins.includes(skinId)) {
            this.data.ownedSkins.push(skinId);
            this.saveData();
            return true;
        }
        return false;
    }

    unlockArena(arenaId) {
        if (!this.data.ownedArenas.includes(arenaId)) {
            this.data.ownedArenas.push(arenaId);
            this.saveData();
            return true;
        }
        return false;
    }

    selectSkin(skinId) {
        if (this.data.ownedSkins.includes(skinId)) {
            this.data.currentSkin = skinId;
            this.saveData();
            return true;
        }
        return false;
    }

    selectArena(arenaId) {
        if (this.data.ownedArenas.includes(arenaId)) {
            this.data.currentArena = arenaId;
            this.saveData();
            return true;
        }
        return false;
    }

    getWinRate() {
        if (this.data.totalMatches === 0) return 0;
        return Math.round((this.data.wins / this.data.totalMatches) * 100);
    }

    reset() {
        localStorage.removeItem('gagaball_data');
        this.data = this.loadData();
    }
}

// Global instance
const playerData = new PlayerDataManager();
