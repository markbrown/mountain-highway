// Renderer - handles all drawing operations for the isometric view

/**
 * Viewport defines what region of the infinite grid plane to display
 */
class Viewport {
    /**
     * Create a viewport for a specific grid region
     * @param {number} minRow - Minimum row to display
     * @param {number} maxRow - Maximum row to display
     * @param {number} minCol - Minimum column to display
     * @param {number} maxCol - Maximum column to display
     * @param {number} blockSize - Size of each grid square in pixels
     * @param {number} fixedWidth - Optional fixed canvas width (otherwise auto-calculated)
     * @param {number} fixedHeight - Optional fixed canvas height (otherwise auto-calculated)
     * @param {Object} courseBounds - Optional course bounds for clamping {minRow, maxRow, minCol, maxCol}
     */
    constructor(minRow, maxRow, minCol, maxCol, blockSize = GameConfig.grid.blockSize, fixedWidth = null, fixedHeight = null, courseBounds = null) {
        this.minRow = minRow;
        this.maxRow = maxRow;
        this.minCol = minCol;
        this.maxCol = maxCol;
        this.blockSize = blockSize;
        this.fixedWidth = fixedWidth;
        this.fixedHeight = fixedHeight;
        this.courseBounds = courseBounds;

        // Calculate canvas size needed for this viewport
        this.calculateCanvasSize();
    }

    /**
     * Calculate the canvas dimensions needed to show this viewport
     */
    calculateCanvasSize() {
        // Calculate the four corners of the viewport in isometric screen space
        // (before scaling by blockSize)
        const corners = [
            { x: this.minCol - this.maxRow, y: -(this.minCol + this.maxRow) / 2 }, // top-left corner
            { x: this.maxCol - this.maxRow, y: -(this.maxCol + this.maxRow) / 2 }, // top-right corner
            { x: this.minCol - this.minRow, y: -(this.minCol + this.minRow) / 2 }, // bottom-left corner
            { x: this.maxCol - this.minRow, y: -(this.maxCol + this.minRow) / 2 }  // bottom-right corner
        ];

        // Find the bounding box in screen space
        const minX = Math.min(...corners.map(c => c.x));
        const maxX = Math.max(...corners.map(c => c.x));
        const minY = Math.min(...corners.map(c => c.y));
        const maxY = Math.max(...corners.map(c => c.y));

        // Store screen space bounds
        this.screenMinX = minX;
        this.screenMinY = minY;
        this.screenMaxX = maxX;
        this.screenMaxY = maxY;

        // Canvas size (use fixed dimensions if provided, otherwise auto-calculate)
        if (this.fixedWidth !== null && this.fixedHeight !== null) {
            this.canvasWidth = this.fixedWidth;
            this.canvasHeight = this.fixedHeight;
        } else {
            this.canvasWidth = Math.ceil((maxX - minX) * this.blockSize);
            this.canvasHeight = Math.ceil((maxY - minY) * this.blockSize);
        }
    }

    /**
     * Get the translation offset to apply before rendering
     * This positions the viewport region at the origin of the canvas
     * @param {number} carRow - Car's current row position (for centering during scrolling)
     * @param {number} carCol - Car's current column position (for centering during scrolling)
     */
    getOffset(carRow = null, carCol = null) {
        if (this.fixedWidth !== null && this.fixedHeight !== null) {
            // For fixed canvas size with vertical scrolling:
            // - Keep horizontal centered on origin (0,0) in grid space
            // - Vertical scrolling keeps car centered, clamped to course bounds

            // Origin (0,0) in grid space maps to screen space as:
            const originScreenX = 0;  // col - row = 0 - 0

            // Center horizontally on grid origin
            const offsetX = this.canvasWidth / 2 - originScreenX * this.blockSize;

            // Vertical offset calculation:
            // Screen Y position is proportional to (row + col), not just row
            // Formula: screenY = -(row + col) / 2
            // Smaller (row+col) = more positive screenY = visually higher (top of course)
            // Larger (row+col) = more negative screenY = visually lower (bottom of course)

            // Course visual layout:
            // - Start of course (small row+col) is at BOTTOM of screen (canvas Y = canvasHeight)
            // - End of course (large row+col) is at TOP of screen (canvas Y = 0)
            // - More negative screenY = higher in race = visually higher (toward top)

            // 1. Calculate offset when START of course is at BOTTOM of canvas
            // Start is the corner with minimum (row + col) - which is (minRow, minCol)
            const startRow = this.courseBounds ? this.courseBounds.minRow : this.minRow;
            const startCol = this.courseBounds ? this.courseBounds.minCol : this.minCol;
            const startScreenY = -(startRow + startCol) / 2;
            // When start is at bottom of canvas: canvasHeight = startScreenY * blockSize + offset
            // offset = canvasHeight - startScreenY * blockSize
            const offsetWhenAtStart = this.canvasHeight - startScreenY * this.blockSize;

            // 2. Calculate offset when END of course is at TOP of canvas
            // End is the corner with maximum (row + col) - which is (maxRow, maxCol)
            const endRow = this.courseBounds ? this.courseBounds.maxRow : this.maxRow;
            const endCol = this.courseBounds ? this.courseBounds.maxCol : this.maxCol;
            const endScreenY = -(endRow + endCol) / 2;
            // When end is at top of canvas (canvas Y = 0): 0 = endScreenY * blockSize + offset
            // offset = -endScreenY * blockSize
            const offsetWhenAtEnd = -endScreenY * this.blockSize;

            // 3. Calculate offset that centers the car vertically
            let offsetCentered;
            if (carRow !== null && carCol !== null) {
                // Use car's actual position
                const carScreenY = -(carRow + carCol) / 2;
                offsetCentered = this.canvasHeight / 2 - carScreenY * this.blockSize;
            } else {
                // Fallback: center the viewport bounds
                const centerRow = (this.minRow + this.maxRow) / 2;
                const centerCol = (this.minCol + this.maxCol) / 2;
                const centerScreenY = -(centerRow + centerCol) / 2;
                offsetCentered = this.canvasHeight / 2 - centerScreenY * this.blockSize;
            }

            // 4. Clamp centered offset so we don't scroll past course boundaries
            // offsetWhenAtStart < offsetWhenAtEnd (start at bottom needs smaller offset than end at top)
            // We want: offsetWhenAtStart <= offsetY <= offsetWhenAtEnd
            const offsetY = Math.max(offsetWhenAtStart, Math.min(offsetWhenAtEnd, offsetCentered));

            return { x: offsetX, y: offsetY };
        } else {
            // For auto-sized canvas, position viewport at origin
            return {
                x: -this.screenMinX * this.blockSize,
                y: -this.screenMinY * this.blockSize
            };
        }
    }
}

class Renderer {
    constructor(canvas, viewport = null) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.viewport = viewport;

        // Set canvas size based on viewport or use default
        if (viewport) {
            this.canvas.width = viewport.canvasWidth;
            this.canvas.height = viewport.canvasHeight;
        } else {
            this.canvas.width = GameConfig.canvas.width;
            this.canvas.height = GameConfig.canvas.height;
        }

        // Car sprites (owned by renderer)
        this.carSprites = {
            rowPositive: null,
            rowNegative: null,
            columnPositive: null,
            columnNegative: null
        };
        this.spritesLoaded = false;

        // Load sprites
        this.loadSprites();
    }

    /**
     * Load car sprite images
     */
    loadSprites() {
        const spritesToLoad = 2; // row and column sprites
        let loadedCount = 0;

        const onSpriteLoad = () => {
            loadedCount++;
            if (loadedCount === spritesToLoad) {
                this.spritesLoaded = true;
            }
        };

        // Load row direction sprite (same for positive/negative)
        this.carSprites.rowPositive = new Image();
        this.carSprites.rowPositive.onload = onSpriteLoad;
        this.carSprites.rowPositive.src = 'assets/car-row-positive.svg';
        // Rectangular prism looks the same from front/back
        this.carSprites.rowNegative = this.carSprites.rowPositive;

        // Load column direction sprite (same for positive/negative)
        this.carSprites.columnPositive = new Image();
        this.carSprites.columnPositive.onload = onSpriteLoad;
        this.carSprites.columnPositive.src = 'assets/car-column-positive.svg';
        // Rectangular prism looks the same from front/back
        this.carSprites.columnNegative = this.carSprites.columnPositive;
    }

    clear() {
        this.ctx.fillStyle = GameConfig.canvas.backgroundColor;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * Render the entire game scene
     * @param {RenderContext} context - Bundled game state for rendering
     * @param {Viewport} viewport - Current viewport
     * @param {DebugRenderer} debug - Debug renderer (optional)
     */
    renderScene(context, viewport, debug = null) {
        this.clear();

        const blockSize = viewport.blockSize;

        // Apply viewport transform
        this.ctx.save();
        const offset = viewport.getOffset(context.car.row, context.car.col);
        this.ctx.translate(offset.x, offset.y);

        // Draw debug grid (optional - for development)
        if (GameConfig.debug.showGrid && debug) {
            debug.drawGrid(viewport.minRow, viewport.maxRow,
                          viewport.minCol, viewport.maxCol, blockSize);
        }

        // Draw islands from top to bottom (highest row first)
        // For each island: base colors → road → black lines
        // This ensures nearer islands properly overlap more distant ones

        const wallHeight = GameConfig.island.wallHeight;

        // Sort islands by distance from camera (row + col, descending) for proper back-to-front rendering
        // Higher sum = farther from camera (rendered first)
        // Lower sum = closer to camera (rendered last, overlays others)
        const sortedIndices = context.islands
            .map((island, idx) => ({island, idx}))
            .sort((a, b) => (b.island[0] + b.island[1]) - (a.island[0] + a.island[1]))
            .map(item => item.idx);

        // Render each island completely (colors → road → lines) from farthest to nearest
        // For falling car: render before or after target island depending on bridge direction
        for (let i = 0; i < sortedIndices.length; i++) {
            const islandIndex = sortedIndices[i];
            const [row, col, width, height] = context.islands[islandIndex];

            // For negative direction bridges, render car BEFORE target island
            if (context.car.isFalling &&
                islandIndex === context.fallingCarRender.targetIslandIndex &&
                !context.fallingCarRender.bridgeIsPositive) {
                this.renderFallingCar(context.car, blockSize);
            }

            // Step 1: Draw island base colors (green and brown)
            const corners = this.drawIslandColors(row, col, width, height, wallHeight, blockSize);

            // Step 2: Draw road on this island (grey) using Course data
            const roadSegments = context.course.getRoadSegmentsForIsland(islandIndex, context.islands);
            this.drawIslandRoadFromSpans(row, col, width, height, roadSegments, blockSize);

            // Step 3: Draw island outlines (black lines)
            this.drawIslandOutlines(corners);

            // For positive direction bridges, render car AFTER target island
            if (context.car.isFalling &&
                islandIndex === context.fallingCarRender.targetIslandIndex &&
                context.fallingCarRender.bridgeIsPositive) {
                this.renderFallingCar(context.car, blockSize);
            }
        }

        // Draw debug bridge zones (optional - shows min/max safe bridge lengths)
        if (GameConfig.debug.showBridgeZones && debug) {
            debug.drawBridgeZones(context.course, context.islands, blockSize);
        }

        // Render bridges in three passes for correct depth ordering
        this.renderBridges(context, blockSize);

        // Draw car at current position (unless it's falling - already rendered in special position)
        if (context.car.shouldRender && !context.car.isFalling) {
            this.drawCar(context.car.row, context.car.col, context.car.direction, blockSize);
        }

        // Draw debug overlays (on top of everything)
        if (GameConfig.debug.showIslandNumbers && debug) {
            context.islands.forEach(([row, col, width, height], islandNum) => {
                debug.drawIslandNumber(row, col, width, height, islandNum, blockSize);
            });
        }

        this.ctx.restore();
    }

    /**
     * Render a falling car with z-offset and tumble rotation
     * @param {Object} carState - Car state from RenderContext
     * @param {number} blockSize - Block size in pixels
     */
    renderFallingCar(carState, blockSize) {
        // Render car with z-offset (falling into the abyss)
        this.ctx.save();

        // Apply z-offset as vertical translation in screen space
        this.ctx.translate(0, carState.zOffset * blockSize);

        // Draw car with tumble rotation
        const screenPos = this.gameToScreen(carState.row, carState.col);
        const screenX = screenPos.x * blockSize;
        const screenY = screenPos.y * blockSize;

        this.ctx.save();
        this.ctx.translate(screenX, screenY);
        this.ctx.rotate(carState.tumbleRotation);
        this.ctx.translate(-screenX, -screenY);

        this.drawCar(carState.row, carState.col, carState.direction, blockSize);

        this.ctx.restore();
        this.ctx.restore();
    }

    /**
     * Render all bridges with proper depth ordering
     * Three passes: completed bridges (under car), positive animating (behind car), negative animating (in front)
     * @param {RenderContext} context - Rendering context
     * @param {number} blockSize - Block size in pixels
     */
    renderBridges(context, blockSize) {
        const baseOffset = GameConfig.bridge.baseOffset;

        // Helper function to draw a bridge
        const drawBridge = (segment, idx) => {
            if (segment.type !== 'bridge') return false;

            const bridgeIndex = segment.bridgeIndex;
            const pos = context.bridgePositions[bridgeIndex];
            const bridgeData = context.bridgeSequence[bridgeIndex];

            // Is this the current bridge being animated?
            const isCurrentBridge = (context.bridge.currentSegment === segment &&
                                     (context.gameState === GameState.BRIDGE_GROWING ||
                                      context.gameState === GameState.BRIDGE_SLAMMING));

            // Is this a completed bridge?
            const isCompleted = idx < context.bridge.currentSegmentIndex - 1 ||
                               (idx === context.bridge.currentSegmentIndex - 1 &&
                                context.gameState !== GameState.BRIDGE_GROWING &&
                                context.gameState !== GameState.BRIDGE_SLAMMING);

            if (isCurrentBridge) {
                // Draw current bridge being animated
                if (context.gameState === GameState.BRIDGE_GROWING) {
                    // Draw vertical bridge
                    if (pos.direction === 'column') {
                        this.drawVerticalBridge(pos.baseRow, pos.edgeCol, pos.direction, context.bridge.length, blockSize);
                        this.drawBridgeEdgeLine(pos.baseRow, pos.edgeCol, pos.direction, blockSize);
                    } else {
                        this.drawVerticalBridge(pos.edgeRow, pos.baseCol, pos.direction, context.bridge.length, blockSize);
                        this.drawBridgeEdgeLine(pos.edgeRow, pos.baseCol, pos.direction, blockSize);
                    }
                } else if (context.gameState === GameState.BRIDGE_SLAMMING) {
                    // Draw rotating bridge
                    if (pos.direction === 'column') {
                        this.drawRotatingBridge(pos.baseRow, pos.edgeCol, pos.direction, context.bridge.length, context.bridge.rotation, blockSize);
                        this.drawBridgeEdgeLine(pos.baseRow, pos.edgeCol, pos.direction, blockSize);
                    } else {
                        this.drawRotatingBridge(pos.edgeRow, pos.baseCol, pos.direction, context.bridge.length, context.bridge.rotation, blockSize);
                        this.drawBridgeEdgeLine(pos.edgeRow, pos.baseCol, pos.direction, blockSize);
                    }
                }
            } else if (isCompleted) {
                // Draw completed bridge (horizontal)
                // Base offset and length direction depend on bridge direction
                // Bridge extends baseOffset back onto start island (covers edge line)
                // and baseOffset onto end island (covers edge line)
                if (pos.direction === 'column') {
                    const offsetCol = pos.isPositive ? (pos.edgeCol - baseOffset) : (pos.edgeCol + baseOffset);
                    const bridgeLength = pos.isPositive ? (bridgeData.targetLength + 2 * baseOffset) : -(bridgeData.targetLength + 2 * baseOffset);
                    this.drawHorizontalBridge(pos.baseRow, offsetCol, pos.direction, bridgeLength, blockSize);
                } else {
                    const offsetRow = pos.isPositive ? (pos.edgeRow - baseOffset) : (pos.edgeRow + baseOffset);
                    const bridgeLength = pos.isPositive ? (bridgeData.targetLength + 2 * baseOffset) : -(bridgeData.targetLength + 2 * baseOffset);
                    this.drawHorizontalBridge(offsetRow, pos.baseCol, pos.direction, bridgeLength, blockSize);
                }
            }
            return true;
        };

        // Draw all completed bridges (car drives over these)
        context.pathSegments.forEach((segment, idx) => {
            if (segment.type !== 'bridge') return;

            const isCurrentBridge = (context.bridge.currentSegment === segment &&
                                     (context.gameState === GameState.BRIDGE_GROWING ||
                                      context.gameState === GameState.BRIDGE_SLAMMING));

            // Draw if it's completed (not currently animating)
            if (!isCurrentBridge) {
                drawBridge(segment, idx);
            }
        });

        // Draw positive direction bridges being animated (behind car)
        context.pathSegments.forEach((segment, idx) => {
            if (segment.type !== 'bridge') return;

            const pos = context.bridgePositions[segment.bridgeIndex];
            const isCurrentBridge = (context.bridge.currentSegment === segment &&
                                     (context.gameState === GameState.BRIDGE_GROWING ||
                                      context.gameState === GameState.BRIDGE_SLAMMING));

            // Draw if it's currently animating and positive direction
            if (isCurrentBridge && pos.isPositive) {
                drawBridge(segment, idx);
            }
        });

        // Draw negative direction bridges being animated (in front of car)
        context.pathSegments.forEach((segment, idx) => {
            if (segment.type !== 'bridge') return;

            const pos = context.bridgePositions[segment.bridgeIndex];
            const isCurrentBridge = (context.bridge.currentSegment === segment &&
                                     (context.gameState === GameState.BRIDGE_GROWING ||
                                      context.gameState === GameState.BRIDGE_SLAMMING));

            // Draw if it's currently animating and negative direction
            if (isCurrentBridge && !pos.isPositive) {
                drawBridge(segment, idx);
            }
        });
    }

    /**
     * Convert game grid coordinates to screen coordinates
     * This is a pure mathematical transformation from grid space to isometric screen space
     * Game coordinates:
     *   - row: increases upward on screen
     *   - col: increases rightward on screen
     * Screen coordinates (unscaled):
     *   - increasing col -> increase X, decrease Y (move right)
     *   - increasing row -> decrease X, decrease Y (move up)
     */
    gameToScreen(row, col, height = 0) {
        const screenX = col - row;
        const screenY = -(col + row) / 2 - height;
        return { x: screenX, y: screenY };
    }


    /**
     * Draw a road segment on an island
     * The road is centered on the course coordinates and is 1 unit wide
     * @param {number} startRow - starting row of the road centerline
     * @param {number} startCol - starting column of the road centerline
     * @param {number} endRow - ending row of the road centerline
     * @param {number} endCol - ending column of the road centerline
     * @param {number} blockSize - size of each grid square in pixels
     * @param {string} color - optional color override (defaults to road color)
     */
    drawRoad(startRow, startCol, endRow, endCol, blockSize, color = null) {
        const roadColor = color || GameConfig.road.color;
        const halfWidth = GameConfig.road.halfWidth;

        // Determine if road runs in row or column direction
        if (startCol === endCol) {
            // Road runs in row direction (centerline at constant column)
            const centerCol = startCol;
            const minRow = Math.min(startRow, endRow);
            const maxRow = Math.max(startRow, endRow);

            // Road extends from centerCol - 0.5 to centerCol + 0.5
            const topLeft = this.gameToScreen(minRow, centerCol - halfWidth, 0);
            const topRight = this.gameToScreen(minRow, centerCol + halfWidth, 0);
            const bottomRight = this.gameToScreen(maxRow, centerCol + halfWidth, 0);
            const bottomLeft = this.gameToScreen(maxRow, centerCol - halfWidth, 0);

            this.ctx.fillStyle = roadColor;
            this.ctx.beginPath();
            this.ctx.moveTo(topLeft.x * blockSize, topLeft.y * blockSize);
            this.ctx.lineTo(topRight.x * blockSize, topRight.y * blockSize);
            this.ctx.lineTo(bottomRight.x * blockSize, bottomRight.y * blockSize);
            this.ctx.lineTo(bottomLeft.x * blockSize, bottomLeft.y * blockSize);
            this.ctx.closePath();
            this.ctx.fill();
        } else {
            // Road runs in column direction (centerline at constant row)
            const centerRow = startRow;
            const minCol = Math.min(startCol, endCol);
            const maxCol = Math.max(startCol, endCol);

            // Road extends from centerRow - 0.5 to centerRow + 0.5
            const topLeft = this.gameToScreen(centerRow - halfWidth, minCol, 0);
            const topRight = this.gameToScreen(centerRow - halfWidth, maxCol, 0);
            const bottomRight = this.gameToScreen(centerRow + halfWidth, maxCol, 0);
            const bottomLeft = this.gameToScreen(centerRow + halfWidth, minCol, 0);

            this.ctx.fillStyle = roadColor;
            this.ctx.beginPath();
            this.ctx.moveTo(topLeft.x * blockSize, topLeft.y * blockSize);
            this.ctx.lineTo(topRight.x * blockSize, topRight.y * blockSize);
            this.ctx.lineTo(bottomRight.x * blockSize, bottomRight.y * blockSize);
            this.ctx.lineTo(bottomLeft.x * blockSize, bottomLeft.y * blockSize);
            this.ctx.closePath();
            this.ctx.fill();
        }
    }

    /**
     * Draw a road outline (stroked, not filled)
     * @param {number} startRow - starting row of the road centerline
     * @param {number} startCol - starting column of the road centerline
     * @param {number} endRow - ending row of the road centerline
     * @param {number} endCol - ending column of the road centerline
     * @param {number} blockSize - size of each grid square in pixels
     * @param {string} color - stroke color
     * @param {number} lineWidth - stroke width
     */
    drawRoadOutline(startRow, startCol, endRow, endCol, blockSize, color, lineWidth) {
        const halfWidth = GameConfig.road.halfWidth;

        // Determine if road runs in row or column direction
        if (startCol === endCol) {
            // Road runs in row direction (centerline at constant column)
            const centerCol = startCol;
            const minRow = Math.min(startRow, endRow);
            const maxRow = Math.max(startRow, endRow);

            // Road extends from centerCol - 0.5 to centerCol + 0.5
            const topLeft = this.gameToScreen(minRow, centerCol - halfWidth, 0);
            const topRight = this.gameToScreen(minRow, centerCol + halfWidth, 0);
            const bottomRight = this.gameToScreen(maxRow, centerCol + halfWidth, 0);
            const bottomLeft = this.gameToScreen(maxRow, centerCol - halfWidth, 0);

            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = lineWidth;
            this.ctx.beginPath();
            this.ctx.moveTo(topLeft.x * blockSize, topLeft.y * blockSize);
            this.ctx.lineTo(topRight.x * blockSize, topRight.y * blockSize);
            this.ctx.lineTo(bottomRight.x * blockSize, bottomRight.y * blockSize);
            this.ctx.lineTo(bottomLeft.x * blockSize, bottomLeft.y * blockSize);
            this.ctx.closePath();
            this.ctx.stroke();
        } else {
            // Road runs in column direction (centerline at constant row)
            const centerRow = startRow;
            const minCol = Math.min(startCol, endCol);
            const maxCol = Math.max(startCol, endCol);

            // Road extends from centerRow - 0.5 to centerRow + 0.5
            const topLeft = this.gameToScreen(centerRow - halfWidth, minCol, 0);
            const topRight = this.gameToScreen(centerRow - halfWidth, maxCol, 0);
            const bottomRight = this.gameToScreen(centerRow + halfWidth, maxCol, 0);
            const bottomLeft = this.gameToScreen(centerRow + halfWidth, minCol, 0);

            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = lineWidth;
            this.ctx.beginPath();
            this.ctx.moveTo(topLeft.x * blockSize, topLeft.y * blockSize);
            this.ctx.lineTo(topRight.x * blockSize, topRight.y * blockSize);
            this.ctx.lineTo(bottomRight.x * blockSize, bottomRight.y * blockSize);
            this.ctx.lineTo(bottomLeft.x * blockSize, bottomLeft.y * blockSize);
            this.ctx.closePath();
            this.ctx.stroke();
        }
    }

    /**
     * Draw island base colors (walls and top surface)
     * @param {number} row - game grid row (near corner)
     * @param {number} col - game grid column (near corner)
     * @param {number} width - width of the island in columns
     * @param {number} height - height of the island in rows
     * @param {number} wallHeight - how far the walls extend downward (pixels)
     * @param {number} blockSize - size of each grid square in pixels
     * @returns {object} Corner coordinates for later outline drawing
     */
    drawIslandColors(row, col, width, height, wallHeight, blockSize) {
        // Calculate the four corners of the top surface in game coordinates
        const bottomPoint = this.gameToScreen(row, col, 0);
        const rightPoint = this.gameToScreen(row, col + width, 0);
        const topPoint = this.gameToScreen(row + height, col + width, 0);
        const leftPoint = this.gameToScreen(row + height, col, 0);

        // Scale corners by blockSize
        const bottom = { x: bottomPoint.x * blockSize, y: bottomPoint.y * blockSize };
        const right = { x: rightPoint.x * blockSize, y: rightPoint.y * blockSize };
        const top = { x: topPoint.x * blockSize, y: topPoint.y * blockSize };
        const left = { x: leftPoint.x * blockSize, y: leftPoint.y * blockSize };

        // Draw the walls first (back to front for proper layering)

        // 1. Draw the left wall (darker brown)
        this.ctx.fillStyle = GameConfig.island.dirtDarkColor;
        this.ctx.beginPath();
        this.ctx.moveTo(left.x, left.y);
        this.ctx.lineTo(left.x, left.y + wallHeight);
        this.ctx.lineTo(bottom.x, bottom.y + wallHeight);
        this.ctx.lineTo(bottom.x, bottom.y);
        this.ctx.closePath();
        this.ctx.fill();

        // 2. Draw the right wall (lighter brown)
        this.ctx.fillStyle = GameConfig.island.dirtLightColor;
        this.ctx.beginPath();
        this.ctx.moveTo(bottom.x, bottom.y);
        this.ctx.lineTo(bottom.x, bottom.y + wallHeight);
        this.ctx.lineTo(right.x, right.y + wallHeight);
        this.ctx.lineTo(right.x, right.y);
        this.ctx.closePath();
        this.ctx.fill();

        // 3. Draw the green top surface
        this.ctx.fillStyle = GameConfig.island.grassColor;
        this.ctx.beginPath();
        this.ctx.moveTo(bottom.x, bottom.y);
        this.ctx.lineTo(right.x, right.y);
        this.ctx.lineTo(top.x, top.y);
        this.ctx.lineTo(left.x, left.y);
        this.ctx.closePath();
        this.ctx.fill();

        // Return corners for outline drawing later
        return { bottom, right, top, left, wallHeight };
    }

    /**
     * Draw island outlines (black lines where faces meet)
     * @param {object} corners - Corner coordinates from drawIslandColors
     */
    drawIslandOutlines(corners) {
        const { bottom, right, top, left, wallHeight } = corners;

        this.ctx.strokeStyle = GameConfig.island.outlineColor;
        this.ctx.lineWidth = GameConfig.island.outlineWidth;

        // Outline of top surface
        this.ctx.beginPath();
        this.ctx.moveTo(bottom.x, bottom.y);
        this.ctx.lineTo(right.x, right.y);
        this.ctx.lineTo(top.x, top.y);
        this.ctx.lineTo(left.x, left.y);
        this.ctx.closePath();
        this.ctx.stroke();

        // Edge between top and right wall
        this.ctx.beginPath();
        this.ctx.moveTo(right.x, right.y);
        this.ctx.lineTo(right.x, right.y + wallHeight);
        this.ctx.stroke();

        // Edge between top and left wall
        this.ctx.beginPath();
        this.ctx.moveTo(left.x, left.y);
        this.ctx.lineTo(left.x, left.y + wallHeight);
        this.ctx.stroke();

        // Front edge where the two visible walls meet
        this.ctx.beginPath();
        this.ctx.moveTo(bottom.x, bottom.y);
        this.ctx.lineTo(bottom.x, bottom.y + wallHeight);
        this.ctx.stroke();
    }

    /**
     * Draw an island - a flat top surface with vertical walls extending downward
     * @param {number} row - game grid row (near corner)
     * @param {number} col - game grid column (near corner)
     * @param {number} width - width of the island in columns
     * @param {number} height - height of the island in rows
     * @param {number} wallHeight - how far the walls extend downward (pixels)
     * @param {number} blockSize - size of each grid square in pixels
     */
    drawIsland(row, col, width, height, wallHeight, blockSize) {
        const corners = this.drawIslandColors(row, col, width, height, wallHeight, blockSize);
        this.drawIslandOutlines(corners);
    }

    /**
     * Draw a vertical bridge (growing/extended upward)
     * @param {number} baseRow - row coordinate of bridge base
     * @param {number} baseCol - column coordinate of bridge base
     * @param {string} direction - 'row' or 'column' (direction bridge extends in when horizontal)
     * @param {number} length - length of the bridge in game units
     * @param {number} blockSize - size of each grid square in pixels
     */
    drawVerticalBridge(baseRow, baseCol, direction, length, blockSize) {
        const bridgeColor = GameConfig.bridge.color;
        const halfWidth = GameConfig.road.halfWidth;

        // Calculate the four corners of the bridge rectangle at the base
        let corner1, corner2, corner3, corner4;

        if (direction === 'column') {
            // Bridge extends in column direction when horizontal
            // Base is perpendicular (in row direction)
            corner1 = this.gameToScreen(baseRow - halfWidth, baseCol, 0);
            corner2 = this.gameToScreen(baseRow + halfWidth, baseCol, 0);
            // Vertical extension: corners move upward by length
            corner3 = this.gameToScreen(baseRow + halfWidth, baseCol, length);
            corner4 = this.gameToScreen(baseRow - halfWidth, baseCol, length);
        } else {
            // Bridge extends in row direction when horizontal
            // Base is perpendicular (in column direction)
            corner1 = this.gameToScreen(baseRow, baseCol - halfWidth, 0);
            corner2 = this.gameToScreen(baseRow, baseCol + halfWidth, 0);
            // Vertical extension: corners move upward by length
            corner3 = this.gameToScreen(baseRow, baseCol + halfWidth, length);
            corner4 = this.gameToScreen(baseRow, baseCol - halfWidth, length);
        }

        // Draw the bridge rectangle
        this.ctx.fillStyle = bridgeColor;

        this.ctx.beginPath();
        this.ctx.moveTo(corner1.x * blockSize, corner1.y * blockSize);
        this.ctx.lineTo(corner2.x * blockSize, corner2.y * blockSize);
        this.ctx.lineTo(corner3.x * blockSize, corner3.y * blockSize);
        this.ctx.lineTo(corner4.x * blockSize, corner4.y * blockSize);
        this.ctx.closePath();
        this.ctx.fill();
    }

    /**
     * Draw a rotating bridge (transitioning from vertical to horizontal)
     * @param {number} baseRow - row coordinate of bridge base
     * @param {number} baseCol - column coordinate of bridge base
     * @param {string} direction - 'row' or 'column' (direction bridge extends in when horizontal)
     * @param {number} length - length of the bridge in game units
     * @param {number} rotation - rotation angle in radians (0 = vertical, Math.PI/2 = horizontal)
     * @param {number} blockSize - size of each grid square in pixels
     */
    drawRotatingBridge(baseRow, baseCol, direction, length, rotation, blockSize) {
        const bridgeColor = GameConfig.bridge.color;
        const halfWidth = GameConfig.road.halfWidth;

        // Calculate the direction vector for when horizontal
        let dirX, dirY;
        if (direction === 'column') {
            const basePoint = this.gameToScreen(baseRow, baseCol, 0);
            const endPoint = this.gameToScreen(baseRow, baseCol + 1, 0);
            dirX = (endPoint.x - basePoint.x) * blockSize;
            dirY = (endPoint.y - basePoint.y) * blockSize;
        } else {
            const basePoint = this.gameToScreen(baseRow, baseCol, 0);
            const endPoint = this.gameToScreen(baseRow + 1, baseCol, 0);
            dirX = (endPoint.x - basePoint.x) * blockSize;
            dirY = (endPoint.y - basePoint.y) * blockSize;
        }

        // Normalize direction
        const dirLength = Math.sqrt(dirX * dirX + dirY * dirY);
        dirX /= dirLength;
        dirY /= dirLength;

        // Perpendicular vector for width
        const perpX = -dirY;
        const perpY = dirX;

        // Calculate the two base edge corners (these stay fixed during rotation)
        let baseCorner1, baseCorner2;
        if (direction === 'column') {
            baseCorner1 = this.gameToScreen(baseRow - halfWidth, baseCol, 0);
            baseCorner2 = this.gameToScreen(baseRow + halfWidth, baseCol, 0);
        } else {
            baseCorner1 = this.gameToScreen(baseRow, baseCol - halfWidth, 0);
            baseCorner2 = this.gameToScreen(baseRow, baseCol + halfWidth, 0);
        }

        const base1X = baseCorner1.x * blockSize;
        const base1Y = baseCorner1.y * blockSize;
        const base2X = baseCorner2.x * blockSize;
        const base2Y = baseCorner2.y * blockSize;

        // Calculate the far edge corners (these rotate around the base edge)
        // When vertical (rotation = 0): bridge extends upward (negative Y in screen space)
        // When horizontal (rotation = π/2): bridge extends in direction vector
        const verticalComponent = length * blockSize * Math.cos(rotation);
        const horizontalComponent = length * blockSize * Math.sin(rotation);

        // Far corners pivot from base corners
        const far1X = base1X + dirX * horizontalComponent;
        const far1Y = base1Y + dirY * horizontalComponent - verticalComponent;

        const far2X = base2X + dirX * horizontalComponent;
        const far2Y = base2Y + dirY * horizontalComponent - verticalComponent;

        this.ctx.fillStyle = bridgeColor;

        this.ctx.beginPath();
        this.ctx.moveTo(base1X, base1Y);
        this.ctx.lineTo(base2X, base2Y);
        this.ctx.lineTo(far2X, far2Y);
        this.ctx.lineTo(far1X, far1Y);
        this.ctx.closePath();
        this.ctx.fill();
    }

    /**
     * Draw a horizontal bridge
     * @param {number} baseRow - row coordinate of bridge base
     * @param {number} baseCol - column coordinate of bridge base
     * @param {string} direction - 'row' or 'column' (direction bridge extends)
     * @param {number} length - length of the bridge in game units
     * @param {number} blockSize - size of each grid square in pixels
     */
    drawHorizontalBridge(baseRow, baseCol, direction, length, blockSize) {
        const bridgeColor = GameConfig.bridge.color;
        const halfWidth = GameConfig.road.halfWidth;

        // Calculate corners based on direction
        let corner1, corner2, corner3, corner4;

        if (direction === 'column') {
            // Bridge extends in column direction
            corner1 = this.gameToScreen(baseRow - halfWidth, baseCol, 0);
            corner2 = this.gameToScreen(baseRow + halfWidth, baseCol, 0);
            corner3 = this.gameToScreen(baseRow + halfWidth, baseCol + length, 0);
            corner4 = this.gameToScreen(baseRow - halfWidth, baseCol + length, 0);
        } else {
            // Bridge extends in row direction
            corner1 = this.gameToScreen(baseRow, baseCol - halfWidth, 0);
            corner2 = this.gameToScreen(baseRow, baseCol + halfWidth, 0);
            corner3 = this.gameToScreen(baseRow + length, baseCol + halfWidth, 0);
            corner4 = this.gameToScreen(baseRow + length, baseCol - halfWidth, 0);
        }

        this.ctx.fillStyle = bridgeColor;

        this.ctx.beginPath();
        this.ctx.moveTo(corner1.x * blockSize, corner1.y * blockSize);
        this.ctx.lineTo(corner2.x * blockSize, corner2.y * blockSize);
        this.ctx.lineTo(corner3.x * blockSize, corner3.y * blockSize);
        this.ctx.lineTo(corner4.x * blockSize, corner4.y * blockSize);
        this.ctx.closePath();
        this.ctx.fill();
    }

    /**
     * Draw the black edge line at the bridge attachment point
     * This is used to redraw the edge after drawing a vertical/rotating bridge
     * @param {number} baseRow - row coordinate of bridge base
     * @param {number} baseCol - column coordinate of bridge base
     * @param {string} direction - 'row' or 'column' (direction bridge extends)
     * @param {number} blockSize - size of each grid square in pixels
     */
    drawBridgeEdgeLine(baseRow, baseCol, direction, blockSize) {
        const halfWidth = GameConfig.road.halfWidth;

        let corner1, corner2;
        if (direction === 'column') {
            // Bridge extends in column direction, edge is perpendicular (in row direction)
            corner1 = this.gameToScreen(baseRow - halfWidth, baseCol, 0);
            corner2 = this.gameToScreen(baseRow + halfWidth, baseCol, 0);
        } else {
            // Bridge extends in row direction, edge is perpendicular (in column direction)
            corner1 = this.gameToScreen(baseRow, baseCol - halfWidth, 0);
            corner2 = this.gameToScreen(baseRow, baseCol + halfWidth, 0);
        }

        this.ctx.strokeStyle = GameConfig.island.outlineColor;
        this.ctx.lineWidth = GameConfig.island.outlineWidth;
        this.ctx.beginPath();
        this.ctx.moveTo(corner1.x * blockSize, corner1.y * blockSize);
        this.ctx.lineTo(corner2.x * blockSize, corner2.y * blockSize);
        this.ctx.stroke();
    }

    /**
     * Draw a car at a specific position
     * @param {number} row - game grid row
     * @param {number} col - game grid column
     * @param {string} direction - 'row' or 'column' (direction car is facing)
     * @param {number} blockSize - size of each grid square in pixels
     */
    drawCar(row, col, direction, blockSize) {
        // Get car screen position
        const screenPos = this.gameToScreen(row, col, 0);
        const screenX = screenPos.x * blockSize;
        const screenY = screenPos.y * blockSize;

        // If sprites are available, use them
        if (this.spritesLoaded) {
            let sprite = null;
            let spriteSize = 40; // All sprites use 40x40 viewBox

            // Select sprite based on direction
            // Rectangular prism looks the same from front/back, so we don't need to distinguish positive/negative
            if (direction === 'row') {
                sprite = this.carSprites.rowPositive;
            } else if (direction === 'column') {
                sprite = this.carSprites.columnPositive;
            }

            if (sprite) {
                // Draw sprite centered at car position
                this.ctx.drawImage(sprite,
                    screenX - spriteSize / 2,
                    screenY - spriteSize / 2,
                    spriteSize,
                    spriteSize);
                return;
            }
        }

        // Fallback: draw as colored rectangle (original implementation)
        const carLength = GameConfig.car.length;
        const carWidth = GameConfig.car.width;

        // Calculate car corners based on direction
        let corner1, corner2, corner3, corner4;

        if (direction === 'column') {
            // Car faces in column direction (rightward on screen)
            // Car centered at (row, col), extends from col-length/2 to col+length/2
            const halfLength = GameConfig.car.halfLength;
            const halfWidth = carWidth / 2;

            corner1 = this.gameToScreen(row - halfWidth, col - halfLength, 0);
            corner2 = this.gameToScreen(row - halfWidth, col + halfLength, 0);
            corner3 = this.gameToScreen(row + halfWidth, col + halfLength, 0);
            corner4 = this.gameToScreen(row + halfWidth, col - halfLength, 0);
        } else {
            // Car faces in row direction (upward on screen)
            // Car centered at (row, col), extends from row-length/2 to row+length/2
            const halfLength = GameConfig.car.halfLength;
            const halfWidth = carWidth / 2;

            corner1 = this.gameToScreen(row - halfLength, col - halfWidth, 0);
            corner2 = this.gameToScreen(row + halfLength, col - halfWidth, 0);
            corner3 = this.gameToScreen(row + halfLength, col + halfWidth, 0);
            corner4 = this.gameToScreen(row - halfLength, col + halfWidth, 0);
        }

        this.ctx.fillStyle = GameConfig.car.color;
        this.ctx.strokeStyle = GameConfig.car.outlineColor;
        this.ctx.lineWidth = GameConfig.car.outlineWidth;

        this.ctx.beginPath();
        this.ctx.moveTo(corner1.x * blockSize, corner1.y * blockSize);
        this.ctx.lineTo(corner2.x * blockSize, corner2.y * blockSize);
        this.ctx.lineTo(corner3.x * blockSize, corner3.y * blockSize);
        this.ctx.lineTo(corner4.x * blockSize, corner4.y * blockSize);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
    }

    /**
     * Draw a road on an island using Course span data
     * This method systematically determines the number of rectangles needed
     * based on the junctions present on the island
     *
     * @param {number} islandRow - island near corner row
     * @param {number} islandCol - island near corner column
     * @param {number} islandWidth - island width in columns
     * @param {number} islandHeight - island height in rows
     * @param {Array} spanSegments - Array of span segments crossing this island
     *                               Each segment: {startRow, startCol, endRow, endCol, direction, junction}
     * @param {number} blockSize - size of each grid square in pixels
     */
    drawIslandRoadFromSpans(islandRow, islandCol, islandWidth, islandHeight, spanSegments, blockSize) {
        if (spanSegments.length === 0) {
            // No road on this island (shouldn't happen in practice)
            return;
        }

        // If all segments have the same direction (straight ahead), combine into one rectangle
        const allSameDirection = spanSegments.every(seg => seg.direction === spanSegments[0].direction);

        if (allSameDirection && spanSegments.length > 1) {
            // Straight ahead case: single rectangle from first start to last end
            const firstSegment = spanSegments[0];
            const lastSegment = spanSegments[spanSegments.length - 1];

            if (firstSegment.direction === Direction.COLUMN) {
                this.drawRoad(
                    firstSegment.startRow, firstSegment.startCol,
                    lastSegment.endRow, lastSegment.endCol,
                    blockSize
                );
            } else {
                this.drawRoad(
                    firstSegment.startRow, firstSegment.startCol,
                    lastSegment.endRow, lastSegment.endCol,
                    blockSize
                );
            }
            return;
        }

        // Multiple rectangles needed (turns present)
        spanSegments.forEach((segment, index) => {
            const isFirstSegment = (index === 0);
            const isLastSegment = (index === spanSegments.length - 1);
            const nextSegment = isLastSegment ? null : spanSegments[index + 1];

            // Check if there's a turn after this segment
            const hasTurnAfter = nextSegment && (nextSegment.direction !== segment.direction);

            if (segment.direction === Direction.COLUMN) {
                // Road travels in column direction (rightward or leftward)
                const startCol = segment.startCol;
                // Extend 0.5 past junction only if there's a turn after this segment
                // Use sign to determine direction: positive = +0.5, negative = -0.5
                const extension = segment.sign * 0.5;
                const endCol = hasTurnAfter ? segment.endCol + extension : segment.endCol;
                const row = segment.startRow;

                this.drawRoad(row, startCol, row, endCol, blockSize);
            } else {
                // Road travels in row direction (upward or downward)
                const startRow = segment.startRow;
                // Extend 0.5 past junction only if there's a turn after this segment
                // Use sign to determine direction: positive = +0.5, negative = -0.5
                const extension = segment.sign * 0.5;
                const endRow = hasTurnAfter ? segment.endRow + extension : segment.endRow;
                const col = segment.startCol;

                this.drawRoad(startRow, col, endRow, col, blockSize);
            }
        });
    }
}
