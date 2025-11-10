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
- Each span travels in either the **column direction** or **row direction**
- Spans can have **positive length** (rightward/upward) or **negative length** (leftward/downward)
- Each span must be at least 3 grid squares in absolute length
- The end of each span (except the last) arrives at an island with a **junction**
- Internally, span sign is separated from length: `span.length` (always positive), `span.sign` (+1 or -1), `span.signedLength`

**Junctions:**
- Junctions describe whether the road turns between consecutive spans
- **Turn**: Direction changes (Column ↔ Row)
- **Straight**: Direction remains the same (Column → Column or Row → Row)
- Turn direction (left vs right) is not tracked since it doesn't affect rendering or validation
- Junction points must be at least 1 square away from the edge of the island

**Example Course:**
Starting at (1,1):
1. Span 0: +4 columns to (1,5) → Island 1 with turn
2. Span 1: +5 rows to (6,5) → Island 2 straight ahead
3. Span 2: +3 rows to (9,5) → Island 3 with turn
4. Span 3: +2 columns to (9,7) → Island 3 with turn (stays on same island)
5. Span 4: +4 rows to (13,7) → Island 4 with turn
6. Span 5: +3 columns to (13,10) → Island 5 with turn
7. Span 6: -4 rows to (9,10) → Island 6 with turn (negative span)
8. Span 7: -3 rows to (6,10) → Island 7 with turn (negative span)
9. Span 8: +3 columns to (6,13) → Island 7 with turn (stays on same island)
10. Span 9: +5 rows to (11,13) → Island 8 (end)

This course requires 9 islands (numbered 0-8): Island 0 at the start, then one island at the end of each bridge-crossing span. Note that spans 2-3 both occur on Island 3, and spans 7-8 both occur on Island 7 (multiple junctions, no bridge between them).

**Adding New Spans:**

When extending a course with a new span:

1. **Calculate the junction position**: Add the span's signed length to the previous junction
   - Example: Previous junction at (6,13), add +5 rows → new junction at (11,13)

2. **Determine if a new island is needed**:
   - Check if the new junction falls within the current island's boundaries
   - If the junction is outside the current island, a bridge is required → create a new island
   - If the junction is inside the current island, no bridge needed → span stays on same island

3. **If creating a new island** (when junction is outside current island):
   - For a 2×2 island, subtract 1 from both row and column coordinates
   - Junction at (11,13) → Island starts at (10,12)
   - This ensures junction at (row+1, col+1) = island center
   - Default to 2×2 islands unless otherwise specified

**Examples:**
- Span from (9,5) with +2 columns on island 3 (at 8,4 with size 4×2) → junction (9,7) is inside island 3 → no bridge
- Span from (6,13) with +5 rows on island 7 (at 5,9 with size 5×2) → junction (11,13) is outside island 7 → bridge to new island 8

## Visual Style

- **Aesthetic**: Minimalist design using straight lines and simple colors
- **Perspective**: Isometric graphics aligned to a square grid
- **Canvas**: Fixed 800×600 pixel canvas
- **Scrolling**: Dynamic vertical scrolling (details below)
- **Colors**:
  - Sky: Light blue (#87CEEB)
  - Island grass (top): Green (#4CAF50)
  - Island dirt (right wall): Light brown (#8B4513)
  - Island dirt (left wall): Dark brown (#6B3410)
  - Black outlines where faces meet

## Viewport and Scrolling

### Three Coordinate Systems

The rendering system uses three coordinate systems:

1. **Game Coordinates** (row, col)
   - Logical grid positions in the game world
   - Example: `(row=10, col=5)` is a position on the grid

2. **Screen Space** (x, y) - Isometric projection (unscaled)
   - Isometric projection formulas:
     - `x = col - row`
     - `y = -(col + row) / 2`
   - **Important**: Y is negative going upward in visual space
     - Row 0, Col 0 → screen Y = 0
     - Row 10, Col 0 → screen Y = -5
     - Higher rows = more negative Y values

3. **Canvas Coordinates** (pixels)
   - Final pixel positions on the HTML5 canvas
   - Formula: `canvas = screenSpace × blockSize + offset`
   - Canvas Y increases downward (standard screen convention)
   - Top-left of canvas is (0, 0)

### Viewport System

The `Viewport` class manages what portion of the game world is visible:

**Two Operating Modes:**

1. **Auto-sized canvas** (used in test views):
   - Canvas size = exactly what's needed to show the full viewport
   - Offset positions viewport at canvas origin
   - No scrolling - entire game region visible

2. **Fixed canvas with scrolling** (used in main game, 800×600):
   - Canvas size is fixed
   - Viewport shows a moving window into the game world
   - Offset centers the viewport region on the canvas
   - Changing minRow/maxRow values = vertical scrolling

### Camera System

**Fixed horizontal framing:**
- Horizontally centered on grid origin (0,0) throughout the game
- Column range dynamically calculated from course bounds
- Shows full course width, no horizontal scrolling

**Dynamic vertical scrolling:**
- Follows the car vertically as it progresses through the course
- Car kept approximately halfway up the viewport for optimal visibility
- Row range: Dynamic window of ~8 rows tall

### Scrolling Behavior

**Frame-by-frame updates:**
- Viewport recalculated every frame based on car's current row position
- Desired viewport: Centered on `carRow ± 4 rows` (with 1-row margin)
- Clamped to course bounds: Never scrolls past top or bottom

**Scrolling Direction (this is confusing!):**
- To scroll toward **higher row numbers** (visually downward on course):
  - Increase minRow/maxRow values
  - Screen Y becomes more negative
  - Canvas offset shifts content downward on screen

- To scroll toward **lower row numbers** (visually upward on course):
  - Decrease minRow/maxRow values
  - Screen Y becomes more positive
  - Canvas offset shifts content upward on screen

**Why it's confusing**: Screen space Y is negative going up (due to isometric formula), opposite of typical screen coordinates.

### Technical Implementation

**Course bounds calculation:**
- `calculateCourseBounds()` finds min/max row/col from all islands
- Adds 1-unit margin on all sides

**Viewport offset calculation:**
- `getOffset(carRow, carCol)` returns translation to apply before drawing
- Horizontal: Centers on grid origin (0,0)
- Vertical: Centers car position on canvas, clamped to course bounds
- **Critical insight**: Vertical screen position uses `-(row + col) / 2` formula
  - This means BOTH row and column affect vertical position in isometric projection
  - Start of course (minRow, minCol): `startScreenY = -(minRow + minCol) / 2`
  - End of course (maxRow, maxCol): `endScreenY = -(maxRow + maxCol) / 2`
  - Car position: `carScreenY = -(carRow + carCol) / 2`

**Clamping logic:**
- Three offsets are calculated:
  1. `offsetWhenAtStart = canvasHeight - startScreenY * blockSize` (start at bottom of canvas)
  2. `offsetWhenAtEnd = -endScreenY * blockSize` (end at top of canvas)
  3. `offsetCentered = canvasHeight/2 - carScreenY * blockSize` (car centered)
- Final offset: `Math.max(offsetWhenAtStart, Math.min(offsetWhenAtEnd, offsetCentered))`
- This ensures:
  - At game start: Start of course is at bottom of canvas (can't scroll to see below start)
  - At game end: End of course is at top of canvas (can't scroll to see above end)
  - During gameplay: Car stays centered vertically
- Course bounds (-1,-1) to (maxRow+1, maxCol+1) are passed to Viewport for clamping
- Viewport bounds (dynamic window) are separate from course bounds (fixed extent)
- Applied via `ctx.translate(offset.x, offset.y)` before rendering

## World Layout

- Rectangular "islands" arranged vertically with gaps between them
- A road zigzags between islands but is missing at each gap
- Islands extend downward (showing their cliff walls)
- The viewport scrolls vertically as the car progresses, revealing new islands ahead while hiding passed islands below

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
- Maximum length: `minSafe + 2.0` units (capped during growth)
  - Bridge stops growing at maximum even if button held
  - Bridge stays vertical until released (holding past maximum only costs time)
  - Maximum ensures bridge never extends past opposite edge of target island
- **Target length**: Gap distance + 0.5 units (extends onto next island for smooth transition)
- **Animation timing**: Hold time = target length / growth rate
  - Example: 2.5 unit bridge at 2 units/sec = 1.25 second hold time
- While growing: displayed as vertical rectangle (rotated 90°)
- When released: quick animation rotating down to horizontal (0.2 seconds)

**Bridge Rendering:**
- Vertical bridge: Rectangle extending upward from island edge
- Rotation animation: Bridge pivots from base edge where it attaches to road
- Horizontal bridge: Extends 0.1 units back onto start island and 0.1 units onto end island
  - This covers the edge lines on both islands for seamless road appearance
  - Rendered length = actual bridge length + 2 × baseOffset (0.2 units total extension)
- Edge line behavior:
  - While bridge is vertical/rotating: Black edge line redrawn on top of bridge
  - When bridge is horizontal: Edge lines are covered by bridge extensions

**Bridge Outcome Evaluation:**

When the bridge slam animation completes, the game evaluates the bridge length against the safe range and determines the outcome:

**Four possible outcomes:**

1. **Bridge too short** (length < minSafe - leeway):
   - Car enters DOOMED state
   - Car drives to predetermined fall point: bridge end + leeway distance
   - Car transitions to FALLING state and tumbles off screen
   - Game over when car falls out of view

2. **Bridge slightly short - Forgiveness applied** (minSafe - leeway ≤ length < minSafe):
   - Leeway value: 0.3 units (configurable via `GameConfig.bridge.leeway`)
   - Bridge length is extended to exactly minSafe
   - Bridge rendering is updated to use extended length
   - Car continues safely - player gets a second chance for close attempts
   - Console logs: "Bridge slightly short - applying forgiveness"

3. **Bridge safe** (minSafe ≤ length ≤ maxSafe):
   - Normal gameplay continues
   - Car drives across bridge to next island

4. **Bridge too long** (length > maxSafe):
   - Junction type determines outcome:
     - **Straight junction or end of course**: Car continues safely (only costs time)
     - **Turn junction**: Check if car misses the turn
       - If `overshoot > 0` (where `overshoot = length - maxSafe`):
         - Car enters DOOMED state
         - Car drives to predetermined fall point: opposite edge of target island + leeway
         - Car transitions to FALLING state and tumbles off screen
         - **Rendering reversal**: Car renders on far side (reversed from too-short case)
           - Positive bridges: car renders before target island
           - Negative bridges: car renders after target island
         - Game over when car falls out of view
       - If `overshoot ≤ 0`: Car makes the turn successfully (bridge slightly too long but safe)

**Safe Range Definition:**

For **straight-ahead junctions** (column→column or row→row):
- Minimum: Bridge must reach near edge of next island (gap distance)
- Maximum: Bridge must not extend past far edge of next island
- Acceptable range: [gap distance, gap distance + island depth]

For **turns** (left or right):
- Minimum: Bridge must reach near edge of next island (gap distance)
- Maximum: Bridge must not extend past junction point
- Acceptable range: [gap distance, gap distance + distance to junction]

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

**Car Falling:**

When a bridge is incorrectly sized, the car may fall off the edge:

**Bridge Too Short:**
- When bridge is too short (beyond forgiveness range), car enters DOOMED state
- DOOMED state: Car drives automatically to fall point with no player control
- Fall point: Bridge end + leeway (0.3 units past bridge end)
- Rendering order (direction-aware):
  - **Positive direction bridges**: Car renders after target island (car on near side)
  - **Negative direction bridges**: Car renders before target island (car on far side)
  - In both cases: car appears in front of island it fell short of, behind foreground islands

**Bridge Too Long (Turn Junction Only):**
- When bridge extends too far past turn junction, car misses the turn
- DOOMED state: Car drives automatically to fall point on far side of target island
- Fall point: Opposite edge of target island + leeway (0.3 units past opposite edge)
- Rendering order (direction-aware - **reversed from too short**):
  - **Positive direction bridges**: Car renders before target island (car on far side)
  - **Negative direction bridges**: Car renders after target island (car on far side)
  - In both cases: car appears behind island it drove across, in front of more distant islands

**FALLING State (Both Cases):**
- Gravity: 20 units/second² acceleration (configurable via `GameConfig.physics.gravity`)
- Tumble rate: 3.0 radians/second rotation (configurable via `GameConfig.physics.tumbleRate`)
- Car position remains at (row, col) where it fell
- Z-offset increases positively (moves down on screen)
- Car rotates continuously while falling
- Falls underneath the bridge
- Direction stored when car becomes DOOMED (`this.bridgeIsPositive`)
- Game over: When car falls more than 100 units below plane
- No recovery possible once falling begins

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
- Rectangle 1: Entry edge to junction±0.5 (in entry direction)
  - Extends 0.5 units past junction for proper overlap
  - **Direction-aware**: Positive spans extend `+0.5`, negative spans extend `-0.5`
- Rectangle 2: Junction to exit edge (in exit direction)
- Example: Island 1 with column→row
  - Rect 1: column 4 to 5.5, centered at row 1 (column direction, positive)
  - Rect 2: row 1 to 2, centered at column 5 (row direction)

**Case 3: Two junctions (turn to turn)**
- Three overlapping rectangles forming an S or Z shape
- Both junctions occur on the same island (no bridge between)
- Rectangle 1: Entry edge to junction1±0.5 (in entry direction)
- Rectangle 2: Junction1 to junction2±0.5 (in middle direction)
  - Both use **direction-aware extension**: `sign * 0.5`
- Rectangle 3: Junction2 to exit edge (in exit direction)
- Example: Island 3 with row→column→row
  - Rect 1: row 8 to 9.5, centered at column 5 (row direction, positive)
  - Rect 2: column 5 to 7.5, centered at row 9 (column direction, positive)
  - Rect 3: row 9 to 10, centered at column 7 (row direction)

**Implementation:**
- `Course.getRoadSegmentsForIsland()` extracts span segments for each island
  - Finds all spans that pass through the island
  - Clips segments to island boundaries
  - **Special cases for start/end islands:**
    - Island 0 (start): Road extends from near edge to first junction (implies continuation off-screen)
    - Last island: Road extends from last junction to far edge (implies continuation off-screen)
  - Returns array of segments with start/end positions, directions, **and sign** (`+1` or `-1`)
- `Renderer.drawIslandRoadFromSpans()` renders roads systematically based on junction types
  - Detects straight-ahead: all segments same direction → merge into single rectangle
  - Detects turns: direction changes → separate rectangles with direction-aware extension at turns
  - **Extension calculation**: `segment.sign * 0.5` (positive = `+0.5`, negative = `-0.5`)
  - Number of rectangles = number of direction changes + 1
- Road rendering is entirely derived from Course definition (no manual configuration needed)
- The ±0.5 extension ensures seamless visual overlap at corners when there's a turn

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

**Bridge and Car Rendering Order:**
- **Completed bridges** (horizontal): Rendered before car (car drives on top)
- **Positive direction bridges being animated**: Rendered before car (car on near side)
- **Car**: Rendered in the middle
- **Negative direction bridges being animated**: Rendered after car (bridge on near side)
- This ensures correct depth relationships: the car appears in front of positive bridges but behind negative bridges during animation
- Once any bridge is completed, the car drives over it regardless of direction

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
  - **Minimum safe**: Must reach entry edge of next island (gap distance)
  - **Maximum safe**: Depends on junction type at the bridge end:
    - **Turn junction** (left/right): Can extend 0.5 units past junction
    - **Straight junction or end of course**: Can extend 1.0 unit past junction
    - Rationale: Straight junctions need more overlap for visual continuity
- Toggle via `showBridgeZones` flag in game.js (disabled by default in game)
- Always enabled in test suite for validation verification
- Rendered using `Renderer.drawRoad()` for filled areas and `Renderer.drawRoadOutline()` for safe zone boundaries
- **Direction-aware rendering**: Bridge zones extend in the correct direction (positive or negative) based on span travel direction
  - `DebugRenderer.drawBridgeZone()` calculates sign from bridge start/end positions
  - Exit edge chosen based on sign: positive uses far edge, negative uses near edge
  - Zone extends as `exitEdge + (sign * length)` for correct directionality

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

## Code Improvements

### Completed Improvements ✅

1. **Unified road rendering approach** - Refactored to use rectangle-based approach. Eliminated complex polygon calculations.
2. **Configuration centralization** - Created `config.js` with all game parameters centralized (car dimensions, road width, bridge speeds, etc.)
3. **Course validation system** - Created `validation.js` with comprehensive validation:
   - Islands must be at least 2x2 units
   - Start location and all junctions must be in island interiors (strictly > edge, not equal)
   - Bridge gaps must be at least 1 unit
   - Maximum bridge size must land on next island
   - Bridge tolerance (max - min) must be at least 1 unit
   - Includes test suite with 10 test cases in `test-validation.html`
4. **Bridge abstraction** - Extracted bridge logic into reusable structures:
   - Created `Bridge` class to encapsulate bridge data (span index, islands, positions, direction, junction type)
   - Added `Course.getBridges(islands)` as single source of truth for finding bridges
   - Added `Bridge.calculateRange(islands)` to encapsulate safe range calculation
   - Simplified `DebugRenderer.drawBridgeZones()` and extracted `CourseValidator.validateBridges()`
5. **Level abstraction** - Created `Level` class to centralize course + island configuration:
   - Single source of truth for level configuration in `createExampleLevel()`
   - Auto-calculates bridge animation data from geometry
   - Eliminates duplication across game and test files
6. **Separated renderer concerns** - Now uses `Course.getRoadSegmentsForIsland()` and `Renderer.drawIslandRoadFromSpans()`
7. **Removed unused code** - Cleaned up obsolete rendering methods:
   - `drawIslandRoad()` - replaced by `drawIslandRoadFromSpans()`
   - `drawComplexRoadTwoTurns()` - replaced by `drawIslandRoadFromSpans()`
   - `drawIsoCube()` - legacy method, not used

**Test Suite Design Principles:**
- Islands must be in course-order in the array (island N reached after N bridges)
- Test cases should actually fail/pass as intended (not just test validation logic)
- When setting up failure tests, ensure the specific condition being tested actually triggers
- Example: "Gap Too Small" needs gap = 0, not gap = 1 (which passes)
- Visual rendering order: sort islands by `row + col` distance for proper depth ordering

### Completed Improvements ✅

8. **Path segment system** - Refactored state machine to use declarative segments:
   - Added `Course.getPathSegments(islands)` to generate drive/bridge/turn segments from course structure
   - Eliminated 95 lines of hardcoded setTimeout chains
   - Segment types: `drive` (move to position), `bridge` (animate bridge), `turn` (change direction)
   - Bridge sequence for each bridge: drive to edge → bridge grows/slams → drive across → turn at junction
   - Bridge lengths automatically calculated from `Level.getBridgeAnimationData()` (gap + 0.5 units)
   - Demo animation now adapts automatically to any course changes
   - Foundation for gameplay: same system can be used when player controls bridge timing

9. **Negative span support** - Full bidirectional travel capability:
   - Spans can now have negative length to travel backward (leftward/downward)
   - Refactored `Span` class to separate sign from length for clarity:
     - `span.length`: Always positive magnitude
     - `span.sign`: +1 or -1 indicating direction
     - `span.isPositive`: Boolean helper
     - `span.signedLength`: Signed length for calculations
   - Updated all systems to handle negative spans:
     - Road segment rendering: Correct clipping for negative direction
     - Bridge positioning: Exit from near edge (instead of far edge)
     - Bridge range calculation: Swap entry/exit edges for negative bridges
     - Car animation: Bidirectional movement with proper target checking
     - Bridge rendering: Negative length extends in opposite direction
     - Bridge slam animation: Counter-clockwise rotation for negative bridges
   - Isometric rendering order handles negative bridges correctly:
     - Completed bridges always render before car (car drives on top)
     - Animating positive bridges render before car (car on near side)
     - Animating negative bridges render after car (bridge on near side)
   - Reduces code complexity by computing sign once instead of repeated position comparisons

### Planned Improvements

**Refactoring Strategy:**

After completing Phases 1-3 of code cleanup (config centralization, removing redundant storage), we've decided to **postpone Phase 4** (renderer refactoring) until after implementing core gameplay mechanics.

**Rationale:**
- Phase 4 would refactor bridge rendering logic from Game into Renderer
- But the next feature (car falling off short bridges) will require:
  - New game states (FALLING, CRASHED)
  - Physics simulation (gravity, rotation during fall)
  - Collision detection at bridge ends
  - Complex car rendering at arbitrary angles
- These gameplay mechanics may reveal better refactoring opportunities than we can anticipate now
- Implementing falling first will inform what the right architectural separation should be
- Risk of refactoring in the wrong direction if done prematurely

**Completed Refactoring (Phases 1-3):**
- ✅ Phase 1: Quick wins - GameState constants, config centralization
- ✅ Phase 2: Removed redundant canvas size storage
- ✅ Phase 3: Removed redundant car/bridge config storage
- ⏸️ Phase 4: Renderer refactoring - **deferred until after falling mechanic**

**Next Steps:**
1. Implement car falling mechanic (bridge too short/long)
2. Implement physics and tumbling animation
3. Reassess refactoring needs based on new complexity
4. Determine if Phase 4 is still relevant or if different refactoring is needed

**Medium Priority:**
1. **Debug mode enhancements**: Add overlays for junction markers, car target position, current game state, road segment boundaries.

**Low Priority:**
2. **Decouple systems**: Create separate PathController, BridgeController, GameController for better modularity (reassess after falling mechanic).

## Future Features to Consider

- **Sound Effects**: Engine sounds, bridge extension, crashes
- **Difficulty Progression**: Gaps get wider, islands get smaller
- **Level Structure**: Fixed course vs. procedurally generated
- **Scoring**: Time-based with penalties for crashes
- **Visual Feedback**: Power meter during bridge extension
- **Win Condition**: Complete course vs. endless mode

## Code Patterns and Best Practices

### Handling Bidirectional Movement

When working with code that involves spans, offsets, or distances, always consider whether the calculation works for both positive and negative directions.

**✅ GOOD - Explicit sign handling:**
```javascript
// Multiply by sign for direction-aware offsets
const offset = sign * 0.5;
const result = position + offset;

// Exit edge selection based on direction
const exitEdge = isPositive ? (startCol + width) : startCol;
const maxBridgeEnd = isPositive ? (exitEdge + distance) : (exitEdge - distance);
```

**❌ BAD - Hardcoded assumptions:**
```javascript
// Assumes positive direction only
const result = position + 0.5;
const exitEdge = startCol + width;
const maxBridgeEnd = exitEdge + distance;
```

**❌ BAD - Verbose conditionals:**
```javascript
// Works but harder to maintain
const result = isPositive ? position + 0.5 : position - 0.5;
```

**Key principle**: Use sign multiplication (`sign * value`) instead of conditionals when possible. This makes the directional nature explicit and reduces branching.

### Code Review Checklist for Direction-Aware Code

When adding or modifying code involving positions, offsets, or edges:

1. **Does this work for negative spans?** Test mentally with a negative direction
2. **Are we assuming "far edge" or "near edge"?** Use `exitEdge` pattern instead
3. **Does this offset extend in travel direction?** Use sign multiplication
4. **Are we hardcoding + or -?** Consider if it should be direction-aware
5. **Test coverage**: Does the test suite include both positive AND negative cases?

### Naming Conventions

**✅ GOOD - Direction-neutral or explicit:**
- `exitEdge`, `entryEdge` (relationship-based)
- `travelDirection`, `isPositive`, `sign`
- `signedLength`, `signedOffset`

**⚠️ RISKY - Assumes direction:**
- `rightEdge`, `leftEdge` (assumes positive)
- `bottomEdge`, `topEdge` (assumes positive)
- `forwardOffset` (ambiguous which way is "forward")

### Common Patterns

**Pattern 1: Choosing the correct edge**
```javascript
const isPositive = endPos > startPos;
const exitEdge = isPositive ? (start + size) : start;
```

**Pattern 2: Extending past a point in travel direction**
```javascript
const extension = sign * 0.5;
const extendedPos = junctionPos + extension;
```

**Pattern 3: Calculating signed distance**
```javascript
const signedDistance = sign * Math.abs(distance);
const finalPos = startPos + signedDistance;
```

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

### Completed (Continued)
- ✅ Bridge outcome evaluation system
  - Four outcomes: too short, slightly short (forgiveness), safe, too long
  - Leeway mechanic (0.3 units) for close attempts
  - Bridge length extension when forgiveness applied
  - Maximum bridge length cap (minSafe + 2.0 units)
- ✅ Car falling mechanic (bridge too short)
  - DOOMED state: car drives to fall point
  - FALLING state: gravity, tumble rotation, z-offset
  - Proper rendering order (behind foreground islands, under bridge)
  - Game over when car falls out of view
- ✅ Car falling mechanic (bridge too long)
  - Junction type detection (straight vs turn)
  - Turn junctions: car misses turn if bridge extends too far past junction
  - DOOMED state: car drives to opposite edge of target island
  - Rendering order reversal (car on far side, opposite from too-short case)
  - Straight junctions: safe regardless of bridge length (only costs time)
- ✅ Physics system
  - Gravity acceleration (20 units/second²)
  - Tumble rotation while falling (3.0 rad/s)

### Planned
- ⏳ Mouse input handling for bridge building
- ⏳ Player-controlled bridge length (hold duration)
- ⏳ Vertical scrolling to follow car (currently implemented but may need refinement)
- ⏳ Game states (start screen, playing, game over, win)
- ⏳ Sound effects
