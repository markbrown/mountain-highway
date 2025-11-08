// Main game loop and initialization

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.renderer = new Renderer(this.canvas);
        this.debug = new DebugRenderer(this.renderer);

        // Debug options
        this.showDebugGrid = false;
        this.showIslandNumbers = false;

        // Create the example course
        this.course = createExampleCourse();

        this.init();
    }

    init() {
        // Log course details for verification
        console.log('Course start:', this.course.startRow, this.course.startCol);
        console.log('Course end:', this.course.getEndLocation());
        console.log('Span details:', this.course.getSpanDetails());

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
        // For each island: base colors → road → black lines
        // This ensures nearer islands properly overlap more distant ones

        const wallHeight = 2000; // Extend walls far down off-screen (ground not visible)

        // Island data: [row, col, width, height, entryDir, exitDir, junctionRow, junctionCol, debugNumber]
        const islands = [
            [8, 4, 4, 2, 'row', 'column', 9, 5, 4],      // Fourth island (topmost) - 4x2, right turn
            [5, 4, 2, 2, 'row', 'row', 6, 5, 3],         // Third island - 2x2, straight ahead
            [0, 4, 2, 2, 'column', 'row', 1, 5, 2],      // Second island - 2x2, left turn
            [0, 0, 2, 2, 'column', 'column', 1, 1, 1],   // First island - 2x2, straight ahead
        ];

        // Render each island completely (colors → road → lines) from farthest to nearest
        islands.forEach(([row, col, width, height, entryDir, exitDir, junctionRow, junctionCol, debugNum]) => {
            // Step 1: Draw island base colors (green and brown)
            const corners = this.renderer.drawIslandColors(row, col, width, height, wallHeight, blockSize);

            // Step 2: Draw road on this island (grey)
            this.renderer.drawIslandRoad(row, col, width, height, entryDir, exitDir, junctionRow, junctionCol, blockSize);

            // Step 3: Draw island outlines (black lines)
            this.renderer.drawIslandOutlines(corners);
        });

        // Draw debug overlays (on top of everything)
        if (this.showIslandNumbers) {
            islands.forEach(([row, col, width, height, entryDir, exitDir, junctionRow, junctionCol, debugNum]) => {
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
