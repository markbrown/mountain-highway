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
                    index + 1
                ));
            }

            if (height < 2) {
                errors.push(new ValidationError(
                    `Island height ${height} is less than minimum 2 rows`,
                    null,
                    index + 1
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
     * @returns {Object} {minSafe, maxSafe, needsBridge}
     */
    static calculateBridgeRange(spanStart, spanEnd, direction, startIsland, endIsland) {
        // Check if we need a bridge (different islands)
        const needsBridge = startIsland !== endIsland;

        if (!needsBridge) {
            return { minSafe: 0, maxSafe: 0, needsBridge: false };
        }

        const [endRow, endCol, endWidth, endHeight] = endIsland;

        let minSafe, maxSafe;

        if (direction === Direction.COLUMN) {
            // Bridge extends in column direction
            // Start island exit edge
            const [startRow, startCol, startWidth, startHeight] = startIsland;
            const exitEdge = startCol + startWidth;

            // End island entry edge
            const entryEdge = endCol;

            // Minimum: must reach entry edge of next island
            minSafe = entryEdge - exitEdge;

            // Maximum: can extend to junction or opposite edge
            // If junction is at entry edge, max goes to opposite edge
            // If junction is inside island, max goes to junction
            if (spanEnd.col === entryEdge) {
                // Junction at entry edge - can extend across entire island
                maxSafe = (endCol + endWidth) - exitEdge;
            } else {
                // Junction inside island - max extends to junction
                maxSafe = spanEnd.col - exitEdge;
            }
        } else {
            // Bridge extends in row direction
            const [startRow, startCol, startWidth, startHeight] = startIsland;
            const exitEdge = startRow + startHeight;

            const entryEdge = endRow;

            minSafe = entryEdge - exitEdge;

            if (spanEnd.row === entryEdge) {
                maxSafe = (endRow + endHeight) - exitEdge;
            } else {
                maxSafe = spanEnd.row - exitEdge;
            }
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

        // Track current position and island
        let currentRow = course.startRow;
        let currentCol = course.startCol;
        let currentIslandIndex = startIsland;

        // Validate each span
        spanDetails.forEach((span, spanIndex) => {
            const junctionRow = span.endRow;
            const junctionCol = span.endCol;

            // Check 2: Junction must be on an island and in its interior
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

                // Check bridge requirements (3, 4, 5) if this span crosses to a different island
                if (currentIslandIndex !== null && junctionIslandIndex !== currentIslandIndex) {
                    const bridgeRange = this.calculateBridgeRange(
                        { row: currentRow, col: currentCol },
                        { row: junctionRow, col: junctionCol },
                        span.direction,
                        islands[currentIslandIndex],
                        islands[junctionIslandIndex]
                    );

                    // Check 3: Minimum bridge size must be at least 1 unit
                    if (bridgeRange.minSafe < 1) {
                        errors.push(new ValidationError(
                            `Gap too small: minimum safe bridge size ${bridgeRange.minSafe.toFixed(2)} is less than 1 unit`,
                            spanIndex
                        ));
                    }

                    // Check 4: Maximum bridge size must land on the next island
                    const [nextRow, nextCol, nextWidth, nextHeight] = islands[junctionIslandIndex];
                    let maxBridgeEnd;

                    if (span.direction === Direction.COLUMN) {
                        const [startRow, startCol, startWidth, startHeight] = islands[currentIslandIndex];
                        maxBridgeEnd = startCol + startWidth + bridgeRange.maxSafe;

                        if (maxBridgeEnd < nextCol || maxBridgeEnd > nextCol + nextWidth) {
                            errors.push(new ValidationError(
                                `Maximum bridge size ${bridgeRange.maxSafe.toFixed(2)} extends to column ${maxBridgeEnd.toFixed(2)}, which is outside next island (columns ${nextCol}-${nextCol + nextWidth})`,
                                spanIndex
                            ));
                        }
                    } else {
                        const [startRow, startCol, startWidth, startHeight] = islands[currentIslandIndex];
                        maxBridgeEnd = startRow + startHeight + bridgeRange.maxSafe;

                        if (maxBridgeEnd < nextRow || maxBridgeEnd > nextRow + nextHeight) {
                            errors.push(new ValidationError(
                                `Maximum bridge size ${bridgeRange.maxSafe.toFixed(2)} extends to row ${maxBridgeEnd.toFixed(2)}, which is outside next island (rows ${nextRow}-${nextRow + nextHeight})`,
                                spanIndex
                            ));
                        }
                    }

                    // Check 5: Tolerance (difference between min and max) must be at least 1 unit
                    const tolerance = bridgeRange.maxSafe - bridgeRange.minSafe;
                    if (tolerance < 1) {
                        errors.push(new ValidationError(
                            `Bridge tolerance ${tolerance.toFixed(2)} is less than 1 unit (min: ${bridgeRange.minSafe.toFixed(2)}, max: ${bridgeRange.maxSafe.toFixed(2)})`,
                            spanIndex
                        ));
                    }
                }
            }

            // Update current position and island for next iteration
            currentRow = junctionRow;
            currentCol = junctionCol;
            currentIslandIndex = junctionIslandIndex;
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
