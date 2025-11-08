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

- **Mouse button**: Click and hold anywhere on screen to grow bridge
  - Bridge grows at constant rate (2 units per second)
  - Bridge displays vertically while growing so player can judge length
  - Release to stop growth and drop bridge to horizontal position
  - No cancel option - once released, outcome is determined

## Mechanics

### Game Flow
1. Car starts at (1,1) facing the direction of the first span
2. Car travels forward at constant speed along the road
3. Car stops when front bumper reaches just before the island edge
4. Player clicks and holds mouse button to grow bridge
5. Bridge grows vertically from island edge at 2 units/second
6. Player releases mouse button when bridge appears correct length
7. Bridge rotates down to horizontal with quick "slamming" animation
8. Car drives forward onto bridge and continues
9. If bridge length is incorrect, car eventually falls and game ends
10. If car reaches end of course, player wins

### Bridge System

**Bridge Growth:**
- Bridge is a rectangle, same width as the road (1 unit)
- Bridge color: Same dark gray as road (#444444)
- No border lines on bridge - blends seamlessly with road when horizontal
- Grows from the exact edge of the island along the road centerline
- Growth rate: 2 units per second
- Minimum length: 0 (instant click/release)
- Maximum length depends on junction type:
  - **Straight ahead**: Distance to opposite edge of island
  - **Left/Right turn**: Distance to outside corner
- Bridge stops growing at maximum length but stays vertical until released
- While growing: displayed as vertical rectangle (rotated 90°)
- When released: quick animation rotating down to horizontal (0.2 seconds)

**Bridge Rendering:**
- Vertical bridge: Rectangle extending upward from island edge
- Rotation animation: Bridge pivots from base edge where it attaches to road
- Horizontal bridge: Starts 0.1 units back onto island to cover edge line
- Edge line behavior:
  - While bridge is vertical/rotating: Black edge line redrawn on top of bridge
  - When bridge is horizontal: Edge line is covered by bridge for seamless road appearance

**Bridge Success Conditions:**

For **straight-ahead junctions** (column→column or row→row):
- Minimum: Bridge must reach near edge of next island
- Maximum: Bridge must not extend past far edge of next island
- Acceptable range: [gap distance, gap distance + island depth]
- Too short: car falls into gap
- Too long: car drives off far edge of next island

For **turns** (left or right):
- Minimum: Bridge must reach near edge of next island
- Maximum: Bridge must not extend past junction point
- Acceptable range: [gap distance, gap distance + distance to junction]
- Too short: car falls into gap
- Too long: bridge extends past junction, car misses turn and drives off opposite edge

**Visual Feedback:**
- Only the vertical bridge length is shown during growth
- No measurement indicators or gap distance hints
- Player must visually judge the correct length

**No Second Chances:**
- Player cannot cancel bridge once mouse button is pressed
- Wrong bridge length leads to eventual crash and game over
- Game over requires restart from beginning of course

### Car Movement

**Car Appearance:**
- Red rectangle with black outline
- Dimensions: 0.6 units long × 0.4 units wide
- Oriented based on current direction (column or row)
- Front bumper extends 0.3 units ahead of car center

**Car Behavior:**
- Speed: 2 units per second (constant)
- Movement: Automatic forward movement along road
- Steering: Player does not control - car follows course path automatically
- Turns: Instantaneous direction change at junction points
- Stopping: Front bumper stops 0.05 units before island edge
  - Stopping position = edge position - 0.3 (half car length) - 0.05 (margin)
  - Car waits at edge for bridge to be built
- After bridge drops: Car immediately continues forward across bridge

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

### Road Geometry
Roads are rendered on island surfaces to show the course path. Each road is 1 unit wide and colored dark grey (#444444).

**Road Width:**
- Roads are centered on the course centerline
- 1 unit total width (0.5 units on each side of centerline)
- For a course in row direction at column C: road extends from (C-0.5) to (C+0.5)
- For a course in column direction at row R: road extends from (R-0.5) to (R+0.5)

**Road Rendering Strategy:**
All roads are rendered using overlapping rectangles. The unified rectangle-based approach handles all cases systematically:

**Case 1: No junction (straight-ahead)**
- Single rectangle from entry edge to exit edge
- Entry and exit directions are the same
- Example: Island 3 with row→row
  - Single rectangle: row 5 to row 7, centered at column 5

**Case 2: One junction (turn to bridge)**
- Two overlapping rectangles forming an L-shape
- Entry and exit directions differ
- Rectangle 1: Entry edge to junction+0.5 (in entry direction)
  - Extends 0.5 units past junction for proper overlap
- Rectangle 2: Junction to exit edge (in exit direction)
- Example: Island 2 with column→row
  - Rect 1: column 4 to 5.5, centered at row 1 (column direction)
  - Rect 2: row 1 to 2, centered at column 5 (row direction)

**Case 3: Two junctions (turn to turn)**
- Three overlapping rectangles forming an S or Z shape
- Both junctions occur on the same island (no bridge between)
- Rectangle 1: Entry edge to junction1+0.5 (in entry direction)
- Rectangle 2: Junction1 to junction2+0.5 (in middle direction)
- Rectangle 3: Junction2 to exit edge (in exit direction)
- Example: Island 4 with row→column→row
  - Rect 1: row 8 to 9.5, centered at column 5 (row direction)
  - Rect 2: column 5 to 7.5, centered at row 9 (column direction)
  - Rect 3: row 9 to 10, centered at column 7 (row direction)

**Implementation:**
- `drawIslandRoad()` handles cases 1 and 2 (0 or 1 junction)
- `drawComplexRoadTwoTurns()` handles case 3 (2 junctions)
- Both methods use `drawRoad()` primitive to draw individual rectangles
- The +0.5 extension ensures seamless visual overlap at corners when leading to another junction

### Rendering
- HTML5 Canvas for all graphics
- Custom isometric projection using row/column game coordinates
- Solid color fills for each face
- 2px black stroke on visible edges only

**Layering Strategy:**
- Islands rendered from highest row to lowest row (back-to-front, top of screen to bottom)
- For each island, rendering happens in three phases:
  1. **Base colors**: Walls (brown) and top surface (green)
  2. **Road**: Grey road surface (1 unit wide)
  3. **Black outlines**: Visible edges where faces meet
- This ensures proper depth ordering: nearer islands overlay more distant ones completely (colors, roads, and lines)

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

## Terminology

**Core Concepts:**
- **Junction**: The coordinate position (row, col) where one span ends and the next begins. Junctions are the key to systematic road rendering.
- **Turn**: Describes the change in direction at a junction (left, right, or straight ahead). Useful for discussion but not required in code.
- **Edge**: The edge of an island where the road enters or leaves.
- **Base**: An edge that has a bridge attached. This occurs at exit edges (except for the final island).

**Usage in Code:**
- Focus on junction coordinates rather than turn types
- Roads are rendered as rectangles based on entry edge, junction locations, and exit edge
- Each island can have 0, 1, or 2 junctions depending on course configuration

## Code Improvements (Planned)

### High Priority
1. **Unify road rendering approach**: Refactor `drawIslandRoad()` to use rectangle-based approach like `drawComplexRoadTwoTurns()`. Eliminate complex polygon calculations.
2. **Extract magic numbers**: Define constants for values like car half-length (0.3), stopping margin (0.05), road half-width (0.5).
3. **Course validation**: Add validation to check that course and islands are consistent (islands large enough for junctions, junction points inside boundaries, gaps match spans).

### Medium Priority
4. **State machine refactor**: Replace nested setTimeout callbacks with declarative path segment system.
5. **Separate renderer concerns**: Pass road configuration type instead of checking island debug numbers.
6. **Debug mode enhancements**: Add overlays for junction markers, car target position, current game state, road segment boundaries.

### Low Priority
7. **Remove unused code**: Clean up `drawIsoCube()` method or move to utilities.
8. **Consistent terminology enforcement**: Audit code comments and variable names for terminology consistency.
9. **Decouple systems**: Create separate PathController, BridgeController, GameController for better modularity.

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
- ✅ Correct render ordering (highest row to lowest row, three-phase per island)
- ✅ Walls extending off-screen to simulate deep cliffs
- ✅ Course structure (spans, directions, junctions)
- ✅ Debug utilities separated into dedicated module
- ✅ Road rendering on islands (straight roads and L-shaped turns)
- ✅ Systematic road geometry calculation for all junction types
- ✅ Bridge rendering system (vertical, rotating, horizontal)
- ✅ Bridge animation (growth, slam down, seamless integration with road)
- ✅ Car sprite rendering (0.6×0.4 units, red with black outline)
- ✅ Car movement along course path
- ✅ Automatic car stopping at island edges
- ✅ Car turning at junctions (instantaneous direction change)
- ✅ Coordinated animation sequence (car movement + bridge building)

### Planned
- ⏳ Mouse input handling for bridge building
- ⏳ Player-controlled bridge length (hold duration)
- ⏳ Bridge length validation and success/failure logic
- ⏳ Car falling animation (bridge too short/long)
- ⏳ Vertical scrolling to follow car
- ⏳ Collision detection (car driving off edge)
- ⏳ Game states (start screen, playing, game over, win)
- ⏳ Sound effects
