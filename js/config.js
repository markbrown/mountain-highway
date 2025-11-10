// Game configuration and constants

const GameConfig = {
    // Canvas settings
    canvas: {
        width: 800,
        height: 600,
        backgroundColor: '#87CEEB' // Sky blue
    },

    // Grid and coordinate system
    grid: {
        blockSize: 50, // Size of each grid square in pixels
        viewOffsetX: 400, // Horizontal offset to center view
        viewOffsetY: 500  // Vertical offset to center view
    },

    // Road dimensions
    road: {
        width: 1.0,      // Road width in game units
        halfWidth: 0.5,  // Half of road width (for rendering)
        color: '#444444', // Dark gray
        junctionExtension: 0.5 // Extension past junction when leading to another junction
    },

    // Car properties
    car: {
        length: 0.6,      // Car length in game units
        width: 0.4,       // Car width in game units
        halfLength: 0.3,  // Half of car length (front bumper distance from center)
        speed: 2.0,       // Movement speed in units per second
        stoppingMargin: 0.05, // Distance to stop before island edge
        color: '#FF0000', // Red
        outlineColor: '#000', // Black
        outlineWidth: 1
    },

    // Bridge mechanics
    bridge: {
        growthRate: 2.0,  // Bridge growth rate in units per second
        slamDuration: 0.2, // Time for bridge to rotate down (seconds)
        color: '#444444',  // Same as road
        baseOffset: 0.1    // How far bridge starts back onto island edge
    },

    // Island rendering
    island: {
        wallHeight: 2000, // Wall extension downward (pixels)
        grassColor: '#4CAF50',      // Green (top surface)
        dirtLightColor: '#8B4513',  // Light brown (right wall)
        dirtDarkColor: '#6B3410',   // Dark brown (left wall)
        outlineColor: '#000',       // Black
        outlineWidth: 2
    },

    // Viewport and scrolling
    viewport: {
        heightInRows: 8,      // Number of rows visible at once when scrolling
        scrollMargin: 1       // Extra margin for smoother scrolling
    },

    // Debug settings
    debug: {
        showGrid: false,
        showIslandNumbers: false,
        showBridgeZones: false,
        gridOpacity: 0.15,
        gridEvery4Opacity: 0.25,
        gridEvery4Color: 'rgba(0, 0, 255, 0.25)', // Blue
        gridRegularColor: 'rgba(0, 0, 0, 0.15)',  // Faint black
        gridEvery4Width: 2,
        gridRegularWidth: 1,
        islandNumberColor: 'rgba(255, 255, 255, 0.8)',
        islandNumberFont: 'bold 24px Arial',
        bridgeZoneColor: 'rgba(255, 255, 255, 0.3)', // Translucent white for full bridge
        bridgeSafeZoneOutlineColor: '#1B5E20',       // Dark green outline for safe zone
        bridgeSafeZoneOutlineWidth: 2
    }
};
