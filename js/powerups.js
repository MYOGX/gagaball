// Power-up system
class PowerUp {
    constructor(scene, x, y, type) {
        this.scene = scene;
        this.type = type;
        this.active = false;
        this.duration = GAME_CONFIG.POWERUP_DURATION;

        // Visual representation
        this.graphics = scene.add.graphics();
        this.x = x;
        this.y = y;
        this.radius = 15;
        this.collected = false;

        this.draw();
        this.createParticles();
    }

    draw() {
        this.graphics.clear();

        // Glow effect
        this.graphics.fillStyle(this.getColor(), 0.3);
        this.graphics.fillCircle(this.x, this.y, this.radius + 5);

        // Main powerup
        this.graphics.fillStyle(this.getColor(), 1);
        this.graphics.fillCircle(this.x, this.y, this.radius);

        // Icon (simplified)
        this.graphics.lineStyle(3, 0xffffff, 1);
        this.drawIcon();
    }

    drawIcon() {
        const x = this.x;
        const y = this.y;
        const r = this.radius * 0.5;

        switch (this.type) {
            case GAME_CONFIG.POWERUP_TYPES.MAGNET:
                // Magnet shape
                this.graphics.beginPath();
                this.graphics.arc(x - r/2, y, r, Math.PI, 0, false);
                this.graphics.arc(x + r/2, y, r, Math.PI, 0, false);
                this.graphics.strokePath();
                break;

            case GAME_CONFIG.POWERUP_TYPES.DOUBLE_BOUNCE:
                // Two circles
                this.graphics.strokeCircle(x - r/2, y, r/2);
                this.graphics.strokeCircle(x + r/2, y, r/2);
                break;

            case GAME_CONFIG.POWERUP_TYPES.INVINCIBILITY:
                // Shield
                this.graphics.strokeCircle(x, y, r);
                this.graphics.beginPath();
                this.graphics.moveTo(x, y - r);
                this.graphics.lineTo(x, y + r);
                this.graphics.strokePath();
                break;

            case GAME_CONFIG.POWERUP_TYPES.SPEED_BOOST:
                // Lightning bolt
                this.graphics.beginPath();
                this.graphics.moveTo(x, y - r);
                this.graphics.lineTo(x - r/3, y);
                this.graphics.lineTo(x + r/3, y);
                this.graphics.lineTo(x, y + r);
                this.graphics.strokePath();
                break;

            case GAME_CONFIG.POWERUP_TYPES.FREEZE_TIME:
                // Snowflake
                this.graphics.strokeCircle(x, y, r/2);
                for (let i = 0; i < 6; i++) {
                    const angle = (i * Math.PI) / 3;
                    const x1 = x + Math.cos(angle) * r/2;
                    const y1 = y + Math.sin(angle) * r/2;
                    const x2 = x + Math.cos(angle) * r;
                    const y2 = y + Math.sin(angle) * r;
                    this.graphics.beginPath();
                    this.graphics.moveTo(x1, y1);
                    this.graphics.lineTo(x2, y2);
                    this.graphics.strokePath();
                }
                break;
        }
    }

    getColor() {
        switch (this.type) {
            case GAME_CONFIG.POWERUP_TYPES.MAGNET:
                return 0xff0066;
            case GAME_CONFIG.POWERUP_TYPES.DOUBLE_BOUNCE:
                return 0x00ff99;
            case GAME_CONFIG.POWERUP_TYPES.INVINCIBILITY:
                return 0xffaa00;
            case GAME_CONFIG.POWERUP_TYPES.SPEED_BOOST:
                return 0x00aaff;
            case GAME_CONFIG.POWERUP_TYPES.FREEZE_TIME:
                return 0xaaaaff;
            default:
                return 0xffffff;
        }
    }

    createParticles() {
        // Floating animation
        this.scene.tweens.add({
            targets: this,
            y: this.y - 10,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
            onUpdate: () => {
                this.draw();
            }
        });

        // Rotation
        this.rotationAngle = 0;
        this.scene.time.addEvent({
            delay: 50,
            callback: () => {
                if (!this.collected) {
                    this.rotationAngle += 0.1;
                }
            },
            loop: true
        });
    }

    checkCollision(player) {
        if (this.collected) return false;

        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < this.radius + player.radius) {
            this.collect(player);
            return true;
        }
        return false;
    }

    collect(player) {
        this.collected = true;
        this.graphics.clear();

        // Create collection effect
        this.scene.createParticleExplosion(this.x, this.y, this.getColor(), 15);

        // Apply power-up effect
        this.applyEffect(player);

        // Play sound
        try {
            if (this.scene.sound.get('powerup')) {
                this.scene.sound.play('powerup', { volume: 0.5 });
            }
        } catch (e) {
            // Sound not loaded, skip
        }
    }

    applyEffect(player) {
        player.activePowerup = this.type;
        player.powerupEndTime = Date.now() + this.duration;

        switch (this.type) {
            case GAME_CONFIG.POWERUP_TYPES.MAGNET:
                player.hasMagnet = true;
                break;

            case GAME_CONFIG.POWERUP_TYPES.DOUBLE_BOUNCE:
                player.doubleBounce = true;
                break;

            case GAME_CONFIG.POWERUP_TYPES.INVINCIBILITY:
                player.invincible = true;
                break;

            case GAME_CONFIG.POWERUP_TYPES.SPEED_BOOST:
                player.speedMultiplier = 1.5;
                break;

            case GAME_CONFIG.POWERUP_TYPES.FREEZE_TIME:
                // Slow down all other players
                this.scene.players.forEach(p => {
                    if (p !== player && p.isAlive) {
                        p.frozen = true;
                        p.frozenEndTime = Date.now() + this.duration;
                    }
                });
                break;
        }
    }

    destroy() {
        if (this.graphics) {
            this.graphics.destroy();
        }
    }
}
