# Vertical Scrolling in Mountain Highway

This document explains the vertical scrolling system, including all coordinate transformations and offset calculations.

## Overview

The game uses vertical scrolling to follow the car as it progresses up the course. The scrolling system must handle:
1. Keeping the car centered when possible
2. Not scrolling past the top of the course
3. Not scrolling past the bottom of the course (strongest constraint)
4. Working correctly across different window aspect ratios

## Coordinate Systems

The scrolling system involves four coordinate spaces:

### 1. Game Coordinates (row, col)
- Logical grid positions in the game world
- Example: Car starts at (1, 1)
- Course bounds: typically (-1, -1) to (maxRow+1, maxCol+1)

### 2. Screen Space (screenX, screenY)
- Isometric projection of game coordinates (unscaled)
- **Formula:** `screenY = -(row + col) / 2`

**Key properties:**
- More negative screenY = higher up the course (toward the finish)
- More positive screenY = lower down the course (toward the start)
- Example:
  - Point (1, 1): screenY = -(1+1)/2 = -1
  - Point (2, 2): screenY = -(2+2)/2 = -2 (higher on course)
  - Point (-1, -1): screenY = -(-1+-1)/2 = 1 (bottom of course)

### 3. Canvas Pixel Coordinates (canvasX, canvasY)
- Pixel positions within the canvas drawing buffer
- **Formula:** `canvasY = screenY * blockSize + offset`
- Canvas origin: (0, 0) at top-left
- Canvas Y increases downward (0 = top, canvasHeight = bottom)

**Canvas dimensions:**
- Width: Fixed at 800px (always)
- Height: Dynamic based on window aspect ratio
- **Formula:** `canvasHeight = 800 / (containerWidth / containerHeight)`
- Example aspect ratios:
  - 16:9 window (1920×1080): canvasHeight = 800 / 1.778 = 450px
  - 4:3 window (800×600): canvasHeight = 800 / 1.333 = 600px
  - 2:3 window (600×900): canvasHeight = 800 / 0.667 = 1200px

### 4. Browser Window Coordinates
- Final display coordinates in the browser
- CSS stretches the canvas to fill the container
- Scale factor: `containerHeight / canvasHeight`
- **Important:** All offset calculations happen in canvas pixel space (step 3), then CSS scales to browser space

## The Offset Variable

The `offset` variable controls vertical scrolling by shifting where game content appears on the canvas.

### What offset means:
```javascript
canvasY = screenY * blockSize + offset
```

- **Larger offset** → content moves DOWN on canvas → we see higher parts of the course (toward finish)
- **Smaller offset** → content moves UP on canvas → we see lower parts of the course (toward start)

### Example with car at (1, 1):
- Car screenY = -1
- With offset = 300: canvasY = -1 * 50 + 300 = 250 (car above center on 600px canvas)
- With offset = 350: canvasY = -1 * 50 + 350 = 300 (car at center on 600px canvas)
- With offset = 400: canvasY = -1 * 50 + 400 = 350 (car below center on 600px canvas)

**Rule:** Increasing offset by N pixels moves ALL content down by N pixels on the canvas.

## Three Scroll Positions

We calculate three key offset values to control scrolling:

### 1. Car Centered (offsetCentered)

**Goal:** Place the car at the vertical center of the canvas.

**Calculation:**
```javascript
const carScreenY = -(carRow + carCol) / 2;
const offsetCentered = canvasHeight / 2 - carScreenY * blockSize;
```

**Why this works:**
- We want: `canvasY = canvasHeight / 2` (center)
- Rendering equation: `canvasY = screenY * blockSize + offset`
- Substitute: `canvasHeight / 2 = carScreenY * blockSize + offset`
- Solve: `offset = canvasHeight / 2 - carScreenY * blockSize`

**Example (800×600 canvas, car at 2,2):**
- carScreenY = -(2+2)/2 = -2
- offsetCentered = 300 - (-2)*50 = 300 + 100 = 400
- Verify: canvasY = -2*50 + 400 = 300 ✓ (centered)

**Important:** This uses the dynamic `canvasHeight`, which varies with window aspect ratio.

### 2. Top Locked (offsetTopLocked)

**Goal:** Place the top of the course at the top of the canvas (prevent scrolling past the top).

**Calculation:**
```javascript
const topRow = courseBounds.maxRow;
const topCol = courseBounds.maxCol;
const topScreenY = -(topRow + topCol) / 2;
const offsetTopLocked = -topScreenY * blockSize;
```

**Why this works:**
- We want the top of course at: `canvasY = 0` (top of canvas)
- Rendering equation: `canvasY = screenY * blockSize + offset`
- Substitute: `0 = topScreenY * blockSize + offset`
- Solve: `offset = -topScreenY * blockSize`

**Example (course top at 13,13):**
- topScreenY = -(13+13)/2 = -13
- offsetTopLocked = -(-13)*50 = 650

**Verify:**
- Top renders at: canvasY = -13*50 + 650 = -650 + 650 = 0 ✓ (at top of canvas)

**This is the MINIMUM offset** (smallest value that doesn't scroll past top).

### 3. Bottom Locked (offsetBottomLocked)

**Goal:** Place the bottom of the course at the bottom of the canvas (prevent scrolling past the bottom).

**Calculation:**
```javascript
const bottomRow = courseBounds.minRow;  // typically -1
const bottomCol = courseBounds.minCol;  // typically -1
const bottomScreenY = -(bottomRow + bottomCol) / 2;
const offsetBottomLocked = canvasHeight - bottomScreenY * blockSize;
```

**Why this works:**
- We want the bottom of course at: `canvasY = canvasHeight` (bottom of canvas)
- Rendering equation: `canvasY = screenY * blockSize + offset`
- Substitute: `canvasHeight = bottomScreenY * blockSize + offset`
- Solve: `offset = canvasHeight - bottomScreenY * blockSize`

**Example (800×600 canvas, course bottom at -1,-1):**
- bottomScreenY = -(-1+-1)/2 = 1
- offsetBottomLocked = 600 - 1*50 = 550

**Verify:**
- Bottom renders at: canvasY = 1*50 + 550 = 600 ✓ (at bottom of canvas)

**This is the MAXIMUM offset** (largest value that doesn't scroll past bottom).

**Important:** This also uses the dynamic `canvasHeight`, so it adapts to window aspect ratio.

## Constraint Application

We apply the three constraints in order:

```javascript
let offsetY = offsetCentered;                   // Step 1: Center the car
offsetY = Math.min(offsetY, offsetTopLocked);   // Step 2: Apply upper bound (weaker)
offsetY = Math.max(offsetY, offsetBottomLocked);// Step 3: Apply lower bound (STRONGER)
```

### Understanding the Constraints

**Key insight:** Think of the constraints as bounds on the allowed offset value:

1. **offsetTopLocked = UPPER BOUND (maximum allowed offset)**
   - If offset is too large → top of course moves too far DOWN on canvas → we see empty space ABOVE the course
   - This constraint prevents scrolling "past the finish line"

2. **offsetBottomLocked = LOWER BOUND (minimum allowed offset)**
   - If offset is too small → bottom of course moves too far UP on canvas → we see empty space BELOW the course
   - This constraint prevents scrolling "past the start line"
   - **This is the STRONGER constraint** - must be applied last

### Why this order?

1. **Start with car centered** - This is our ideal position
2. **Apply upper bound first (weaker)** - Caps offset at maximum: `Math.min(offset, upperBound)`
3. **Apply lower bound last (STRONGER)** - Ensures minimum: `Math.max(offset, lowerBound)`

The lower bound wins when constraints conflict because it's applied last.

### At game start (car at 1,1):

With 800×600 canvas, car at (1,1), course from (-1,-1) to (13,13):

- offsetCentered ≈ 350 (tries to center car)
- offsetTopLocked ≈ 650 (upper bound - maximum offset)
- offsetBottomLocked ≈ 550 (lower bound - minimum offset)

**Step-by-step:**
- Step 1: offset = 350 (car centered)
- Step 2: offset = Math.min(350, 650) = 350 (upper bound doesn't restrict yet)
- Step 3: offset = Math.max(350, 550) = 550 (lower bound wins!)
- **Result:** offset = 550, bottom of course locked at bottom of canvas ✓

### When constraints conflict (tall narrow window):

If the window is very tall and narrow:
- canvasHeight might be 1200px
- The entire course fits on screen
- offsetBottomLocked > offsetTopLocked (lower bound > upper bound - impossible to satisfy both!)

Example:
- offsetTopLocked = 650 (upper bound)
- offsetBottomLocked = 700 (lower bound) - CONFLICT!
- Step 2: offset = Math.min(centered, 650) might give 650
- Step 3: offset = Math.max(650, 700) = 700 (lower bound wins!)
- **Result:** Bottom constraint overrides top constraint, bottom stays locked at bottom of canvas

## Key Insights

### 1. Offset Direction
- **Increasing offset** = content moves DOWN on canvas = we see HIGHER parts of course
- This is counterintuitive but follows from the isometric formula where higher game positions have more negative screenY

### 2. Canvas Height is Dynamic
- `canvasHeight = 800 / aspectRatio`
- Narrow windows → large canvasHeight (e.g., 1200px)
- Wide windows → small canvasHeight (e.g., 450px)
- All offset formulas must use this dynamic value

### 3. Upper/Lower Bound Relationship
- offsetTopLocked = UPPER BOUND (maximum allowed offset)
- offsetBottomLocked = LOWER BOUND (minimum allowed offset)
- When lower > upper, constraints conflict (course fits entirely on screen)
- In conflict case, lower bound wins because it's applied last with `Math.max()`

### 4. CSS Scaling is Separate
- All calculations happen in canvas pixel coordinates (800 × canvasHeight)
- CSS then scales the entire canvas to fill the browser window
- The scaling is uniform (same factor for X and Y) because canvas aspect ratio matches container
- We don't need to account for CSS scaling in our offset calculations

### 5. Bottom Constraint is Strongest
- Applied last with `Math.min()`
- Ensures the start of the course is always visible
- Overrides the top constraint when they conflict
- This makes sense for gameplay: players should always see where they started from

## Visual Summary

```
Canvas coordinates (Y-axis, downward positive):

0 ←─────────────── Top of canvas
  │
  │   [Top of course at offsetTopLocked]
  │
  ├─ canvasHeight/2 ← Car centered at offsetCentered
  │
  │   [Bottom of course at offsetBottomLocked]
  │
canvasHeight ←──── Bottom of canvas
```

When car is at game start (1,1):
- offsetCentered would put car near center
- But offsetBottomLocked forces bottom of course to stay at bottom of canvas
- So car appears low on screen (near bottom)

As car progresses upward:
- offsetCentered decreases (trying to keep car centered)
- Eventually hits offsetTopLocked (can't scroll past top)
- Car starts moving up relative to canvas as it approaches the finish

## Critical Implementation Detail

**Always use the actual canvas dimensions, not config constants!**

When creating the viewport, you must pass the actual `canvas.width` and `canvas.height` values:

```javascript
// ✅ CORRECT - uses dynamic canvas dimensions
this.viewport = this.createViewportForCanvas(this.canvas.width, this.canvas.height);

// ❌ WRONG - uses static config values (always 800×600)
this.viewport = this.createViewportForCanvas(GameConfig.canvas.width, GameConfig.canvas.height);
```

**Why this matters:**
- `this.canvas.height` is calculated dynamically based on window aspect ratio
- `GameConfig.canvas.height` is always 600 (static constant)
- Using the config value makes scrolling calculations wrong for non-4:3 aspect ratios
- The viewport stores `canvasHeight` and uses it in all offset calculations
- If the wrong value is stored, all three scroll positions will be incorrect

This was a subtle bug that caused scrolling to behave as if the canvas was always 800×600, even when the actual internal resolution was different (e.g., 800×450 for 16:9, or 800×1200 for narrow windows).

## Related Files

- `js/renderer.js`: `Viewport.getOffset()` - implements these calculations
- `js/game.js`: `updateCanvasSize()` - calculates dynamic canvas height
- `js/game.js`: `updateViewport()` - must pass `this.canvas.width/height` (not config values!)
- `ISOMETRIC.md`: Details of the isometric projection system
- `GAME_DESIGN.md`: Overview of viewport and camera system
