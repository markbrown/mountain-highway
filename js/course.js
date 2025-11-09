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
