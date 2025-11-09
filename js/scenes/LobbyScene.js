// Lobby scene for multiplayer matchmaking
console.log('Loading LobbyScene.js...');
class LobbyScene extends Phaser.Scene {
    constructor() {
        super({ key: 'LobbyScene' });
    }

    init(data) {
        this.mode = data.mode; // 'host' or 'join'
        this.roomId = data.roomId || null;
    }

    create() {
        const { width, height } = this.cameras.main;
        const centerX = width / 2;
        const centerY = height / 2;

        // Background
        this.add.rectangle(0, 0, width, height, 0x1e1b4b).setOrigin(0, 0);

        if (this.mode === 'host') {
            this.createHostLobby(centerX, centerY);
        } else if (this.mode === 'join') {
            this.createJoinLobby(centerX, centerY);
        } else {
            this.createModeSelection(centerX, centerY);
        }
    }

    createModeSelection(centerX, centerY) {
        // Title
        this.add.text(centerX, 80, 'MULTIPLAYER', {
            fontSize: '48px',
            fontStyle: 'bold',
            color: '#fbbf24',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5);

        // Host button
        const hostBtn = this.createButton(centerX, centerY - 60, 'HOST GAME', () => {
            this.mode = 'host';
            this.scene.restart({ mode: 'host' });
        }, 0x10b981, 300);

        // Join button
        const joinBtn = this.createButton(centerX, centerY + 20, 'JOIN GAME', () => {
            this.mode = 'join';
            this.scene.restart({ mode: 'join' });
        }, 0x3b82f6, 300);

        // Back button
        const backBtn = this.createButton(centerX, centerY + 100, 'BACK', () => {
            this.scene.start('MenuScene');
        }, 0x6366f1, 200);

        // Info text
        this.add.text(centerX, height - 80, 'Play with friends online - completely free!', {
            fontSize: '16px',
            color: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 10, y: 5 }
        }).setOrigin(0.5);
    }

    createHostLobby(centerX, centerY) {
        // Title
        this.add.text(centerX, 60, 'HOSTING GAME', {
            fontSize: '42px',
            fontStyle: 'bold',
            color: '#10b981',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5);

        // Status text
        this.statusText = this.add.text(centerX, 120, 'Initializing...', {
            fontSize: '20px',
            color: '#ffffff'
        }).setOrigin(0.5);

        // Room code display
        this.roomCodeText = this.add.text(centerX, 180, '', {
            fontSize: '48px',
            fontStyle: 'bold',
            color: '#fbbf24',
            backgroundColor: '#000000',
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5);

        this.add.text(centerX, 240, 'Share this code with friends!', {
            fontSize: '18px',
            color: '#ffffff'
        }).setOrigin(0.5);

        // Players list
        this.add.text(centerX, 300, 'PLAYERS:', {
            fontSize: '24px',
            fontStyle: 'bold',
            color: '#fbbf24'
        }).setOrigin(0.5);

        this.playersContainer = this.add.container(centerX, 340);

        // Start button (initially disabled)
        this.startButton = this.createButton(centerX, height - 120, 'START GAME', () => {
            this.startMultiplayerGame();
        }, 0x10b981, 250);
        this.startButton.setAlpha(0.5);

        // Cancel button
        this.createButton(centerX, height - 60, 'CANCEL', () => {
            networkManager.disconnect();
            this.scene.start('LobbyScene');
        }, 0xef4444, 200);

        // Initialize as host
        this.initializeHost();
    }

    createJoinLobby(centerX, centerY) {
        // Title
        this.add.text(centerX, 60, 'JOIN GAME', {
            fontSize: '42px',
            fontStyle: 'bold',
            color: '#3b82f6',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5);

        // Instruction
        this.add.text(centerX, 140, 'Enter Room Code:', {
            fontSize: '24px',
            color: '#ffffff'
        }).setOrigin(0.5);

        // Room code input (simulated with text)
        this.roomCodeInput = '';
        this.roomCodeDisplay = this.add.text(centerX, 200, '______', {
            fontSize: '48px',
            fontStyle: 'bold',
            color: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 20, y: 10 },
            fixedWidth: 300,
            align: 'center'
        }).setOrigin(0.5);

        // Status text
        this.statusText = this.add.text(centerX, 280, '', {
            fontSize: '18px',
            color: '#ff0000'
        }).setOrigin(0.5);

        // Join button
        this.joinButton = this.createButton(centerX, height - 120, 'JOIN', () => {
            this.joinGame();
        }, 0x3b82f6, 200);

        // Back button
        this.createButton(centerX, height - 60, 'BACK', () => {
            this.scene.start('LobbyScene');
        }, 0x6366f1, 200);

        // Keyboard input
        this.input.keyboard.on('keydown', (event) => {
            const key = event.key.toUpperCase();

            if (key === 'BACKSPACE') {
                this.roomCodeInput = this.roomCodeInput.slice(0, -1);
            } else if (key === 'ENTER' && this.roomCodeInput.length === 6) {
                this.joinGame();
            } else if (/^[A-Z0-9]$/.test(key) && this.roomCodeInput.length < 6) {
                this.roomCodeInput += key;
            }

            this.updateRoomCodeDisplay();
        });
    }

    updateRoomCodeDisplay() {
        const display = this.roomCodeInput.padEnd(6, '_');
        this.roomCodeDisplay.setText(display);

        if (this.roomCodeInput.length === 6) {
            this.roomCodeDisplay.setColor('#10b981');
        } else {
            this.roomCodeDisplay.setColor('#ffffff');
        }
    }

    async initializeHost() {
        try {
            this.statusText.setText('Creating room...');

            const roomId = await networkManager.initializeHost('You');

            this.roomCodeText.setText(roomId);
            this.statusText.setText('Waiting for players...');

            // Set up network callbacks
            networkManager.on('onPlayerJoined', (player) => {
                console.log('Player joined:', player);
                this.updatePlayersList();
                this.checkStartButton();
            });

            networkManager.on('onPlayerLeft', (playerId) => {
                console.log('Player left:', playerId);
                this.updatePlayersList();
                this.checkStartButton();
            });

            this.updatePlayersList();

        } catch (error) {
            console.error('Failed to initialize host:', error);
            this.statusText.setText('Error creating room. Please try again.');
        }
    }

    async joinGame() {
        if (this.roomCodeInput.length !== 6) {
            this.statusText.setText('Please enter a 6-character room code');
            return;
        }

        try {
            this.statusText.setText('Connecting...');
            this.statusText.setColor('#ffffff');

            await networkManager.initializeClient(this.roomCodeInput, 'Player');

            this.statusText.setText('Connected! Waiting for host...');
            this.statusText.setColor('#10b981');

            // Set up network callbacks
            networkManager.on('onGameState', (event, data) => {
                if (event === 'start') {
                    this.scene.start('GameScene', { multiplayer: true, isHost: false });
                }
            });

        } catch (error) {
            console.error('Failed to join game:', error);
            this.statusText.setText('Could not join room. Check the code and try again.');
            this.statusText.setColor('#ef4444');
        }
    }

    updatePlayersList() {
        // Clear existing player displays
        this.playersContainer.removeAll(true);

        const players = networkManager.getAllPlayers();
        const yOffset = 0;

        players.forEach((player, index) => {
            const playerText = this.add.text(0, yOffset + index * 35,
                `${player.id === networkManager.playerId ? '👑 ' : ''}${player.name}${player.ready ? ' ✓' : ''}`, {
                fontSize: '20px',
                color: player.ready ? '#10b981' : '#ffffff',
                backgroundColor: '#000000',
                padding: { x: 10, y: 5 }
            }).setOrigin(0.5);

            this.playersContainer.add(playerText);
        });
    }

    checkStartButton() {
        const playerCount = networkManager.getPlayerCount();

        if (playerCount >= 2) {
            this.startButton.setAlpha(1);
        } else {
            this.startButton.setAlpha(0.5);
        }
    }

    startMultiplayerGame() {
        const playerCount = networkManager.getPlayerCount();

        if (playerCount < 2) {
            this.statusText.setText('Need at least 2 players to start!');
            this.statusText.setColor('#ef4444');
            return;
        }

        // Start the game
        networkManager.startGame({ timestamp: Date.now() });
        this.scene.start('GameScene', { multiplayer: true, isHost: true });
    }

    createButton(x, y, text, callback, color = 0x6366f1, width = 200) {
        const button = this.add.container(x, y);

        const bg = this.add.rectangle(0, 0, width, 50, color);
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
}
