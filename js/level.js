// Level management - combines course and island configuration

/**
 * A level represents a complete game configuration with course and islands
 */
class Level {
    /**
     * @param {Course} course - The course definition
     * @param {Array} islands - Array of island data [row, col, width, height]
     */
    constructor(course, islands) {
        this.course = course;
        this.islands = islands;
    }

    /**
     * Get all bridges in this level
     * @returns {Array<Bridge>} Array of Bridge objects
     */
    getBridges() {
        return this.course.getBridges(this.islands);
    }

    /**
     * Calculate bridge animation data based on the course and islands
     * Each bridge's target length is calculated as: gap distance + 0.5 units
     * This ensures the bridge extends slightly onto the next island for smooth transition
     *
     * @returns {Array} Array of {holdTime, targetLength} for each bridge
     */
    getBridgeAnimationData() {
        const bridges = this.getBridges();

        return bridges.map(bridge => {
            const range = bridge.calculateRange(this.islands);

            // Perfect bridge length: gap distance + 0.5 units (extends onto next island)
            const targetLength = range.minSafe + 0.5;

            // Hold time: how long to hold the button (length / growth rate)
            const holdTime = targetLength / GameConfig.bridge.growthRate;

            return {
                holdTime: holdTime,
                targetLength: targetLength
            };
        });
    }

    /**
     * Get bridge positions for rendering
     * Calculates where each bridge should be drawn based on island positions
     *
     * @returns {Array} Array of bridge position data
     */
    getBridgePositions() {
        const bridges = this.getBridges();

        return bridges.map(bridge => {
            const startIsland = this.islands[bridge.startIsland];
            const [startRow, startCol, startWidth, startHeight] = startIsland;

            if (bridge.direction === Direction.COLUMN) {
                // Bridge extends in column direction (horizontal on screen)
                // Use explicit sign from bridge (stored from span)
                const isPositive = bridge.sign > 0;
                return {
                    baseRow: bridge.startPos.row,
                    edgeCol: isPositive ? (startCol + startWidth) : startCol,
                    direction: 'column',
                    isPositive: isPositive
                };
            } else {
                // Bridge extends in row direction (vertical on screen)
                // Use explicit sign from bridge (stored from span)
                const isPositive = bridge.sign > 0;
                return {
                    edgeRow: isPositive ? (startRow + startHeight) : startRow,
                    baseCol: bridge.startPos.col,
                    direction: 'row',
                    isPositive: isPositive
                };
            }
        });
    }

    /**
     * Validate this level configuration
     * @returns {Object} {valid: boolean, errors: Array}
     */
    validate() {
        return CourseValidator.validate(this.course, this.islands);
    }
}
