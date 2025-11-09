// Course definition and management

// Direction constants
const Direction = {
    COLUMN: 'column',  // Positive column direction (rightward on screen)
    ROW: 'row'         // Positive row direction (upward on screen)
};

// Junction types
const JunctionType = {
    TURN: 'turn',        // Direction changes at junction
    STRAIGHT: 'straight' // Direction continues unchanged
};

/**
 * A span represents one segment of the course
 */
class Span {
    constructor(length, direction) {
        this.length = Math.abs(length);      // Number of grid squares (always positive)
        this.direction = direction;          // Direction.COLUMN or Direction.ROW
        this.sign = Math.sign(length) || 1;  // Direction of travel: 1 (positive) or -1 (negative)
    }

    /**
     * Check if this span travels in positive direction
     */
    get isPositive() {
        return this.sign > 0;
    }

    /**
     * Get the signed length (positive or negative)
     */
    get signedLength() {
        return this.length * this.sign;
    }
}

/**
 * A bridge represents a gap between two islands that must be crossed
 */
class Bridge {
    constructor(spanIndex, startIsland, endIsland, startPos, endPos, direction, junctionType) {
        this.spanIndex = spanIndex;      // Index of the span that crosses this bridge
        this.startIsland = startIsland;  // Island index where bridge starts
        this.endIsland = endIsland;      // Island index where bridge ends
        this.startPos = startPos;        // {row, col} start position
        this.endPos = endPos;            // {row, col} end position (junction)
        this.direction = direction;      // Direction.COLUMN or Direction.ROW
        this.junctionType = junctionType; // JunctionType at end of bridge (or null for course end)
    }

    /**
     * Calculate the safe bridge length range for this bridge
     * @param {Array} islands - Array of island data [row, col, width, height]
     * @returns {Object} {minSafe, maxSafe, needsBridge}
     */
    calculateRange(islands) {
        return CourseValidator.calculateBridgeRange(
            this.startPos,
            this.endPos,
            this.direction,
            islands[this.startIsland],
            islands[this.endIsland],
            this.junctionType
        );
    }
}

/**
 * A course defines the path the car will travel
 */
class Course {
    constructor() {
        this.startRow = 1;
        this.startCol = 1;
        this.spans = [];
    }

    /**
     * Add a span to the course
     * @param {number} length - Length in grid squares
     * @param {string} direction - Direction.COLUMN or Direction.ROW
     */
    addSpan(length, direction) {
        this.spans.push(new Span(length, direction));
    }

    /**
     * Calculate the end position of a span given its start position
     * @param {number} startRow - Starting row
     * @param {number} startCol - Starting column
     * @param {Span} span - The span
     * @returns {object} Object with row and col properties
     */
    calculateSpanEnd(startRow, startCol, span) {
        if (span.direction === Direction.COLUMN) {
            return { row: startRow, col: startCol + span.signedLength };
        } else { // Direction.ROW
            return { row: startRow + span.signedLength, col: startCol };
        }
    }

    /**
     * Get the junction type between two consecutive spans
     * @param {Span} currentSpan - The current span
     * @param {Span} nextSpan - The next span
     * @returns {string} JunctionType
     */
    getJunctionType(currentSpan, nextSpan) {
        if (currentSpan.direction === nextSpan.direction) {
            return JunctionType.STRAIGHT;
        } else {
            return JunctionType.TURN;
        }
    }

    /**
     * Get the end location of the entire course
     * @returns {object} Object with row and col properties
     */
    getEndLocation() {
        let row = this.startRow;
        let col = this.startCol;

        for (const span of this.spans) {
            const end = this.calculateSpanEnd(row, col, span);
            row = end.row;
            col = end.col;
        }

        return { row, col };
    }

    /**
     * Get detailed information about each span including end positions and junctions
     * @returns {Array} Array of objects with span details
     */
    getSpanDetails() {
        let row = this.startRow;
        let col = this.startCol;
        const details = [];

        for (let i = 0; i < this.spans.length; i++) {
            const span = this.spans[i];
            const end = this.calculateSpanEnd(row, col, span);

            let junction = null;
            if (i < this.spans.length - 1) {
                junction = this.getJunctionType(span, this.spans[i + 1]);
            }

            details.push({
                spanIndex: i,
                startRow: row,
                startCol: col,
                endRow: end.row,
                endCol: end.col,
                length: span.length,
                direction: span.direction,
                sign: span.sign,
                junction: junction
            });

            row = end.row;
            col = end.col;
        }

        return details;
    }

    /**
     * Get road segments for a specific island
     * Each island may have one or more span segments that need to be rendered
     * Segments are clipped to the portion that's actually on the island
     *
     * Special cases:
     * - Island 0 (start): Road extends from near edge to first junction
     * - Last island: Road extends from last junction to far edge
     *
     * @param {number} islandIndex - Island index (0-based, course-order)
     * @param {Array} islands - Array of island data [row, col, width, height]
     * @returns {Array} Array of road segments: {startRow, startCol, endRow, endCol, direction}
     */
    getRoadSegmentsForIsland(islandIndex, islands) {
        const spanDetails = this.getSpanDetails();
        const segments = [];

        const [islandRow, islandCol, islandWidth, islandHeight] = islands[islandIndex];
        const islandMaxRow = islandRow + islandHeight;
        const islandMaxCol = islandCol + islandWidth;

        const isStartIsland = (islandIndex === 0);
        const isEndIsland = (islandIndex === islands.length - 1);

        // Find all spans that pass through this island
        spanDetails.forEach((span, idx) => {
            // For intersection check, we need min/max regardless of direction
            const spanMinRow = Math.min(span.startRow, span.endRow);
            const spanMaxRow = Math.max(span.startRow, span.endRow);
            const spanMinCol = Math.min(span.startCol, span.endCol);
            const spanMaxCol = Math.max(span.startCol, span.endCol);

            // Check if this span intersects with the island
            const spanIntersects =
                (spanMinRow <= islandMaxRow && spanMaxRow >= islandRow &&
                 spanMinCol <= islandMaxCol && spanMaxCol >= islandCol);

            if (!spanIntersects) return;

            // Clip the span to the island boundaries
            let segmentStart, segmentEnd;

            if (span.direction === Direction.COLUMN) {
                // Span travels in column direction (row stays constant)
                // Clip to island column boundaries
                const isPositive = span.sign > 0;

                segmentStart = {
                    row: span.startRow,
                    col: isPositive ? Math.max(span.startCol, islandCol) : Math.min(span.startCol, islandMaxCol)
                };
                segmentEnd = {
                    row: span.endRow,
                    col: isPositive ? Math.min(span.endCol, islandMaxCol) : Math.max(span.endCol, islandCol)
                };

                // Special case: extend to edges for start/end islands
                if (isStartIsland && span.startCol === this.startCol) {
                    // First span on start island: extend to near edge
                    segmentStart.col = isPositive ? islandCol : islandMaxCol;
                }
                if (isEndIsland && idx === spanDetails.length - 1) {
                    // Last span on end island: extend to far edge
                    segmentEnd.col = isPositive ? islandMaxCol : islandCol;
                }
            } else {
                // Span travels in row direction (column stays constant)
                // Clip to island row boundaries
                const isPositive = span.sign > 0;

                segmentStart = {
                    row: isPositive ? Math.max(span.startRow, islandRow) : Math.min(span.startRow, islandMaxRow),
                    col: span.startCol
                };
                segmentEnd = {
                    row: isPositive ? Math.min(span.endRow, islandMaxRow) : Math.max(span.endRow, islandRow),
                    col: span.endCol
                };

                // Special case: extend to edges for start/end islands
                if (isStartIsland && span.startRow === this.startRow) {
                    // First span on start island: extend to near edge
                    segmentStart.row = isPositive ? islandRow : islandMaxRow;
                }
                if (isEndIsland && idx === spanDetails.length - 1) {
                    // Last span on end island: extend to far edge
                    segmentEnd.row = isPositive ? islandMaxRow : islandRow;
                }
            }

            // Add the clipped segment
            segments.push({
                startRow: segmentStart.row,
                startCol: segmentStart.col,
                endRow: segmentEnd.row,
                endCol: segmentEnd.col,
                direction: span.direction,
                sign: span.sign
            });
        });

        return segments;
    }

    /**
     * Get all bridges in the course
     * A bridge is created when a span crosses from one island to another
     *
     * @param {Array} islands - Array of island data [row, col, width, height]
     * @returns {Array<Bridge>} Array of Bridge objects
     */
    getBridges(islands) {
        const bridges = [];
        const spanDetails = this.getSpanDetails();

        // Track current position and island
        let currentIsland = 0;
        let currentPos = { row: this.startRow, col: this.startCol };

        spanDetails.forEach((span, spanIndex) => {
            const spanEnd = { row: span.endRow, col: span.endCol };

            // Find which island the junction is on
            const junctionIsland = CourseValidator.findIslandAt(spanEnd.row, spanEnd.col, islands);

            // If junction is on a different island, we have a bridge
            if (junctionIsland !== null && junctionIsland !== currentIsland) {
                bridges.push(new Bridge(
                    spanIndex,
                    currentIsland,
                    junctionIsland,
                    currentPos,
                    spanEnd,
                    span.direction,
                    span.junction
                ));

                // Move to the new island
                currentIsland = junctionIsland;
            }

            // Update current position
            currentPos = spanEnd;
        });

        return bridges;
    }

    /**
     * Get path segments for car animation
     * Breaks down the course into discrete segments: drive, bridge, turn
     *
     * @param {Array} islands - Array of island data [row, col, width, height]
     * @returns {Array} Array of path segment objects
     */
    getPathSegments(islands) {
        const segments = [];
        const spanDetails = this.getSpanDetails();
        const bridges = this.getBridges(islands);

        let currentRow = this.startRow;
        let currentCol = this.startCol;
        let currentDirection = spanDetails[0].direction; // Start facing first span direction
        let bridgeIndex = 0;

        spanDetails.forEach((span, spanIdx) => {
            const spanEnd = { row: span.endRow, col: span.endCol };

            // Check if this span crosses a bridge
            const bridge = bridges.find(b => b.spanIndex === spanIdx);

            if (bridge) {
                // Segment 1: Drive to edge of current island (before bridge)
                const [islandRow, islandCol, islandWidth, islandHeight] = islands[bridge.startIsland];
                let edgeRow, edgeCol;

                if (span.direction === Direction.COLUMN) {
                    if (span.sign > 0) {
                        // Exit from far edge (right side)
                        edgeCol = islandCol + islandWidth - GameConfig.car.halfLength - GameConfig.car.stoppingMargin;
                    } else {
                        // Exit from near edge (left side)
                        edgeCol = islandCol + GameConfig.car.halfLength + GameConfig.car.stoppingMargin;
                    }
                    edgeRow = currentRow;
                } else {
                    if (span.sign > 0) {
                        // Exit from far edge (bottom)
                        edgeRow = islandRow + islandHeight - GameConfig.car.halfLength - GameConfig.car.stoppingMargin;
                    } else {
                        // Exit from near edge (top)
                        edgeRow = islandRow + GameConfig.car.halfLength + GameConfig.car.stoppingMargin;
                    }
                    edgeCol = currentCol;
                }

                segments.push({
                    type: 'drive',
                    startRow: currentRow,
                    startCol: currentCol,
                    endRow: edgeRow,
                    endCol: edgeCol,
                    direction: span.direction
                });

                // Segment 2: Bridge animation (grows and slams, but car stays at edge)
                segments.push({
                    type: 'bridge',
                    startRow: edgeRow,
                    startCol: edgeCol,
                    direction: span.direction,
                    bridgeIndex: bridgeIndex
                });

                // Segment 3: Drive across bridge to junction
                segments.push({
                    type: 'drive',
                    startRow: edgeRow,
                    startCol: edgeCol,
                    endRow: spanEnd.row,
                    endCol: spanEnd.col,
                    direction: span.direction
                });

                bridgeIndex++;
                currentRow = spanEnd.row;
                currentCol = spanEnd.col;

            } else {
                // No bridge - just drive along island to junction
                segments.push({
                    type: 'drive',
                    startRow: currentRow,
                    startCol: currentCol,
                    endRow: spanEnd.row,
                    endCol: spanEnd.col,
                    direction: span.direction
                });

                currentRow = spanEnd.row;
                currentCol = spanEnd.col;
            }

            // Add turn segment if direction changes
            if (span.junction && span.junction !== JunctionType.STRAIGHT) {
                const nextDirection = spanIdx + 1 < spanDetails.length ?
                    spanDetails[spanIdx + 1].direction : null;

                if (nextDirection) {
                    segments.push({
                        type: 'turn',
                        row: currentRow,
                        col: currentCol,
                        fromDirection: span.direction,
                        toDirection: nextDirection,
                        junctionType: span.junction
                    });

                    currentDirection = nextDirection;
                }
            }
        });

        return segments;
    }
}

/**
 * Create the example course from the specification
 */
function createExampleCourse() {
    const course = new Course();
    course.addSpan(4, Direction.COLUMN);  // +4 columns to (1,5), turn
    course.addSpan(5, Direction.ROW);     // +5 rows to (6,5), straight ahead
    course.addSpan(3, Direction.ROW);     // +3 rows to (9,5), turn
    course.addSpan(2, Direction.COLUMN);  // +2 columns to (9,7), turn (stays on island 3)
    course.addSpan(4, Direction.ROW);     // +4 rows to (13,7), turn (bridge to island 4)
    course.addSpan(3, Direction.COLUMN);  // +3 columns to (13,10), turn (bridge to island 5)
    course.addSpan(-4, Direction.ROW);    // -4 rows to (9,10), turn (bridge to island 6)
    course.addSpan(-3, Direction.ROW);    // -3 rows to (6,10), turn (bridge to island 7)
    course.addSpan(3, Direction.COLUMN);  // +3 columns to (6,13), end (stays on island 7)
    return course;
}

/**
 * Create the example level (course + islands)
 * This is the main game configuration
 */
function createExampleLevel() {
    const course = createExampleCourse();

    // Island configuration in course-order
    // Format: [row, col, width, height] where height×width = rows×columns
    const islands = [
        [0, 0, 2, 2],   // Island 0: Start (0 bridges crossed)
        [0, 4, 2, 2],   // Island 1: After bridge 0 (1 bridge crossed)
        [5, 4, 2, 2],   // Island 2: After bridge 1 (2 bridges crossed)
        [8, 4, 4, 2],   // Island 3: After bridge 2 (has 2 junctions)
        [11, 6, 2, 3],  // Island 4: After bridge 3 - 3 rows × 2 cols
        [12, 9, 2, 2],  // Island 5: After bridge 4
        [8, 9, 2, 2],   // Island 6: After bridge 5 (negative span)
        [5, 9, 5, 2],   // Island 7: After bridge 6 (end, negative span) - 2 rows × 5 cols
    ];

    return new Level(course, islands);
}
