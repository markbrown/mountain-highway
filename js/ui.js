// UI Manager - handles all overlay and DOM-based UI elements

class UIManager {
    /**
     * Create a UI manager
     * @param {boolean} isTouchDevice - Whether the device supports touch input
     * @param {HTMLElement} gameContainer - The game container element for fullscreen
     */
    constructor(isTouchDevice, gameContainer) {
        this.isTouchDevice = isTouchDevice;
        this.gameContainer = gameContainer;
        this.overlay = document.getElementById('startScreen');
        this.title = this.overlay?.querySelector('.game-title');
        this.instructions = this.overlay?.querySelector('.instructions');
        this.prompt = this.overlay?.querySelector('.start-prompt');
        this.instructionGrow = this.overlay?.querySelector('.instruction-grow');
        this.fullscreenBtn = document.getElementById('fullscreenBtn');
        this.backBtn = document.getElementById('backBtn');

        // Callback for when back button is pressed
        this.onBackPressed = null;

        // Set initial text based on input device
        this.updateTextForDevice();

        // Store original content for restoration (after device-specific text is set)
        this.originalInstructionsHTML = this.instructions?.innerHTML || '';
        this.originalPromptText = this.prompt?.textContent || '';

        // Set up buttons
        this.setupFullscreenButton();
        this.setupBackButton();
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

        // Restore original instructions and prompt
        this.instructions.innerHTML = this.originalInstructionsHTML;
        this.instructions.style.display = 'block';
        this.prompt.textContent = this.originalPromptText;
        this.prompt.style.display = 'block';
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

    /**
     * Show the back button
     */
    showBackButton() {
        if (this.backBtn) {
            this.backBtn.classList.add('visible');
        }
    }

    /**
     * Hide the back button
     */
    hideBackButton() {
        if (this.backBtn) {
            this.backBtn.classList.remove('visible');
        }
    }

    /**
     * Set up back button click handler
     */
    setupBackButton() {
        if (!this.backBtn) return;

        this.backBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.onBackPressed) {
                this.onBackPressed();
            }
        });

        this.backBtn.addEventListener('touchend', (e) => {
            e.stopPropagation();
            e.preventDefault();
            if (this.onBackPressed) {
                this.onBackPressed();
            }
        });
    }

    /**
     * Set up fullscreen button click handler
     */
    setupFullscreenButton() {
        if (!this.fullscreenBtn) return;

        this.fullscreenBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent triggering game start
            this.toggleFullscreen();
        });

        // Also handle touch to prevent it bubbling to canvas
        this.fullscreenBtn.addEventListener('touchend', (e) => {
            e.stopPropagation();
            e.preventDefault();
            this.toggleFullscreen();
        });
    }

    /**
     * Toggle fullscreen mode
     */
    toggleFullscreen() {
        if (!this.gameContainer) return;

        if (this.isFullscreen()) {
            this.exitFullscreen();
        } else {
            this.enterFullscreen();
        }
    }

    /**
     * Check if currently in fullscreen mode
     * @returns {boolean}
     */
    isFullscreen() {
        return !!(document.fullscreenElement ||
                  document.webkitFullscreenElement ||
                  document.mozFullScreenElement ||
                  document.msFullscreenElement);
    }

    /**
     * Enter fullscreen mode
     */
    enterFullscreen() {
        const elem = this.gameContainer;

        if (elem.requestFullscreen) {
            elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) {
            elem.webkitRequestFullscreen();
        } else if (elem.mozRequestFullScreen) {
            elem.mozRequestFullScreen();
        } else if (elem.msRequestFullscreen) {
            elem.msRequestFullscreen();
        }
    }

    /**
     * Exit fullscreen mode
     */
    exitFullscreen() {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    }
}
