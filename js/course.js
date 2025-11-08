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
