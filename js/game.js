// Main game loop and initialization

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.renderer = new Renderer(this.canvas);
        this.debug = new DebugRenderer(this.renderer);

        // Debug options
        this.showDebugGrid = false;
        this.showIslandNumbers = false;

        this.init();
    }

    init() {
        // Initial render
        this.render();
    }

    render() {
        this.renderer.clear();

        const blockSize = 50;

        // Center the view on canvas
        this.renderer.ctx.save();
        this.renderer.ctx.translate(400, 500); // Offset to center islands on screen

        // Draw debug grid (optional - for development)
        if (this.showDebugGrid) {
            this.debug.drawGrid(-2, 10, -2, 10, blockSize);
        }

        // Draw islands from top to bottom (highest row first)
        // so walls extend downward over islands below

        const wallHeight = 2000; // Extend walls far down off-screen (ground not visible)

        // Island data: [row, col, width, height, debugNumber]
        const islands = [
            [8, 4, 4, 2, 4],  // Fourth island (topmost) - 4x2
            [5, 4, 2, 2, 3],  // Third island - 2x2
            [0, 0, 2, 2, 1],  // First island - 2x2
            [0, 4, 2, 2, 2],  // Second island - 2x2
        ];

        // Draw islands (already sorted from highest row to lowest)
        islands.forEach(([row, col, width, height, debugNum]) => {
            this.renderer.drawIsland(row, col, width, height, wallHeight, blockSize);
        });

        // Draw debug overlays (on top of everything)
        if (this.showIslandNumbers) {
            islands.forEach(([row, col, width, height, debugNum]) => {
                this.debug.drawIslandNumber(row, col, width, height, debugNum, blockSize);
            });
        }

        this.renderer.ctx.restore();
    }
}

// Start the game when page loads
window.addEventListener('load', () => {
    new Game();
});
