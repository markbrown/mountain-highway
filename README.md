# Mountain Highway

A minimalist arcade game where you drive a car along a treacherous mountain highway, extending bridges to cross gaps between islands while racing against the clock.

## About

Mountain Highway is a browser-based game built with vanilla JavaScript and HTML5 Canvas. Drive your car through a winding mountain course, carefully timing bridge extensions to cross gaps between floating islands. One wrong move and you'll tumble off the cliff!

## How to Play

1. **Open the game**: Open `index.html` in a web browser, or serve with a local web server (e.g., `python3 -m http.server`)
2. **Start**: Click to begin the game - a countdown (3-2-1) prepares you for action
3. **Build bridges**: When your car stops at an edge, click and hold to grow a bridge
4. **Judge the distance**: The bridge grows vertically while you hold - watch carefully!
5. **Release to drop**: Let go to slam the bridge down
6. **Drive safely**: If the bridge is the right length, you'll continue. Too short or too long? You'll fall!
7. **Race the clock**: Complete the course as fast as possible - your time is displayed in the top right corner

### Controls

- **Mouse**: Click and hold anywhere on the canvas to grow bridge, release to drop
- **Touch**: Tap and hold on mobile devices

### Bridge Mechanics

- **Too Short**: Bridge doesn't reach the next island → car falls off near side
- **Perfect**: Bridge reaches the next island with just the right extension → car continues
- **Too Long (at turns)**: Bridge extends past the junction → car misses the turn and falls off far side
- **Too Long (straight)**: Bridge extends too far but car continues (just costs time)

The game includes a forgiveness mechanic for bridges that are slightly short (within 0.3 units).

## Technical Details

### Technology Stack

- HTML5 Canvas for rendering
- Vanilla JavaScript (no frameworks)
- Isometric graphics with custom projection
- Web Audio API (planned for sound effects)

### Architecture

- **Course System**: Declarative course definition with spans and junctions
- **Level System**: Combines course layout with island geometry
- **Validation System**: Ensures courses are playable and bridges are possible
- **Renderer**: Isometric projection with depth-sorted rendering
- **Physics**: Gravity and tumbling animation for falling
- **State Machine**: Clean game state management

### Key Features

- ✅ Isometric rendering with proper depth sorting
- ✅ Bidirectional movement (forward and backward spans)
- ✅ Dynamic viewport with vertical scrolling
- ✅ Player-controlled bridge building
- ✅ Physics-based falling with tumbling animation
- ✅ Forgiveness mechanic for close attempts
- ✅ Touch device support
- ✅ Complete game flow with start screen, countdown, and finish/game over screens
- ✅ Timer system for speedrun challenges

## Project Structure

```
mountain-highway/
├── index.html                      # Main game page
├── style.css                       # Game styles
├── js/
│   ├── config.js                   # Configuration and constants
│   ├── course.js                   # Course structure (spans, bridges, directions)
│   ├── level.js                    # Level combining course + islands
│   ├── renderer.js                 # Canvas rendering and viewport
│   ├── validation.js               # Course validation system
│   ├── debug.js                    # Debug overlays and visualization
│   └── game.js                     # Main game loop and state machine
├── assets/
│   ├── car-row-positive.svg        # Car sprite (vertical travel)
│   └── car-column-positive.svg     # Car sprite (horizontal travel)
├── test-game-static.html           # Static debug visualization
├── test-validation.html            # Validation test suite
├── GAME_DESIGN.md                  # Detailed design documentation
└── CLAUDE.md                       # Development guidelines

```

## Development

### Running Locally

```bash
# Serve with Python 3
python3 -m http.server 8000

# Or use any other static web server
# Then open http://localhost:8000
```

### Testing

- **Main Game**: Open `index.html`
- **Static Visualization**: Open `test-game-static.html` to see the full course layout
- **Validation Tests**: Open `test-validation.html` to run the validation test suite

### Debug Mode

The game includes debug features that can be enabled in `js/config.js`:

- `showGrid`: Display coordinate grid
- `showIslandNumbers`: Show island indices
- `showBridgeZones`: Visualize safe bridge ranges

## Design Philosophy

Mountain Highway follows a minimalist design philosophy:

- **Clean visual style**: Simple colors and geometric shapes
- **Pure skill-based gameplay**: No randomness, perfect play is always possible
- **Methodical development**: Well-documented code with clear separation of concerns
- **Incremental complexity**: Features added systematically with proper testing

## License

This project was developed as a personal learning exercise.

## Credits

Developed by Mark Brown with assistance from Claude Code (Anthropic).

The game was built methodically through dialog-based development, with careful attention to code architecture and game design principles.

## Afterword

Aside from this afterword, this project was entirely written by Claude Code. Plain English assistance was provided by myself, the meat puppet who owns this github account.
