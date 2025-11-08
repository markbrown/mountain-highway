// Renderer - handles all drawing operations for the isometric view

class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        // Set canvas size
        this.canvas.width = 800;
        this.canvas.height = 600;
    }

    clear() {
        this.ctx.fillStyle = '#87CEEB'; // Sky blue
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * Convert game grid coordinates to screen coordinates
     * Game coordinates:
     *   - row: increases upward on screen
     *   - col: increases rightward on screen
     * Screen coordinates:
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
     * Draw a road on an island following the systematic calculation approach
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
        const roadColor = '#444444';
        const halfWidth = 0.5;

        // Step 1: Determine start point (where course enters island)
        let startPoint, startSide1, startSide2;
        if (entryDirection === 'column') {
            // Course enters in column direction - start at near corner column
            startPoint = islandCol;
            // Step 2: Sides perpendicular to column direction (in row direction)
            startSide1 = junctionRow - halfWidth;
            startSide2 = junctionRow + halfWidth;
        } else {
            // Course enters in row direction - start at near corner row
            startPoint = islandRow;
            // Step 2: Sides perpendicular to row direction (in column direction)
            startSide1 = junctionCol - halfWidth;
            startSide2 = junctionCol + halfWidth;
        }

        // Step 3: Determine end point (where course leaves island)
        let endPoint, endSide1, endSide2;
        if (exitDirection === 'column') {
            // Course exits in column direction - use far corner column
            endPoint = islandCol + islandWidth;
            // Step 4: Sides perpendicular to column direction (in row direction)
            endSide1 = junctionRow - halfWidth;
            endSide2 = junctionRow + halfWidth;
        } else {
            // Course exits in row direction - use far corner row
            endPoint = islandRow + islandHeight;
            // Step 4: Sides perpendicular to row direction (in column direction)
            endSide1 = junctionCol - halfWidth;
            endSide2 = junctionCol + halfWidth;
        }

        // Step 5: Draw the road based on whether it's straight or a turn
        if (entryDirection === exitDirection) {
            // Straight road
            this.drawRoad(
                entryDirection === 'row' ? startPoint : junctionRow,
                entryDirection === 'column' ? startPoint : junctionCol,
                exitDirection === 'row' ? endPoint : junctionRow,
                exitDirection === 'column' ? endPoint : junctionCol,
                blockSize
            );
        } else {
            // L-shaped road (turn)
            let corners;
            if (entryDirection === 'column') {
                // Entry in column direction, exit in row direction (left turn)
                corners = [
                    this.gameToScreen(startSide1, startPoint, 0),
                    this.gameToScreen(startSide1, endSide2, 0),
                    this.gameToScreen(endPoint, endSide2, 0),
                    this.gameToScreen(endPoint, endSide1, 0),
                    this.gameToScreen(startSide2, endSide1, 0),
                    this.gameToScreen(startSide2, startPoint, 0)
                ];
            } else {
                // Entry in row direction, exit in column direction (right turn)
                // startSide1/2 are column sides, endSide1/2 are row sides
                // Outside corner: startSide1 (col-0.5) with endSide2 (row+0.5)
                // Inside corner: startSide2 (col+0.5) with endSide1 (row-0.5)
                corners = [
                    this.gameToScreen(startPoint, startSide1, 0),
                    this.gameToScreen(endSide2, startSide1, 0),
                    this.gameToScreen(endSide2, endPoint, 0),
                    this.gameToScreen(endSide1, endPoint, 0),
                    this.gameToScreen(endSide1, startSide2, 0),
                    this.gameToScreen(startPoint, startSide2, 0)
                ];
            }

            this.ctx.fillStyle = roadColor;
            this.ctx.beginPath();
            this.ctx.moveTo(corners[0].x * blockSize, corners[0].y * blockSize);
            for (let i = 1; i < corners.length; i++) {
                this.ctx.lineTo(corners[i].x * blockSize, corners[i].y * blockSize);
            }
            this.ctx.closePath();
            this.ctx.fill();
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
        const roadColor = '#444444'; // Dark gray for road
        const roadWidth = 1.0; // Road is 1 unit wide
        const halfWidth = roadWidth / 2;

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
        this.ctx.fillStyle = '#6B3410';
        this.ctx.beginPath();
        this.ctx.moveTo(left.x, left.y);
        this.ctx.lineTo(left.x, left.y + wallHeight);
        this.ctx.lineTo(bottom.x, bottom.y + wallHeight);
        this.ctx.lineTo(bottom.x, bottom.y);
        this.ctx.closePath();
        this.ctx.fill();

        // 2. Draw the right wall (lighter brown)
        this.ctx.fillStyle = '#8B4513';
        this.ctx.beginPath();
        this.ctx.moveTo(bottom.x, bottom.y);
        this.ctx.lineTo(bottom.x, bottom.y + wallHeight);
        this.ctx.lineTo(right.x, right.y + wallHeight);
        this.ctx.lineTo(right.x, right.y);
        this.ctx.closePath();
        this.ctx.fill();

        // 3. Draw the green top surface
        this.ctx.fillStyle = '#4CAF50';
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

        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 2;

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
}
