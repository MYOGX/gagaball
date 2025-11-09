// Game Over scene - results and rewards
console.log('Loading GameOverScene.js...');
class GameOverScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameOverScene' });
    }

    init(data) {
        this.won = data.won;
        this.eliminationCount = data.eliminationCount;
        this.matchDuration = data.matchDuration;
        this.survived = data.survived;
    }

    create() {
        const { width, height } = this.cameras.main;
        const centerX = width / 2;
        const centerY = height / 2;

        // Background
        this.add.rectangle(0, 0, width, height,
            this.won ? 0x14532d : 0x450a0a).setOrigin(0, 0);

        // Results container
        const container = this.add.container(centerX, -500);

        // Result text
        const resultText = this.won ? '🏆 VICTORY! 🏆' : '💀 ELIMINATED 💀';
        const resultColor = this.won ? '#10b981' : '#ef4444';

        const result = this.add.text(0, 0, resultText, {
            fontSize: '56px',
            fontStyle: 'bold',
            color: resultColor,
            stroke: '#000000',
            strokeThickness: 8,
            shadow: {
                offsetX: 0,
                offsetY: 0,
                color: resultColor,
                blur: 30,
                fill: true
            }
        }).setOrigin(0.5);

        container.add(result);

        // Stats panel
        const statsY = 100;
        const stats = [
            `Match Duration: ${this.matchDuration.toFixed(1)}s`,
            `Eliminations: ${this.eliminationCount}`,
            `Status: ${this.survived ? 'Survived' : 'Eliminated'}`
        ];

        stats.forEach((stat, i) => {
            const text = this.add.text(0, statsY + i * 40, stat, {
                fontSize: '24px',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 4
            }).setOrigin(0.5);
            container.add(text);
        });

        // Rewards
        const rewardsY = 280;
        this.add.text(centerX, centerY + rewardsY - 500, '💰 REWARDS', {
            fontSize: '32px',
            fontStyle: 'bold',
            color: '#fbbf24',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        const rewards = this.calculateRewards();
        let totalCoins = 0;
        let rewardTextY = rewardsY + 50;

        rewards.forEach((reward, i) => {
            totalCoins += reward.amount;

            const rewardText = this.add.text(0, rewardTextY + i * 35, `${reward.label}: +${reward.amount}`, {
                fontSize: '20px',
                color: '#ffffff'
            }).setOrigin(0.5);
            container.add(rewardText);

            // Animate reward appearing
            rewardText.setAlpha(0);
            this.tweens.add({
                targets: rewardText,
                alpha: 1,
                delay: 1000 + i * 200,
                duration: 300
            });
        });

        // Total
        const totalY = rewardTextY + rewards.length * 35 + 20;
        const totalText = this.add.text(0, totalY, `TOTAL: +${totalCoins} COINS`, {
            fontSize: '28px',
            fontStyle: 'bold',
            color: '#fbbf24',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);
        container.add(totalText);

        totalText.setAlpha(0);
        this.tweens.add({
            targets: totalText,
            alpha: 1,
            delay: 1000 + rewards.length * 200 + 300,
            duration: 500
        });

        // Buttons
        const buttonsY = totalY + 70;

        const playAgainBtn = this.createButton(0, buttonsY, 'PLAY AGAIN', () => {
            this.scene.start('GameScene');
        }, 0x10b981);
        container.add(playAgainBtn);

        const menuBtn = this.createButton(0, buttonsY + 70, 'MENU', () => {
            this.scene.start('MenuScene');
        }, 0x6366f1);
        container.add(menuBtn);

        // Share button (for future implementation)
        if (this.won) {
            const shareBtn = this.createButton(0, buttonsY + 140, 'SHARE VICTORY', () => {
                this.shareVictory();
            }, 0xec4899);
            container.add(shareBtn);
        }

        // Animate container in
        this.tweens.add({
            targets: container,
            y: centerY - 50,
            duration: 1000,
            ease: 'Bounce.easeOut'
        });

        // Play sound
        try {
            if (this.won && this.sound.get('win')) {
                this.sound.play('win', { volume: 0.7 });
            } else if (!this.won && this.sound.get('lose')) {
                this.sound.play('lose', { volume: 0.5 });
            }
        } catch (e) {
            // Sound not loaded, skip
        }

        // Confetti for wins
        if (this.won) {
            this.createConfetti();
        }
    }

    calculateRewards() {
        const rewards = [];

        if (this.won) {
            rewards.push({
                label: 'Victory Bonus',
                amount: GAME_CONFIG.COINS_PER_WIN
            });
        }

        if (this.eliminationCount > 0) {
            rewards.push({
                label: `Eliminations (${this.eliminationCount})`,
                amount: this.eliminationCount * GAME_CONFIG.COINS_PER_ELIMINATION
            });
        }

        if (this.survived) {
            rewards.push({
                label: 'Survival Bonus',
                amount: GAME_CONFIG.COINS_PER_SURVIVAL
            });
        }

        return rewards;
    }

    createButton(x, y, text, callback, color = 0x6366f1) {
        const button = this.add.container(x, y);

        const bg = this.add.rectangle(0, 0, 250, 50, color);
        bg.setInteractive({ useHandCursor: true });

        const label = this.add.text(0, 0, text, {
            fontSize: '20px',
            fontStyle: 'bold',
            color: '#ffffff'
        }).setOrigin(0.5);

        button.add([bg, label]);

        // Hover effects
        bg.on('pointerover', () => {
            this.tweens.add({
                targets: button,
                scale: 1.05,
                duration: 100
            });
        });

        bg.on('pointerout', () => {
            this.tweens.add({
                targets: button,
                scale: 1,
                duration: 100
            });
        });

        bg.on('pointerdown', () => {
            this.tweens.add({
                targets: button,
                scale: 0.95,
                duration: 50,
                yoyo: true,
                onComplete: callback
            });
        });

        return button;
    }

    createConfetti() {
        const { width, height } = this.cameras.main;

        for (let i = 0; i < 50; i++) {
            const x = Math.random() * width;
            const y = -50;
            const color = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff][Math.floor(Math.random() * 5)];
            const size = 5 + Math.random() * 10;

            const confetti = this.add.rectangle(x, y, size, size, color);
            confetti.rotation = Math.random() * Math.PI * 2;

            this.tweens.add({
                targets: confetti,
                y: height + 50,
                rotation: confetti.rotation + Math.PI * 4,
                duration: 3000 + Math.random() * 2000,
                delay: Math.random() * 1000,
                onComplete: () => confetti.destroy()
            });
        }
    }

    shareVictory() {
        // Future: Share to social media or clipboard
        const shareText = `🏆 I just won GaGa Ball! ${this.eliminationCount} eliminations in ${this.matchDuration.toFixed(1)}s! Can you beat that?`;

        // Try to copy to clipboard
        if (navigator.clipboard) {
            navigator.clipboard.writeText(shareText).then(() => {
                this.showNotification('Victory stats copied to clipboard!');
            }).catch(() => {
                this.showNotification('Share feature coming soon!');
            });
        } else {
            this.showNotification(shareText);
        }
    }

    showNotification(text) {
        const { width } = this.cameras.main;

        const notification = this.add.text(width / 2, 50, text, {
            fontSize: '18px',
            color: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5);

        this.tweens.add({
            targets: notification,
            alpha: 0,
            y: 0,
            delay: 2000,
            duration: 500,
            onComplete: () => notification.destroy()
        });
    }
}
