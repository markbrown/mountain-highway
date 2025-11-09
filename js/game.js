// Main game loop and initialization

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');

        // Define viewport for the game (what region of grid to show)
        // We want a fixed canvas size (800x600) showing a specific region
        // Calculate the grid region that fits in 800x600 at 50px blockSize
        // The previous view centered around the start of the course
        this.viewport = this.createViewportForCanvas(800, 600);

        this.renderer = new Renderer(this.canvas, this.viewport);
        this.debug = new DebugRenderer(this.renderer);

        // Debug options
        this.showDebugGrid = GameConfig.debug.showGrid;
        this.showIslandNumbers = GameConfig.debug.showIslandNumbers;
        this.showBridgeZones = GameConfig.debug.showBridgeZones;

        // Load the level (course + islands)
        this.level = createExampleLevel();
        this.course = this.level.course;
        this.islands = this.level.islands;

        // Car state
        this.carRow = 1;
        this.carCol = 1;
        this.carDirection = 'column'; // Direction car is facing
        this.carSpeed = GameConfig.car.speed;

        // Bridge animation state
        this.bridgeGrowthRate = GameConfig.bridge.growthRate;
        this.slamDuration = GameConfig.bridge.slamDuration;

        // Current bridge being animated (0, 1, or 2 for bridges 1-3)
        this.currentBridge = 0;

        // Bridge sequence definition - calculated from level
        this.bridgeSequence = this.level.getBridgeAnimationData();
        this.bridgePositions = this.level.getBridgePositions();

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

    /**
     * Create a viewport that shows a specific grid region to fit in a fixed canvas size
     * This recreates the previous fixed view (800x600) centered at bottom of course
     */
    createViewportForCanvas(canvasWidth, canvasHeight) {
        const blockSize = GameConfig.grid.blockSize;

        // Start at the bottom of the course, showing the beginning islands
        // We want to see from roughly row -1 to row 11 (12 row span)
        // and col -1 to col 9 (10 col span)
        const minRow = -1;
        const maxRow = 11;
        const minCol = -1;
        const maxCol = 9;

        return new Viewport(minRow, maxRow, minCol, maxCol, blockSize, canvasWidth, canvasHeight);
    }

    init() {
        // Log course details for verification
        console.log('Course start:', this.course.startRow, this.course.startCol);
        console.log('Course end:', this.course.getEndLocation());
        console.log('Span details:', this.course.getSpanDetails());

        // Validate level configuration
        const validationResult = this.level.validate();
        CourseValidator.printResults(validationResult, 'Course Validation');

        // Initialize: car drives to edge of first island (column 2 - car half-length - stopping margin)
        this.targetPosition = 2 - GameConfig.car.halfLength - GameConfig.car.stoppingMargin;
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
        // Segments: 0->bridge1, 1->junction1, 2->bridge2, 3->junction2, 4->bridge3, 5->junction3(right), 6->junction4(left), 7->bridge4, 8->end
        this.currentBridge++;

        if (this.currentBridge === 1) {
            // Just crossed bridge 1, drive to junction 1 at (1,5) then turn left
            this.targetPosition = 5;
            this.gameState = 'driving';
            // After reaching junction, car will be at (1,5) facing column, need to turn to row
            setTimeout(() => {
                this.carDirection = 'row';
                this.targetPosition = 2 - GameConfig.car.halfLength - GameConfig.car.stoppingMargin;
                this.gameState = 'driving';
            }, ((5 - this.carCol) / this.carSpeed) * 1000);
        } else if (this.currentBridge === 2) {
            // Just crossed bridge 2, drive to junction 2 at (6,5), straight ahead
            this.targetPosition = 6;
            this.gameState = 'driving';
            // No turn needed, continue to edge of island 3
            setTimeout(() => {
                this.targetPosition = 7 - GameConfig.car.halfLength - GameConfig.car.stoppingMargin;
                this.gameState = 'driving';
            }, ((6 - this.carRow) / this.carSpeed) * 1000);
        } else if (this.currentBridge === 3) {
            // Just crossed bridge 3, drive to junction 3 at (9,5) then turn right
            this.targetPosition = 9;
            this.gameState = 'driving';
            // After reaching junction 3, turn from row to column
            setTimeout(() => {
                this.carDirection = 'column';
                // Drive to junction 4 at (9,7) - NO BRIDGE, just drive along island
                this.targetPosition = 7;
                this.gameState = 'driving';
                // After reaching junction 4, turn from column to row
                setTimeout(() => {
                    this.carDirection = 'row';
                    this.targetPosition = 10 - GameConfig.car.halfLength - GameConfig.car.stoppingMargin;
                    this.gameState = 'driving';
                }, ((7 - this.carCol) / this.carSpeed) * 1000);
            }, ((9 - this.carRow) / this.carSpeed) * 1000);
        } else if (this.currentBridge === 4) {
            // Just crossed bridge 3, drive to final junction at (13,7)
            this.targetPosition = 13;
            this.gameState = 'driving';
            // After reaching final junction, animation is complete
            setTimeout(() => {
                this.gameState = 'done';
            }, ((13 - this.carRow) / this.carSpeed) * 1000);
        } else {
            // Reached end
            this.gameState = 'done';
        }
    }

    render() {
        this.renderer.clear();

        const blockSize = this.viewport.blockSize;

        // Apply viewport transform
        this.renderer.ctx.save();
        const offset = this.viewport.getOffset();
        this.renderer.ctx.translate(offset.x, offset.y);

        // Draw debug grid (optional - for development)
        if (this.showDebugGrid) {
            this.debug.drawGrid(this.viewport.minRow, this.viewport.maxRow,
                              this.viewport.minCol, this.viewport.maxCol, blockSize);
        }

        // Draw islands from top to bottom (highest row first)
        // For each island: base colors → road → black lines
        // This ensures nearer islands properly overlap more distant ones

        const wallHeight = GameConfig.island.wallHeight;

        // Sort islands by row (descending) for proper back-to-front rendering
        const sortedIndices = this.islands
            .map((island, idx) => ({island, idx}))
            .sort((a, b) => b.island[0] - a.island[0])
            .map(item => item.idx);

        // Render each island completely (colors → road → lines) from farthest to nearest
        sortedIndices.forEach(islandIndex => {
            const [row, col, width, height] = this.islands[islandIndex];

            // Step 1: Draw island base colors (green and brown)
            const corners = this.renderer.drawIslandColors(row, col, width, height, wallHeight, blockSize);

            // Step 2: Draw road on this island (grey) using Course data
            const roadSegments = this.course.getRoadSegmentsForIsland(islandIndex, this.islands);
            this.renderer.drawIslandRoadFromSpans(row, col, width, height, roadSegments, blockSize);

            // Step 3: Draw island outlines (black lines)
            this.renderer.drawIslandOutlines(corners);
        });

        // Draw debug bridge zones (optional - shows min/max safe bridge lengths)
        if (this.showBridgeZones) {
            this.debug.drawBridgeZones(this.course, this.islands, blockSize);
        }

        // Draw all completed bridges (horizontal)
        for (let i = 0; i < this.currentBridge; i++) {
            const pos = this.bridgePositions[i];
            const bridgeData = this.bridgeSequence[i];
            const baseOffset = GameConfig.bridge.baseOffset;

            if (pos.direction === 'column') {
                this.renderer.drawHorizontalBridge(pos.baseRow, pos.edgeCol - baseOffset, pos.direction, bridgeData.targetLength + baseOffset, blockSize);
            } else {
                this.renderer.drawHorizontalBridge(pos.edgeRow - baseOffset, pos.baseCol, pos.direction, bridgeData.targetLength + baseOffset, blockSize);
            }
        }

        // Draw current bridge being animated (only if it hasn't been completed yet)
        if (this.currentBridge < this.bridgeSequence.length) {
            const pos = this.bridgePositions[this.currentBridge];

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
            this.islands.forEach(([row, col, width, height], islandNum) => {
                this.debug.drawIslandNumber(row, col, width, height, islandNum, blockSize);
            });
        }

        this.renderer.ctx.restore();
    }
}

// Start the game when page loads
window.addEventListener('load', () => {
    new Game();
});
