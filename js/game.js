// Main game loop and initialization

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');

        // Fixed canvas size
        this.canvasWidth = 800;
        this.canvasHeight = 600;

        // Viewport will be updated each frame based on car position
        this.viewport = null;
        this.renderer = null;
        this.debug = null;

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

        // Path segments - calculated from course
        this.pathSegments = this.course.getPathSegments(this.islands);
        this.currentSegmentIndex = 0;
        this.currentSegment = null;

        // Bridge data - calculated from level
        this.bridgeSequence = this.level.getBridgeAnimationData();
        this.bridgePositions = this.level.getBridgePositions();

        this.bridgeLength = 0;
        this.bridgeRotation = 0; // 0 = vertical, Math.PI/2 = horizontal

        // Game state machine
        // States: 'driving', 'turning', 'bridge_growing', 'bridge_slamming', 'done'
        this.gameState = 'driving';
        this.stateProgress = 0;
        this.lastTime = 0;

        this.init();
    }

    /**
     * Calculate course bounds from islands
     */
    calculateCourseBounds() {
        let minRow = Infinity, maxRow = -Infinity;
        let minCol = Infinity, maxCol = -Infinity;

        this.islands.forEach(island => {
            const [row, col, width, height] = island;
            minRow = Math.min(minRow, row);
            maxRow = Math.max(maxRow, row + height);
            minCol = Math.min(minCol, col);
            maxCol = Math.max(maxCol, col + width);
        });

        // Add 1 unit margin
        return {
            minRow: minRow - 1,
            maxRow: maxRow + 1,
            minCol: minCol - 1,
            maxCol: maxCol + 1
        };
    }

    /**
     * Create a viewport that follows the car vertically while staying within course bounds
     * Car is positioned halfway up the viewport
     * Horizontal view is centered on (0,0) and does not scroll
     */
    createViewportForCanvas(canvasWidth, canvasHeight) {
        const blockSize = GameConfig.grid.blockSize;

        // Calculate full course bounds
        const courseBounds = this.calculateCourseBounds();

        // Use course bounds for column range (no horizontal scrolling, show full width)
        const minCol = courseBounds.minCol;
        const maxCol = courseBounds.maxCol;

        // Calculate viewport height in grid units
        // We want to show roughly half the course height at a time for scrolling
        // In isometric: moving 1 row changes screenY by blockSize/2
        const viewportHeightInRows = 8; // Show ~8 rows at a time (roughly half of 16-row course)

        // Add some extra margin for smoother scrolling
        const scrollMargin = 1;

        // Position viewport to center car vertically
        const carCenterRow = this.carRow;
        const desiredMinRow = carCenterRow - viewportHeightInRows / 2 - scrollMargin;
        const desiredMaxRow = carCenterRow + viewportHeightInRows / 2 + scrollMargin;

        // Clamp to course bounds (don't scroll past top or bottom)
        let minRow = desiredMinRow;
        let maxRow = desiredMaxRow;

        if (minRow < courseBounds.minRow) {
            minRow = courseBounds.minRow;
            maxRow = minRow + viewportHeightInRows + scrollMargin * 2;
        }

        if (maxRow > courseBounds.maxRow) {
            maxRow = courseBounds.maxRow;
            minRow = maxRow - viewportHeightInRows - scrollMargin * 2;
        }

        // Ensure minRow doesn't go below bounds after clamping maxRow
        if (minRow < courseBounds.minRow) {
            minRow = courseBounds.minRow;
        }

        return new Viewport(minRow, maxRow, minCol, maxCol, blockSize, canvasWidth, canvasHeight, courseBounds);
    }

    init() {
        // Log course details for verification
        console.log('Course start:', this.course.startRow, this.course.startCol);
        console.log('Course end:', this.course.getEndLocation());
        console.log('Span details:', this.course.getSpanDetails());

        // Validate level configuration
        const validationResult = this.level.validate();
        CourseValidator.printResults(validationResult, 'Course Validation');

        // Initialize viewport and renderer
        this.updateViewport();

        // Log path segments for debugging
        console.log('Path segments:', this.pathSegments);

        // Start with first segment
        this.startNextSegment();

        // Start animation loop
        requestAnimationFrame((time) => this.animate(time));
    }

    /**
     * Update viewport based on current car position
     */
    updateViewport() {
        this.viewport = this.createViewportForCanvas(this.canvasWidth, this.canvasHeight);

        // Create or update renderer with new viewport
        if (this.renderer === null) {
            this.renderer = new Renderer(this.canvas, this.viewport);
            this.debug = new DebugRenderer(this.renderer);
        } else {
            // Update existing renderer's viewport
            this.renderer.viewport = this.viewport;
            this.canvas.width = this.viewport.canvasWidth;
            this.canvas.height = this.viewport.canvasHeight;
        }
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
                // Check if we're moving forward or backward
                if (this.targetPosition >= this.carCol) {
                    // Moving forward (positive direction)
                    this.carCol += this.carSpeed * deltaTime;
                    if (this.carCol >= this.targetPosition) {
                        this.carCol = this.targetPosition;
                        this.gameState = 'segment_done';
                    }
                } else {
                    // Moving backward (negative direction)
                    this.carCol -= this.carSpeed * deltaTime;
                    if (this.carCol <= this.targetPosition) {
                        this.carCol = this.targetPosition;
                        this.gameState = 'segment_done';
                    }
                }
            } else {
                // Check if we're moving forward or backward
                if (this.targetPosition >= this.carRow) {
                    // Moving forward (positive direction)
                    this.carRow += this.carSpeed * deltaTime;
                    if (this.carRow >= this.targetPosition) {
                        this.carRow = this.targetPosition;
                        this.gameState = 'segment_done';
                    }
                } else {
                    // Moving backward (negative direction)
                    this.carRow -= this.carSpeed * deltaTime;
                    if (this.carRow <= this.targetPosition) {
                        this.carRow = this.targetPosition;
                        this.gameState = 'segment_done';
                    }
                }
            }
        } else if (this.gameState === 'turning') {
            // Instant turn, advance to next segment
            this.startNextSegment();
        } else if (this.gameState === 'bridge_growing') {
            const bridgeData = this.bridgeSequence[this.currentSegment.bridgeIndex];
            this.bridgeLength += this.bridgeGrowthRate * deltaTime;

            if (this.bridgeLength >= bridgeData.targetLength) {
                this.bridgeLength = bridgeData.targetLength;
                this.gameState = 'bridge_slamming';
                this.stateProgress = 0;
            }
        } else if (this.gameState === 'bridge_slamming') {
            this.stateProgress += deltaTime;
            const pos = this.bridgePositions[this.currentSegment.bridgeIndex];

            if (this.stateProgress >= this.slamDuration) {
                // Final rotation depends on bridge direction
                this.bridgeRotation = pos.isPositive ? (Math.PI / 2) : (-Math.PI / 2);
                this.startNextSegment();
            } else {
                const t = this.stateProgress / this.slamDuration;
                // Rotate in opposite direction for negative bridges
                this.bridgeRotation = pos.isPositive ? (Math.PI / 2) * t : (-Math.PI / 2) * t;
            }
        } else if (this.gameState === 'segment_done') {
            // Start next segment
            this.startNextSegment();
        }

        // Continue animation
        this.render();
        requestAnimationFrame((time) => this.animate(time));
    }

    /**
     * Start the next path segment
     */
    startNextSegment() {
        // Check if we've completed all segments
        if (this.currentSegmentIndex >= this.pathSegments.length) {
            this.gameState = 'done';
            return;
        }

        // Get next segment
        this.currentSegment = this.pathSegments[this.currentSegmentIndex];
        this.currentSegmentIndex++;

        console.log('Starting segment', this.currentSegmentIndex - 1, ':', this.currentSegment);

        if (this.currentSegment.type === 'drive') {
            // Set direction and target position for driving
            this.carDirection = this.currentSegment.direction;

            if (this.currentSegment.direction === 'column') {
                this.targetPosition = this.currentSegment.endCol;
            } else {
                this.targetPosition = this.currentSegment.endRow;
            }
            this.gameState = 'driving';

        } else if (this.currentSegment.type === 'bridge') {
            // Start bridge animation
            this.bridgeLength = 0;
            this.bridgeRotation = 0;
            this.gameState = 'bridge_growing';

        } else if (this.currentSegment.type === 'turn') {
            // Change direction and continue to next segment
            this.carDirection = this.currentSegment.toDirection;
            this.gameState = 'turning';
        }
    }

    render() {
        // Update viewport to follow car
        this.updateViewport();

        this.renderer.clear();

        const blockSize = this.viewport.blockSize;

        // Apply viewport transform
        this.renderer.ctx.save();
        const offset = this.viewport.getOffset(this.carRow, this.carCol);
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

        // Sort islands by distance from camera (row + col, descending) for proper back-to-front rendering
        // Higher sum = farther from camera (rendered first)
        // Lower sum = closer to camera (rendered last, overlays others)
        const sortedIndices = this.islands
            .map((island, idx) => ({island, idx}))
            .sort((a, b) => (b.island[0] + b.island[1]) - (a.island[0] + a.island[1]))
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

        // Helper function to draw a bridge
        const drawBridge = (segment, idx) => {
            if (segment.type !== 'bridge') return false;

            const bridgeIndex = segment.bridgeIndex;
            const pos = this.bridgePositions[bridgeIndex];
            const bridgeData = this.bridgeSequence[bridgeIndex];
            const baseOffset = GameConfig.bridge.baseOffset;

            // Is this the current bridge being animated?
            const isCurrentBridge = (this.currentSegment === segment &&
                                     (this.gameState === 'bridge_growing' || this.gameState === 'bridge_slamming'));

            // Is this a completed bridge?
            const isCompleted = idx < this.currentSegmentIndex - 1 ||
                               (idx === this.currentSegmentIndex - 1 && this.gameState !== 'bridge_growing' && this.gameState !== 'bridge_slamming');

            if (isCurrentBridge) {
                // Draw current bridge being animated
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
            } else if (isCompleted) {
                // Draw completed bridge (horizontal)
                // Base offset and length direction depend on bridge direction
                if (pos.direction === 'column') {
                    const offsetCol = pos.isPositive ? (pos.edgeCol - baseOffset) : (pos.edgeCol + baseOffset);
                    const bridgeLength = pos.isPositive ? (bridgeData.targetLength + baseOffset) : -(bridgeData.targetLength + baseOffset);
                    this.renderer.drawHorizontalBridge(pos.baseRow, offsetCol, pos.direction, bridgeLength, blockSize);
                } else {
                    const offsetRow = pos.isPositive ? (pos.edgeRow - baseOffset) : (pos.edgeRow + baseOffset);
                    const bridgeLength = pos.isPositive ? (bridgeData.targetLength + baseOffset) : -(bridgeData.targetLength + baseOffset);
                    this.renderer.drawHorizontalBridge(offsetRow, pos.baseCol, pos.direction, bridgeLength, blockSize);
                }
            }
            return true;
        };

        // Draw all completed bridges (car drives over these)
        this.pathSegments.forEach((segment, idx) => {
            if (segment.type !== 'bridge') return;

            const bridgeIndex = segment.bridgeIndex;
            const isCurrentBridge = (this.currentSegment === segment &&
                                     (this.gameState === 'bridge_growing' || this.gameState === 'bridge_slamming'));

            // Draw if it's completed (not currently animating)
            if (!isCurrentBridge) {
                drawBridge(segment, idx);
            }
        });

        // Draw positive direction bridges being animated (behind car)
        this.pathSegments.forEach((segment, idx) => {
            if (segment.type !== 'bridge') return;

            const pos = this.bridgePositions[segment.bridgeIndex];
            const isCurrentBridge = (this.currentSegment === segment &&
                                     (this.gameState === 'bridge_growing' || this.gameState === 'bridge_slamming'));

            // Draw if it's currently animating and positive direction
            if (isCurrentBridge && pos.isPositive) {
                drawBridge(segment, idx);
            }
        });

        // Draw car at current position
        this.renderer.drawCar(this.carRow, this.carCol, this.carDirection, blockSize);

        // Draw negative direction bridges being animated (in front of car)
        this.pathSegments.forEach((segment, idx) => {
            if (segment.type !== 'bridge') return;

            const pos = this.bridgePositions[segment.bridgeIndex];
            const isCurrentBridge = (this.currentSegment === segment &&
                                     (this.gameState === 'bridge_growing' || this.gameState === 'bridge_slamming'));

            // Draw if it's currently animating and negative direction
            if (isCurrentBridge && !pos.isPositive) {
                drawBridge(segment, idx);
            }
        });

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
