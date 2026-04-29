# Marble Kingdom Sim

A marble physics fighter simulation inspired by the "Marble Kingdoms" series from the Lost Marbles YouTube channel, ported to HTML/CSS/JavaScript with a Node.js backend.

## Features

### Physics Engine
- **Realistic Gravity**: Marbles fall with proper acceleration
- **Friction**: Air resistance and rolling friction
- **Collision Detection**: Accurate marble-to-marble collision detection and resolution
- **Elastic Collisions**: Mass-based impulse calculations with coefficient of restitution
- **Boundary Collisions**: Marbles bounce off canvas edges

### Simulation Modes
- **Single Marble Addition**: Click on canvas to add marbles
- **Random Mode**: Spawn 5 random marbles with random colors
- **Brawl Mode**: 3v3 setup with red and blue teams (opposite sides, moving toward each other)
- **Tournament Mode**: 8 random marbles in chaotic battle

### Interactive Controls
- **Play/Pause**: Control simulation timing
- **Reset**: Clear all marbles and reset collision counter
- **Add Marble**: Manually add a marble at random position
- **Physics Settings**: Adjust gravity, friction, and bounce in real-time
- **Time Scale**: Slow down or speed up the simulation (0.1x to 2x)
- **Color Picker**: Choose color for next manually added marbles

### Visualization
- **Grid Background**: Helps visualize marble movement and collision zones
- **Marble Shine**: Realistic gradient highlight on each marble
- **Velocity Indicators**: Visual line showing marble direction
- **Live Stats**: FPS counter, marble count, collision count

## Installation

1. Navigate to the project directory:
```bash
cd "c:\Users\k1222969\OneDrive - Katy Independent School District\HTML\Private\Marble-Kingdom-Sim"
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

4. Open your browser and navigate to:
```
http://localhost:3000
```

## How to Use

### Adding Marbles
- **Click** anywhere on the canvas to add a single marble with the selected color
- Use **"+ Add Marble"** button to add a random marble
- Use **"🎭 Brawl (3v3)"** for a competitive setup
- Use **"🏆 Tournament (8 Random)"** for chaos mode

### Physics Adjustments
Use the sliders in the right panel to adjust:
- **Gravity**: How fast marbles fall (0-2)
- **Friction**: How quickly marbles slow down (0.8-1.0)
- **Bounce**: How much energy is retained in collisions (0-1)
- **Time Scale**: Speed up or slow down simulation (0.1x-2x)

### Keyboard Shortcuts
- **Space**: Toggle Play/Pause
- **R**: Reset (clear all marbles)
- **A**: Add a random marble

## Physics Implementation

### Collision Detection
The engine uses distance-based collision detection:
- Checks distance between all marble pairs
- If distance < sum of radii, a collision occurred

### Impulse Resolution
Collisions are resolved using:
1. Calculate relative velocity at collision point
2. Compute normal vector between marble centers
3. Calculate impulse based on masses and velocities
4. Apply equal and opposite impulses to both marbles
5. Separate overlapping marbles to prevent sticking

### Boundary Handling
- Checks marble position against canvas boundaries
- Reflects velocity with bounce coefficient
- Repositions marble to prevent clipping

## Project Structure

```
marble-kingdom-sim/
├── public/
│   ├── index.html       # Main HTML file
│   ├── styles.css       # All styling
│   ├── game.js          # Client-side physics engine and rendering
├── server/
│   └── server.js        # Express server (for future multiplayer/server physics)
├── package.json         # Node.js dependencies
└── README.md           # This file
```

## Technologies Used

- **HTML5 Canvas**: 2D graphics rendering
- **CSS3**: Responsive design with gradients and animations
- **JavaScript (ES6+)**: Physics engine and game logic
- **Node.js/Express**: Backend server for potential future expansion

## Future Enhancements

- [ ] Different marble sizes and weights affecting physics
- [ ] Obstacles and static walls
- [ ] Power-ups (speed boost, size change, etc.)
- [ ] Multiplayer support via WebSockets
- [ ] Different arena shapes and ramps
- [ ] Recording and playback of simulations
- [ ] Physics presets based on famous Marble Kingdom episodes
- [ ] Particle effects for collisions

## License

MIT

## Credits

Inspired by the "Marble Kingdoms" series from Lost Marbles YouTube channel.
