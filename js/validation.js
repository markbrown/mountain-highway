// Course and island validation

class ValidationError {
    constructor(message, spanIndex = null, islandIndex = null) {
        this.message = message;
        this.spanIndex = spanIndex;
        this.islandIndex = islandIndex;
    }

    toString() {
        let prefix = '';
        if (this.spanIndex !== null) {
            prefix = `Span ${this.spanIndex}: `;
        } else if (this.islandIndex !== null) {
            prefix = `Island ${this.islandIndex}: `;
        }
        return prefix + this.message;
    }
}

class CourseValidator {
    /**
     * Validate a course against a set of islands
     * @param {Course} course - The course to validate
     * @param {Array} islands - Array of island data [row, col, width, height, ...]
     * @returns {Object} { valid: boolean, errors: Array<ValidationError> }
     */
    static validate(course, islands) {
        const errors = [];

        // Validate islands first
        errors.push(...this.validateIslands(islands));

        // Validate course against islands
        errors.push(...this.validateCourseAgainstIslands(course, islands));

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Check 1: Each island must be at least 2x2
     */
    static validateIslands(islands) {
        const errors = [];

        islands.forEach((island, index) => {
            const [row, col, width, height] = island;

            if (width < 2) {
                errors.push(new ValidationError(
                    `Island width ${width} is less than minimum 2 columns`,
                    null,
                    index
                ));
            }

            if (height < 2) {
                errors.push(new ValidationError(
                    `Island height ${height} is less than minimum 2 rows`,
                    null,
                    index
                ));
            }
        });

        return errors;
    }

    /**
     * Find which island contains a given point
     * @param {number} row - Point row coordinate
     * @param {number} col - Point column coordinate
     * @param {Array} islands - Array of island data
     * @returns {number|null} Island index (0-based) or null if not found
     */
    static findIslandAt(row, col, islands) {
        for (let i = 0; i < islands.length; i++) {
            const [islandRow, islandCol, width, height] = islands[i];

            if (row >= islandRow && row <= islandRow + height &&
                col >= islandCol && col <= islandCol + width) {
                return i;
            }
        }
        return null;
    }

    /**
     * Check if a point is in the interior of an island (at least 1 unit from any edge)
     * @param {number} row - Point row coordinate
     * @param {number} col - Point column coordinate
     * @param {Array} island - Island data [row, col, width, height, ...]
     * @returns {boolean} True if point is in interior
     */
    static isInInterior(row, col, island) {
        const [islandRow, islandCol, width, height] = island;

        return row > islandRow && row < islandRow + height &&
               col > islandCol && col < islandCol + width;
    }

    /**
     * Calculate safe bridge size range for a span
     * @param {Object} spanStart - {row, col} start position
     * @param {Object} spanEnd - {row, col} end position (junction)
     * @param {string} direction - 'row' or 'column'
     * @param {Array} startIsland - Island data where span starts
     * @param {Array} endIsland - Island data where span ends
     * @param {string} junctionType - JunctionType (turn, straight, or null for end)
     * @returns {Object} {minSafe, maxSafe, needsBridge}
     */
    static calculateBridgeRange(spanStart, spanEnd, direction, startIsland, endIsland, junctionType = null) {
        // Check if we need a bridge (different islands)
        const needsBridge = startIsland !== endIsland;

        if (!needsBridge) {
            return { minSafe: 0, maxSafe: 0, needsBridge: false };
        }

        const [endRow, endCol, endWidth, endHeight] = endIsland;

        let minSafe, maxSafe;

        if (direction === Direction.COLUMN) {
            // Bridge extends in column direction
            const [startRow, startCol, startWidth, startHeight] = startIsland;

            // Determine if traveling in positive or negative direction
            const isPositive = spanEnd.col >= spanStart.col;

            let exitEdge, entryEdge;
            if (isPositive) {
                // Positive direction: exit from far edge, enter at near edge
                exitEdge = startCol + startWidth;
                entryEdge = endCol;
            } else {
                // Negative direction: exit from near edge, enter at far edge
                exitEdge = startCol;
                entryEdge = endCol + endWidth;
            }

            // Minimum: must reach entry edge of next island (the gap)
            minSafe = Math.abs(entryEdge - exitEdge);

            // Maximum: only limited if there's an immediate corner (turn 1 unit past entry edge)
            const distanceToJunction = Math.abs(spanEnd.col - entryEdge);
            const isImmediateCorner = (junctionType === JunctionType.TURN) && (distanceToJunction === 1);
            maxSafe = isImmediateCorner ? (minSafe + 1.5) : (minSafe + 10.0);
        } else {
            // Bridge extends in row direction
            const [startRow, startCol, startWidth, startHeight] = startIsland;

            // Determine if traveling in positive or negative direction
            const isPositive = spanEnd.row >= spanStart.row;

            let exitEdge, entryEdge;
            if (isPositive) {
                // Positive direction: exit from far edge, enter at near edge
                exitEdge = startRow + startHeight;
                entryEdge = endRow;
            } else {
                // Negative direction: exit from near edge, enter at far edge
                exitEdge = startRow;
                entryEdge = endRow + endHeight;
            }

            // Minimum: must reach entry edge of next island (the gap)
            minSafe = Math.abs(entryEdge - exitEdge);

            // Maximum: only limited if there's an immediate corner (turn 1 unit past entry edge)
            const distanceToJunction = Math.abs(spanEnd.row - entryEdge);
            const isImmediateCorner = (junctionType === JunctionType.TURN) && (distanceToJunction === 1);
            maxSafe = isImmediateCorner ? (minSafe + 1.5) : (minSafe + 10.0);
        }

        return { minSafe, maxSafe, needsBridge: true };
    }

    /**
     * Check 2, 3, 4, 5: Validate course junctions and bridges
     */
    static validateCourseAgainstIslands(course, islands) {
        const errors = [];
        const spanDetails = course.getSpanDetails();

        // Check start location (1,1)
        const startIsland = this.findIslandAt(course.startRow, course.startCol, islands);
        if (startIsland === null) {
            errors.push(new ValidationError(
                `Start location (${course.startRow},${course.startCol}) is not on any island`
            ));
        } else {
            if (!this.isInInterior(course.startRow, course.startCol, islands[startIsland])) {
                errors.push(new ValidationError(
                    `Start location (${course.startRow},${course.startCol}) is not in island interior (must be 1+ units from edges)`
                ));
            }
        }

        // Check 2: Validate each junction
        spanDetails.forEach((span, spanIndex) => {
            const junctionRow = span.endRow;
            const junctionCol = span.endCol;

            // Junction must be on an island and in its interior
            const junctionIslandIndex = this.findIslandAt(junctionRow, junctionCol, islands);

            if (junctionIslandIndex === null) {
                errors.push(new ValidationError(
                    `Junction at (${junctionRow},${junctionCol}) is not on any island`,
                    spanIndex
                ));
            } else {
                const junctionIsland = islands[junctionIslandIndex];
                if (!this.isInInterior(junctionRow, junctionCol, junctionIsland)) {
                    errors.push(new ValidationError(
                        `Junction at (${junctionRow},${junctionCol}) is not in island interior (must be 1+ units from edges)`,
                        spanIndex
                    ));
                }
            }
        });

        // Check 3, 4, 5: Validate bridges
        errors.push(...this.validateBridges(course, islands));

        return errors;
    }

    /**
     * Check 3, 4, 5: Validate bridge requirements
     */
    static validateBridges(course, islands) {
        const errors = [];
        const bridges = course.getBridges(islands);

        bridges.forEach(bridge => {
            const range = bridge.calculateRange(islands);

            // Check 3: Minimum bridge size must be at least 1 unit
            if (range.minSafe < 1) {
                errors.push(new ValidationError(
                    `Gap too small: minimum safe bridge size ${range.minSafe.toFixed(2)} is less than 1 unit`,
                    bridge.spanIndex
                ));
            }

            // Check 4: Maximum bridge size must land on the next island
            const [nextRow, nextCol, nextWidth, nextHeight] = islands[bridge.endIsland];
            let maxBridgeEnd;

            if (bridge.direction === Direction.COLUMN) {
                const [startRow, startCol, startWidth, startHeight] = islands[bridge.startIsland];
                const isPositive = bridge.endPos.col >= bridge.startPos.col;
                const sign = isPositive ? 1 : -1;
                const exitEdge = isPositive ? (startCol + startWidth) : startCol;
                maxBridgeEnd = exitEdge + (sign * range.maxSafe);

                if (maxBridgeEnd < nextCol || maxBridgeEnd > nextCol + nextWidth) {
                    errors.push(new ValidationError(
                        `Maximum bridge size ${range.maxSafe.toFixed(2)} extends to column ${maxBridgeEnd.toFixed(2)}, which is outside next island (columns ${nextCol}-${nextCol + nextWidth})`,
                        bridge.spanIndex
                    ));
                }
            } else {
                const [startRow, startCol, startWidth, startHeight] = islands[bridge.startIsland];
                const isPositive = bridge.endPos.row >= bridge.startPos.row;
                const sign = isPositive ? 1 : -1;
                const exitEdge = isPositive ? (startRow + startHeight) : startRow;
                maxBridgeEnd = exitEdge + (sign * range.maxSafe);

                if (maxBridgeEnd < nextRow || maxBridgeEnd > nextRow + nextHeight) {
                    errors.push(new ValidationError(
                        `Maximum bridge size ${range.maxSafe.toFixed(2)} extends to row ${maxBridgeEnd.toFixed(2)}, which is outside next island (rows ${nextRow}-${nextRow + nextHeight})`,
                        bridge.spanIndex
                    ));
                }
            }

            // Check 5: Tolerance (difference between min and max) must be at least 1 unit
            const tolerance = range.maxSafe - range.minSafe;
            if (tolerance < 1) {
                errors.push(new ValidationError(
                    `Bridge tolerance ${tolerance.toFixed(2)} is less than 1 unit (min: ${range.minSafe.toFixed(2)}, max: ${range.maxSafe.toFixed(2)})`,
                    bridge.spanIndex
                ));
            }
        });

        return errors;
    }

    /**
     * Print validation results to console
     * @param {Object} result - Result from validate()
     * @param {string} label - Label for this validation run
     */
    static printResults(result, label = 'Validation') {
        console.log(`\n=== ${label} ===`);
        if (result.valid) {
            console.log('✅ All checks passed!');
        } else {
            console.log(`❌ Found ${result.errors.length} error(s):`);
            result.errors.forEach(error => {
                console.log(`  - ${error.toString()}`);
            });
        }
    }
}
