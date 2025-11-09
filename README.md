# ⚡ GAGA BALL ⚡

**The Most Addictive Pit Game Ever!**

A hyper-addictive, fast-paced digital version of the classic playground game GaGa Ball. Built with Phaser.js for web and mobile.

🎮 **[Play Now!](#)** | 🏆 **Can you survive 30 seconds in the pit?**

## 🎯 About

GaGa Ball is a high-energy dodgeball variant played in an octagonal pit. Hit the ball to eliminate opponents, dodge incoming shots, and be the last player standing!

### Features

✨ **Fast-Paced Gameplay**
- 30-60 second rounds of pure chaos
- Top-down arena view with smooth physics
- Real-time collision detection

🤖 **Smart AI Opponents**
- 7 AI opponents with increasing difficulty levels
- EASY, MEDIUM, HARD, and EXPERT AI behaviors
- Dynamic decision-making and strategy

💥 **Explosive Visual Effects**
- Camera shake on impacts
- Particle explosions on eliminations
- Slow-motion replays of epic moments
- Ragdoll physics when players get hit
- Neon-lit pit with glowing ball effects

⚡ **Power-Ups**
- 🧲 **Magnet Glove** - Attracts the ball
- ⚡ **Double Bounce** - Hit with extra power
- 🛡️ **Invincibility** - Temporary immunity
- 🚀 **Speed Boost** - Move faster
- ❄️ **Freeze Time** - Slow down opponents

🎁 **Progression System**
- Earn coins for wins and eliminations
- Daily rewards with streak bonuses
- Unlock skins, arenas, and abilities
- Achievement system with rewards
- Persistent stats tracking

📱 **Cross-Platform**
- Responsive design for desktop and mobile
- Touch controls for mobile devices
- Keyboard controls (WASD/Arrows) for desktop
- 60+ FPS optimized performance
- Works on all modern browsers

## 🎮 How to Play

### Desktop Controls
- **WASD** or **Arrow Keys** - Move your player
- Bump into the ball to hit it toward opponents
- Dodge incoming ball shots to survive

### Mobile Controls
- **Touch and drag** - Move your player
- The player follows your finger
- Same rules apply!

### Game Rules
1. Hit the ball to eliminate opponents
2. If the ball touches you (below the knees), you're OUT!
3. Last player standing wins
4. Survive for the full round duration for bonus coins
5. Collect power-ups for special abilities

## 🏗️ Technical Details

### Built With
- **Phaser 3** - Game framework
- **JavaScript (ES6+)** - Game logic
- **HTML5 Canvas** - Rendering
- **Web Audio API** - Sound effects
- **LocalStorage** - Save system

### File Structure
```
gagaball/
├── index.html              # Main HTML file
├── styles.css             # Game styling
├── js/
│   ├── main.js           # Phaser configuration
│   ├── config.js         # Game constants
│   ├── playerData.js     # Save system
│   ├── ai.js             # AI opponent logic
│   ├── powerups.js       # Power-up system
│   ├── particles.js      # Visual effects
│   └── scenes/
│       ├── BootScene.js      # Initial loading
│       ├── MenuScene.js      # Main menu
│       ├── GameScene.js      # Core gameplay
│       └── GameOverScene.js  # Results screen
└── README.md
```

### Performance
- Optimized for 60 FPS
- Efficient particle system
- Physics-based collision detection
- Minimal memory footprint
- Mobile-optimized

## 🚀 Deployment

### GitHub Pages
This game is deployed via GitHub Pages and can be played directly in your browser!

To deploy your own version:
1. Fork this repository
2. Enable GitHub Pages in repository settings
3. Set source to main branch, root directory
4. Your game will be available at: `https://[username].github.io/gagaball`

### Local Development
```bash
# Clone the repository
git clone https://github.com/[username]/gagaball.git

# Navigate to directory
cd gagaball

# Serve with any HTTP server (e.g., Python)
python -m http.server 8000

# Open browser to http://localhost:8000
```

## 🎯 Addiction Mechanics

### Coin System
- **Win Bonus**: 100 coins
- **Per Elimination**: 25 coins
- **Survival Bonus**: 10 coins
- Use coins to unlock cosmetics and arenas

### Daily Rewards
- Claim free coins every 24 hours
- Streak bonuses for consecutive days
- Rewards multiply with your streak!

### Unlockables
- **Skins**: 7 unique character skins
- **Arenas**: 5 themed pit designs
- **Achievements**: Earn badges and rewards

### Social Features (Coming Soon)
- Share victory replays
- Global leaderboards
- Weekly tournaments
- Challenge friends

## 🎨 Visual Style

**Bright, Cartoony, Neon-Lit Aesthetic**
- Glowing ball with trail effects
- Smooth shadows and lighting
- Expressive character designs
- Meme-able fail moments
- Optional night mode with glow trails

## 🔧 Debug Commands

Open browser console and use these commands:

```javascript
gagaDebug.showStats()        // Display your stats
gagaDebug.addCoins(1000)     // Add coins
gagaDebug.unlockAll()        // Unlock all items
gagaDebug.resetProgress()    // Reset everything
```

## 🎵 Audio

The game features:
- Upbeat background music (similar to Rocket League/Fall Guys)
- Impact sound effects
- Elimination sounds
- Crowd reactions
- Power-up pickup sounds
- Victory/defeat music

*Note: Current version uses Web Audio API for sounds. For production, replace with high-quality audio files.*

## 📊 Stats Tracking

The game tracks:
- Total wins and matches
- Win rate percentage
- Elimination count
- Win streaks (current and best)
- Best match time
- Total coins earned
- Achievements unlocked

## 🎁 Monetization (Future)

**Free-to-Play Model**
- Base game completely free
- Optional cosmetic purchases
- Rewarded ads for bonus coins
- No pay-to-win mechanics

**Potential Ad Integration**
- AdMob (mobile)
- Unity Ads
- Rewarded video ads for extra coins/revives

## 🐛 Known Issues / Future Improvements

### Planned Features
- [ ] Real-time multiplayer (WebSocket)
- [ ] Global leaderboards
- [ ] Tournament mode
- [ ] Replay sharing as GIFs
- [ ] More power-ups
- [ ] Custom skins creator
- [ ] Sound on/off toggle in menu
- [ ] Mobile app version (Cordova/Capacitor)

### Improvements
- [ ] Better audio (replace with professional SFX)
- [ ] More arena themes
- [ ] Advanced AI behaviors
- [ ] Spectator mode
- [ ] Replay system

## 📝 License

MIT License - Feel free to use, modify, and distribute!

## 🙏 Credits

Created with ❤️ using Phaser.js

Inspired by the classic playground game GaGa Ball.

## 🎮 Let's Play!

**Challenge Mode**: Can you win with 0 hits taken?

**Speedrun**: Can you win in under 15 seconds?

**Endurance**: How many matches can you win in a row?

**#1 GaGa Pit Boss** - Prove you're the best!

---

**Made for web and mobile | Play anywhere, anytime!**

⚡ **Start playing now and become the ultimate GaGa champion!** ⚡