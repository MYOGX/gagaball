// Boot scene - initial loading and asset generation
console.log('Loading BootScene.js...');
class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        console.log('BootScene: preload started');
        // Create procedural sounds (simple beeps for now - can be replaced with real audio files)
        // Commenting out for now as they may cause issues
        // this.createSounds();
    }

    create() {
        console.log('BootScene: create started');

        // Hide loading screen
        const loadingScreen = document.getElementById('loading-screen');
        console.log('Loading screen element:', loadingScreen);

        if (loadingScreen) {
            setTimeout(() => {
                console.log('Hiding loading screen');
                loadingScreen.style.display = 'none';
            }, 100);
        }

        // Check for daily reward availability
        try {
            this.checkDailyReward();
        } catch (e) {
            console.error('Error checking daily reward:', e);
        }

        // Start menu
        console.log('Starting MenuScene');
        this.scene.start('MenuScene');
    }

    checkDailyReward() {
        const result = playerData.claimDailyReward();

        if (result.claimed) {
            // Show notification later in menu
            this.registry.set('dailyReward', result);
        }
    }
}
