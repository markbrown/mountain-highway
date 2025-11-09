// Course definition and management

// Direction constants
const Direction = {
    COLUMN: 'column',  // Positive column direction (rightward on screen)
    ROW: 'row'         // Positive row direction (upward on screen)
};

// Junction types
const JunctionType = {
    LEFT: 'left',
    RIGHT: 'right',
    STRAIGHT: 'straight'
};

/**
 * A span represents one segment of the course
 */
class Span {
    constructor(length, direction) {
        this.length = length;           // Number of grid squares
        this.direction = direction;     // Direction.COLUMN or Direction.ROW
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
            return { row: startRow, col: startCol + span.length };
        } else { // Direction.ROW
            return { row: startRow + span.length, col: startCol };
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
        } else if (currentSpan.direction === Direction.COLUMN && nextSpan.direction === Direction.ROW) {
            return JunctionType.LEFT;
        } else { // currentSpan.direction === Direction.ROW && nextSpan.direction === Direction.COLUMN
            return JunctionType.RIGHT;
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
            // Check if this span intersects with the island
            const spanIntersects =
                (span.startRow <= islandMaxRow && span.endRow >= islandRow &&
                 span.startCol <= islandMaxCol && span.endCol >= islandCol);

            if (!spanIntersects) return;

            // Clip the span to the island boundaries
            let segmentStart, segmentEnd;

            if (span.direction === Direction.COLUMN) {
                // Span travels in column direction (row stays constant)
                // Clip to island column boundaries
                segmentStart = {
                    row: span.startRow,
                    col: Math.max(span.startCol, islandCol)
                };
                segmentEnd = {
                    row: span.endRow,
                    col: Math.min(span.endCol, islandMaxCol)
                };

                // Special case: extend to edges for start/end islands
                if (isStartIsland && span.startCol === this.startCol) {
                    // First span on start island: extend to near edge
                    segmentStart.col = islandCol;
                }
                if (isEndIsland && idx === spanDetails.length - 1) {
                    // Last span on end island: extend to far edge
                    segmentEnd.col = islandMaxCol;
                }
            } else {
                // Span travels in row direction (column stays constant)
                // Clip to island row boundaries
                segmentStart = {
                    row: Math.max(span.startRow, islandRow),
                    col: span.startCol
                };
                segmentEnd = {
                    row: Math.min(span.endRow, islandMaxRow),
                    col: span.endCol
                };

                // Special case: extend to edges for start/end islands
                if (isStartIsland && span.startRow === this.startRow) {
                    // First span on start island: extend to near edge
                    segmentStart.row = islandRow;
                }
                if (isEndIsland && idx === spanDetails.length - 1) {
                    // Last span on end island: extend to far edge
                    segmentEnd.row = islandMaxRow;
                }
            }

            // Add the clipped segment
            segments.push({
                startRow: segmentStart.row,
                startCol: segmentStart.col,
                endRow: segmentEnd.row,
                endCol: segmentEnd.col,
                direction: span.direction
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
}

/**
 * Create the example course from the specification
 */
function createExampleCourse() {
    const course = new Course();
    course.addSpan(4, Direction.COLUMN);  // +4 columns to (1,5), left turn
    course.addSpan(5, Direction.ROW);     // +5 rows to (6,5), straight ahead
    course.addSpan(3, Direction.ROW);     // +3 rows to (9,5), right turn
    course.addSpan(2, Direction.COLUMN);  // +2 columns to (9,7), left turn (stays on island 4)
    course.addSpan(4, Direction.ROW);     // +4 rows to (13,7), end (bridge to island 5)
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
        [11, 6, 2, 3],  // Island 4: After bridge 3 (final destination) - 3 rows × 2 cols
    ];

    return new Level(course, islands);
}
