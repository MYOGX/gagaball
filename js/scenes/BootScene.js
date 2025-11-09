// Boot scene - initial loading and asset generation
class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        // Create procedural sounds (simple beeps for now - can be replaced with real audio files)
        this.createSounds();

        // Loading progress
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.display = 'flex';
        }

        this.load.on('complete', () => {
            if (loadingScreen) {
                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                }, 500);
            }
        });
    }

    create() {
        // Check for daily reward availability
        this.checkDailyReward();

        // Start menu
        this.scene.start('MenuScene');
    }

    createSounds() {
        // We'll use simple Web Audio API tones for now
        // In production, replace with actual audio files

        // Hit sound
        this.sound.add('hit', {
            mute: false,
            volume: 0.7,
            rate: 1,
            detune: 0,
            seek: 0,
            loop: false,
            delay: 0
        });

        // Eliminate sound
        this.sound.add('eliminate', {
            mute: false,
            volume: 0.8,
            rate: 1,
            detune: 0,
            seek: 0,
            loop: false,
            delay: 0
        });

        // Powerup sound
        this.sound.add('powerup', {
            mute: false,
            volume: 0.6,
            rate: 1,
            detune: 0,
            seek: 0,
            loop: false,
            delay: 0
        });

        // Win sound
        this.sound.add('win', {
            mute: false,
            volume: 1,
            rate: 1,
            detune: 0,
            seek: 0,
            loop: false,
            delay: 0
        });

        // Lose sound
        this.sound.add('lose', {
            mute: false,
            volume: 0.8,
            rate: 1,
            detune: 0,
            seek: 0,
            loop: false,
            delay: 0
        });
    }

    checkDailyReward() {
        const result = playerData.claimDailyReward();

        if (result.claimed) {
            // Show notification later in menu
            this.registry.set('dailyReward', result);
        }
    }
}
