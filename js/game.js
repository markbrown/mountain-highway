// Main game loop and initialization

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.renderer = new Renderer(this.canvas);

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
        // Uncomment to show grid lines:
        // this.renderer.drawDebugGrid(-2, 10, -2, 10, blockSize);

        // Draw islands from top to bottom (highest row first)
        // so walls extend downward over islands below

        // Draw third island (topmost)
        // Near corner at game grid (row=5, col=4), extends to (row=7, col=6)
        this.renderer.drawIsland(
            5,    // row
            4,    // col
            2,    // size (2x2)
            400,  // wall height
            blockSize
        );

        // Draw first island (row=0, col=0)
        // Near corner at game grid (row=0, col=0), extends to (row=2, col=2)
        this.renderer.drawIsland(
            0,    // row
            0,    // col
            2,    // size (2x2)
            400,  // wall height
            blockSize
        );

        // Draw second island (row=0, col=4)
        // Near corner at game grid (row=0, col=4), extends to (row=2, col=6)
        // Same row as first island, but 4 columns to the right (2 for island + 2 for gap)
        this.renderer.drawIsland(
            0,    // row (same as first island)
            4,    // col (2 for first island + 2 for gap = 4)
            2,    // size (2x2)
            400,  // wall height
            blockSize
        );

        this.renderer.ctx.restore();
    }
}

// Start the game when page loads
window.addEventListener('load', () => {
    new Game();
});
