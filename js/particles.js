// Particle system for visual effects
class ParticleSystem {
    constructor(scene) {
        this.scene = scene;
        this.particles = [];
    }

    createExplosion(x, y, color, count = 20) {
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count;
            const speed = 100 + Math.random() * 150;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;

            const particle = {
                x: x,
                y: y,
                vx: vx,
                vy: vy,
                life: 1.0,
                maxLife: 1.0,
                color: color,
                size: 3 + Math.random() * 5,
                gravity: 100
            };

            this.particles.push(particle);
        }
    }

    createTrail(x, y, color, vx = 0, vy = 0) {
        const particle = {
            x: x + (Math.random() - 0.5) * 10,
            y: y + (Math.random() - 0.5) * 10,
            vx: vx * 0.2 + (Math.random() - 0.5) * 20,
            vy: vy * 0.2 + (Math.random() - 0.5) * 20,
            life: 0.5,
            maxLife: 0.5,
            color: color,
            size: 2 + Math.random() * 3,
            gravity: 0
        };

        this.particles.push(particle);
    }

    createHitEffect(x, y, color) {
        // Create ring effect
        for (let i = 0; i < 30; i++) {
            const angle = (Math.PI * 2 * i) / 30;
            const speed = 200 + Math.random() * 100;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;

            const particle = {
                x: x,
                y: y,
                vx: vx,
                vy: vy,
                life: 0.8,
                maxLife: 0.8,
                color: color,
                size: 4 + Math.random() * 4,
                gravity: 0
            };

            this.particles.push(particle);
        }
    }

    update(delta) {
        const dt = delta / 1000;

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];

            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += p.gravity * dt;
            p.vx *= 0.98;
            p.vy *= 0.98;

            p.life -= dt;

            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    render(graphics) {
        graphics.clear();

        this.particles.forEach(p => {
            const alpha = p.life / p.maxLife;
            const size = p.size * alpha;

            graphics.fillStyle(p.color, alpha);
            graphics.fillCircle(p.x, p.y, size);
        });
    }

    clear() {
        this.particles = [];
    }
}
