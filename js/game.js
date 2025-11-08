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

        // Bridge animation state
        this.bridgeGrowthRate = 2.0; // units per second
        this.slamDuration = 0.2; // 0.2 seconds to slam down
        this.pauseDuration = 1.0; // 1 second pause between bridges

        // Current bridge being animated (0, 1, or 2 for bridges 1-3)
        this.currentBridge = 0;

        // Bridge sequence definition: [holdTime, baseRow, baseCol, direction]
        this.bridgeSequence = [
            { holdTime: 1.25, targetLength: 2.5 }, // Bridge 1: island 1 to 2
            { holdTime: 1.75, targetLength: 3.5 }, // Bridge 2: island 2 to 3
            { holdTime: 0.75, targetLength: 1.5 }  // Bridge 3: island 3 to 4
        ];

        this.bridgeLength = 0;
        this.bridgeState = 'growing'; // 'growing', 'slamming', 'pausing', 'done'
        this.bridgeRotation = 0; // 0 = vertical, Math.PI/2 = horizontal
        this.stateProgress = 0; // Progress within current state
        this.lastTime = 0;

        this.init();
    }

    init() {
        // Log course details for verification
        console.log('Course start:', this.course.startRow, this.course.startCol);
        console.log('Course end:', this.course.getEndLocation());
        console.log('Span details:', this.course.getSpanDetails());

        // Start animation loop
        requestAnimationFrame((time) => this.animate(time));
    }

    animate(currentTime) {
        if (this.lastTime === 0) {
            this.lastTime = currentTime;
        }

        const deltaTime = (currentTime - this.lastTime) / 1000; // Convert to seconds
        this.lastTime = currentTime;

        // Check if all bridges are done
        if (this.bridgeState === 'done') {
            this.render();
            return;
        }

        const currentBridgeData = this.bridgeSequence[this.currentBridge];

        // Update bridge animation state machine
        if (this.bridgeState === 'growing') {
            this.bridgeLength += this.bridgeGrowthRate * deltaTime;

            if (this.bridgeLength >= currentBridgeData.targetLength) {
                this.bridgeLength = currentBridgeData.targetLength;
                this.bridgeState = 'slamming';
                this.stateProgress = 0;
            }
        } else if (this.bridgeState === 'slamming') {
            this.stateProgress += deltaTime;

            if (this.stateProgress >= this.slamDuration) {
                this.stateProgress = this.slamDuration;
                this.bridgeRotation = Math.PI / 2; // Horizontal
                this.bridgeState = 'pausing';
                this.stateProgress = 0;
            } else {
                const t = this.stateProgress / this.slamDuration;
                this.bridgeRotation = (Math.PI / 2) * t;
            }
        } else if (this.bridgeState === 'pausing') {
            this.stateProgress += deltaTime;

            if (this.stateProgress >= this.pauseDuration) {
                // Move to next bridge
                this.currentBridge++;
                if (this.currentBridge >= this.bridgeSequence.length) {
                    // All bridges complete
                    this.bridgeState = 'done';
                } else {
                    // Start next bridge
                    this.bridgeLength = 0;
                    this.bridgeRotation = 0;
                    this.bridgeState = 'growing';
                    this.stateProgress = 0;
                }
            }
        }

        // Continue animation
        this.render();
        requestAnimationFrame((time) => this.animate(time));
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

        // Bridge positions: [baseRow/Col for road center, edgePosition, direction]
        const bridgePositions = [
            { baseRow: 1, edgeCol: 2, direction: 'column' },     // Bridge 1: island 1 to 2, exits at col 2, centered at row 1
            { baseCol: 5, edgeRow: 2, direction: 'row' },        // Bridge 2: island 2 to 3, exits at row 2, centered at col 5
            { baseCol: 5, edgeRow: 7, direction: 'row' }         // Bridge 3: island 3 to 4, exits at row 7, centered at col 5
        ];

        // Draw all completed bridges (horizontal)
        for (let i = 0; i < this.currentBridge; i++) {
            const pos = bridgePositions[i];
            const bridgeData = this.bridgeSequence[i];

            if (pos.direction === 'column') {
                this.renderer.drawHorizontalBridge(pos.baseRow, pos.edgeCol - 0.1, pos.direction, bridgeData.targetLength + 0.1, blockSize);
            } else {
                this.renderer.drawHorizontalBridge(pos.edgeRow - 0.1, pos.baseCol, pos.direction, bridgeData.targetLength + 0.1, blockSize);
            }
        }

        // Draw current bridge being animated (if not done with all)
        if (this.bridgeState !== 'done') {
            const pos = bridgePositions[this.currentBridge];

            if (this.bridgeState === 'growing') {
                // Draw vertical bridge
                if (pos.direction === 'column') {
                    this.renderer.drawVerticalBridge(pos.baseRow, pos.edgeCol, pos.direction, this.bridgeLength, blockSize);
                    this.renderer.drawBridgeEdgeLine(pos.baseRow, pos.edgeCol, pos.direction, blockSize);
                } else {
                    this.renderer.drawVerticalBridge(pos.edgeRow, pos.baseCol, pos.direction, this.bridgeLength, blockSize);
                    this.renderer.drawBridgeEdgeLine(pos.edgeRow, pos.baseCol, pos.direction, blockSize);
                }
            } else if (this.bridgeState === 'slamming') {
                // Draw rotating bridge
                if (pos.direction === 'column') {
                    this.renderer.drawRotatingBridge(pos.baseRow, pos.edgeCol, pos.direction, this.bridgeLength, this.bridgeRotation, blockSize);
                    this.renderer.drawBridgeEdgeLine(pos.baseRow, pos.edgeCol, pos.direction, blockSize);
                } else {
                    this.renderer.drawRotatingBridge(pos.edgeRow, pos.baseCol, pos.direction, this.bridgeLength, this.bridgeRotation, blockSize);
                    this.renderer.drawBridgeEdgeLine(pos.edgeRow, pos.baseCol, pos.direction, blockSize);
                }
            } else if (this.bridgeState === 'pausing') {
                // Draw horizontal bridge during pause
                if (pos.direction === 'column') {
                    this.renderer.drawHorizontalBridge(pos.baseRow, pos.edgeCol - 0.1, pos.direction, this.bridgeLength + 0.1, blockSize);
                } else {
                    this.renderer.drawHorizontalBridge(pos.edgeRow - 0.1, pos.baseCol, pos.direction, this.bridgeLength + 0.1, blockSize);
                }
            }
        } else {
            // All done - draw final bridge
            const pos = bridgePositions[this.currentBridge - 1];
            const bridgeData = this.bridgeSequence[this.currentBridge - 1];

            if (pos.direction === 'column') {
                this.renderer.drawHorizontalBridge(pos.baseRow, pos.edgeCol - 0.1, pos.direction, bridgeData.targetLength + 0.1, blockSize);
            } else {
                this.renderer.drawHorizontalBridge(pos.edgeRow - 0.1, pos.baseCol, pos.direction, bridgeData.targetLength + 0.1, blockSize);
            }
        }

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
