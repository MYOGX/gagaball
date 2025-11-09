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

        // Background
        this.add.rectangle(0, 0, this.cameras.main.width, this.cameras.main.height,
            arena.bgColor).setOrigin(0, 0);

        // Arena graphics
        this.arenaGraphics = this.add.graphics();

        // Outer glow
        this.arenaGraphics.fillStyle(arena.borderColor, 0.2);
        this.arenaGraphics.fillCircle(this.centerX, this.centerY, GAME_CONFIG.ARENA_RADIUS + 20);

        // Main arena
        this.arenaGraphics.fillStyle(GAME_CONFIG.COLORS.ARENA, 0.5);
        this.arenaGraphics.fillCircle(this.centerX, this.centerY, GAME_CONFIG.ARENA_RADIUS);

        // Border
        this.arenaGraphics.lineStyle(8, arena.borderColor, 1);
        this.arenaGraphics.strokeCircle(this.centerX, this.centerY, GAME_CONFIG.ARENA_RADIUS);

        // Inner decoration rings
        for (let i = 1; i <= 3; i++) {
            this.arenaGraphics.lineStyle(2, arena.borderColor, 0.3);
            this.arenaGraphics.strokeCircle(this.centerX, this.centerY,
                GAME_CONFIG.ARENA_RADIUS * (i * 0.25));
        }

        // Center dot
        this.arenaGraphics.fillStyle(arena.borderColor, 0.8);
        this.arenaGraphics.fillCircle(this.centerX, this.centerY, 5);

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
        this.ball.body.setBounce(GAME_CONFIG.BALL_BOUNCE);
        this.ball.body.setDrag(GAME_CONFIG.BALL_DRAG);
        this.ball.body.setMaxSpeed(600);

        // Ball glow
        this.ballGlow = this.add.circle(this.centerX, this.centerY,
            GAME_CONFIG.BALL_RADIUS + 8, GAME_CONFIG.COLORS.BALL_GLOW, 0.4);
        this.ballGlow.setBlendMode(Phaser.BlendModes.ADD);

        // Initial ball velocity
        const angle = Math.random() * Math.PI * 2;
        this.ball.body.setVelocity(
            Math.cos(angle) * GAME_CONFIG.BALL_SPEED,
            Math.sin(angle) * GAME_CONFIG.BALL_SPEED
        );

        // Ball trail effect
        this.ballTrailGraphics = this.add.graphics();
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

        // Power shot mechanic
        player.powerShotReady = true;
        player.powerShotCooldown = 0;
        player.chargingPowerShot = false;

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

        // Power shot indicator (for human player)
        if (isHuman) {
            player.powerShotIndicator = this.add.circle(x, y, GAME_CONFIG.PLAYER_RADIUS + 8, 0xff0000, 0);
            player.powerShotIndicator.setStrokeStyle(3, 0xff0000, 1);
            player.powerShotIndicator.setVisible(false);
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

        // Pulsing glow
        const scale = 1 + Math.sin(Date.now() / 200) * 0.2;
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

            // Update power shot cooldown
            if (player.powerShotCooldown > 0) {
                player.powerShotCooldown -= delta;
                if (player.powerShotCooldown <= 0) {
                    player.powerShotReady = true;
                    player.powerShotCooldown = 0;
                }
            }

            // Update power shot indicator (for human player)
            if (player.isHuman && player.powerShotIndicator) {
                player.powerShotIndicator.x = player.x;
                player.powerShotIndicator.y = player.y;

                if (player.chargingPowerShot) {
                    // Pulsing animation when charging
                    player.powerShotIndicator.setVisible(true);
                    const pulse = Math.sin(Date.now() / 100) * 0.5 + 0.5;
                    player.powerShotIndicator.setAlpha(pulse);
                } else if (player.powerShotReady) {
                    // Gently pulse when ready
                    player.powerShotIndicator.setVisible(true);
                    const pulse = Math.sin(Date.now() / 500) * 0.3 + 0.5;
                    player.powerShotIndicator.setAlpha(pulse);
                } else {
                    player.powerShotIndicator.setVisible(false);
                }
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

        // Power shot activation
        if ((this.powerShotKey.isDown || this.powerShotKeyAlt.isDown) && player.powerShotReady) {
            player.chargingPowerShot = true;
        } else {
            player.chargingPowerShot = false;
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
        // Check if hit below knees (simplified - just check if ball hit player)
        const now = Date.now();

        // Player hitting the ball
        if (player.body.velocity.length() > 50) {
            let hitPower = GAME_CONFIG.HIT_POWER;

            // Apply power shot multiplier!
            if (player.chargingPowerShot && player.powerShotReady) {
                hitPower *= 2.5; // MEGA HIT!
                player.powerShotReady = false;
                player.powerShotCooldown = 3000; // 3 second cooldown
                player.chargingPowerShot = false;

                // Extra dramatic effect for power shot!
                this.cameras.main.shake(GAME_CONFIG.CAMERA_SHAKE_DURATION * 3, 0.02);
                this.particleSystem.createExplosion(this.ball.x, this.ball.y, 0xff0000, 30);
            } else {
                // Normal hit effects
                this.cameras.main.shake(GAME_CONFIG.CAMERA_SHAKE_DURATION, 0.003);
            }

            // Apply double bounce powerup
            if (player.doubleBounce) {
                hitPower *= 1.5;
            }

            const angle = Phaser.Math.Angle.Between(player.x, player.y, this.ball.x, this.ball.y);

            this.ball.body.setVelocity(
                Math.cos(angle) * hitPower,
                Math.sin(angle) * hitPower
            );

            // Visual feedback
            this.particleSystem.createHitEffect(this.ball.x, this.ball.y, player.fillColor);

            // Sound - disabled for now
            // (Add audio files in preload to enable)
        }
        // Ball hitting player (elimination check)
        else if (this.ball.body.velocity.length() > 150) {
            if (now > player.invulnerableUntil && !player.invincible) {
                this.eliminatePlayer(player);
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
        const maxDist = this.arena.radius - GAME_CONFIG.BALL_RADIUS;

        if (dist > maxDist) {
            const angle = Math.atan2(dy, dx);
            this.ball.x = this.arena.centerX + Math.cos(angle) * maxDist;
            this.ball.y = this.arena.centerY + Math.sin(angle) * maxDist;

            // Bounce off wall
            const normalX = -Math.cos(angle);
            const normalY = -Math.sin(angle);
            const dot = this.ball.body.velocity.x * normalX + this.ball.body.velocity.y * normalY;

            this.ball.body.velocity.x = (this.ball.body.velocity.x - 2 * dot * normalX) * 0.9;
            this.ball.body.velocity.y = (this.ball.body.velocity.y - 2 * dot * normalY) * 0.9;

            // Effect
            this.cameras.main.shake(100, 0.005);
            this.particleSystem.createHitEffect(this.ball.x, this.ball.y, GAME_CONFIG.COLORS.ARENA_BORDER);
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

        // Power shot status
        if (this.humanPlayer.chargingPowerShot) {
            this.powerShotStatusText.setText('🔥 POWER SHOT READY! 🔥');
            this.powerShotStatusText.setColor('#ffff00');
        } else if (this.humanPlayer.powerShotReady) {
            this.powerShotStatusText.setText('💥 Hold SPACE for Power Shot');
            this.powerShotStatusText.setColor('#ff6600');
        } else {
            const cooldownLeft = (this.humanPlayer.powerShotCooldown / 1000).toFixed(1);
            this.powerShotStatusText.setText(`Power Shot: ${cooldownLeft}s`);
            this.powerShotStatusText.setColor('#888888');
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
