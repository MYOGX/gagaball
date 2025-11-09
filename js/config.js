// Game configuration constants
const GAME_CONFIG = {
    // Game settings
    ARENA_RADIUS: 300,
    BALL_RADIUS: 12,
    PLAYER_RADIUS: 20,
    MAX_AI_OPPONENTS: 7,
    ROUND_DURATION: 45, // seconds

    // Physics
    BALL_SPEED: 400,
    BALL_DRAG: 0.98,
    BALL_BOUNCE: 0.95,
    PLAYER_SPEED: 200,
    PLAYER_DRAG: 0.88,
    HIT_POWER: 350,

    // Visual effects
    CAMERA_SHAKE_INTENSITY: 10,
    CAMERA_SHAKE_DURATION: 200,
    PARTICLE_COUNT: 20,
    SLOWMO_DURATION: 800,
    SLOWMO_SCALE: 0.3,

    // Gameplay
    INVULNERABILITY_TIME: 1500, // after spawn
    POWERUP_SPAWN_INTERVAL: 15000,
    POWERUP_DURATION: 5000,

    // Rewards
    COINS_PER_WIN: 100,
    COINS_PER_ELIMINATION: 25,
    COINS_PER_SURVIVAL: 10,
    DAILY_REWARD_BASE: 50,

    // AI difficulty levels
    AI_DIFFICULTIES: {
        EASY: { reactionTime: 800, accuracy: 0.4, aggression: 0.3 },
        MEDIUM: { reactionTime: 500, accuracy: 0.6, aggression: 0.5 },
        HARD: { reactionTime: 300, accuracy: 0.8, aggression: 0.7 },
        EXPERT: { reactionTime: 150, accuracy: 0.9, aggression: 0.85 }
    },

    // Colors
    COLORS: {
        PRIMARY: 0x6366f1,
        SECONDARY: 0xec4899,
        ACCENT: 0xfbbf24,
        SUCCESS: 0x10b981,
        DANGER: 0xef4444,
        BACKGROUND: 0x1e1b4b,
        ARENA: 0x312e81,
        ARENA_BORDER: 0x4c1d95,
        BALL: 0xfbbf24,
        BALL_GLOW: 0xfde047
    },

    // Power-up types
    POWERUP_TYPES: {
        MAGNET: 'magnet',
        DOUBLE_BOUNCE: 'double_bounce',
        INVINCIBILITY: 'invincibility',
        SPEED_BOOST: 'speed_boost',
        FREEZE_TIME: 'freeze_time'
    }
};

// Player skin configurations
const SKINS = {
    default: { color: 0x3b82f6, name: 'Classic Blue', price: 0 },
    red: { color: 0xef4444, name: 'Crimson Crusher', price: 500 },
    green: { color: 0x10b981, name: 'Emerald Elite', price: 500 },
    purple: { color: 0xa855f7, name: 'Purple Power', price: 750 },
    gold: { color: 0xfbbf24, name: 'Golden God', price: 1000 },
    rainbow: { color: 0xff00ff, name: 'Rainbow Royalty', price: 2000 },
    neon: { color: 0x00ffff, name: 'Neon Nightmare', price: 1500 }
};

// Arena themes
const ARENAS = {
    classic: { name: 'Classic Pit', bgColor: 0x1e1b4b, borderColor: 0x4c1d95, price: 0 },
    cyber: { name: 'Cyber Arena', bgColor: 0x0f172a, borderColor: 0x06b6d4, price: 1000 },
    sunset: { name: 'Sunset Stadium', bgColor: 0x7c2d12, borderColor: 0xfbbf24, price: 1200 },
    ice: { name: 'Ice Palace', bgColor: 0x0c4a6e, borderColor: 0x7dd3fc, price: 1500 },
    toxic: { name: 'Toxic Zone', bgColor: 0x14532d, borderColor: 0x84cc16, price: 1800 }
};

// Achievement system
const ACHIEVEMENTS = {
    firstWin: { name: 'First Victory', desc: 'Win your first match', reward: 100 },
    survivor: { name: 'Survivor', desc: 'Survive for 30 seconds', reward: 150 },
    eliminator: { name: 'Eliminator', desc: 'Eliminate 5 players in one match', reward: 200 },
    untouchable: { name: 'Untouchable', desc: 'Win without getting hit', reward: 300 },
    speedDemon: { name: 'Speed Demon', desc: 'Win in under 20 seconds', reward: 250 },
    champion: { name: 'Champion', desc: 'Win 10 matches', reward: 500 },
    legend: { name: 'Legend', desc: 'Win 50 matches', reward: 1000 }
};
