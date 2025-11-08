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

### Game Coordinate System
The game uses a **row/column** coordinate system distinct from screen coordinates:

- **Row**: Increases upward on screen (toward the top of the canvas)
- **Column**: Increases rightward on screen (toward the right side of the canvas)
- **Grid unit**: 50px base block size

**Coordinate mapping to screen (isometric projection):**
- `screenX = (col - row) * blockSize`
- `screenY = -(col + row) / 2 * blockSize`

**Example:**
- Island at (row=0, col=0) with size=2 occupies game coordinates from (0,0) to (2,2)
- Island at (row=0, col=4) with size=2 occupies game coordinates from (0,4) to (2,6)
- A 2-unit gap between them means columns 2-3 are empty

### Island Structure
- Islands are square (typically 2x2 grid units)
- Each island consists of three visible faces:
  - **Top face**: Green grass (#4CAF50) - horizontal diamond shape
  - **Right wall**: Light brown dirt (#8B4513) - extends downward
  - **Left wall**: Dark brown dirt (#6B3410) - extends downward
- Walls typically extend 400px downward (off-screen)
- Black outlines drawn only on visible edges:
  - Top surface perimeter
  - Front vertical edge (where the two walls meet at the near corner)
  - Two side vertical edges (where top meets each wall)

### Rendering
- HTML5 Canvas for all graphics
- Custom isometric projection using row/column game coordinates
- Solid color fills for each face
- 2px black stroke on visible edges only
- Faces drawn back-to-front for proper layering (walls first, then top)

## Future Features to Consider

- **Sound Effects**: Engine sounds, bridge extension, crashes
- **Difficulty Progression**: Gaps get wider, islands get smaller
- **Level Structure**: Fixed course vs. procedurally generated
- **Scoring**: Time-based with penalties for crashes
- **Visual Feedback**: Power meter during bridge extension
- **Win Condition**: Complete course vs. endless mode

## Development Status

### Completed
- ✅ Isometric rendering system with row/column coordinate mapping
- ✅ Island rendering with proper 3D appearance (top + two visible walls)
- ✅ Multiple islands with configurable gaps
- ✅ Proper edge rendering (visible edges only)

### In Progress
- 🔄 Road rendering on islands

### Planned
- ⏳ Vertical scrolling
- ⏳ Car sprite and movement
- ⏳ Bridge extension mechanic
- ⏳ Mouse input handling
- ⏳ Collision detection
- ⏳ Game loop and timing system
- ⏳ Start/game over screens
- ⏳ Sound effects
