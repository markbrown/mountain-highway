# Mountain Highway - Game Design Document

## Game Concept

Mountain Highway is a minimalist arcade game where players drive a car along a treacherous mountain highway, extending bridges to cross gaps between islands while racing against the clock.

## Core Gameplay

**Objective**: Drive the full length of the mountain highway course in the fastest time possible without falling off the edge.

**Challenge**: The highway has gaps between islands. Players must extend a bridge to cross each gap. The bridge length is determined by how long the player holds the mouse button.

**Failure Condition**: If the bridge is too short or too long, the car drives off the cliff and crashes, ending the game.

## Visual Style

- **Aesthetic**: Minimalist design using straight lines and simple colors
- **Perspective**: Isometric graphics aligned to a square grid
- **Scrolling**: Vertical scrolling during gameplay
- **Colors**:
  - Sky: Light blue (#87CEEB)
  - Island grass (top): Green (#4CAF50)
  - Island dirt (right wall): Light brown (#8B4513)
  - Island dirt (left wall): Dark brown (#6B3410)
  - Black outlines where faces meet

## World Layout

- Rectangular "islands" arranged vertically with gaps between them
- A road zigzags between islands but is missing at each gap
- Islands extend downward (showing their cliff walls)
- The view scrolls vertically as the player progresses

## Controls

- **Mouse button**: Hold to extend bridge
  - Hold duration determines bridge length
  - Release to stop extending and allow car to cross

## Mechanics

### Bridge System
- Player holds mouse button to extend a bridge
- Bridge extends from the current island toward the next
- Visual feedback shows bridge extension (details TBD)
- Bridge must reach the next island perfectly to cross safely
- Too short: car falls into gap
- Too long: car drives off far edge of next island

### Car Movement
- Car moves forward automatically (speed TBD)
- Player does not control steering, only bridge extension
- Car follows the road path when present
- Car follows bridge when crossing gaps

## Technical Details

### Grid System
- Islands aligned to isometric grid
- Base unit: 50px blocks
- Islands are square, typically 2x2 grid units (100px)

### Rendering
- HTML5 Canvas for all graphics
- Isometric projection system
- Solid faces with outlines only at edges (no interior grid lines)

## Future Features to Consider

- **Sound Effects**: Engine sounds, bridge extension, crashes
- **Difficulty Progression**: Gaps get wider, islands get smaller
- **Level Structure**: Fixed course vs. procedurally generated
- **Scoring**: Time-based with penalties for crashes
- **Visual Feedback**: Power meter during bridge extension
- **Win Condition**: Complete course vs. endless mode

## Development Status

### Completed
- ✅ Isometric rendering system
- ✅ Single island rendering with proper 3D appearance

### In Progress
- 🔄 Multiple island layout

### Planned
- ⏳ Vertical scrolling
- ⏳ Road rendering on islands
- ⏳ Car sprite and movement
- ⏳ Bridge extension mechanic
- ⏳ Mouse input handling
- ⏳ Collision detection
- ⏳ Game loop and timing system
- ⏳ Start/game over screens
- ⏳ Sound effects
