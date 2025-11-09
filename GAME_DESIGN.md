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
1. Span 0: +4 columns to (1,5) → Island 1 with left turn
2. Span 1: +5 rows to (6,5) → Island 2 straight ahead
3. Span 2: +3 rows to (9,5) → Island 3 with right turn
4. Span 3: +2 columns to (9,7) → Island 3 with left turn (stays on same island)
5. Span 4: +4 rows to (13,7) → Island 4 (final destination)

This course requires 5 islands (numbered 0-4): Island 0 at the start, then one island at the end of each bridge-crossing span. Note that spans 2 and 3 both occur on Island 3 (two junctions, no bridge between them).

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
- Growth rate: 2 units per second (configurable via `GameConfig.bridge.growthRate`)
- Minimum length: 0 (instant click/release)
- Maximum length depends on junction type:
  - **Straight ahead**: Distance to opposite edge of island
  - **Left/Right turn**: Distance to outside corner
- **Target length**: Gap distance + 0.5 units (extends onto next island for smooth transition)
- **Animation timing**: Hold time = target length / growth rate
  - Example: 2.5 unit bridge at 2 units/sec = 1.25 second hold time
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
- `js/config.js` - Game configuration and constants (all magic numbers centralized)
- `js/renderer.js` - Core rendering engine (islands, isometric projection)
- `js/course.js` - Course definition and management (spans, junctions, directions)
- `js/validation.js` - Course and island validation system
- `js/game.js` - Game loop, island data, and main logic
- `js/debug.js` - Debug utilities (grid, island numbering)
- `test-validation.html` - Validation test suite with 10 test cases

### Game Coordinate System
The game uses a **row/column** coordinate system on an infinite grid plane:

- **Row**: Increases upward on screen (toward the top of the canvas)
- **Column**: Increases rightward on screen (toward the right side of the canvas)
- **Grid unit**: 50px base block size (configurable)

**Coordinate Notation Convention:**
- All positions written as **(row, col)** - row first, column second
- Example: Position (1, 5) means row=1, col=5
- Islands stored as `[row, col, width, height]`
- Course start: `{ startRow: 1, startCol: 1 }`

**Island Ordering Convention:**
- Islands are ordered by course-visit sequence
- Island number = number of bridges crossed to reach it
- Island 0 is the start (0 bridges crossed)
- Island N is reached after crossing bridge N-1
- Multiple junctions can occur on a single island (no bridge between them)
- Example: 5 islands (0-4) connected by 4 bridges (0-3)

**Benefits of Course-Order Islands:**
- Island array index directly corresponds to semantic game progress
- Bridge index matches destination island (bridge 0 → island 1, bridge 1 → island 2, etc.)
- Validation logic becomes clearer (check bridge N lands on island N+1)
- Debugging is easier (island numbers reflect actual gameplay sequence)
- Game state can reference "current island" by simple index

**Coordinate mapping to screen (isometric projection):**
- Pure transformation: `screenX = col - row`, `screenY = -(col + row) / 2`
- The `gameToScreen()` method performs this pure mathematical transformation
- Scaling by `blockSize` and viewport offset are applied separately

### Viewport System
The **Viewport** class defines what region of the infinite grid plane to display:

- **Purpose**: Separates the concept of the game grid from the view
- **Viewport bounds**: Defined by `minRow, maxRow, minCol, maxCol`
- **Canvas sizing**: Two modes supported:
  - **Auto-sized**: Canvas dimensions calculated to exactly fit viewport region
  - **Fixed-size**: Specified width/height with viewport centered in canvas
- **Offset calculation**: Positions the viewport region appropriately in canvas space
  - Auto-sized: Viewport positioned at canvas origin (0,0)
  - Fixed-size: Viewport centered in canvas (common for main game view)
- **Usage**: Pass viewport to Renderer constructor

**Architecture Benefits:**
- Separates infinite grid plane concept from finite view window
- Enables static visualizations with custom viewports (e.g., test suite)
- Supports future features like camera panning, zooming, or following the car
- Allows different courses with different viewport requirements
- Single rendering codebase works for both game canvas and test visualizations

**Example Usage:**
```javascript
// Fixed-size canvas (main game - 800x600 showing specific region)
const viewport = new Viewport(-1, 11, -1, 9, 50, 800, 600);

// Auto-sized canvas (test suite - size calculated to fit islands)
const viewport = new Viewport(minRow, maxRow, minCol, maxCol, 50);
```

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
- Example: Island 2 with row→row
  - Single rectangle: row 5 to row 7, centered at column 5

**Case 2: One junction (turn to bridge)**
- Two overlapping rectangles forming an L-shape
- Entry and exit directions differ
- Rectangle 1: Entry edge to junction+0.5 (in entry direction)
  - Extends 0.5 units past junction for proper overlap
- Rectangle 2: Junction to exit edge (in exit direction)
- Example: Island 1 with column→row
  - Rect 1: column 4 to 5.5, centered at row 1 (column direction)
  - Rect 2: row 1 to 2, centered at column 5 (row direction)

**Case 3: Two junctions (turn to turn)**
- Three overlapping rectangles forming an S or Z shape
- Both junctions occur on the same island (no bridge between)
- Rectangle 1: Entry edge to junction1+0.5 (in entry direction)
- Rectangle 2: Junction1 to junction2+0.5 (in middle direction)
- Rectangle 3: Junction2 to exit edge (in exit direction)
- Example: Island 3 with row→column→row
  - Rect 1: row 8 to 9.5, centered at column 5 (row direction)
  - Rect 2: column 5 to 7.5, centered at row 9 (column direction)
  - Rect 3: row 9 to 10, centered at column 7 (row direction)

**Implementation:**
- `Course.getRoadSegmentsForIsland()` extracts span segments for each island
  - Finds all spans that pass through the island
  - Clips segments to island boundaries
  - **Special cases for start/end islands:**
    - Island 0 (start): Road extends from near edge to first junction (implies continuation off-screen)
    - Last island: Road extends from last junction to far edge (implies continuation off-screen)
  - Returns array of segments with start/end positions and directions
- `Renderer.drawIslandRoadFromSpans()` renders roads systematically based on junction types
  - Detects straight-ahead: all segments same direction → merge into single rectangle
  - Detects turns: direction changes → separate rectangles with +0.5 extension at turns
  - Number of rectangles = number of direction changes + 1
- Road rendering is entirely derived from Course definition (no manual configuration needed)
- The +0.5 extension ensures seamless visual overlap at corners when there's a turn

### Rendering
- HTML5 Canvas for all graphics
- Custom isometric projection using row/column game coordinates
- Solid color fills for each face
- 2px black stroke on visible edges only

**Layering Strategy:**
- Islands rendered back-to-front (farthest to nearest) for proper depth ordering
- **Rendering order**: Sort islands by distance from camera, measured as `row + col`
  - Higher sum = farther from camera (rendered first)
  - Lower sum = closer to camera (rendered last, overlays others)
  - This works correctly even when islands are at the same row or column
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
- Numbers reflect course-visit order (island 0 = start, island N = after N bridges)
- Rendered in bold 24px Arial font
- Toggle via `showIslandNumbers` flag in game.js
- Useful for identifying islands during development and debugging

**Bridge Zones (Min/Max Safe Lengths):**
- Visual overlay showing valid bridge placement regions
- Two-layer visualization:
  - **White filled area**: Full possible bridge range (from island edge to maximum safe length)
  - **Dark green outline**: Safe zone boundaries (minimum to maximum safe bridge length)
- The white-only region (if visible) indicates bridge lengths that are too short
- The green-outlined region shows valid bridge lengths that will correctly reach the next island
- Calculations based on `CourseValidator.calculateBridgeRange()`:
  - Minimum safe: Must reach entry edge of next island
  - Maximum safe: Can extend to junction or opposite edge of next island
- Toggle via `showBridgeZones` flag in game.js (disabled by default in game)
- Always enabled in test suite for validation verification
- Rendered using `Renderer.drawRoad()` for filled areas and `Renderer.drawRoadOutline()` for safe zone boundaries

All debug features render on a separate layer above game graphics.

### Test Suite Visualization
The validation test suite (`test-validation.html`) provides comprehensive debugging visualizations:

**Test Case Display:**
- Each test case shows: expected result, actual result, pass/fail status
- Detailed tables show course spans and island configurations
- Visual rendering of each test case using auto-sized viewport

**Visual Debugging Aids:**
- **Grid lines**: Blue grid showing row/column boundaries (starting from 0,0)
- **Bridge zones**: White filled areas with dark green outlined safe zones (always enabled)
  - Shows minimum and maximum safe bridge lengths for each gap
  - Helps verify that bridges are correctly sized for the island spacing
- **Course overlay**: Yellow dots and lines showing the defined course path
  - Yellow dots mark start position and all junction points
  - Yellow lines connect consecutive positions along the course
  - Helps verify that course definition matches expected layout
- **Island numbering**: Shows course-visit order for each island
- **Full rendering**: Islands, walls, roads all rendered as they appear in game

**Benefits:**
- Quickly identify misalignments between course and islands
- Verify junction positions are correct and inside island boundaries
- Spot gaps or overlaps in road rendering
- Test different course configurations without running the full game
- Systematic validation of all 5 validation checks across 10 test cases

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
1. ~~**Unify road rendering approach**: Refactor `drawIslandRoad()` to use rectangle-based approach like `drawComplexRoadTwoTurns()`. Eliminate complex polygon calculations.~~ ✅ **Completed**
2. ~~**Extract magic numbers**: Define constants for values like car half-length (0.3), stopping margin (0.05), road half-width (0.5).~~ ✅ **Completed** - Created `config.js` with all game parameters centralized
3. ~~**Course validation**: Add validation to check that course and islands are consistent (islands large enough for junctions, junction points inside boundaries, gaps match spans).~~ ✅ **Completed** - Created `validation.js` with comprehensive validation system

**Validation Checks Implemented:**
- Islands must be at least 2x2 units
- Start location and all junctions must be in island interiors (strictly > edge, not equal)
- Bridge gaps must be at least 1 unit
- Maximum bridge size must land on next island
- Bridge tolerance (max - min) must be at least 1 unit
- Includes test suite with 10 test cases in `test-validation.html`

**Test Suite Design Principles:**
- Islands must be in course-order in the array (island N reached after N bridges)
- Test cases should actually fail/pass as intended (not just test validation logic)
- When setting up failure tests, ensure the specific condition being tested actually triggers
- Example: "Gap Too Small" needs gap = 0, not gap = 1 (which passes)
- Visual rendering order: sort islands by `row + col` distance for proper depth ordering

### Medium Priority
4. **State machine refactor**: Replace nested setTimeout callbacks with declarative path segment system.
   - Current implementation uses complex nested setTimeout chains in `advanceToNextSegment()`
   - Could use a segment queue with state transitions for cleaner flow
5. ~~**Separate renderer concerns**: Pass road configuration data instead of hardcoding.~~ ✅ **Completed** - Now uses `Course.getRoadSegmentsForIsland()` and `Renderer.drawIslandRoadFromSpans()`
6. **Debug mode enhancements**: Add overlays for junction markers, car target position, current game state, road segment boundaries.

### Low Priority
7. ~~**Remove unused code**: Clean up old rendering methods now that Course-based rendering is implemented.~~ ✅ **Completed** - Removed obsolete methods:
   - `drawIslandRoad()` - replaced by `drawIslandRoadFromSpans()`
   - `drawComplexRoadTwoTurns()` - replaced by `drawIslandRoadFromSpans()`
   - `drawIsoCube()` - legacy method, not used
8. **Decouple systems**: Create separate PathController, BridgeController, GameController for better modularity.

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
- ✅ Correct render ordering using `row + col` distance metric for depth sorting
- ✅ Walls extending off-screen to simulate deep cliffs
- ✅ Course structure (spans, directions, junctions)
- ✅ Debug utilities separated into dedicated module
- ✅ Road rendering using Course-based junction type analysis
  - Automatically determines rectangle count based on direction changes
  - Straight-ahead junctions render as single rectangle
  - Turn junctions render with +0.5 extension for overlap
- ✅ Systematic road geometry calculation for all junction types
- ✅ Bridge rendering system (vertical, rotating, horizontal)
- ✅ Bridge animation with correct timing (hold time = target length / growth rate)
- ✅ Car sprite rendering (0.6×0.4 units, red with black outline)
- ✅ Car movement along course path
- ✅ Automatic car stopping at island edges
- ✅ Car turning at junctions (instantaneous direction change)
- ✅ Coordinated animation sequence reaching final junction
- ✅ Viewport system separating grid plane from view window
- ✅ Course validation with 10 test cases
- ✅ Test suite with visual debugging (grid, course overlay, island details)

### Planned
- ⏳ Mouse input handling for bridge building
- ⏳ Player-controlled bridge length (hold duration)
- ⏳ Bridge length validation and success/failure logic
- ⏳ Car falling animation (bridge too short/long)
- ⏳ Vertical scrolling to follow car
- ⏳ Collision detection (car driving off edge)
- ⏳ Game states (start screen, playing, game over, win)
- ⏳ Sound effects
