// Debug utilities for development and testing

class DebugRenderer {
    constructor(renderer) {
        this.renderer = renderer;
        this.ctx = renderer.ctx;
    }

    /**
     * Draw debug grid lines to visualize the game coordinate system
     * @param {number} minRow - minimum row to draw
     * @param {number} maxRow - maximum row to draw
     * @param {number} minCol - minimum column to draw
     * @param {number} maxCol - maximum column to draw
     * @param {number} blockSize - size of each grid square
     */
    drawGrid(minRow, maxRow, minCol, maxCol, blockSize) {
        // Draw vertical lines (constant column, varying row)
        for (let col = minCol; col <= maxCol; col++) {
            // Every 4th line gets a different color and is thicker
            if (col % 4 === 0) {
                this.ctx.strokeStyle = GameConfig.debug.gridEvery4Color;
                this.ctx.lineWidth = GameConfig.debug.gridEvery4Width;
            } else {
                this.ctx.strokeStyle = GameConfig.debug.gridRegularColor;
                this.ctx.lineWidth = GameConfig.debug.gridRegularWidth;
            }

            this.ctx.beginPath();
            const startPoint = this.renderer.gameToScreen(minRow, col, 0);
            const endPoint = this.renderer.gameToScreen(maxRow, col, 0);
            this.ctx.moveTo(startPoint.x * blockSize, startPoint.y * blockSize);
            this.ctx.lineTo(endPoint.x * blockSize, endPoint.y * blockSize);
            this.ctx.stroke();
        }

        // Draw horizontal lines (constant row, varying column)
        for (let row = minRow; row <= maxRow; row++) {
            // Every 4th line gets a different color and is thicker
            if (row % 4 === 0) {
                this.ctx.strokeStyle = GameConfig.debug.gridEvery4Color;
                this.ctx.lineWidth = GameConfig.debug.gridEvery4Width;
            } else {
                this.ctx.strokeStyle = GameConfig.debug.gridRegularColor;
                this.ctx.lineWidth = GameConfig.debug.gridRegularWidth;
            }

            this.ctx.beginPath();
            const startPoint = this.renderer.gameToScreen(row, minCol, 0);
            const endPoint = this.renderer.gameToScreen(row, maxCol, 0);
            this.ctx.moveTo(startPoint.x * blockSize, startPoint.y * blockSize);
            this.ctx.lineTo(endPoint.x * blockSize, endPoint.y * blockSize);
            this.ctx.stroke();
        }
    }

    /**
     * Draw a debug number on an island
     * @param {number} row - game grid row (near corner)
     * @param {number} col - game grid column (near corner)
     * @param {number} width - width of the island in columns
     * @param {number} height - height of the island in rows
     * @param {number} number - the number to display
     * @param {number} blockSize - size of each grid square in pixels
     */
    drawIslandNumber(row, col, width, height, number, blockSize) {
        // Calculate center of the island top
        const centerRow = row + height / 2;
        const centerCol = col + width / 2;
        const centerPoint = this.renderer.gameToScreen(centerRow, centerCol, 0);
        const centerX = centerPoint.x * blockSize;
        const centerY = centerPoint.y * blockSize;

        // Draw the number
        this.ctx.fillStyle = GameConfig.debug.islandNumberColor;
        this.ctx.font = GameConfig.debug.islandNumberFont;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(number.toString(), centerX, centerY);
    }

    /**
     * Draw debug bridge zones showing min/max safe bridge lengths
     * @param {Course} course - The course object
     * @param {Array} islands - Array of island data [row, col, width, height]
     * @param {number} blockSize - size of each grid square in pixels
     */
    drawBridgeZones(course, islands, blockSize) {
        const bridges = course.getBridges(islands);
        const roadWidth = GameConfig.road.width;

        bridges.forEach(bridge => {
            const range = bridge.calculateRange(islands);

            if (range.needsBridge) {
                // Draw the bridge zone overlays
                this.drawBridgeZone(
                    bridge.startPos,
                    bridge.direction,
                    islands[bridge.startIsland],
                    range.minSafe,
                    range.maxSafe,
                    roadWidth,
                    blockSize
                );
            }
        });
    }

    /**
     * Draw a single bridge zone with min/max safe regions
     * @param {Object} spanStart - {row, col} where bridge starts
     * @param {string} direction - 'row' or 'column'
     * @param {Array} startIsland - Island data where bridge starts
     * @param {number} minSafe - Minimum safe bridge length
     * @param {number} maxSafe - Maximum safe bridge length
     * @param {number} roadWidth - Width of the road
     * @param {number} blockSize - size of each grid square in pixels
     */
    drawBridgeZone(spanStart, direction, startIsland, minSafe, maxSafe, roadWidth, blockSize) {
        const [startRow, startCol, startWidth, startHeight] = startIsland;

        if (direction === Direction.COLUMN) {
            // Bridge extends in column direction (horizontal in screen space)
            const exitEdge = startCol + startWidth;
            const centerRow = spanStart.row;

            // Draw full bridge zone (white fill) from exit edge to maxSafe
            this.renderer.drawRoad(
                centerRow, exitEdge,
                centerRow, exitEdge + maxSafe,
                blockSize,
                GameConfig.debug.bridgeZoneColor
            );

            // Draw safe zone outline (dark green) from minSafe to maxSafe
            this.renderer.drawRoadOutline(
                centerRow, exitEdge + minSafe,
                centerRow, exitEdge + maxSafe,
                blockSize,
                GameConfig.debug.bridgeSafeZoneOutlineColor,
                GameConfig.debug.bridgeSafeZoneOutlineWidth
            );
        } else {
            // Bridge extends in row direction (vertical in screen space)
            const exitEdge = startRow + startHeight;
            const centerCol = spanStart.col;

            // Draw full bridge zone (white fill) from exit edge to maxSafe
            this.renderer.drawRoad(
                exitEdge, centerCol,
                exitEdge + maxSafe, centerCol,
                blockSize,
                GameConfig.debug.bridgeZoneColor
            );

            // Draw safe zone outline (dark green) from minSafe to maxSafe
            this.renderer.drawRoadOutline(
                exitEdge + minSafe, centerCol,
                exitEdge + maxSafe, centerCol,
                blockSize,
                GameConfig.debug.bridgeSafeZoneOutlineColor,
                GameConfig.debug.bridgeSafeZoneOutlineWidth
            );
        }
    }
}
