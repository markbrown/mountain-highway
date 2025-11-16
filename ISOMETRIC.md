# Isometric Graphics Reference

This document explains the isometric projection system used in Mountain Highway, including coordinate systems, orientation conventions, and rendering details.

## Coordinate Systems

The game uses three coordinate systems that work together:

### 1. Game Coordinates (row, col, height)

**Purpose:** Logical grid positions in the game world

- `row`: Position along the row axis
- `col`: Position along the column axis
- `height`: Vertical position above ground (0 = ground level)

**Characteristics:**
- Origin is typically at the first island
- All measurements are in abstract "game units"
- Independent of rendering or screen pixels

### 2. Screen Space (x, y)

**Purpose:** Isometric projection of game coordinates (unscaled by pixels)

**Projection Formulas:**
```javascript
x = col - row
y = -(col + row) / 2 - height
```

**Important Properties:**
- Screen Y is **negative going upward** in visual space
  - Higher in the world = more negative Y
  - Example: Row 0, Col 0 → Y = 0; Row 10, Col 0 → Y = -5
- Height subtracts from Y (making it more negative = visually higher)
- Scale-independent (no pixel dimensions yet)

**Movement directions in screen space:**
- Increasing col → X increases, Y decreases (move right on screen)
- Increasing row → X decreases, Y decreases (move down-left on screen)
- Increasing height → Y decreases (move up on screen)

### 3. Canvas/SVG Coordinates (pixels)

**Purpose:** Final pixel positions for rendering

**Formula:**
```javascript
canvasX = screenX × blockSize + offsetX
canvasY = screenY × blockSize + offsetY
```

**Key Properties:**
- Canvas Y increases **downward** (standard screen convention)
- SVG Y also increases downward
- Top-left of canvas/SVG is (0, 0)
- `blockSize`: Scale factor (50 pixels per game unit in Mountain Highway)
- `offset`: Positions the viewport on the canvas

## Directional Orientation

### Understanding Row and Column Directions

When an object faces in the **positive column direction** (+col):
- **Left** is the **positive row direction** (+row)
- **Right** is the **negative row direction** (-row)
- **Forward** is **positive column** (+col)
- **Backward** is **negative column** (-col)

When an object faces in the **positive row direction** (+row):
- **Left** is the **negative column direction** (-col)
- **Right** is the **positive column direction** (+col)
- **Forward** is **positive row** (+row)
- **Backward** is **negative row** (-row)

### Visual Mapping to Screen

In the isometric view:
- **Positive column** direction → right on screen (northeast)
- **Negative column** direction → left on screen (southwest)
- **Positive row** direction → down-left on screen (southeast)
- **Negative row** direction → up-right on screen (northwest)

## Isometric Box Rendering

### Fundamental Visibility Rules for Cubes

These rules apply to any cube/rectangular prism in isometric projection:

1. **Cubes have 8 corners, but we can only see 7 of them.**
2. **The corner that is invisible is the one that is furthest away and is least in height.**
3. **A point is further away if the (row + column) is greater.**
4. **The corner that is invisible is the one with the greatest row position, the greatest column position, and the least height.**
5. **Cubes have 6 faces, but we can only see 3 of them.**
6. **The faces that are invisible are the ones that connect to the invisible corner.**
7. **In the row axis, the visible face is the one with the least row position.**
8. **In the column axis, the visible face is the one with the least column position.**
9. **In the vertical axis, the visible face is the one with the greatest height.**
10. **The top is always visible, the bottom is never visible.**
11. **When facing the positive column direction, the back and right are visible.**
12. **When facing the positive row direction, the back and left are visible.**
13. **When facing the negative column direction, the front and left are visible.**
14. **When facing the negative row direction, the front and right are visible.**

### Visible Faces

For a rectangular prism (box) in isometric view, **three faces are visible**:

1. **Top face** - always visible (highest face)
2. **Right side face** - visible when viewing from standard isometric angle
3. **Left side face** - visible when viewing from standard isometric angle

The **front**, **back**, and **bottom** faces are typically hidden (depending on orientation).

### Face Orientation for Column-Facing Object

For an object facing positive column direction (like our car):
- **Back face**: Located at minimum column (col = -length/2)
- **Front face**: Located at maximum column (col = +length/2) - HIDDEN
- **Left side face**: Located at maximum row (row = +width/2)
- **Right side face**: Located at minimum row (row = -width/2)
- **Top face**: Located at maximum height
- **Bottom face**: At height = 0 - HIDDEN

### Corner Visibility

For a box centered at origin with dimensions (length, width, height):
- Length in column direction: col ∈ [-length/2, +length/2]
- Width in row direction: row ∈ [-width/2, +width/2]
- Height: h ∈ [0, height]

**Eight corners total, visibility from standard isometric view:**

Ground level (h = 0):
- (-width/2, -length/2, 0): Back right - **VISIBLE**
- (-width/2, +length/2, 0): Front right - **VISIBLE**
- (+width/2, +length/2, 0): Front left - **HIDDEN**
- (+width/2, -length/2, 0): Back left - **VISIBLE**

Top level (h = height):
- (-width/2, -length/2, h): Back right top - **VISIBLE**
- (-width/2, +length/2, h): Front right top - **VISIBLE**
- (+width/2, +length/2, h): Front left top - **VISIBLE** (top face visible)
- (+width/2, -length/2, h): Back left top - **VISIBLE**

## Bidirectional Movement

The game supports movement in both positive and negative directions along both axes.

### Sign Conventions

For spans (movement segments):
- `span.length`: Always positive magnitude
- `span.sign`: +1 for positive direction, -1 for negative direction
- `span.signedLength = span.length × span.sign`

### Direction-Aware Calculations

When working with directional offsets:

**✅ GOOD - Explicit sign handling:**
```javascript
const extension = span.sign × 0.5;  // Extends in travel direction
const exitEdge = startPos + (span.sign × width);  // Correct edge for direction
```

**❌ BAD - Hardcoded assumptions:**
```javascript
const extension = 0.5;  // Assumes positive only
const exitEdge = startCol + width;  // Always uses far edge
```

### Questions to Ask

When implementing directional logic:
1. Does this work for negative spans?
2. Are we assuming "far edge" or "near edge"?
3. Does this offset extend in travel direction?

## Canvas and SVG Specifics

### Canvas (HTML5)

- **Coordinate system**: Origin (0,0) at top-left
- **Y-axis**: Increases downward
- **Transform order matters**: `translate()` then `rotate()` vs `rotate()` then `translate()` give different results
- **Context state**: Save/restore with `ctx.save()` and `ctx.restore()`

### SVG

- **Coordinate system**: Configurable via `viewBox`
- **Y-axis**: Increases downward by default
- **ViewBox**: `viewBox="minX minY width height"` defines the coordinate system
  - Example: `viewBox="-30 -30 60 60"` creates a 60×60 space centered at origin
- **Transform**: Applied in order specified in the `transform` attribute
- **Precision**: SVG uses floating-point coordinates (no pixel snapping)

### Centering ViewBox at Origin

For easier coordinate work, center the SVG viewBox:

```xml
<!-- 60×60 viewBox centered at (0,0) -->
<svg width="400" height="400" viewBox="-30 -30 60 60">
  <!-- Now (0,0) is at the center -->
  <circle cx="0" cy="0" r="1" fill="blue"/>
</svg>
```

Benefits:
- Positive/negative coordinates are intuitive
- Origin at visual center
- Symmetric coordinate space

## Scale Factors

**Mountain Highway uses:**
- `blockSize = 50` pixels per game unit
- SVG sprites may use different internal scales for clarity
- Conversion: `screenPixels = screenUnits × blockSize`

**For sprite creation:**
- Use `blockSize = 50` to match game scale exactly
- Calculate screen coordinates from game coordinates using projection formulas
- Multiply by 50 to get pixel coordinates for SVG elements

## Depth Sorting

Objects must be rendered back-to-front for correct occlusion:

**Sorting key:** `row + col` (higher values = farther from camera)

**Render order:**
1. Islands sorted by (row + col) descending (highest first)
2. Within each island: base → road → outlines
3. Bridges: Three-pass system based on direction and state
4. Car: Positioned correctly within depth order

## Practical Example

Car sprite at origin, dimensions 0.7 × 0.3 × 0.2:
- Length (column): 0.7 units → col ∈ [-0.35, +0.35]
- Width (row): 0.3 units → row ∈ [-0.15, +0.15]
- Height: 0.2 units → h ∈ [0, 0.2]

Visible ground corner (back right):
- Game coords: (row=-0.15, col=-0.35, h=0)
- Screen coords: x = -0.35 - (-0.15) = -0.2, y = -(-0.35 + (-0.15))/2 = 0.25
- SVG coords (blockSize=50): x = -10, y = 12.5

Visible top corner (front right):
- Game coords: (row=-0.15, col=+0.35, h=0.2)
- Screen coords: x = 0.35 - (-0.15) = 0.5, y = -(0.35 + (-0.15))/2 - 0.2 = -0.1 - 0.2 = -0.3
- SVG coords (blockSize=50): x = 25, y = -15

## Shading and Lighting in Isometric Graphics

Shading in isometric graphics represents **lighting direction**, not object properties:

### Key Principles

1. **Shading indicates light source direction**
   - Light comes from the upper-right (toward positive screen X)
   - Darker shades appear on surfaces facing away from light (left/back)
   - Brighter shades appear on surfaces facing toward light (right/front)

2. **Shading is view-dependent, not object-dependent**
   - When an object rotates, shading stays consistent with world lighting
   - The same physical face may have different shading in different orientations
   - Example: A car's left side is dark, but after 180° rotation, what is now the left side is still dark

3. **Object rotation and shading**
   - Rotating 180° swaps front/back and left/right
   - But shading doesn't swap - it remains consistent with lighting direction
   - Top and bottom don't swap (object isn't flipping upside-down)

### Mountain Highway Car Shading

For the car sprites (1.0 × 0.5 × 0.25 units):

**Column direction (traveling left/right on screen):**
- Back face (col = -0.5): Dark red #990000 (vertical, away from light)
- Right side (row = -0.25): Medium red #cc0000 (angled, toward light)
- Top faces: Light red #ff6666 (horizontal, most lit)

**Row direction (traveling diagonal on screen):**
- Left side (row = +0.25): Dark red #990000 (angled, away from light)
- Back/Front face: Medium red #cc0000 (vertical, neutral)
- Top faces: Light red #ff6666 (horizontal, most lit)

### Exceptions to Shading Rules

**Emissive objects** (light sources) don't follow shading rules:
- Headlights remain #FFFF99 regardless of orientation
- Windows reflecting sky remain #87CEEB regardless of direction
- Self-luminous objects maintain constant color

## Drawing Symmetric Objects with Rotation

For objects that are symmetric under 180° rotation (like cars):

### When rotating from positive to negative direction:

**What changes:**
- Front and back swap (functionally, not visually)
- Left and right swap (functionally, not visually)
- Features visible on front appear/disappear (headlights)

**What stays the same:**
- Polygon coordinates remain identical (car is symmetric)
- Shading pattern relative to screen (light from upper-right)
- Top face always visible, bottom never visible

**What flips when mirroring horizontally:**
- All X coordinates negate
- Shading colors swap to maintain lighting consistency
- Wheel positions mirror but foreshortening doesn't change

### Practical Application: Car Sprites

The game has four car sprites:
- `car-column-positive.svg`: Traveling right, shows back + right side
- `car-column-negative.svg`: Same polygons, adds headlights to front
- `car-row-positive.svg`: Horizontally flipped, shading adjusted for lighting
- `car-row-negative.svg`: Same as row-positive, adds headlights to front

## Compensating for Visual Distortion

### Ellipses for Circles

Circles appear foreshortened in isometric view:
- **Wheels**: Use ellipses with aspect ratio ~0.78 (rx = 6.5, ry = 8.33 for 8.33 radius)
- **Headlights**: Same aspect ratio as wheels
- Foreshortening is consistent across all orientations (it's a property of the view)

### Positioning Adjustments

The isometric view creates optical illusions:
- Wheels appear closer to edges than they actually are
- Compensate by moving wheels slightly inward from true quarter positions
- Rear wheel at 0.275 from back (instead of 0.25)
- Front wheel at 0.225 from front (instead of 0.25)

**Important:** These adjustments are **view corrections**, not object properties:
- Don't change when object rotates
- Stay the same for all four car orientations
- Mirrors reflect coordinates but not the correction ratios

## Common Pitfalls

1. **Forgetting Y is negative upward** in screen space
2. **Confusing canvas Y (down is positive) with screen Y (up is negative)**
3. **Assuming positive direction only** in directional calculations
4. **Wrong row/column orientation** - remember +row is left when facing +col
5. **Incorrect depth sorting** - must use (row + col) for isometric view
6. **Forgetting height component** - height affects Y coordinate
7. **Swapping shading with object rotation** - shading follows world lighting, not object orientation
8. **Changing foreshortening corrections** - ellipse ratios stay constant regardless of direction

## References

- Game Design Document: `GAME_DESIGN.md` (Viewport and Scrolling section)
- Renderer Implementation: `js/renderer.js` (`gameToScreen()` method)
- Configuration: `js/config.js` (`blockSize = 50`)
- Car Sprites: `assets/car-*.svg` (four directional variants with proper shading)
