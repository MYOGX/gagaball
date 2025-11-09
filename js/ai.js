// AI opponent system
class AIPlayer {
    constructor(difficulty = 'MEDIUM') {
        this.difficulty = GAME_CONFIG.AI_DIFFICULTIES[difficulty];
        this.targetX = 0;
        this.targetY = 0;
        this.lastReactionTime = 0;
        this.reactionDelay = this.difficulty.reactionTime;
        this.state = 'IDLE'; // IDLE, CHASING_BALL, DODGING, ATTACKING
        this.dodgeDirection = { x: 0, y: 0 };
    }

    update(player, ball, arena, otherPlayers, time) {
        if (!player.isAlive || player.frozen) {
            return { x: 0, y: 0 };
        }

        // Reaction time simulation
        if (time - this.lastReactionTime < this.reactionDelay) {
            return this.getMoveDirection(player);
        }

        this.lastReactionTime = time;

        // Calculate ball danger
        const ballDistance = Phaser.Math.Distance.Between(player.x, player.y, ball.x, ball.y);
        const ballSpeed = Math.sqrt(ball.body.velocity.x ** 2 + ball.body.velocity.y ** 2);
        const ballHeading = Math.atan2(ball.body.velocity.y, ball.body.velocity.x);
        const angleToPlayer = Math.atan2(player.y - ball.y, player.x - ball.x);
        const headingDifference = Math.abs(ballHeading - angleToPlayer);

        // Determine if ball is coming towards AI
        const ballComingTowards = headingDifference < Math.PI / 4 && ballDistance < 150;

        // Decision making
        if (ballComingTowards && ballSpeed > 100) {
            this.state = 'DODGING';
            this.calculateDodge(player, ball);
        } else if (ballDistance < 60 && ballSpeed < 100) {
            this.state = 'ATTACKING';
            this.calculateAttack(player, ball, otherPlayers);
        } else if (ballDistance < 200) {
            this.state = 'CHASING_BALL';
            this.targetX = ball.x;
            this.targetY = ball.y;
        } else {
            this.state = 'IDLE';
            this.calculateIdlePosition(player, arena);
        }

        return this.getMoveDirection(player);
    }

    calculateDodge(player, ball) {
        // Dodge perpendicular to ball trajectory
        const ballAngle = Math.atan2(ball.body.velocity.y, ball.body.velocity.x);
        const dodgeAngle = ballAngle + Math.PI / 2;

        // Choose dodge direction based on accuracy
        if (Math.random() > this.difficulty.accuracy) {
            // Sometimes dodge wrong way (mistake)
            this.dodgeDirection.x = Math.cos(dodgeAngle + Math.PI);
            this.dodgeDirection.y = Math.sin(dodgeAngle + Math.PI);
        } else {
            this.dodgeDirection.x = Math.cos(dodgeAngle);
            this.dodgeDirection.y = Math.sin(dodgeAngle);
        }

        this.targetX = player.x + this.dodgeDirection.x * 100;
        this.targetY = player.y + this.dodgeDirection.y * 100;
    }

    calculateAttack(player, ball, otherPlayers) {
        // Find nearest opponent
        let nearestOpponent = null;
        let nearestDistance = Infinity;

        otherPlayers.forEach(opponent => {
            if (opponent !== player && opponent.isAlive) {
                const dist = Phaser.Math.Distance.Between(player.x, player.y, opponent.x, opponent.y);
                if (dist < nearestDistance) {
                    nearestDistance = dist;
                    nearestOpponent = opponent;
                }
            }
        });

        if (nearestOpponent && Math.random() < this.difficulty.aggression) {
            // Aim at opponent with some inaccuracy
            const inaccuracy = (1 - this.difficulty.accuracy) * 50;
            this.targetX = nearestOpponent.x + (Math.random() - 0.5) * inaccuracy;
            this.targetY = nearestOpponent.y + (Math.random() - 0.5) * inaccuracy;
        } else {
            // Just get close to ball
            this.targetX = ball.x;
            this.targetY = ball.y;
        }
    }

    calculateIdlePosition(player, arena) {
        // Move towards center or stay in safe position
        const centerX = arena.centerX;
        const centerY = arena.centerY;
        const distFromCenter = Phaser.Math.Distance.Between(player.x, player.y, centerX, centerY);

        if (distFromCenter > arena.radius * 0.7) {
            // Too close to wall, move inward
            this.targetX = centerX + (player.x - centerX) * 0.5;
            this.targetY = centerY + (player.y - centerY) * 0.5;
        } else {
            // Stay put or move slightly
            this.targetX = player.x + (Math.random() - 0.5) * 50;
            this.targetY = player.y + (Math.random() - 0.5) * 50;
        }
    }

    getMoveDirection(player) {
        const dx = this.targetX - player.x;
        const dy = this.targetY - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 5) {
            return { x: 0, y: 0 };
        }

        return {
            x: dx / distance,
            y: dy / distance
        };
    }

    shouldHitBall(player, ball) {
        const distance = Phaser.Math.Distance.Between(player.x, player.y, ball.x, ball.y);
        return distance < 40 && this.state === 'ATTACKING';
    }
}

// AI difficulty manager
class AIManager {
    static createAI(playerIndex, totalPlayers) {
        // Distribute difficulty levels
        const difficulties = ['EASY', 'MEDIUM', 'HARD', 'EXPERT'];
        const difficultyIndex = Math.min(
            Math.floor((playerIndex / totalPlayers) * difficulties.length),
            difficulties.length - 1
        );

        return new AIPlayer(difficulties[difficultyIndex]);
    }

    static getRandomDifficulty() {
        const difficulties = ['EASY', 'MEDIUM', 'HARD', 'EXPERT'];
        const weights = [0.3, 0.4, 0.2, 0.1]; // 30% easy, 40% medium, 20% hard, 10% expert

        const random = Math.random();
        let cumulative = 0;

        for (let i = 0; i < difficulties.length; i++) {
            cumulative += weights[i];
            if (random < cumulative) {
                return difficulties[i];
            }
        }

        return 'MEDIUM';
    }
}
