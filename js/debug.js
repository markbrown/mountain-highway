// Debug utilities for development and testing

class DebugRenderer {
    constructor(renderer) {
        this.renderer = renderer;
        this.ctx = renderer.ctx;
    }

    /**
     * Draw debug grid lines to visualize the game coordinate system
     * @param {number} minRow - minimum row to draw
     * @param {number} maxRow - maximum row to draw
     * @param {number} minCol - minimum column to draw
     * @param {number} maxCol - maximum column to draw
     * @param {number} blockSize - size of each grid square
     */
    drawGrid(minRow, maxRow, minCol, maxCol, blockSize) {
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)'; // Faint black lines
        this.ctx.lineWidth = 1;

        // Draw vertical lines (constant column, varying row)
        for (let col = minCol; col <= maxCol; col++) {
            this.ctx.beginPath();
            const startPoint = this.renderer.gameToScreen(minRow, col, 0);
            const endPoint = this.renderer.gameToScreen(maxRow, col, 0);
            this.ctx.moveTo(startPoint.x * blockSize, startPoint.y * blockSize);
            this.ctx.lineTo(endPoint.x * blockSize, endPoint.y * blockSize);
            this.ctx.stroke();
        }

        // Draw horizontal lines (constant row, varying column)
        for (let row = minRow; row <= maxRow; row++) {
            this.ctx.beginPath();
            const startPoint = this.renderer.gameToScreen(row, minCol, 0);
            const endPoint = this.renderer.gameToScreen(row, maxCol, 0);
            this.ctx.moveTo(startPoint.x * blockSize, startPoint.y * blockSize);
            this.ctx.lineTo(endPoint.x * blockSize, endPoint.y * blockSize);
            this.ctx.stroke();
        }
    }

    /**
     * Draw a debug number on an island
     * @param {number} row - game grid row (near corner)
     * @param {number} col - game grid column (near corner)
     * @param {number} width - width of the island in columns
     * @param {number} height - height of the island in rows
     * @param {number} number - the number to display
     * @param {number} blockSize - size of each grid square in pixels
     */
    drawIslandNumber(row, col, width, height, number, blockSize) {
        // Calculate center of the island top
        const centerRow = row + height / 2;
        const centerCol = col + width / 2;
        const centerPoint = this.renderer.gameToScreen(centerRow, centerCol, 0);
        const centerX = centerPoint.x * blockSize;
        const centerY = centerPoint.y * blockSize;

        // Draw the number
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.font = 'bold 24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(number.toString(), centerX, centerY);
    }
}
