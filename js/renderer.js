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
     * Convert isometric coordinates to screen coordinates
     * In isometric view, x goes right-down, y goes left-down
     */
    isoToScreen(isoX, isoY, isoZ = 0) {
        const screenX = (isoX - isoY);
        const screenY = (isoX + isoY) / 2 - isoZ;
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
     * @param {number} gridX - grid X position (not used yet)
     * @param {number} gridY - grid Y position (not used yet)
     * @param {number} gridSize - size of the top surface in grid units
     * @param {number} height - how far the walls extend downward
     * @param {number} offsetX - screen offset X
     * @param {number} offsetY - screen offset Y
     */
    drawIsland(gridX, gridY, gridSize, height, offsetX, offsetY) {
        const blockSize = 50; // Size of each isometric block
        const totalSize = gridSize * blockSize;

        // Calculate the four corners of the top surface in isometric coordinates
        const topLeft = this.isoToScreen(offsetX, offsetY, 0);
        const topRight = this.isoToScreen(offsetX + totalSize, offsetY, 0);
        const bottomRight = this.isoToScreen(offsetX + totalSize, offsetY + totalSize, 0);
        const bottomLeft = this.isoToScreen(offsetX, offsetY + totalSize, 0);

        // 1. Draw the green top surface as a single face
        this.ctx.beginPath();
        this.ctx.moveTo(topLeft.x, topLeft.y);
        this.ctx.lineTo(topRight.x, topRight.y);
        this.ctx.lineTo(bottomRight.x, bottomRight.y);
        this.ctx.lineTo(bottomLeft.x, bottomLeft.y);
        this.ctx.closePath();
        this.ctx.fillStyle = '#4CAF50'; // Green grass
        this.ctx.fill();

        // 2. Draw the right wall as a single face
        this.ctx.beginPath();
        this.ctx.moveTo(topRight.x, topRight.y);
        this.ctx.lineTo(topRight.x, topRight.y + height);
        this.ctx.lineTo(bottomRight.x, bottomRight.y + height);
        this.ctx.lineTo(bottomRight.x, bottomRight.y);
        this.ctx.closePath();
        this.ctx.fillStyle = '#8B4513'; // Lighter brown
        this.ctx.fill();

        // 3. Draw the left wall as a single face
        this.ctx.beginPath();
        this.ctx.moveTo(bottomLeft.x, bottomLeft.y);
        this.ctx.lineTo(bottomLeft.x, bottomLeft.y + height);
        this.ctx.lineTo(bottomRight.x, bottomRight.y + height);
        this.ctx.lineTo(bottomRight.x, bottomRight.y);
        this.ctx.closePath();
        this.ctx.fillStyle = '#6B3410'; // Darker brown
        this.ctx.fill();

        // 4. Draw the outline where faces meet
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 2;

        // Outline of top surface
        this.ctx.beginPath();
        this.ctx.moveTo(topLeft.x, topLeft.y);
        this.ctx.lineTo(topRight.x, topRight.y);
        this.ctx.lineTo(bottomRight.x, bottomRight.y);
        this.ctx.lineTo(bottomLeft.x, bottomLeft.y);
        this.ctx.closePath();
        this.ctx.stroke();

        // Edge between top and right wall
        this.ctx.beginPath();
        this.ctx.moveTo(topRight.x, topRight.y);
        this.ctx.lineTo(topRight.x, topRight.y + height);
        this.ctx.stroke();

        // Edge between top and left wall
        this.ctx.beginPath();
        this.ctx.moveTo(bottomLeft.x, bottomLeft.y);
        this.ctx.lineTo(bottomLeft.x, bottomLeft.y + height);
        this.ctx.stroke();

        // Edge between right and left walls
        this.ctx.beginPath();
        this.ctx.moveTo(bottomRight.x, bottomRight.y);
        this.ctx.lineTo(bottomRight.x, bottomRight.y + height);
        this.ctx.stroke();
    }
}
