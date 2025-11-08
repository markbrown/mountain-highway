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

        // Draw first island
        // Near corner at game grid (row=0, col=0), extends to (row=2, col=2)
        this.renderer.drawIsland(
            0,    // row
            0,    // col
            2,    // size (2x2)
            400,  // wall height
            blockSize
        );

        // Draw second island to the right (along column axis)
        // Near corner at game grid (row=0, col=4), extends to (row=2, col=6)
        // Same row (0), column increases by 4 (2 for island + 2 for gap)
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
