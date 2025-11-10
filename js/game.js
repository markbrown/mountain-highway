// Main game loop and initialization

// Game state constants
const GameState = {
    DRIVING: 'driving',
    TURNING: 'turning',
    BRIDGE_GROWING: 'bridge_growing',
    BRIDGE_SLAMMING: 'bridge_slamming',
    SEGMENT_DONE: 'segment_done',
    DONE: 'done'
};

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');

        // Set canvas element dimensions from config
        this.canvas.width = GameConfig.canvas.width;
        this.canvas.height = GameConfig.canvas.height;

        // Viewport will be updated each frame based on car position
        this.viewport = null;
        this.renderer = null;
        this.debug = null;

        // Load the level (course + islands)
        this.level = createExampleLevel();
        this.course = this.level.course;
        this.islands = this.level.islands;

        // Car state
        this.carRow = 1;
        this.carCol = 1;
        this.carDirection = 'column'; // Direction car is facing

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
        this.gameState = GameState.DRIVING;
        this.stateProgress = 0;
        this.lastTime = 0;

        // Car sprites
        this.carSprites = {
            rowPositive: null,
            rowNegative: null,
            columnPositive: null,
            columnNegative: null
        };
        this.spritesLoaded = false;

        this.loadSprites();
    }

    /**
     * Load car sprite images
     */
    loadSprites() {
        const spritesToLoad = 2; // row and column sprites
        let loadedCount = 0;

        const onSpriteLoad = () => {
            loadedCount++;
            if (loadedCount === spritesToLoad) {
                this.spritesLoaded = true;
                this.init();
            }
        };

        // Load row direction sprite (same for positive/negative)
        this.carSprites.rowPositive = new Image();
        this.carSprites.rowPositive.onload = onSpriteLoad;
        this.carSprites.rowPositive.src = 'assets/car-row-positive.svg';
        // Rectangular prism looks the same from front/back
        this.carSprites.rowNegative = this.carSprites.rowPositive;

        // Load column direction sprite (same for positive/negative)
        this.carSprites.columnPositive = new Image();
        this.carSprites.columnPositive.onload = onSpriteLoad;
        this.carSprites.columnPositive.src = 'assets/car-column-positive.svg';
        // Rectangular prism looks the same from front/back
        this.carSprites.columnNegative = this.carSprites.columnPositive;
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
        const viewportHeightInRows = GameConfig.viewport.heightInRows;
        const scrollMargin = GameConfig.viewport.scrollMargin;

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
        this.viewport = this.createViewportForCanvas(GameConfig.canvas.width, GameConfig.canvas.height);

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

        if (this.gameState === GameState.DONE) {
            this.render();
            return;
        }

        // State machine for coordinating car movement and bridge animations
        if (this.gameState === GameState.DRIVING) {
            // Move car toward target position
            if (this.carDirection === 'column') {
                // Check if we're moving forward or backward
                if (this.targetPosition >= this.carCol) {
                    // Moving forward (positive direction)
                    this.carCol += GameConfig.car.speed * deltaTime;
                    if (this.carCol >= this.targetPosition) {
                        this.carCol = this.targetPosition;
                        this.gameState = GameState.SEGMENT_DONE;
                    }
                } else {
                    // Moving backward (negative direction)
                    this.carCol -= GameConfig.car.speed * deltaTime;
                    if (this.carCol <= this.targetPosition) {
                        this.carCol = this.targetPosition;
                        this.gameState = GameState.SEGMENT_DONE;
                    }
                }
            } else {
                // Check if we're moving forward or backward
                if (this.targetPosition >= this.carRow) {
                    // Moving forward (positive direction)
                    this.carRow += GameConfig.car.speed * deltaTime;
                    if (this.carRow >= this.targetPosition) {
                        this.carRow = this.targetPosition;
                        this.gameState = GameState.SEGMENT_DONE;
                    }
                } else {
                    // Moving backward (negative direction)
                    this.carRow -= GameConfig.car.speed * deltaTime;
                    if (this.carRow <= this.targetPosition) {
                        this.carRow = this.targetPosition;
                        this.gameState = GameState.SEGMENT_DONE;
                    }
                }
            }
        } else if (this.gameState === GameState.TURNING) {
            // Instant turn, advance to next segment
            this.startNextSegment();
        } else if (this.gameState === GameState.BRIDGE_GROWING) {
            const bridgeData = this.bridgeSequence[this.currentSegment.bridgeIndex];
            this.bridgeLength += GameConfig.bridge.growthRate * deltaTime;

            if (this.bridgeLength >= bridgeData.targetLength) {
                this.bridgeLength = bridgeData.targetLength;
                this.gameState = GameState.BRIDGE_SLAMMING;
                this.stateProgress = 0;
            }
        } else if (this.gameState === GameState.BRIDGE_SLAMMING) {
            this.stateProgress += deltaTime;
            const pos = this.bridgePositions[this.currentSegment.bridgeIndex];

            if (this.stateProgress >= GameConfig.bridge.slamDuration) {
                // Final rotation depends on bridge direction
                this.bridgeRotation = pos.isPositive ? (Math.PI / 2) : (-Math.PI / 2);
                this.startNextSegment();
            } else {
                const t = this.stateProgress / GameConfig.bridge.slamDuration;
                // Rotate in opposite direction for negative bridges
                this.bridgeRotation = pos.isPositive ? (Math.PI / 2) * t : (-Math.PI / 2) * t;
            }
        } else if (this.gameState === GameState.SEGMENT_DONE) {
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
            this.gameState = GameState.DONE;
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
            this.gameState = GameState.DRIVING;

        } else if (this.currentSegment.type === 'bridge') {
            // Start bridge animation
            this.bridgeLength = 0;
            this.bridgeRotation = 0;
            this.gameState = GameState.BRIDGE_GROWING;

        } else if (this.currentSegment.type === 'turn') {
            // Change direction and continue to next segment
            this.carDirection = this.currentSegment.toDirection;
            this.gameState = GameState.TURNING;
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
        if (GameConfig.debug.showGrid) {
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
                                     (this.gameState === GameState.BRIDGE_GROWING || this.gameState === GameState.BRIDGE_SLAMMING));

            // Is this a completed bridge?
            const isCompleted = idx < this.currentSegmentIndex - 1 ||
                               (idx === this.currentSegmentIndex - 1 && this.gameState !== GameState.BRIDGE_GROWING && this.gameState !== GameState.BRIDGE_SLAMMING);

            if (isCurrentBridge) {
                // Draw current bridge being animated
                if (this.gameState === GameState.BRIDGE_GROWING) {
                    // Draw vertical bridge
                    if (pos.direction === 'column') {
                        this.renderer.drawVerticalBridge(pos.baseRow, pos.edgeCol, pos.direction, this.bridgeLength, blockSize);
                        this.renderer.drawBridgeEdgeLine(pos.baseRow, pos.edgeCol, pos.direction, blockSize);
                    } else {
                        this.renderer.drawVerticalBridge(pos.edgeRow, pos.baseCol, pos.direction, this.bridgeLength, blockSize);
                        this.renderer.drawBridgeEdgeLine(pos.edgeRow, pos.baseCol, pos.direction, blockSize);
                    }
                } else if (this.gameState === GameState.BRIDGE_SLAMMING) {
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
                                     (this.gameState === GameState.BRIDGE_GROWING || this.gameState === GameState.BRIDGE_SLAMMING));

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
                                     (this.gameState === GameState.BRIDGE_GROWING || this.gameState === GameState.BRIDGE_SLAMMING));

            // Draw if it's currently animating and positive direction
            if (isCurrentBridge && pos.isPositive) {
                drawBridge(segment, idx);
            }
        });

        // Draw car at current position
        this.renderer.drawCar(this.carRow, this.carCol, this.carDirection, blockSize, this.carSprites, this.spritesLoaded);

        // Draw negative direction bridges being animated (in front of car)
        this.pathSegments.forEach((segment, idx) => {
            if (segment.type !== 'bridge') return;

            const pos = this.bridgePositions[segment.bridgeIndex];
            const isCurrentBridge = (this.currentSegment === segment &&
                                     (this.gameState === GameState.BRIDGE_GROWING || this.gameState === GameState.BRIDGE_SLAMMING));

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
