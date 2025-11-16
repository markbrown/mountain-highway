// Main game loop and initialization

// Game state constants
const GameState = {
    START_SCREEN: 'start_screen',
    COUNTDOWN: 'countdown',
    DRIVING: 'driving',
    TURNING: 'turning',
    BRIDGE_GROWING: 'bridge_growing',
    BRIDGE_SLAMMING: 'bridge_slamming',
    DOOMED: 'doomed',
    FALLING: 'falling',
    SEGMENT_DONE: 'segment_done',
    DONE: 'done',
    FINISH: 'finish',
    GAME_OVER: 'game_over'
};

/**
 * RenderContext bundles all game state needed for rendering
 * This keeps the Game/Renderer boundary clean
 */
class RenderContext {
    constructor(options) {
        // Game state
        this.gameState = options.gameState;

        // Car state
        this.car = {
            row: options.carRow,
            col: options.carCol,
            direction: options.carDirection,
            sign: options.carSign || 1,
            shouldRender: options.shouldRenderCar,
            isFalling: options.isFalling,
            zOffset: options.carZOffset || 0,
            tumbleRotation: options.carTumbleRotation || 0
        };

        // Bridge state
        this.bridge = {
            length: options.bridgeLength,
            rotation: options.bridgeRotation,
            currentSegment: options.currentSegment,
            currentSegmentIndex: options.currentSegmentIndex
        };

        // Course and level data
        this.course = options.course;
        this.islands = options.islands;
        this.pathSegments = options.pathSegments;
        this.bridgePositions = options.bridgePositions;
        this.bridgeSequence = options.bridgeSequence;

        // Falling car rendering (when car has fallen off)
        this.fallingCarRender = {
            targetIslandIndex: options.targetIslandIndex,
            bridgeIsPositive: options.bridgeIsPositive
        };
    }
}

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

        // Player input state
        this.mousePressed = false;

        this.bridgeLength = 0;
        this.bridgeRotation = 0; // 0 = vertical, Math.PI/2 = horizontal

        // Game state machine
        this.gameState = GameState.START_SCREEN;
        this.stateProgress = 0;
        this.lastTime = 0;

        // Countdown state
        this.countdownValue = 3;      // Current countdown number (3, 2, 1)
        this.countdownTimer = 0;      // Time elapsed in current countdown number

        // Falling state
        this.fallPoint = null;        // Position where car runs out of bridge
        this.carZOffset = 0;          // Vertical offset when falling (negative = down)
        this.carFallVelocity = 0;     // Current falling velocity
        this.carTumbleRotation = 0;   // Rotation angle while tumbling
        this.targetIslandIndex = -1;  // Island index for rendering order
        this.bridgeIsPositive = true; // Direction sign of bridge when falling
        this.fallTimer = 0;           // Time elapsed since car started falling

        // Timer state
        this.gameTimer = 0;           // Total time elapsed during gameplay (seconds)
        this.finishTime = 0;          // Time when player finished (for display)

        // Wait for renderer to load sprites, then initialize
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

        // Set up input handlers
        this.setupInputHandlers();
        this.setupStartScreen();

        // Render the start screen (but don't start animation loop yet)
        this.render();
    }

    /**
     * Start the game (called when player clicks Start button)
     */
    startGame() {
        // Transition to countdown state
        this.gameState = GameState.COUNTDOWN;
        this.countdownValue = 3;
        this.countdownTimer = 0;

        // Update overlay to show countdown
        this.updateCountdownDisplay();

        // Start animation loop
        requestAnimationFrame((time) => this.animate(time));
    }

    /**
     * Update the overlay to show countdown number
     */
    updateCountdownDisplay() {
        const startScreen = document.getElementById('startScreen');
        if (!startScreen) return;

        const title = startScreen.querySelector('.game-title');
        const instructions = startScreen.querySelector('.instructions');
        const prompt = startScreen.querySelector('.start-prompt');

        if (this.gameState === GameState.COUNTDOWN) {
            // Show countdown number
            title.textContent = this.countdownValue.toString();
            title.classList.add('countdown');
            instructions.style.display = 'none';
            prompt.style.display = 'none';
        }
    }

    /**
     * Hide the start screen overlay
     */
    hideStartScreen() {
        const startScreen = document.getElementById('startScreen');
        if (startScreen) {
            startScreen.style.display = 'none';
        }
    }

    /**
     * Show the finish screen when player completes the course
     */
    showFinishScreen() {
        const startScreen = document.getElementById('startScreen');
        if (!startScreen) return;

        const title = startScreen.querySelector('.game-title');
        const instructions = startScreen.querySelector('.instructions');
        const prompt = startScreen.querySelector('.start-prompt');

        // Show finish screen overlay
        startScreen.style.display = 'flex';

        // Update text for finish screen
        title.textContent = 'YOU MADE IT!';
        title.classList.remove('countdown');

        // Show finish time with one decimal place
        instructions.innerHTML = `<p class="finish-time">Time: ${this.finishTime.toFixed(1)}s</p>`;
        instructions.style.display = 'block';

        prompt.textContent = 'Press the mouse button to play again';
        prompt.style.display = 'block';
    }

    /**
     * Show the game over screen when player crashes
     */
    showGameOverScreen() {
        const startScreen = document.getElementById('startScreen');
        if (!startScreen) return;

        const title = startScreen.querySelector('.game-title');
        const instructions = startScreen.querySelector('.instructions');
        const prompt = startScreen.querySelector('.start-prompt');

        // Show game over screen overlay
        startScreen.style.display = 'flex';

        // Update text for game over screen
        title.textContent = 'YOU CRASHED!';
        title.classList.remove('countdown');
        instructions.style.display = 'none';
        prompt.textContent = 'Press the mouse button to play again';
        prompt.style.display = 'block';
    }

    /**
     * Restart the game
     */
    restartGame() {
        // Reset game state
        this.gameState = GameState.COUNTDOWN;
        this.countdownValue = 3;
        this.countdownTimer = 0;

        // Reset car position
        this.carRow = this.course.startRow;
        this.carCol = this.course.startCol;
        this.carDirection = this.pathSegments[0].direction;

        // Reset segment tracking
        this.currentSegmentIndex = 0;
        this.currentSegment = null;

        // Reset bridge state
        this.bridgeLength = 0;
        this.bridgeRotation = 0;

        // Reset falling state
        this.carZOffset = 0;
        this.carFallVelocity = 0;
        this.carTumbleRotation = 0;
        this.fallPoint = null;
        this.fallTimer = 0;

        // Reset timer state
        this.gameTimer = 0;
        this.finishTime = 0;

        // Update overlay to show countdown
        this.updateCountdownDisplay();
    }

    /**
     * Set up start screen - click anywhere to start or restart
     */
    setupStartScreen() {
        const startHandler = (e) => {
            if (this.gameState === GameState.START_SCREEN) {
                this.startGame();
            } else if (this.gameState === GameState.FINISH || this.gameState === GameState.GAME_OVER) {
                this.restartGame();
            }
        };

        // Mouse click to start/restart
        this.canvas.addEventListener('mousedown', startHandler);

        // Touch to start/restart
        this.canvas.addEventListener('touchstart', startHandler);
    }

    /**
     * Set up mouse/touch input handlers for bridge building
     */
    setupInputHandlers() {
        // Mouse down - start growing bridge
        this.canvas.addEventListener('mousedown', (e) => {
            if (this.gameState === GameState.BRIDGE_GROWING) {
                this.mousePressed = true;
                console.log('Mouse pressed - bridge growing');
            }
        });

        // Mouse up - stop growing and slam bridge
        this.canvas.addEventListener('mouseup', (e) => {
            if (this.gameState === GameState.BRIDGE_GROWING && this.mousePressed) {
                this.mousePressed = false;
                this.slamBridge();
                console.log('Mouse released - bridge slamming at length:', this.bridgeLength);
            }
        });

        // Touch support
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (this.gameState === GameState.BRIDGE_GROWING) {
                this.mousePressed = true;
                console.log('Touch start - bridge growing');
            }
        });

        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            if (this.gameState === GameState.BRIDGE_GROWING && this.mousePressed) {
                this.mousePressed = false;
                this.slamBridge();
                console.log('Touch end - bridge slamming at length:', this.bridgeLength);
            }
        });
    }

    /**
     * Update viewport based on current car position
     */
    updateViewport() {
        this.viewport = this.createViewportForCanvas(GameConfig.canvas.width, GameConfig.canvas.height);

        // Create or update renderer with new viewport
        if (this.renderer === null) {
            this.renderer = new Renderer(this.canvas, this.viewport, () => {
                // Re-render once sprites are loaded
                if (this.gameState === GameState.START_SCREEN) {
                    this.render();
                }
            });
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

        if (this.gameState === GameState.GAME_OVER) {
            // Game over (crashed) - keep rendering and continue falling animation
            // Continue falling physics so car disappears off screen
            this.carFallVelocity += GameConfig.physics.gravity * deltaTime;
            this.carZOffset += this.carFallVelocity * deltaTime;
            this.carTumbleRotation += GameConfig.physics.tumbleRate * deltaTime;

            this.updateViewport();
            this.render();
            requestAnimationFrame((time) => this.animate(time));
            return;
        }

        if (this.gameState === GameState.FINISH) {
            // Player finished successfully - keep rendering but don't update
            this.updateViewport();
            this.render();
            requestAnimationFrame((time) => this.animate(time));
            return;
        }

        // Handle countdown state
        if (this.gameState === GameState.COUNTDOWN) {
            this.countdownTimer += deltaTime;

            // Each number shows for 1 second
            if (this.countdownTimer >= 1.0) {
                this.countdownValue--;
                this.countdownTimer = 0;

                if (this.countdownValue <= 0) {
                    // Countdown finished - start the game!
                    this.hideStartScreen();
                    this.gameTimer = 0;  // Reset timer when gameplay starts
                    this.gameState = GameState.DRIVING;
                    this.startNextSegment();
                } else {
                    // Update display to show next number
                    this.updateCountdownDisplay();
                }
            }

            // Continue rendering during countdown
            this.render();
            requestAnimationFrame((time) => this.animate(time));
            return;
        }

        // Update game timer during active gameplay
        if (this.gameState !== GameState.FINISH &&
            this.gameState !== GameState.GAME_OVER &&
            this.gameState !== GameState.FALLING) {
            this.gameTimer += deltaTime;
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
        } else if (this.gameState === GameState.DOOMED) {
            // Car drives to fall point (same logic as DRIVING but transitions to FALLING)
            if (this.carDirection === 'column') {
                // Check if we're moving forward or backward
                if (this.targetPosition >= this.carCol) {
                    // Moving forward (positive direction)
                    this.carCol += GameConfig.car.speed * deltaTime;
                    if (this.carCol >= this.targetPosition) {
                        this.carRow = this.fallPoint.row;
                        this.carCol = this.fallPoint.col;
                        this.gameState = GameState.FALLING;
                        this.carFallVelocity = 0;
                        this.fallTimer = 0;
                    }
                } else {
                    // Moving backward (negative direction)
                    this.carCol -= GameConfig.car.speed * deltaTime;
                    if (this.carCol <= this.targetPosition) {
                        this.carRow = this.fallPoint.row;
                        this.carCol = this.fallPoint.col;
                        this.gameState = GameState.FALLING;
                        this.carFallVelocity = 0;
                        this.fallTimer = 0;
                    }
                }
            } else {
                // Check if we're moving forward or backward
                if (this.targetPosition >= this.carRow) {
                    // Moving forward (positive direction)
                    this.carRow += GameConfig.car.speed * deltaTime;
                    if (this.carRow >= this.targetPosition) {
                        this.carRow = this.fallPoint.row;
                        this.carCol = this.fallPoint.col;
                        this.gameState = GameState.FALLING;
                        this.carFallVelocity = 0;
                        this.fallTimer = 0;
                    }
                } else {
                    // Moving backward (negative direction)
                    this.carRow -= GameConfig.car.speed * deltaTime;
                    if (this.carRow <= this.targetPosition) {
                        this.carRow = this.fallPoint.row;
                        this.carCol = this.fallPoint.col;
                        this.gameState = GameState.FALLING;
                        this.carFallVelocity = 0;
                        this.fallTimer = 0;
                    }
                }
            }
        } else if (this.gameState === GameState.TURNING) {
            // Instant turn, advance to next segment
            this.startNextSegment();
        } else if (this.gameState === GameState.BRIDGE_GROWING) {
            // Only grow bridge while mouse is pressed
            if (this.mousePressed) {
                const bridgeIndex = this.currentSegment.bridgeIndex;
                const bridges = this.level.getBridges();
                const currentBridge = bridges[bridgeIndex];
                const safeRange = currentBridge.calculateRange(this.islands);

                // Calculate maximum bridge length: minSafe + 2.0 units
                const maxBridgeLength = safeRange.minSafe + 2.0;

                this.bridgeLength += GameConfig.bridge.growthRate * deltaTime;

                // Cap bridge length at maximum (but don't slam until released)
                if (this.bridgeLength > maxBridgeLength) {
                    this.bridgeLength = maxBridgeLength;
                }
            }
            // Bridge stays at current length while waiting for player input
        } else if (this.gameState === GameState.BRIDGE_SLAMMING) {
            this.stateProgress += deltaTime;
            const pos = this.bridgePositions[this.currentSegment.bridgeIndex];

            if (this.stateProgress >= GameConfig.bridge.slamDuration) {
                // Final rotation depends on bridge direction
                this.bridgeRotation = pos.isPositive ? (Math.PI / 2) : (-Math.PI / 2);

                // Evaluate bridge outcome
                this.evaluateBridgeOutcome();
            } else {
                const t = this.stateProgress / GameConfig.bridge.slamDuration;
                // Rotate in opposite direction for negative bridges
                this.bridgeRotation = pos.isPositive ? (Math.PI / 2) * t : (-Math.PI / 2) * t;
            }
        } else if (this.gameState === GameState.FALLING) {
            // Apply gravity and tumble rotation
            this.carFallVelocity += GameConfig.physics.gravity * deltaTime;
            this.carZOffset += this.carFallVelocity * deltaTime;
            this.carTumbleRotation += GameConfig.physics.tumbleRate * deltaTime;

            // Track how long car has been falling
            this.fallTimer += deltaTime;

            // Show game over screen after 1 second of falling
            if (this.fallTimer >= 1.0) {
                console.log('Game Over - Car crashed');
                this.gameState = GameState.GAME_OVER;
                this.showGameOverScreen();
            }
        } else if (this.gameState === GameState.SEGMENT_DONE) {
            // Start next segment
            this.startNextSegment();
        }

        // Update viewport based on new car position (after all state updates)
        this.updateViewport();

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
            this.finishTime = this.gameTimer;  // Capture final time
            this.gameState = GameState.FINISH;
            this.showFinishScreen();
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

    /**
     * Called when player releases mouse - slam bridge and apply forgiveness if needed
     */
    slamBridge() {
        const bridgeIndex = this.currentSegment.bridgeIndex;
        const bridges = this.level.getBridges();
        const currentBridge = bridges[bridgeIndex];
        const safeRange = currentBridge.calculateRange(this.islands);

        // Apply forgiveness for slightly short bridges BEFORE slam animation
        const leeway = GameConfig.bridge.leeway;

        if (this.bridgeLength >= safeRange.minSafe - leeway && this.bridgeLength < safeRange.minSafe) {
            console.log('Bridge slightly short - applying forgiveness (extending to minimum)');
            this.bridgeLength = safeRange.minSafe;
            // Update bridge data so rendering uses the extended length
            this.bridgeSequence[bridgeIndex].targetLength = safeRange.minSafe;
        }

        // Update bridge data with final length
        this.bridgeSequence[bridgeIndex].targetLength = this.bridgeLength;

        // Start slam animation
        this.gameState = GameState.BRIDGE_SLAMMING;
        this.stateProgress = 0;
    }

    /**
     * Evaluate bridge outcome after slam completes
     * Determines if bridge is safe, too short (with/without leeway), or too long
     */
    evaluateBridgeOutcome() {
        const bridgeIndex = this.currentSegment.bridgeIndex;
        const bridges = this.level.getBridges();
        const currentBridge = bridges[bridgeIndex];
        const safeRange = currentBridge.calculateRange(this.islands);

        // Note: Forgiveness is already applied during BRIDGE_GROWING state
        // Check if bridge is too short
        if (this.bridgeLength < safeRange.minSafe) {
            // Bridge is too short - car is doomed
            console.log('Bridge too short! Length:', this.bridgeLength, 'Min:', safeRange.minSafe);

            // Calculate fall point: bridge start + bridge length + leeway
            const pos = this.bridgePositions[bridgeIndex];
            const sign = pos.isPositive ? 1 : -1;
            const fallDistance = this.bridgeLength + GameConfig.bridge.leeway;

            if (pos.direction === 'column') {
                const bridgeStart = pos.edgeCol;
                this.fallPoint = { row: pos.baseRow, col: bridgeStart + (sign * fallDistance) };
                this.targetPosition = this.fallPoint.col;
            } else {
                const bridgeStart = pos.edgeRow;
                this.fallPoint = { row: bridgeStart + (sign * fallDistance), col: pos.baseCol };
                this.targetPosition = this.fallPoint.row;
            }

            this.targetIslandIndex = currentBridge.endIsland;
            this.bridgeIsPositive = pos.isPositive;
            this.gameState = GameState.DOOMED;

        } else if (this.bridgeLength <= safeRange.maxSafe) {
            // Bridge is safe - continue normal gameplay
            console.log('Bridge safe! Length:', this.bridgeLength, 'Range:', safeRange.minSafe, '-', safeRange.maxSafe);
            this.startNextSegment();

        } else {
            // Bridge is too long
            console.log('Bridge too long. Junction type:', currentBridge.junctionType);
            // Check if this causes the car to miss a turn
            if (currentBridge.junctionType === null || currentBridge.junctionType !== 'turn') {
                // No turn to miss - car continues safely (just costs time)
                console.log('Bridge too long but no turn to miss - safe');
                this.startNextSegment();
            } else {
                // Turn junction - check if car misses the turn
                // Note: maxSafe already includes 0.5 extension past junction for turns
                const overshoot = this.bridgeLength - safeRange.maxSafe;
                console.log('Turn junction: bridgeLength =', this.bridgeLength, 'maxSafe =', safeRange.maxSafe, 'overshoot =', overshoot);

                if (overshoot > 0) {
                    // Car misses the turn, drives off opposite edge
                    console.log('Bridge too long! Car misses turn. Length:', this.bridgeLength, 'Max safe:', safeRange.maxSafe);

                    const pos = this.bridgePositions[bridgeIndex];
                    const sign = pos.isPositive ? 1 : -1;
                    const targetIsland = this.islands[currentBridge.endIsland];
                    const [islandRow, islandCol, islandWidth, islandHeight] = targetIsland;

                    // Calculate opposite edge and fall point
                    // Entry edge is where minSafe reaches (edge of island)
                    // Opposite edge is entry edge + island dimension in travel direction
                    if (pos.direction === 'column') {
                        // Entry edge is where the bridge reaches
                        const entryEdge = sign > 0 ? islandCol : (islandCol + islandWidth);
                        const oppositeEdge = sign > 0 ? (islandCol + islandWidth) : islandCol;
                        const fallCol = oppositeEdge + (sign * GameConfig.bridge.leeway);
                        this.fallPoint = { row: pos.baseRow, col: fallCol };
                        this.targetPosition = this.fallPoint.col;
                    } else {
                        const entryEdge = sign > 0 ? islandRow : (islandRow + islandHeight);
                        const oppositeEdge = sign > 0 ? (islandRow + islandHeight) : islandRow;
                        const fallRow = oppositeEdge + (sign * GameConfig.bridge.leeway);
                        this.fallPoint = { row: fallRow, col: pos.baseCol };
                        this.targetPosition = this.fallPoint.row;
                    }

                    this.targetIslandIndex = currentBridge.endIsland;
                    // IMPORTANT: Rendering reversal for too-long falls
                    // Car falls off far side, so reverse the rendering order
                    this.bridgeIsPositive = !pos.isPositive;
                    this.gameState = GameState.DOOMED;
                } else {
                    // Bridge extends past junction but not enough to miss turn
                    console.log('Bridge slightly too long but car makes the turn');
                    this.startNextSegment();
                }
            }
        }
    }

    /**
     * Render the game scene
     */
    render() {
        // Determine car rendering state
        // Car is falling if in FALLING or GAME_OVER state (game over continues falling animation)
        const isFalling = (this.gameState === GameState.FALLING || this.gameState === GameState.GAME_OVER);
        // Don't render car if it has fallen too far off screen
        const shouldRenderCar = !(isFalling && this.carZOffset > 100);

        // Determine car travel direction sign (positive or negative)
        // Use the sign stored in the current segment (reliable and works even when car is stopped)
        let carSign = (this.currentSegment && this.currentSegment.sign) ? this.currentSegment.sign : 1;

        // Create rendering context with all game state
        const context = new RenderContext({
            gameState: this.gameState,
            carRow: this.carRow,
            carCol: this.carCol,
            carDirection: this.carDirection,
            carSign: carSign,
            isFalling: isFalling,
            shouldRenderCar: shouldRenderCar,
            carZOffset: this.carZOffset,
            carTumbleRotation: this.carTumbleRotation,
            bridgeLength: this.bridgeLength,
            bridgeRotation: this.bridgeRotation,
            currentSegment: this.currentSegment,
            currentSegmentIndex: this.currentSegmentIndex,
            course: this.course,
            islands: this.islands,
            pathSegments: this.pathSegments,
            bridgePositions: this.bridgePositions,
            bridgeSequence: this.bridgeSequence,
            targetIslandIndex: this.targetIslandIndex,
            bridgeIsPositive: this.bridgeIsPositive
        });

        // Delegate all rendering to the renderer
        this.renderer.renderScene(context, this.viewport, this.debug);

        // Update timer display
        this.updateTimerDisplay();
    }

    /**
     * Update the timer display element
     */
    updateTimerDisplay() {
        const timerDisplay = document.getElementById('timerDisplay');
        if (!timerDisplay) return;

        // Show timer only during active gameplay
        if (this.gameState === GameState.DRIVING ||
            this.gameState === GameState.TURNING ||
            this.gameState === GameState.BRIDGE_GROWING ||
            this.gameState === GameState.BRIDGE_SLAMMING ||
            this.gameState === GameState.DOOMED ||
            this.gameState === GameState.SEGMENT_DONE) {
            timerDisplay.style.display = 'block';
            // Display without decimal places during gameplay
            timerDisplay.textContent = Math.floor(this.gameTimer) + 's';
        } else {
            timerDisplay.style.display = 'none';
        }
    }
}

// Start the game when page loads
window.addEventListener('load', () => {
    new Game();
});
