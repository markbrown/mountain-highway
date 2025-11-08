# Mountain Highway - Game Design Document

## Game Concept

Mountain Highway is a minimalist arcade game where players drive a car along a treacherous mountain highway, extending bridges to cross gaps between islands while racing against the clock.

## Core Gameplay

**Objective**: Drive the full length of the mountain highway course in the fastest time possible without falling off the edge.

**Challenge**: The highway has gaps between islands. Players must extend a bridge to cross each gap. The bridge length is determined by how long the player holds the mouse button.

**Failure Condition**: If the bridge is too short or too long, the car drives off the cliff and crashes, ending the game.

## Course Structure

A course defines the path the car will travel through the game.

**Course Definition:**
- Every course starts at the center of the first island at game coordinate (1,1)
- A course consists of a sequence of **spans**
- Each span connects one island to the next island
- The course ends at a specific location on the final island

**Spans:**
- Each span travels in either the **column direction** (rightward on screen) or **row direction** (upward on screen)
- Each span must be at least 3 grid squares in length
- The end of each span (except the last) arrives at an island with a **junction**

**Junctions:**
- Junctions describe how the road turns between consecutive spans
- **Left turn**: Column direction → Row direction
- **Right turn**: Row direction → Column direction
- **Straight ahead**: Direction remains the same (Column → Column or Row → Row)
- Junction points must be at least 1 square away from the edge of the island

**Example Course:**
Starting at (1,1):
1. Span 1: +4 columns to (5,1) → Island 2 with left turn
2. Span 2: +5 rows to (5,6) → Island 3 straight ahead
3. Span 3: +3 rows to (5,9) → Island 4 with right turn
4. Span 4: +7 columns to (12,9) → Island 5 (final destination)

This course requires 5 islands total: one at the start, one at the end of each span.

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

### File Structure
- `index.html` - Main HTML page
- `style.css` - Styling for canvas and page layout
- `js/renderer.js` - Core rendering engine (islands, isometric projection)
- `js/course.js` - Course definition and management (spans, junctions, directions)
- `js/game.js` - Game loop, island data, and main logic
- `js/debug.js` - Debug utilities (grid, island numbering)

### Game Coordinate System
The game uses a **row/column** coordinate system distinct from screen coordinates:

- **Row**: Increases upward on screen (toward the top of the canvas)
- **Column**: Increases rightward on screen (toward the right side of the canvas)
- **Grid unit**: 50px base block size

**Coordinate mapping to screen (isometric projection):**
- `screenX = (col - row) * blockSize`
- `screenY = -(col + row) / 2 * blockSize`

**Examples:**
- Island at (row=0, col=0) with dimensions 2x2 occupies game coordinates from (0,0) to (2,2)
- Island at (row=0, col=4) with dimensions 2x2 occupies game coordinates from (0,4) to (2,6)
  - A 2-column gap between them means columns 2-3 are empty
- Island at (row=5, col=4) with dimensions 2x2 occupies game coordinates from (5,4) to (7,6)
  - A 3-row gap from second island (rows 2-4 are empty)
- Island at (row=8, col=4) with dimensions 4x2 occupies game coordinates from (8,4) to (10,8)
  - 4 columns wide, 2 rows tall

### Island Structure
- Islands can be rectangular (e.g., 2x2, 3x2, 4x2, etc.)
- Dimensions specified as width (columns) x height (rows)
- Each island consists of three visible faces:
  - **Top face**: Green grass (#4CAF50) - diamond/rhombus shape in isometric view
  - **Right wall**: Light brown dirt (#8B4513) - extends from near corner to right corner
  - **Left wall**: Dark brown dirt (#6B3410) - extends from left corner to near corner
- Walls extend 2000px downward (well off-screen)
  - Ground/floor is not visible - too far below
  - Creates illusion of floating islands with deep cliff sides
- Black outlines drawn only on visible edges:
  - Top surface perimeter (all four edges)
  - Front vertical edge (where the two walls meet at the near corner)
  - Two side vertical edges (where top meets each wall on left and right)

### Rendering
- HTML5 Canvas for all graphics
- Custom isometric projection using row/column game coordinates
- Solid color fills for each face
- 2px black stroke on visible edges only

**Layering Strategy:**
- Within each island: walls drawn first, then top surface (back-to-front)
- Between islands: render from highest row to lowest row (top of screen to bottom)
  - Islands with higher row values are drawn first
  - Their walls extend downward (400px, well below the visible canvas)
  - Islands closer to the viewer (lower row values) are drawn last
  - This creates proper occlusion where nearer islands appear in front

**Visual Model:**
- All island tops exist on the same horizontal plane
- The brown walls represent vertical cliffs extending downward to an invisible ground far below
- The isometric view shows islands "floating" with their cliff sides visible
- Islands closer to the camera (lower row values) visually overlap those further away
- Wall geometry:
  - Left wall (dark brown): Quadrilateral from left corner down to near corner down
  - Right wall (light brown): Quadrilateral from near corner down to right corner down
  - The far corner of the island does not affect wall rendering
  - Both walls extend straight down (2000px) parallel to the screen Y-axis

### Debug Features
Debug utilities are separated into `js/debug.js` and render as overlays on top of the game graphics.

**Debug Grid:**
- Faint grid lines to visualize the game coordinate system
- Shows row and column boundaries
- Rendered at 15% opacity
- Toggle via `showDebugGrid` flag in game.js
- Useful for positioning islands, roads, and other game elements

**Island Numbering:**
- White semi-transparent numbers (80% opacity) displayed at the center of each island
- Numbers start from 1 for the first island added
- Rendered in bold 24px Arial font
- Toggle via `showIslandNumbers` flag in game.js
- Useful for identifying islands during development and debugging

Both debug features are disabled by default and render on a separate layer above all game graphics.

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
- ✅ Rectangular islands with configurable width and height
- ✅ Multiple islands with configurable gaps (row and column)
- ✅ Proper edge rendering (visible edges only)
- ✅ Correct render ordering (highest row to lowest row)
- ✅ Walls extending off-screen to simulate deep cliffs
- ✅ Course structure (spans, directions, junctions)
- ✅ Debug utilities separated into dedicated module

### In Progress
- 🔄 Road rendering along course spans

### Planned
- ⏳ Vertical scrolling
- ⏳ Car sprite and movement
- ⏳ Bridge extension mechanic
- ⏳ Mouse input handling
- ⏳ Collision detection
- ⏳ Game loop and timing system
- ⏳ Start/game over screens
- ⏳ Sound effects
