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

        // Draw a single island
        // gridX, gridY position (not used yet)
        // gridSize = 2x2 blocks (will make island ~100px)
        // height = extend down far enough to go off screen
        // offsetX, offsetY = center it on screen
        this.renderer.drawIsland(
            0, 0,           // grid position
            2,              // 2x2 grid (100px side with 50px blocks)
            400,            // height = 400px walls extending downward (off screen)
            400, 150        // offset to center on screen
        );
    }
}

// Start the game when page loads
window.addEventListener('load', () => {
    new Game();
});
