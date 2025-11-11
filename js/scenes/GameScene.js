// Main game scene - core gameplay
console.log('Loading GameScene.js...');
class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    init(data) {
        this.isMultiplayer = data.multiplayer || false;
        this.isHost = data.isHost || false;
        this.networkPlayers = {}; // Map of network player ID -> player sprite
    }

    create() {
        const { width, height } = this.cameras.main;
        this.centerX = width / 2;
        this.centerY = height / 2;

        // Game state
        this.gameStartTime = Date.now();
        this.roundDuration = GAME_CONFIG.ROUND_DURATION;
        this.eliminationCount = 0;
        this.isGameOver = false;
        this.slowMotionActive = false;

        // Setup
        this.createArena();
        this.createBall();
        this.createPlayers();
        this.retargetBall(); // Initial targeting after players are created
        this.createUI();
        this.setupPhysics();
        this.setupControls();
        this.createParticles();

        // Power-up spawning
        this.powerups = [];
        this.time.addEvent({
            delay: GAME_CONFIG.POWERUP_SPAWN_INTERVAL,
            callback: () => this.spawnPowerup(),
            loop: true
        });

        // First powerup after 10 seconds
        this.time.delayedCall(10000, () => this.spawnPowerup());

        // Setup multiplayer networking
        if (this.isMultiplayer) {
            this.setupNetworking();
        }
    }

    setupNetworking() {
        console.log('Setting up multiplayer networking. isHost:', this.isHost);

        // Handle player updates from network
        networkManager.on('onPlayerUpdate', (data) => {
            if (data.playerId === networkManager.playerId) return; // Skip own updates

            const networkPlayer = this.networkPlayers[data.playerId];
            if (networkPlayer && networkPlayer.isAlive) {
                // Smoothly interpolate to new position
                this.tweens.add({
                    targets: networkPlayer,
                    x: data.x,
                    y: data.y,
                    duration: 50,
                    ease: 'Linear'
                });

                // Update power shot state
                if (data.chargingPowerShot !== undefined) {
                    networkPlayer.chargingPowerShot = data.chargingPowerShot;
                }
            }
        });

        // Handle ball updates from host
        if (!this.isHost) {
            networkManager.on('onBallUpdate', (data) => {
                if (this.ball && this.ball.body) {
                    this.ball.x = data.x;
                    this.ball.y = data.y;
                    this.ball.body.setVelocity(data.vx, data.vy);
                }
            });
        }

        // Handle player eliminations
        networkManager.on('onGameState', (event, data) => {
            if (event === 'elimination') {
                const player = this.networkPlayers[data.playerId] ||
                              (this.humanPlayer.playerId === data.playerId ? this.humanPlayer : null);
                if (player && player.isAlive) {
                    this.eliminatePlayer(player);
                }
            } else if (event === 'gameOver') {
                this.endGame(data.won);
            }
        });

        // Create network players for all remote players
        const allPlayers = networkManager.getAllPlayers();
        allPlayers.forEach(player => {
            if (player.id !== networkManager.playerId) {
                this.createNetworkPlayer(player);
            }
        });

        // Mark local player with network ID
        this.humanPlayer.playerId = networkManager.playerId;

        // Send player updates every frame (throttled in update())
        this.lastNetworkUpdate = 0;
        this.networkUpdateInterval = 50; // ms
    }

    createNetworkPlayer(playerData) {
        console.log('Creating network player:', playerData);

        // Find a spawn position
        const angle = Math.random() * Math.PI * 2;
        const distance = GAME_CONFIG.ARENA_RADIUS * 0.6;
        const x = this.arena.centerX + Math.cos(angle) * distance;
        const y = this.arena.centerY + Math.sin(angle) * distance;

        // Create player sprite (similar to createPlayer but for remote player)
        const player = this.add.circle(x, y, GAME_CONFIG.PLAYER_RADIUS, this.getRandomColor());
        this.physics.add.existing(player);
        player.body.setCircle(GAME_CONFIG.PLAYER_RADIUS);
        player.body.setCollideWorldBounds(false);

        player.isAlive = true;
        player.isHuman = true; // It's a human, but controlled remotely
        player.isRemote = true; // Mark as remote player
        player.playerId = playerData.id;
        player.invulnerableUntil = Date.now() + GAME_CONFIG.INVULNERABILITY_TIME;
        player.activePowerup = null;
        player.powerupEndTime = 0;
        player.chargingPowerShot = false;
        player.powerShotReady = true;

        // Player name
        player.nameText = this.add.text(x, y - 35, playerData.name || 'Player', {
            fontSize: '12px',
            fontStyle: 'bold',
            color: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 5, y: 2 }
        }).setOrigin(0.5);

        // Invincibility shield
        player.shield = this.add.circle(x, y, GAME_CONFIG.PLAYER_RADIUS + 10, 0xffffff, 0);
        player.shield.setStrokeStyle(3, 0x10b981, 1);
        this.tweens.add({
            targets: player.shield,
            alpha: { from: 0.5, to: 0 },
            duration: 500,
            yoyo: true,
            repeat: -1
        });

        // Add to players array and network players map
        this.players.push(player);
        this.networkPlayers[playerData.id] = player;

        return player;
    }

    createArena() {
        const arena = this.currentArena || ARENAS.classic;

        // Playground grass background
        this.add.rectangle(0, 0, this.cameras.main.width, this.cameras.main.height,
            0x4a7c59).setOrigin(0, 0); // Darker grass green

        // Arena graphics
        this.arenaGraphics = this.add.graphics();

        // Wooden octagon border (like real gaga ball pits)
        const numSides = 8;
        const borderRadius = GAME_CONFIG.ARENA_RADIUS + 15;
        this.arenaGraphics.fillStyle(0x8b6f47, 1); // Brown wood color
        this.arenaGraphics.beginPath();
        for (let i = 0; i < numSides; i++) {
            const angle = (Math.PI * 2 * i) / numSides - Math.PI / 2;
            const x = this.centerX + Math.cos(angle) * borderRadius;
            const y = this.centerY + Math.sin(angle) * borderRadius;
            if (i === 0) {
                this.arenaGraphics.moveTo(x, y);
            } else {
                this.arenaGraphics.lineTo(x, y);
            }
        }
        this.arenaGraphics.closePath();
        this.arenaGraphics.fillPath();

        // Sand pit (tan color)
        this.arenaGraphics.fillStyle(0xddb892, 1); // Sandy tan color
        this.arenaGraphics.fillCircle(this.centerX, this.centerY, GAME_CONFIG.ARENA_RADIUS);

        // Add sand texture (random dots)
        for (let i = 0; i < 100; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * GAME_CONFIG.ARENA_RADIUS;
            const x = this.centerX + Math.cos(angle) * distance;
            const y = this.centerY + Math.sin(angle) * distance;
            const size = Math.random() * 2 + 1;
            const shade = Math.random() > 0.5 ? 0xc9a876 : 0xe8d4b8;
            this.arenaGraphics.fillStyle(shade, 0.3);
            this.arenaGraphics.fillCircle(x, y, size);
        }

        // Wood plank border segments
        for (let i = 0; i < numSides; i++) {
            const angle1 = (Math.PI * 2 * i) / numSides - Math.PI / 2;
            const angle2 = (Math.PI * 2 * (i + 1)) / numSides - Math.PI / 2;

            const x1 = this.centerX + Math.cos(angle1) * GAME_CONFIG.ARENA_RADIUS;
            const y1 = this.centerY + Math.sin(angle1) * GAME_CONFIG.ARENA_RADIUS;
            const x2 = this.centerX + Math.cos(angle2) * GAME_CONFIG.ARENA_RADIUS;
            const y2 = this.centerY + Math.sin(angle2) * GAME_CONFIG.ARENA_RADIUS;

            this.arenaGraphics.lineStyle(12, 0x6b5638, 1); // Dark wood
            this.arenaGraphics.lineBetween(x1, y1, x2, y2);

            // Wood grain highlights
            this.arenaGraphics.lineStyle(2, 0x9d825f, 0.5);
            this.arenaGraphics.lineBetween(x1, y1, x2, y2);
        }

        // Center circle (worn spot in sand)
        this.arenaGraphics.fillStyle(0xc9a876, 0.5);
        this.arenaGraphics.fillCircle(this.centerX, this.centerY, 25);
        this.arenaGraphics.lineStyle(2, 0xb89968, 0.5);
        this.arenaGraphics.strokeCircle(this.centerX, this.centerY, 25);

        // School sign - "L.S.E"
        const signX = this.centerX;
        const signY = 50;

        // Sign post
        this.arenaGraphics.fillStyle(0x8b6f47, 1);
        this.arenaGraphics.fillRect(signX - 3, signY, 6, 40);

        // Sign board (rectangular, like school signs)
        const signWidth = 140;
        const signHeight = 50;
        this.arenaGraphics.fillStyle(0x2c5f2d, 1); // Dark green (school colors)
        this.arenaGraphics.fillRoundedRect(signX - signWidth/2, signY - signHeight/2, signWidth, signHeight, 5);

        // Sign border
        this.arenaGraphics.lineStyle(3, 0x1a3d1b, 1);
        this.arenaGraphics.strokeRoundedRect(signX - signWidth/2, signY - signHeight/2, signWidth, signHeight, 5);

        // "L.S.E" text on sign
        this.add.text(signX, signY, 'L.S.E', {
            fontSize: '32px',
            fontStyle: 'bold',
            color: '#ffffff',
            fontFamily: 'Arial, sans-serif',
            stroke: '#1a3d1b',
            strokeThickness: 4
        }).setOrigin(0.5);

        // Add grass tufts around the pit
        for (let i = 0; i < 15; i++) {
            const angle = (Math.PI * 2 * i) / 15;
            const distance = GAME_CONFIG.ARENA_RADIUS + 50 + Math.random() * 30;
            const x = this.centerX + Math.cos(angle) * distance;
            const y = this.centerY + Math.sin(angle) * distance;

            // Grass tuft
            this.arenaGraphics.fillStyle(0x5a9c6e, 0.7);
            this.arenaGraphics.fillCircle(x, y, 8);
            this.arenaGraphics.fillStyle(0x6bb583, 0.7);
            this.arenaGraphics.fillCircle(x - 3, y - 2, 6);
            this.arenaGraphics.fillCircle(x + 3, y - 2, 6);
        }

        this.arena = {
            centerX: this.centerX,
            centerY: this.centerY,
            radius: GAME_CONFIG.ARENA_RADIUS
        };
    }

    createBall() {
        this.ball = this.add.circle(this.centerX, this.centerY,
            GAME_CONFIG.BALL_RADIUS, GAME_CONFIG.COLORS.BALL);

        this.physics.add.existing(this.ball);
        this.ball.body.setCircle(GAME_CONFIG.BALL_RADIUS);
        this.ball.body.setBounce(1.0); // Perfect bounce to prevent energy loss
        this.ball.body.setDrag(20); // Very low drag so ball keeps moving
        this.ball.body.setMaxSpeed(800);
        this.ball.body.setFriction(0); // No friction

        // Ball glow
        this.ballGlow = this.add.circle(this.centerX, this.centerY,
            GAME_CONFIG.BALL_RADIUS + 8, GAME_CONFIG.COLORS.BALL_GLOW, 0.4);
        this.ballGlow.setBlendMode(Phaser.BlendModes.ADD);

        // Blade Ball style targeting
        this.ball.target = null; // Current target player
        this.ball.targetLockTime = 0; // When target was locked
        this.ball.baseSpeed = GAME_CONFIG.BALL_SPEED;
        this.ball.currentSpeed = GAME_CONFIG.BALL_SPEED;
        this.ball.speedMultiplier = 1.0;
        this.ball.hitCount = 0; // Tracks hits to increase speed

        // Ball trail effect
        this.ballTrailGraphics = this.add.graphics();

        // Track last bounce time to prevent sticking
        this.ball.lastBounceTime = 0;

        // Target indicator (arrow pointing at target)
        this.targetIndicator = this.add.graphics();
    }

    retargetBall() {
        // Find nearest alive player to target (Blade Ball style)
        const alivePlayers = this.players.filter(p => p.isAlive);
        if (alivePlayers.length === 0) return;

        // Clear old target's indicator
        if (this.ball.target && this.ball.target.isTargeted) {
            this.ball.target.isTargeted = false;
        }

        // Target closest player
        let closestPlayer = null;
        let closestDist = Infinity;

        alivePlayers.forEach(player => {
            const dist = Phaser.Math.Distance.Between(
                this.ball.x, this.ball.y,
                player.x, player.y
            );
            if (dist < closestDist) {
                closestDist = dist;
                closestPlayer = player;
            }
        });

        if (closestPlayer) {
            this.ball.target = closestPlayer;
            this.ball.target.isTargeted = true;
            this.ball.targetLockTime = Date.now();

            // Aim ball at target
            const angle = Phaser.Math.Angle.Between(
                this.ball.x, this.ball.y,
                closestPlayer.x, closestPlayer.y
            );

            this.ball.body.setVelocity(
                Math.cos(angle) * this.ball.currentSpeed,
                Math.sin(angle) * this.ball.currentSpeed
            );
        }
    }

    createPlayers() {
        this.players = [];

        // In multiplayer, reduce AI count (network players will be added separately)
        const aiCount = this.isMultiplayer ? 2 : GAME_CONFIG.MAX_AI_OPPONENTS; // Just 2 AI in multiplayer
        const totalPlayers = aiCount + 1; // AI + local player

        for (let i = 0; i < totalPlayers; i++) {
            const angle = (Math.PI * 2 * i) / totalPlayers;
            const distance = GAME_CONFIG.ARENA_RADIUS * 0.7;
            const x = this.centerX + Math.cos(angle) * distance;
            const y = this.centerY + Math.sin(angle) * distance;

            const player = this.createPlayer(x, y, i === 0);
            this.players.push(player);
        }

        this.humanPlayer = this.players[0];
    }

    createPlayer(x, y, isHuman = false) {
        const player = this.add.circle(x, y, GAME_CONFIG.PLAYER_RADIUS,
            isHuman ? SKINS[playerData.data.currentSkin].color : this.getRandomColor());

        this.physics.add.existing(player);
        player.body.setCircle(GAME_CONFIG.PLAYER_RADIUS);
        player.body.setDrag(GAME_CONFIG.PLAYER_DRAG);
        player.body.setMaxSpeed(300);

        // Player properties
        player.isHuman = isHuman;
        player.isAlive = true;
        player.radius = GAME_CONFIG.PLAYER_RADIUS;
        player.invulnerableUntil = Date.now() + GAME_CONFIG.INVULNERABILITY_TIME;
        player.ai = isHuman ? null : AIManager.createAI(this.players.length, GAME_CONFIG.MAX_AI_OPPONENTS);

        // Powerup states
        player.activePowerup = null;
        player.powerupEndTime = 0;
        player.hasMagnet = false;
        player.doubleBounce = false;
        player.invincible = false;
        player.speedMultiplier = 1;
        player.frozen = false;
        player.frozenEndTime = 0;

        // Blade Ball style parry mechanic
        player.canParry = true;
        player.parryWindow = false; // True when ball is close enough to parry
        player.lastParryTime = 0;
        player.parryCooldown = 300; // ms between parries
        player.isTargeted = false; // Is this player the ball's target?

        // Player name
        player.nameText = this.add.text(x, y - 35,
            isHuman ? 'YOU' : `Bot ${this.players.length}`, {
            fontSize: '12px',
            fontStyle: 'bold',
            color: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 5, y: 2 }
        }).setOrigin(0.5);

        // Invulnerability indicator
        if (player.invulnerableUntil > Date.now()) {
            player.shield = this.add.circle(x, y, GAME_CONFIG.PLAYER_RADIUS + 5, 0xffffff, 0);
            player.shield.setStrokeStyle(2, 0x00ff00, 1);
            this.tweens.add({
                targets: player.shield,
                alpha: { from: 0.5, to: 0 },
                duration: 500,
                yoyo: true,
                repeat: -1
            });
        }

        // Target indicator (for when ball is coming at you)
        if (isHuman) {
            player.targetWarning = this.add.circle(x, y, GAME_CONFIG.PLAYER_RADIUS + 15, 0xff0000, 0);
            player.targetWarning.setStrokeStyle(4, 0xff0000, 1);
            player.targetWarning.setVisible(false);
        }

        return player;
    }

    getRandomColor() {
        const colors = [0xef4444, 0x10b981, 0x3b82f6, 0xa855f7, 0xf59e0b, 0x06b6d4, 0xec4899];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    createUI() {
        const { width, height } = this.cameras.main;

        // Timer
        this.timerText = this.add.text(width / 2, 30, '', {
            fontSize: '32px',
            fontStyle: 'bold',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        // Players alive counter
        this.playersAliveText = this.add.text(20, 20, '', {
            fontSize: '20px',
            fontStyle: 'bold',
            color: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 10, y: 5 }
        }).setOrigin(0, 0);

        // Elimination counter
        this.eliminationsText = this.add.text(20, 60, '', {
            fontSize: '18px',
            color: '#fbbf24',
            backgroundColor: '#000000',
            padding: { x: 10, y: 5 }
        }).setOrigin(0, 0);

        // Powerup indicator
        this.powerupText = this.add.text(width - 20, 20, '', {
            fontSize: '18px',
            fontStyle: 'bold',
            color: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 10, y: 5 }
        }).setOrigin(1, 0);

        // Power shot status indicator
        this.powerShotStatusText = this.add.text(width - 20, 60, '', {
            fontSize: '18px',
            fontStyle: 'bold',
            color: '#ff0000',
            backgroundColor: '#000000',
            padding: { x: 10, y: 5 }
        }).setOrigin(1, 0);

        this.updateUI();
    }

    setupPhysics() {
        // Ball collision with arena bounds
        this.physics.world.on('worldbounds', () => {
            this.cameras.main.shake(100, 0.002);
        });
    }

    setupControls() {
        // Keyboard
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = {
            up: this.input.keyboard.addKey('W'),
            down: this.input.keyboard.addKey('S'),
            left: this.input.keyboard.addKey('A'),
            right: this.input.keyboard.addKey('D')
        };

        // Power shot control (SPACE or SHIFT)
        this.powerShotKey = this.input.keyboard.addKey('SPACE');
        this.powerShotKeyAlt = this.input.keyboard.addKey('SHIFT');

        // Touch controls
        this.input.on('pointerdown', (pointer) => {
            this.touchTarget = { x: pointer.x, y: pointer.y };
        });

        this.input.on('pointermove', (pointer) => {
            if (pointer.isDown) {
                this.touchTarget = { x: pointer.x, y: pointer.y };
            }
        });

        this.input.on('pointerup', () => {
            this.touchTarget = null;
        });
    }

    createParticles() {
        this.particleSystem = new ParticleSystem(this);
        this.particleGraphics = this.add.graphics();
    }

    update(time, delta) {
        if (this.isGameOver) return;

        // Update ball position
        this.updateBall();

        // Update players
        this.updatePlayers(time, delta);

        // Check collisions
        this.checkCollisions();

        // Update powerups
        this.updatePowerups();

        // Update particles
        this.particleSystem.update(delta);
        this.particleSystem.render(this.particleGraphics);

        // Update UI
        this.updateUI();

        // Network synchronization
        if (this.isMultiplayer) {
            this.updateNetwork(time);
        }

        // Check win/loss conditions
        this.checkGameOver();

        // Keep ball in arena
        this.constrainBallToArena();
    }

    updateNetwork(time) {
        // Throttle network updates
        if (time - this.lastNetworkUpdate < this.networkUpdateInterval) {
            return;
        }
        this.lastNetworkUpdate = time;

        // Send local player position
        if (this.humanPlayer && this.humanPlayer.isAlive) {
            networkManager.sendPlayerUpdate({
                playerId: networkManager.playerId,
                x: this.humanPlayer.x,
                y: this.humanPlayer.y,
                chargingPowerShot: this.humanPlayer.chargingPowerShot || false
            });
        }

        // Host sends ball updates
        if (this.isHost && this.ball && this.ball.body) {
            networkManager.sendBallUpdate({
                x: this.ball.x,
                y: this.ball.y,
                vx: this.ball.body.velocity.x,
                vy: this.ball.body.velocity.y
            });
        }
    }

    updateBall() {
        // Update glow position
        this.ballGlow.x = this.ball.x;
        this.ballGlow.y = this.ball.y;

        // Pulsing glow (faster when ball is faster)
        const speedFactor = this.ball.speedMultiplier || 1.0;
        const scale = 1 + Math.sin(Date.now() / (200 / speedFactor)) * 0.3;
        this.ballGlow.setScale(scale);

        // Ball trail
        if (this.ball.body.velocity.length() > 100) {
            this.particleSystem.createTrail(
                this.ball.x, this.ball.y,
                GAME_CONFIG.COLORS.BALL_GLOW,
                this.ball.body.velocity.x,
                this.ball.body.velocity.y
            );
        }

        // Draw target indicator (arrow from ball to target player)
        this.targetIndicator.clear();
        if (this.ball.target && this.ball.target.isAlive) {
            const target = this.ball.target;
            const angle = Phaser.Math.Angle.Between(this.ball.x, this.ball.y, target.x, target.y);

            // Draw line from ball to target
            this.targetIndicator.lineStyle(3, 0xff0000, 0.5);
            this.targetIndicator.beginPath();
            this.targetIndicator.moveTo(this.ball.x, this.ball.y);
            this.targetIndicator.lineTo(target.x, target.y);
            this.targetIndicator.strokePath();

            // Draw arrow head
            const arrowLength = 15;
            const arrowAngle = 0.5;
            this.targetIndicator.fillStyle(0xff0000, 0.7);
            this.targetIndicator.beginPath();
            this.targetIndicator.moveTo(target.x, target.y);
            this.targetIndicator.lineTo(
                target.x - arrowLength * Math.cos(angle - arrowAngle),
                target.y - arrowLength * Math.sin(angle - arrowAngle)
            );
            this.targetIndicator.lineTo(
                target.x - arrowLength * Math.cos(angle + arrowAngle),
                target.y - arrowLength * Math.sin(angle + arrowAngle)
            );
            this.targetIndicator.closePath();
            this.targetIndicator.fillPath();
        }
    }

    updatePlayers(time, delta) {
        this.players.forEach(player => {
            if (!player.isAlive) return;

            // Update name position
            player.nameText.x = player.x;
            player.nameText.y = player.y - 35;

            // Update shield
            if (player.shield) {
                player.shield.x = player.x;
                player.shield.y = player.y;
                if (Date.now() > player.invulnerableUntil) {
                    player.shield.destroy();
                    player.shield = null;
                }
            }

            // Update frozen state
            if (player.frozen && Date.now() > player.frozenEndTime) {
                player.frozen = false;
                player.setAlpha(1);
            }

            // Human player control
            if (player.isHuman && !player.isRemote) {
                // Only control local human player
                this.updateHumanPlayer(player, delta);
            } else if (!player.isHuman) {
                // AI control
                this.updateAIPlayer(player, time);
            }
            // Remote players are updated via network in setupNetworking()

            // Constrain to arena
            this.constrainPlayerToArena(player);

            // Check powerup expiration
            if (player.activePowerup && Date.now() > player.powerupEndTime) {
                this.clearPowerup(player);
            }

            // Magnet effect
            if (player.hasMagnet) {
                const dist = Phaser.Math.Distance.Between(player.x, player.y, this.ball.x, this.ball.y);
                if (dist < 100) {
                    const force = 200 / Math.max(dist, 1);
                    const angle = Phaser.Math.Angle.Between(this.ball.x, this.ball.y, player.x, player.y);
                    this.ball.body.velocity.x += Math.cos(angle) * force;
                    this.ball.body.velocity.y += Math.sin(angle) * force;
                }
            }
        });
    }

    updateHumanPlayer(player, delta) {
        if (player.frozen) {
            player.setAlpha(0.5);
            return;
        }

        // Update target warning indicator
        if (player.targetWarning) {
            player.targetWarning.x = player.x;
            player.targetWarning.y = player.y;

            if (player.isTargeted) {
                player.targetWarning.setVisible(true);
                // Pulse effect
                const pulse = Math.sin(Date.now() / 100) * 0.3 + 0.7;
                player.targetWarning.setAlpha(pulse);
            } else {
                player.targetWarning.setVisible(false);
            }
        }

        // Check if player can parry (ball is close)
        const distToBall = Phaser.Math.Distance.Between(player.x, player.y, this.ball.x, this.ball.y);
        const parryRange = 80; // Can parry when ball is within this range

        player.parryWindow = distToBall < parryRange;

        // Parry attempt - press space when ball is close
        const now = Date.now();
        if ((Phaser.Input.Keyboard.JustDown(this.powerShotKey) ||
             Phaser.Input.Keyboard.JustDown(this.powerShotKeyAlt)) &&
            player.parryWindow &&
            now - player.lastParryTime > player.parryCooldown) {

            player.attemptedParry = true;
            player.lastParryTime = now;
        }

        let vx = 0;
        let vy = 0;

        // Keyboard input
        if (this.cursors.left.isDown || this.wasd.left.isDown) vx = -1;
        if (this.cursors.right.isDown || this.wasd.right.isDown) vx = 1;
        if (this.cursors.up.isDown || this.wasd.up.isDown) vy = -1;
        if (this.cursors.down.isDown || this.wasd.down.isDown) vy = 1;

        // Touch input
        if (this.touchTarget) {
            const dx = this.touchTarget.x - player.x;
            const dy = this.touchTarget.y - player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 20) {
                vx = dx / dist;
                vy = dy / dist;
            }
        }

        // Normalize diagonal movement
        if (vx !== 0 && vy !== 0) {
            vx *= 0.707;
            vy *= 0.707;
        }

        const speed = GAME_CONFIG.PLAYER_SPEED * player.speedMultiplier;
        player.body.setVelocity(vx * speed, vy * speed);
    }

    updateAIPlayer(player, time) {
        if (player.frozen) {
            player.setAlpha(0.5);
            player.body.setVelocity(0, 0);
            return;
        }

        const direction = player.ai.update(player, this.ball, this.arena, this.players, time);
        const speed = GAME_CONFIG.PLAYER_SPEED * 0.9; // AI slightly slower

        player.body.setVelocity(direction.x * speed, direction.y * speed);
    }

    checkCollisions() {
        this.players.forEach(player => {
            if (!player.isAlive) return;

            // Ball collision
            const dist = Phaser.Math.Distance.Between(player.x, player.y, this.ball.x, this.ball.y);

            if (dist < GAME_CONFIG.BALL_RADIUS + GAME_CONFIG.PLAYER_RADIUS) {
                this.handleBallPlayerCollision(player);
            }

            // Powerup collision
            this.powerups.forEach(powerup => {
                powerup.checkCollision(player);
            });
        });
    }

    handleBallPlayerCollision(player) {
        const now = Date.now();

        // Check if player successfully parried (human players only)
        let parrySuccess = false;
        if (player.isHuman && player.attemptedParry) {
            parrySuccess = true;
            player.attemptedParry = false;
        }

        // Check if player is moving into ball (AI or movement-based deflection)
        const isMovingIntoBall = player.body.velocity.length() > 50;

        // If parry or moving into ball, deflect it
        if (parrySuccess || isMovingIntoBall) {
            let hitPower = GAME_CONFIG.HIT_POWER;

            if (parrySuccess) {
                hitPower *= 2.0; // PARRY HIT!

                // Increase ball speed after successful parry
                this.ball.hitCount++;
                this.ball.speedMultiplier = Math.min(2.5, 1.0 + (this.ball.hitCount * 0.15));
                this.ball.currentSpeed = this.ball.baseSpeed * this.ball.speedMultiplier;

                // Dramatic parry effect
                this.cameras.main.shake(GAME_CONFIG.CAMERA_SHAKE_DURATION * 2, 0.015);
                this.particleSystem.createExplosion(this.ball.x, this.ball.y, 0x00ff00, 35);

                // Show "PARRY!" text
                const parryText = this.add.text(this.ball.x, this.ball.y - 40, 'PARRY!', {
                    fontSize: '28px',
                    fontStyle: 'bold',
                    color: '#00ff00',
                    stroke: '#000000',
                    strokeThickness: 4
                }).setOrigin(0.5);

                this.tweens.add({
                    targets: parryText,
                    y: this.ball.y - 80,
                    alpha: 0,
                    duration: 700,
                    ease: 'Power2',
                    onComplete: () => parryText.destroy()
                });
            } else {
                // Normal deflection (AI or passive hit)
                this.cameras.main.shake(GAME_CONFIG.CAMERA_SHAKE_DURATION, 0.005);
            }

            // Apply double bounce powerup
            if (player.doubleBounce) {
                hitPower *= 1.5;
            }

            // Calculate deflection angle
            const angle = Phaser.Math.Angle.Between(player.x, player.y, this.ball.x, this.ball.y);

            this.ball.body.setVelocity(
                Math.cos(angle) * hitPower,
                Math.sin(angle) * hitPower
            );

            // Visual feedback
            this.particleSystem.createHitEffect(this.ball.x, this.ball.y, player.fillColor);

            // Retarget ball after deflection (Blade Ball style)
            this.time.delayedCall(200, () => {
                if (this.ball && this.ball.body) {
                    this.retargetBall();
                }
            });
        }
        // Ball hitting stationary player (elimination check)
        else {
            // Only eliminate if ball is moving fast
            if (this.ball.body.velocity.length() > 150) {
                if (now > player.invulnerableUntil && !player.invincible) {
                    this.eliminatePlayer(player);
                    // Retarget after elimination
                    this.retargetBall();
                }
            }
        }
    }

    eliminatePlayer(player) {
        player.isAlive = false;
        this.eliminationCount++;

        // Broadcast elimination in multiplayer
        if (this.isMultiplayer && player.playerId) {
            networkManager.sendPlayerEliminated(player.playerId);
        }

        // Create dramatic effect
        this.activateSlowMotion();

        // Explosion
        this.particleSystem.createExplosion(player.x, player.y, player.fillColor, 40);
        this.cameras.main.shake(GAME_CONFIG.CAMERA_SHAKE_DURATION * 2, 0.01);

        player.nameText.setColor('#ff0000');
        player.nameText.setText(player.isHuman ? 'ELIMINATED!' : 'OUT!');

        // Sound - disabled for now
        // (Add audio files in preload to enable)

        // Check if human player
        if (player.isHuman && !player.isRemote) {
            // Local human player eliminated - ragdoll effect
            this.tweens.add({
                targets: player,
                alpha: 0,
                scale: 0.5,
                angle: 360,
                duration: 500,
                ease: 'Power2'
            });

            this.time.delayedCall(1000, () => {
                this.endGame(false);
            });
        } else if (player.isHuman && player.isRemote) {
            // Remote human player eliminated - move outside to watch
            const angle = Math.random() * Math.PI * 2;
            const sitDistance = GAME_CONFIG.ARENA_RADIUS + 80;
            const sitX = this.arena.centerX + Math.cos(angle) * sitDistance;
            const sitY = this.arena.centerY + Math.sin(angle) * sitDistance;

            this.tweens.add({
                targets: player,
                x: sitX,
                y: sitY,
                scale: 0.7,
                alpha: 0.5,
                duration: 800,
                ease: 'Power2',
                onUpdate: () => {
                    player.nameText.x = player.x;
                    player.nameText.y = player.y - 25;
                }
            });

            player.nameText.setText('😢 OUT');
        } else {
            // Move AI outside the arena to sit and watch!
            const angle = Math.random() * Math.PI * 2;
            const sitDistance = GAME_CONFIG.ARENA_RADIUS + 80;
            const sitX = this.arena.centerX + Math.cos(angle) * sitDistance;
            const sitY = this.arena.centerY + Math.sin(angle) * sitDistance;

            // Animate to sitting position
            this.tweens.add({
                targets: player,
                x: sitX,
                y: sitY,
                scale: 0.7,
                alpha: 0.5,
                duration: 800,
                ease: 'Power2',
                onUpdate: () => {
                    player.nameText.x = player.x;
                    player.nameText.y = player.y - 25;
                }
            });

            // Add a sad emoji or indicator
            player.nameText.setText('😢 OUT');

            // Award coins for elimination
            if (this.humanPlayer.isAlive) {
                playerData.addCoins(GAME_CONFIG.COINS_PER_ELIMINATION);
            }
        }
    }

    activateSlowMotion() {
        if (this.slowMotionActive) return;

        this.slowMotionActive = true;
        this.physics.world.timeScale = 1 / GAME_CONFIG.SLOWMO_SCALE;

        this.time.delayedCall(GAME_CONFIG.SLOWMO_DURATION, () => {
            this.physics.world.timeScale = 1;
            this.slowMotionActive = false;
        });
    }

    constrainPlayerToArena(player) {
        // Don't constrain dead players (they're spectators outside arena)
        if (!player.isAlive) return;

        const dx = player.x - this.arena.centerX;
        const dy = player.y - this.arena.centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = this.arena.radius - GAME_CONFIG.PLAYER_RADIUS;

        if (dist > maxDist) {
            const angle = Math.atan2(dy, dx);
            player.x = this.arena.centerX + Math.cos(angle) * maxDist;
            player.y = this.arena.centerY + Math.sin(angle) * maxDist;
        }
    }

    constrainBallToArena() {
        const dx = this.ball.x - this.arena.centerX;
        const dy = this.ball.y - this.arena.centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = this.arena.radius - GAME_CONFIG.BALL_RADIUS - 2; // Extra padding to prevent sticking

        if (dist > maxDist) {
            const angle = Math.atan2(dy, dx);

            // Push ball away from wall slightly
            this.ball.x = this.arena.centerX + Math.cos(angle) * (maxDist - 5);
            this.ball.y = this.arena.centerY + Math.sin(angle) * (maxDist - 5);

            // Calculate reflection angle
            const normalX = -Math.cos(angle);
            const normalY = -Math.sin(angle);
            const dot = this.ball.body.velocity.x * normalX + this.ball.body.velocity.y * normalY;

            // Better bounce physics - maintain energy better
            this.ball.body.velocity.x = (this.ball.body.velocity.x - 2 * dot * normalX) * 0.95;
            this.ball.body.velocity.y = (this.ball.body.velocity.y - 2 * dot * normalY) * 0.95;

            // Ensure ball doesn't get stuck - add minimum velocity
            const currentSpeed = this.ball.body.velocity.length();
            if (currentSpeed < 150) {
                // Give it a nudge toward center with some random angle
                const nudgeAngle = angle + Math.PI + (Math.random() - 0.5) * 0.5;
                this.ball.body.setVelocity(
                    Math.cos(nudgeAngle) * 200,
                    Math.sin(nudgeAngle) * 200
                );
            }

            // Effect
            this.cameras.main.shake(100, 0.005);
            this.particleSystem.createHitEffect(this.ball.x, this.ball.y, GAME_CONFIG.COLORS.ARENA_BORDER);

            this.ball.lastBounceTime = Date.now();
        }

        // Anti-stuck mechanism - if ball is moving too slowly near edges, give it a boost
        const speed = this.ball.body.velocity.length();
        if (speed < 100 && dist > maxDist * 0.7) {
            // Ball is slow and near edge - push it toward center
            const pushAngle = Math.atan2(-dy, -dx) + (Math.random() - 0.5) * 1;
            this.ball.body.setVelocity(
                Math.cos(pushAngle) * 180,
                Math.sin(pushAngle) * 180
            );
        }

        // Ensure ball always has minimum velocity to keep game moving
        if (speed < 80) {
            const currentAngle = Math.atan2(this.ball.body.velocity.y, this.ball.body.velocity.x);
            this.ball.body.setVelocity(
                Math.cos(currentAngle) * 150,
                Math.sin(currentAngle) * 150
            );
        }
    }

    spawnPowerup() {
        if (this.isGameOver) return;

        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * (GAME_CONFIG.ARENA_RADIUS * 0.6);
        const x = this.arena.centerX + Math.cos(angle) * distance;
        const y = this.arena.centerY + Math.sin(angle) * distance;

        const types = Object.values(GAME_CONFIG.POWERUP_TYPES);
        const type = types[Math.floor(Math.random() * types.length)];

        const powerup = new PowerUp(this, x, y, type);
        this.powerups.push(powerup);
    }

    updatePowerups() {
        this.powerups = this.powerups.filter(p => !p.collected);
    }

    clearPowerup(player) {
        player.activePowerup = null;
        player.hasMagnet = false;
        player.doubleBounce = false;
        player.invincible = false;
        player.speedMultiplier = 1;
    }

    updateUI() {
        const elapsed = (Date.now() - this.gameStartTime) / 1000;
        const remaining = Math.max(0, this.roundDuration - elapsed);

        this.timerText.setText(`${remaining.toFixed(1)}s`);

        const alive = this.players.filter(p => p.isAlive).length;
        this.playersAliveText.setText(`Players: ${alive}/${this.players.length}`);

        this.eliminationsText.setText(`Eliminations: ${this.eliminationCount}`);

        // Powerup indicator
        if (this.humanPlayer.activePowerup) {
            const timeLeft = (this.humanPlayer.powerupEndTime - Date.now()) / 1000;
            this.powerupText.setText(`⚡ ${this.humanPlayer.activePowerup.toUpperCase()}: ${timeLeft.toFixed(1)}s`);
        } else {
            this.powerupText.setText('');
        }

        // Parry status and ball speed (Blade Ball style)
        const ballSpeedPercent = Math.round(this.ball.speedMultiplier * 100);

        if (this.humanPlayer.isTargeted) {
            if (this.humanPlayer.parryWindow) {
                const timeSinceParry = Date.now() - this.humanPlayer.lastParryTime;
                if (timeSinceParry < this.humanPlayer.parryCooldown) {
                    const cooldownLeft = ((this.humanPlayer.parryCooldown - timeSinceParry) / 1000).toFixed(1);
                    this.powerShotStatusText.setText(`⏱ Cooldown: ${cooldownLeft}s`);
                    this.powerShotStatusText.setColor('#888888');
                } else {
                    this.powerShotStatusText.setText('🛡 Press SPACE to PARRY! 🛡');
                    this.powerShotStatusText.setColor('#00ff00');
                }
            } else {
                this.powerShotStatusText.setText(`🎯 BALL COMING! Speed: ${ballSpeedPercent}%`);
                this.powerShotStatusText.setColor('#ff0000');
            }
        } else {
            this.powerShotStatusText.setText(`⚡ Ball Speed: ${ballSpeedPercent}%`);
            this.powerShotStatusText.setColor('#ffffff');
        }
    }

    checkGameOver() {
        const alive = this.players.filter(p => p.isAlive).length;
        const elapsed = (Date.now() - this.gameStartTime) / 1000;

        if (alive === 1 && this.humanPlayer.isAlive) {
            this.endGame(true);
        } else if (elapsed >= this.roundDuration && this.humanPlayer.isAlive) {
            this.endGame(true);
        }
    }

    endGame(won) {
        if (this.isGameOver) return;

        this.isGameOver = true;

        const matchDuration = (Date.now() - this.gameStartTime) / 1000;

        if (won) {
            playerData.recordWin(this.eliminationCount, matchDuration);
        } else {
            playerData.recordLoss();
        }

        this.time.delayedCall(1500, () => {
            this.scene.start('GameOverScene', {
                won: won,
                eliminationCount: this.eliminationCount,
                matchDuration: matchDuration,
                survived: won
            });
        });
    }

    createParticleExplosion(x, y, color, count) {
        this.particleSystem.createExplosion(x, y, color, count);
    }
}
