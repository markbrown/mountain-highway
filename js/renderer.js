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
     */
    constructor(minRow, maxRow, minCol, maxCol, blockSize = GameConfig.grid.blockSize, fixedWidth = null, fixedHeight = null) {
        this.minRow = minRow;
        this.maxRow = maxRow;
        this.minCol = minCol;
        this.maxCol = maxCol;
        this.blockSize = blockSize;
        this.fixedWidth = fixedWidth;
        this.fixedHeight = fixedHeight;

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
     */
    getOffset() {
        if (this.fixedWidth !== null && this.fixedHeight !== null) {
            // For fixed canvas size, center the viewport region
            const centerX = (this.screenMinX + this.screenMaxX) / 2;
            const centerY = (this.screenMinY + this.screenMaxY) / 2;

            return {
                x: this.canvasWidth / 2 - centerX * this.blockSize,
                y: this.canvasHeight / 2 - centerY * this.blockSize
            };
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
    }

    clear() {
        this.ctx.fillStyle = GameConfig.canvas.backgroundColor;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
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
     * Draw an isometric cube/block
     * @param {number} isoX - isometric X coordinate
     * @param {number} isoY - isometric Y coordinate
     * @param {number} isoZ - isometric Z coordinate (height)
     * @param {number} size - size of the cube
     * @param {string} topColor - color for top face
     * @param {string} leftColor - color for left face
     * @param {string} rightColor - color for right face
     */
    drawIsoCube(isoX, isoY, isoZ, size, topColor, leftColor, rightColor) {
        const pos = this.isoToScreen(isoX, isoY, isoZ);

        this.ctx.save();
        this.ctx.translate(pos.x, pos.y);

        // Top face (diamond/rhombus)
        this.ctx.beginPath();
        this.ctx.moveTo(0, 0);
        this.ctx.lineTo(size, size / 2);
        this.ctx.lineTo(0, size);
        this.ctx.lineTo(-size, size / 2);
        this.ctx.closePath();
        this.ctx.fillStyle = topColor;
        this.ctx.fill();
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();

        // Right face
        this.ctx.beginPath();
        this.ctx.moveTo(size, size / 2);
        this.ctx.lineTo(size, size / 2 + size);
        this.ctx.lineTo(0, size + size);
        this.ctx.lineTo(0, size);
        this.ctx.closePath();
        this.ctx.fillStyle = rightColor;
        this.ctx.fill();
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();

        // Left face
        this.ctx.beginPath();
        this.ctx.moveTo(-size, size / 2);
        this.ctx.lineTo(-size, size / 2 + size);
        this.ctx.lineTo(0, size + size);
        this.ctx.lineTo(0, size);
        this.ctx.closePath();
        this.ctx.fillStyle = leftColor;
        this.ctx.fill();
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();

        this.ctx.restore();
    }

    /**
     * Draw a road on an island using rectangle-based approach
     * @param {number} islandRow - island near corner row
     * @param {number} islandCol - island near corner column
     * @param {number} islandWidth - island width in columns
     * @param {number} islandHeight - island height in rows
     * @param {string} entryDirection - 'column' or 'row' (direction course enters)
     * @param {string} exitDirection - 'column' or 'row' (direction course exits)
     * @param {number} junctionRow - junction point row
     * @param {number} junctionCol - junction point column
     * @param {number} blockSize - size of each grid square in pixels
     */
    drawIslandRoad(islandRow, islandCol, islandWidth, islandHeight,
                   entryDirection, exitDirection, junctionRow, junctionCol, blockSize) {
        // Determine entry and exit edges
        const entryEdge = entryDirection === 'column' ? islandCol : islandRow;
        const exitEdge = exitDirection === 'column' ? islandCol + islandWidth : islandRow + islandHeight;

        if (entryDirection === exitDirection) {
            // Case 1: Straight ahead - single rectangle from entry edge to exit edge
            this.drawRoad(
                entryDirection === 'row' ? entryEdge : junctionRow,
                entryDirection === 'column' ? entryEdge : junctionCol,
                exitDirection === 'row' ? exitEdge : junctionRow,
                exitDirection === 'column' ? exitEdge : junctionCol,
                blockSize
            );
        } else {
            // Case 2: Turn to bridge - two overlapping rectangles forming L-shape
            // Rectangle 1: Entry edge to junction+0.5 (in entry direction)
            // Rectangle 2: Junction to exit edge (in exit direction)

            if (entryDirection === 'column') {
                // Entry in column direction, exit in row direction
                // Rectangle 1: from entry edge to junction+0.5 in column direction
                this.drawRoad(junctionRow, entryEdge, junctionRow, junctionCol + 0.5, blockSize);
                // Rectangle 2: from junction to exit edge in row direction
                this.drawRoad(junctionRow, junctionCol, exitEdge, junctionCol, blockSize);
            } else {
                // Entry in row direction, exit in column direction
                // Rectangle 1: from entry edge to junction+0.5 in row direction
                this.drawRoad(entryEdge, junctionCol, junctionRow + 0.5, junctionCol, blockSize);
                // Rectangle 2: from junction to exit edge in column direction
                this.drawRoad(junctionRow, junctionCol, junctionRow, exitEdge, blockSize);
            }
        }
    }

    /**
     * Draw a road segment on an island
     * The road is centered on the course coordinates and is 1 unit wide
     * @param {number} startRow - starting row of the road centerline
     * @param {number} startCol - starting column of the road centerline
     * @param {number} endRow - ending row of the road centerline
     * @param {number} endCol - ending column of the road centerline
     * @param {number} blockSize - size of each grid square in pixels
     */
    drawRoad(startRow, startCol, endRow, endCol, blockSize) {
        const roadColor = GameConfig.road.color;
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
     * Draw a complex road with two turns using three overlapping rectangles
     * Specifically for island with entry→turn1→turn2→exit
     * @param {number} islandRow - island near corner row
     * @param {number} islandCol - island near corner column
     * @param {number} islandWidth - island width in columns
     * @param {number} islandHeight - island height in rows
     * @param {number} junction1Row - first junction row
     * @param {number} junction1Col - first junction column
     * @param {number} junction2Row - second junction row
     * @param {number} junction2Col - second junction column
     * @param {number} blockSize - size of each grid square in pixels
     */
    drawComplexRoadTwoTurns(islandRow, islandCol, islandWidth, islandHeight,
                            junction1Row, junction1Col, junction2Row, junction2Col, blockSize) {
        // Island 4: Entry at row 8, junction1 at (9,5), junction2 at (9,7), exit at row 10
        // Draw as three overlapping rectangles:

        // Rectangle 1: Entry to junction1+0.5 (row direction)
        // From row 8 to row 9.5, centered at column 5
        this.drawRoad(islandRow, junction1Col, junction1Row + 0.5, junction1Col, blockSize);

        // Rectangle 2: Junction1 to junction2+0.5 (column direction)
        // From column 5 to column 7.5, centered at row 9
        this.drawRoad(junction1Row, junction1Col, junction1Row, junction2Col + 0.5, blockSize);

        // Rectangle 3: Junction2 to exit edge (row direction)
        // From row 9 to row 10, centered at column 7
        this.drawRoad(junction2Row, junction2Col, islandRow + islandHeight, junction2Col, blockSize);
    }
}
