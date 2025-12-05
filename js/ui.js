// UI Manager - handles all overlay and DOM-based UI elements

class UIManager {
    /**
     * Create a UI manager
     * @param {boolean} isTouchDevice - Whether the device supports touch input
     */
    constructor(isTouchDevice) {
        this.isTouchDevice = isTouchDevice;
        this.overlay = document.getElementById('startScreen');
        this.title = this.overlay?.querySelector('.game-title');
        this.instructions = this.overlay?.querySelector('.instructions');
        this.prompt = this.overlay?.querySelector('.start-prompt');
        this.instructionGrow = this.overlay?.querySelector('.instruction-grow');

        // Set initial text based on input device
        this.updateTextForDevice();
    }

    /**
     * Update UI text based on input device (touch vs mouse)
     */
    updateTextForDevice() {
        if (this.isTouchDevice) {
            if (this.instructionGrow) {
                this.instructionGrow.textContent = 'Tap and hold to grow bridge';
            }
            if (this.prompt) {
                this.prompt.textContent = 'Tap the screen to play';
            }
        }
    }

    /**
     * Get the appropriate "play again" prompt text for the current device
     * @returns {string} The prompt text
     */
    getPlayAgainText() {
        return this.isTouchDevice
            ? 'Tap the screen to play again'
            : 'Press the mouse button to play again';
    }

    /**
     * Show the start screen overlay
     */
    showStartScreen() {
        if (!this.overlay) return;

        this.overlay.style.display = 'flex';
        this.title.textContent = 'MOUNTAIN HIGHWAY';
        this.title.classList.remove('countdown');
        this.instructions.style.display = 'block';
        this.prompt.style.display = 'block';
        this.updateTextForDevice();
    }

    /**
     * Show countdown number during game start
     * @param {number} value - The countdown number (3, 2, 1)
     */
    showCountdown(value) {
        if (!this.overlay) return;

        this.overlay.style.display = 'flex';
        this.title.textContent = value.toString();
        this.title.classList.add('countdown');
        this.instructions.style.display = 'none';
        this.prompt.style.display = 'none';
    }

    /**
     * Hide the overlay completely
     */
    hide() {
        if (this.overlay) {
            this.overlay.style.display = 'none';
        }
    }

    /**
     * Show the finish screen when player completes the course
     * @param {number} finishTime - The time in seconds
     */
    showFinishScreen(finishTime) {
        if (!this.overlay) return;

        this.overlay.style.display = 'flex';
        this.title.textContent = 'YOU MADE IT!';
        this.title.classList.remove('countdown');
        this.instructions.innerHTML = `<p class="finish-time">Time: ${finishTime.toFixed(1)}s</p>`;
        this.instructions.style.display = 'block';
        this.prompt.textContent = this.getPlayAgainText();
        this.prompt.style.display = 'block';
    }

    /**
     * Show the game over screen when player crashes
     */
    showGameOverScreen() {
        if (!this.overlay) return;

        this.overlay.style.display = 'flex';
        this.title.textContent = 'YOU CRASHED!';
        this.title.classList.remove('countdown');
        this.instructions.style.display = 'none';
        this.prompt.textContent = this.getPlayAgainText();
        this.prompt.style.display = 'block';
    }
}
