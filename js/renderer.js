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
     * Draw debug grid lines to visualize the game coordinate system
     * @param {number} minRow - minimum row to draw
     * @param {number} maxRow - maximum row to draw
     * @param {number} minCol - minimum column to draw
     * @param {number} maxCol - maximum column to draw
     * @param {number} blockSize - size of each grid square
     */
    drawDebugGrid(minRow, maxRow, minCol, maxCol, blockSize) {
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)'; // Faint black lines
        this.ctx.lineWidth = 1;

        // Draw vertical lines (constant column, varying row)
        for (let col = minCol; col <= maxCol; col++) {
            this.ctx.beginPath();
            const startPoint = this.gameToScreen(minRow, col, 0);
            const endPoint = this.gameToScreen(maxRow, col, 0);
            this.ctx.moveTo(startPoint.x * blockSize, startPoint.y * blockSize);
            this.ctx.lineTo(endPoint.x * blockSize, endPoint.y * blockSize);
            this.ctx.stroke();
        }

        // Draw horizontal lines (constant row, varying column)
        for (let row = minRow; row <= maxRow; row++) {
            this.ctx.beginPath();
            const startPoint = this.gameToScreen(row, minCol, 0);
            const endPoint = this.gameToScreen(row, maxCol, 0);
            this.ctx.moveTo(startPoint.x * blockSize, startPoint.y * blockSize);
            this.ctx.lineTo(endPoint.x * blockSize, endPoint.y * blockSize);
            this.ctx.stroke();
        }
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
     * Draw an island - a flat top surface with vertical walls extending downward
     * @param {number} row - game grid row (near corner)
     * @param {number} col - game grid column (near corner)
     * @param {number} width - width of the island in columns
     * @param {number} height - height of the island in rows
     * @param {number} wallHeight - how far the walls extend downward (pixels)
     * @param {number} blockSize - size of each grid square in pixels
     */
    drawIsland(row, col, width, height, wallHeight, blockSize) {
        // Calculate the four corners of the top surface in game coordinates
        // In isometric view, these form a diamond/rhombus:
        //   - Bottom point (near): (row, col)
        //   - Right point: (row, col+width)
        //   - Top point (far): (row+height, col+width)
        //   - Left point: (row+height, col)
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

        // 1. Draw the left wall (darker brown) - from left corner to bottom (near) corner
        this.ctx.fillStyle = '#6B3410';
        this.ctx.beginPath();
        this.ctx.moveTo(left.x, left.y);
        this.ctx.lineTo(left.x, left.y + wallHeight);
        this.ctx.lineTo(bottom.x, bottom.y + wallHeight);
        this.ctx.lineTo(bottom.x, bottom.y);
        this.ctx.closePath();
        this.ctx.fill();

        // 2. Draw the right wall (lighter brown) - from bottom (near) corner to right corner
        this.ctx.fillStyle = '#8B4513';
        this.ctx.beginPath();
        this.ctx.moveTo(bottom.x, bottom.y);
        this.ctx.lineTo(bottom.x, bottom.y + wallHeight);
        this.ctx.lineTo(right.x, right.y + wallHeight);
        this.ctx.lineTo(right.x, right.y);
        this.ctx.closePath();
        this.ctx.fill();

        // 3. Draw the green top surface last (on top of everything)
        this.ctx.fillStyle = '#4CAF50';
        this.ctx.beginPath();
        this.ctx.moveTo(bottom.x, bottom.y);
        this.ctx.lineTo(right.x, right.y);
        this.ctx.lineTo(top.x, top.y);
        this.ctx.lineTo(left.x, left.y);
        this.ctx.closePath();
        this.ctx.fill();

        // Draw the visible outlines where faces meet
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
}
