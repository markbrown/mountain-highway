// Main game loop and initialization

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.renderer = new Renderer(this.canvas);
        this.debug = new DebugRenderer(this.renderer);

        // Debug options
        this.showDebugGrid = true;
        this.showIslandNumbers = false;

        // Create the example course
        this.course = createExampleCourse();

        // Car state
        this.carRow = 1;
        this.carCol = 1;
        this.carDirection = 'column'; // Direction car is facing
        this.carSpeed = 2.0; // units per second

        // Bridge animation state
        this.bridgeGrowthRate = 2.0; // units per second
        this.slamDuration = 0.2; // 0.2 seconds to slam down

        // Current bridge being animated (0, 1, or 2 for bridges 1-3)
        this.currentBridge = 0;

        // Bridge sequence definition
        this.bridgeSequence = [
            { holdTime: 1.25, targetLength: 2.5 }, // Bridge 1: island 1 to 2
            { holdTime: 1.75, targetLength: 3.5 }, // Bridge 2: island 2 to 3
            { holdTime: 0.75, targetLength: 1.5 }  // Bridge 3: island 3 to 4
        ];

        this.bridgeLength = 0;
        this.bridgeRotation = 0; // 0 = vertical, Math.PI/2 = horizontal

        // Game state machine
        // States: 'driving', 'waiting', 'bridge_growing', 'bridge_slamming', 'done'
        this.gameState = 'driving';
        this.stateProgress = 0;
        this.targetPosition = 0; // Target row or col for current drive
        this.lastTime = 0;

        this.init();
    }

    init() {
        // Log course details for verification
        console.log('Course start:', this.course.startRow, this.course.startCol);
        console.log('Course end:', this.course.getEndLocation());
        console.log('Span details:', this.course.getSpanDetails());

        // Initialize: car drives to edge of first island (column 2 - car half-length - small margin)
        // Car is 0.6 units long, so front bumper is 0.3 units ahead of center
        this.targetPosition = 2 - 0.3 - 0.05; // Stop with front bumper just before edge
        this.gameState = 'driving';

        // Start animation loop
        requestAnimationFrame((time) => this.animate(time));
    }

    animate(currentTime) {
        if (this.lastTime === 0) {
            this.lastTime = currentTime;
        }

        const deltaTime = (currentTime - this.lastTime) / 1000; // Convert to seconds
        this.lastTime = currentTime;

        if (this.gameState === 'done') {
            this.render();
            return;
        }

        // State machine for coordinating car movement and bridge animations
        if (this.gameState === 'driving') {
            // Move car toward target position
            if (this.carDirection === 'column') {
                this.carCol += this.carSpeed * deltaTime;
                if (this.carCol >= this.targetPosition) {
                    this.carCol = this.targetPosition;
                    this.gameState = 'waiting';
                }
            } else {
                this.carRow += this.carSpeed * deltaTime;
                if (this.carRow >= this.targetPosition) {
                    this.carRow = this.targetPosition;
                    this.gameState = 'waiting';
                }
            }
        } else if (this.gameState === 'waiting') {
            // Start bridge animation
            this.bridgeLength = 0;
            this.bridgeRotation = 0;
            this.gameState = 'bridge_growing';
        } else if (this.gameState === 'bridge_growing') {
            const currentBridgeData = this.bridgeSequence[this.currentBridge];
            this.bridgeLength += this.bridgeGrowthRate * deltaTime;

            if (this.bridgeLength >= currentBridgeData.targetLength) {
                this.bridgeLength = currentBridgeData.targetLength;
                this.gameState = 'bridge_slamming';
                this.stateProgress = 0;
            }
        } else if (this.gameState === 'bridge_slamming') {
            this.stateProgress += deltaTime;

            if (this.stateProgress >= this.slamDuration) {
                this.bridgeRotation = Math.PI / 2; // Horizontal
                this.gameState = 'bridge_done';
            } else {
                const t = this.stateProgress / this.slamDuration;
                this.bridgeRotation = (Math.PI / 2) * t;
            }
        } else if (this.gameState === 'bridge_done') {
            // Advance to next segment
            this.advanceToNextSegment();
        }

        // Continue animation
        this.render();
        requestAnimationFrame((time) => this.animate(time));
    }

    advanceToNextSegment() {
        // Segments: 0->bridge1, 1->junction1, 2->bridge2, 3->junction2, 4->bridge3, 5->junction3, 6->edge of island 4
        this.currentBridge++;

        if (this.currentBridge === 1) {
            // Just crossed bridge 1, drive to junction 1 at (1,5) then turn left
            this.targetPosition = 5;
            this.gameState = 'driving';
            // After reaching junction, car will be at (1,5) facing column, need to turn to row
            setTimeout(() => {
                this.carDirection = 'row';
                this.targetPosition = 2 - 0.3 - 0.05; // Drive to edge of island 2
                this.gameState = 'driving';
            }, ((5 - this.carCol) / this.carSpeed) * 1000);
        } else if (this.currentBridge === 2) {
            // Just crossed bridge 2, drive to junction 2 at (6,5), straight ahead
            this.targetPosition = 6;
            this.gameState = 'driving';
            // No turn needed, continue to edge of island 3
            setTimeout(() => {
                this.targetPosition = 7 - 0.3 - 0.05; // Drive to edge of island 3
                this.gameState = 'driving';
            }, ((6 - this.carRow) / this.carSpeed) * 1000);
        } else if (this.currentBridge === 3) {
            // Just crossed bridge 3, drive to junction 3 at (9,5) then turn right
            this.targetPosition = 9;
            this.gameState = 'driving';
            // After reaching junction, turn from row to column
            setTimeout(() => {
                this.carDirection = 'column';
                this.targetPosition = 8 - 0.3 - 0.05; // Drive to edge of island 4
                this.gameState = 'driving';
            }, ((9 - this.carRow) / this.carSpeed) * 1000);
        } else {
            // Reached end
            this.gameState = 'done';
        }
    }

    render() {
        this.renderer.clear();

        const blockSize = 50;

        // Center the view on canvas
        this.renderer.ctx.save();
        this.renderer.ctx.translate(400, 500); // Offset to center islands on screen

        // Draw debug grid (optional - for development)
        if (this.showDebugGrid) {
            this.debug.drawGrid(0, 16, 0, 16, blockSize);
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

        // Draw current bridge being animated (only if it hasn't been completed yet)
        if (this.currentBridge < this.bridgeSequence.length) {
            const pos = bridgePositions[this.currentBridge];

            if (this.gameState === 'bridge_growing') {
                // Draw vertical bridge
                if (pos.direction === 'column') {
                    this.renderer.drawVerticalBridge(pos.baseRow, pos.edgeCol, pos.direction, this.bridgeLength, blockSize);
                    this.renderer.drawBridgeEdgeLine(pos.baseRow, pos.edgeCol, pos.direction, blockSize);
                } else {
                    this.renderer.drawVerticalBridge(pos.edgeRow, pos.baseCol, pos.direction, this.bridgeLength, blockSize);
                    this.renderer.drawBridgeEdgeLine(pos.edgeRow, pos.baseCol, pos.direction, blockSize);
                }
            } else if (this.gameState === 'bridge_slamming') {
                // Draw rotating bridge
                if (pos.direction === 'column') {
                    this.renderer.drawRotatingBridge(pos.baseRow, pos.edgeCol, pos.direction, this.bridgeLength, this.bridgeRotation, blockSize);
                    this.renderer.drawBridgeEdgeLine(pos.baseRow, pos.edgeCol, pos.direction, blockSize);
                } else {
                    this.renderer.drawRotatingBridge(pos.edgeRow, pos.baseCol, pos.direction, this.bridgeLength, this.bridgeRotation, blockSize);
                    this.renderer.drawBridgeEdgeLine(pos.edgeRow, pos.baseCol, pos.direction, blockSize);
                }
            }
            // Note: Once bridge_done, the bridge moves to the "completed bridges" section above
        }

        // Draw car at current position
        this.renderer.drawCar(this.carRow, this.carCol, this.carDirection, blockSize);

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
