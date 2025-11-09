// Main Phaser game configuration
console.log('Initializing GaGa Ball game...');

// Check if all scenes are defined
console.log('BootScene:', typeof BootScene);
console.log('MenuScene:', typeof MenuScene);
console.log('GameScene:', typeof GameScene);
console.log('GameOverScene:', typeof GameOverScene);

const phaserConfig = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: 800,
    height: 600,
    backgroundColor: '#1e1b4b',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false,
            fps: 60
        }
    },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 800,
        height: 600
    },
    scene: [BootScene, MenuScene, GameScene, GameOverScene],
    audio: {
        disableWebAudio: false
    },
    callbacks: {
        preBoot: function (game) {
            console.log('Phaser preBoot callback');
        },
        postBoot: function (game) {
            console.log('Phaser postBoot callback - game started successfully');
        }
    }
};

// Initialize the game
try {
    const game = new Phaser.Game(phaserConfig);
    console.log('Phaser game instance created:', game);
} catch (error) {
    console.error('Error creating Phaser game:', error);
    // Hide loading screen on error
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.innerHTML = '<h1>⚠️ Error Loading Game</h1><p>' + error.message + '</p><p>Check console for details</p>';
    }
}

// Prevent default touch behaviors
document.addEventListener('touchmove', (e) => {
    e.preventDefault();
}, { passive: false });

// Prevent zoom on mobile
document.addEventListener('gesturestart', (e) => {
    e.preventDefault();
});

// Handle visibility changes (pause when tab not active)
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        game.sound.pauseAll();
    } else {
        game.sound.resumeAll();
    }
});

// Console welcome message
console.log(`
╔═══════════════════════════════════════╗
║                                       ║
║         ⚡ GAGA BALL ⚡               ║
║                                       ║
║   The Most Addictive Pit Game Ever!  ║
║                                       ║
║   Can you survive 30 seconds?        ║
║                                       ║
╚═══════════════════════════════════════╝
`);

// Add some helpful debug commands
window.gagaDebug = {
    resetProgress: () => {
        if (confirm('Reset all game progress? This cannot be undone!')) {
            playerData.reset();
            window.location.reload();
        }
    },
    addCoins: (amount) => {
        playerData.addCoins(amount);
        console.log(`Added ${amount} coins. Total: ${playerData.data.coins}`);
    },
    showStats: () => {
        console.table({
            Coins: playerData.data.coins,
            Wins: playerData.data.wins,
            'Total Matches': playerData.data.totalMatches,
            'Win Rate': playerData.getWinRate() + '%',
            Eliminations: playerData.data.eliminations,
            'Current Streak': playerData.data.stats.currentWinStreak,
            'Best Streak': playerData.data.stats.longestWinStreak
        });
    },
    unlockAll: () => {
        Object.keys(SKINS).forEach(skin => playerData.unlockSkin(skin));
        Object.keys(ARENAS).forEach(arena => playerData.unlockArena(arena));
        console.log('Unlocked all skins and arenas!');
    }
};

console.log('Debug commands available:');
console.log('  gagaDebug.resetProgress() - Reset all progress');
console.log('  gagaDebug.addCoins(amount) - Add coins');
console.log('  gagaDebug.showStats() - Show player stats');
console.log('  gagaDebug.unlockAll() - Unlock all items');
