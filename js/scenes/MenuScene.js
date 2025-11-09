// Menu scene - main menu with stats, shop, and start game
console.log('Loading MenuScene.js...');
class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    create() {
        console.log('MenuScene: create started');
        const { width, height } = this.cameras.main;
        const centerX = width / 2;
        const centerY = height / 2;
        console.log('MenuScene dimensions:', width, height);

        // Background
        this.add.rectangle(0, 0, width, height, GAME_CONFIG.COLORS.BACKGROUND).setOrigin(0, 0);

        // Title
        const title = this.add.text(centerX, 80, '⚡ GAGA BALL ⚡', {
            fontSize: '64px',
            fontStyle: 'bold',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 6,
            shadow: {
                offsetX: 0,
                offsetY: 0,
                color: '#fbbf24',
                blur: 20,
                fill: true
            }
        }).setOrigin(0.5);

        // Animate title
        this.tweens.add({
            targets: title,
            scale: 1.1,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Tagline
        this.add.text(centerX, 150, 'Can you survive 30 seconds in the pit?', {
            fontSize: '20px',
            color: '#fbbf24',
            fontStyle: 'italic'
        }).setOrigin(0.5);

        // Player stats panel
        this.createStatsPanel(centerX, 220);

        // Buttons
        this.createButton(centerX, 400, 'PLAY NOW', () => this.startGame(), 0x10b981);
        this.createButton(centerX, 470, 'SHOP', () => this.openShop(), 0x6366f1);
        this.createButton(centerX, 540, 'STATS', () => this.openStats(), 0xec4899);

        // Footer info
        this.add.text(centerX, height - 40, 'Desktop: WASD/Arrows | Mobile: Touch to move', {
            fontSize: '14px',
            color: '#9ca3af',
            align: 'center'
        }).setOrigin(0.5);

        // Daily reward notification
        const dailyReward = this.registry.get('dailyReward');
        if (dailyReward && dailyReward.claimed && dailyReward.reward) {
            this.showDailyRewardPopup(dailyReward);
        }

        // Coins display (top right)
        this.createCoinsDisplay(width - 20, 20);
    }

    createStatsPanel(x, y) {
        const panel = this.add.container(x, y);

        // Background
        const bg = this.add.rectangle(0, 0, 400, 120, 0x1f2937, 0.8);
        bg.setStrokeStyle(2, GAME_CONFIG.COLORS.PRIMARY);
        panel.add(bg);

        const data = playerData.data;

        // Stats text
        const stats = [
            `Wins: ${data.wins} | Matches: ${data.totalMatches} | Win Rate: ${playerData.getWinRate()}%`,
            `Eliminations: ${data.eliminations} | Win Streak: ${data.stats.currentWinStreak}`,
            `Best Streak: ${data.stats.longestWinStreak} | Best Time: ${data.bestTime.toFixed(1)}s`
        ];

        stats.forEach((stat, i) => {
            panel.add(this.add.text(0, -40 + i * 35, stat, {
                fontSize: '16px',
                color: '#ffffff',
                align: 'center'
            }).setOrigin(0.5));
        });

        return panel;
    }

    createButton(x, y, text, callback, color = 0x6366f1) {
        const button = this.add.container(x, y);

        const bg = this.add.rectangle(0, 0, 300, 50, color);
        bg.setInteractive({ useHandCursor: true });

        const label = this.add.text(0, 0, text, {
            fontSize: '24px',
            fontStyle: 'bold',
            color: '#ffffff'
        }).setOrigin(0.5);

        button.add([bg, label]);

        // Hover effects
        bg.on('pointerover', () => {
            bg.setFillStyle(Phaser.Display.Color.GetColor(
                Math.min(255, Phaser.Display.Color.IntegerToRGB(color).r + 30),
                Math.min(255, Phaser.Display.Color.IntegerToRGB(color).g + 30),
                Math.min(255, Phaser.Display.Color.IntegerToRGB(color).b + 30)
            ));
            this.tweens.add({
                targets: button,
                scale: 1.05,
                duration: 100
            });
        });

        bg.on('pointerout', () => {
            bg.setFillStyle(color);
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

    createCoinsDisplay(x, y) {
        const container = this.add.container(x, y);

        const bg = this.add.rectangle(0, 0, 150, 40, 0xfbbf24, 0.9);
        bg.setOrigin(1, 0);

        const text = this.add.text(-10, 20, `💰 ${playerData.data.coins}`, {
            fontSize: '20px',
            fontStyle: 'bold',
            color: '#000000'
        }).setOrigin(1, 0.5);

        container.add([bg, text]);
    }

    startGame() {
        this.scene.start('GameScene');
    }

    openShop() {
        // Simple shop overlay
        const { width, height } = this.cameras.main;

        const overlay = this.add.container(0, 0);

        // Darken background
        const dimmer = this.add.rectangle(0, 0, width, height, 0x000000, 0.7).setOrigin(0, 0);
        dimmer.setInteractive();

        // Shop panel
        const shopBg = this.add.rectangle(width/2, height/2, 600, 500, 0x1f2937);
        shopBg.setStrokeStyle(4, GAME_CONFIG.COLORS.PRIMARY);

        const title = this.add.text(width/2, height/2 - 200, 'SHOP - Coming Soon!', {
            fontSize: '32px',
            fontStyle: 'bold',
            color: '#ffffff'
        }).setOrigin(0.5);

        const desc = this.add.text(width/2, height/2 - 150, 'Unlock skins, arenas, and power-ups!', {
            fontSize: '18px',
            color: '#9ca3af'
        }).setOrigin(0.5);

        // Close button
        const closeBtn = this.add.text(width/2, height/2 + 180, 'CLOSE', {
            fontSize: '24px',
            fontStyle: 'bold',
            color: '#ffffff',
            backgroundColor: '#ef4444',
            padding: { x: 40, y: 10 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        closeBtn.on('pointerdown', () => {
            overlay.destroy();
        });

        overlay.add([dimmer, shopBg, title, desc, closeBtn]);
    }

    openStats() {
        // Stats overlay
        const { width, height } = this.cameras.main;

        const overlay = this.add.container(0, 0);

        const dimmer = this.add.rectangle(0, 0, width, height, 0x000000, 0.7).setOrigin(0, 0);
        dimmer.setInteractive();

        const statsBg = this.add.rectangle(width/2, height/2, 600, 500, 0x1f2937);
        statsBg.setStrokeStyle(4, GAME_CONFIG.COLORS.PRIMARY);

        const title = this.add.text(width/2, height/2 - 220, 'YOUR STATS', {
            fontSize: '32px',
            fontStyle: 'bold',
            color: '#ffffff'
        }).setOrigin(0.5);

        const data = playerData.data;
        const statsText = [
            `Total Wins: ${data.wins}`,
            `Total Matches: ${data.totalMatches}`,
            `Win Rate: ${playerData.getWinRate()}%`,
            `Total Eliminations: ${data.eliminations}`,
            `Current Win Streak: ${data.stats.currentWinStreak}`,
            `Best Win Streak: ${data.stats.longestWinStreak}`,
            `Best Time: ${data.bestTime > 0 ? data.bestTime.toFixed(1) + 's' : 'N/A'}`,
            `Total Coins Earned: ${data.coins}`
        ];

        statsText.forEach((stat, i) => {
            this.add.text(width/2, height/2 - 160 + i * 40, stat, {
                fontSize: '18px',
                color: '#ffffff'
            }).setOrigin(0.5);
        });

        overlay.add([dimmer, statsBg, title]);

        const closeBtn = this.add.text(width/2, height/2 + 200, 'CLOSE', {
            fontSize: '24px',
            fontStyle: 'bold',
            color: '#ffffff',
            backgroundColor: '#ef4444',
            padding: { x: 40, y: 10 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        closeBtn.on('pointerdown', () => {
            overlay.destroy();
        });

        overlay.add(closeBtn);
    }

    showDailyRewardPopup(reward) {
        const { width, height } = this.cameras.main;

        const popup = this.add.container(width/2, -200);

        const bg = this.add.rectangle(0, 0, 400, 120, 0xfbbf24);
        bg.setStrokeStyle(4, 0xfde047);

        const text = this.add.text(0, -20, '🎁 DAILY REWARD CLAIMED!', {
            fontSize: '24px',
            fontStyle: 'bold',
            color: '#000000'
        }).setOrigin(0.5);

        const amount = this.add.text(0, 20, `+${reward.reward} Coins | Streak: ${reward.streak} days`, {
            fontSize: '18px',
            color: '#000000'
        }).setOrigin(0.5);

        popup.add([bg, text, amount]);

        // Animate in
        this.tweens.add({
            targets: popup,
            y: 100,
            duration: 500,
            ease: 'Back.easeOut'
        });

        // Animate out after 3 seconds
        this.time.delayedCall(3000, () => {
            this.tweens.add({
                targets: popup,
                y: -200,
                duration: 500,
                ease: 'Back.easeIn',
                onComplete: () => popup.destroy()
            });
        });
    }
}
