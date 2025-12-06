// High Score Manager - handles saving and retrieving top times from localStorage

class HighScoreManager {
    constructor(storageKey = 'mountainHighway.highScores', maxScores = 3) {
        this.storageKey = storageKey;
        this.maxScores = maxScores;
    }

    /**
     * Get current high scores from localStorage
     * @returns {number[]} Array of times in seconds, sorted ascending (fastest first)
     */
    getScores() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const scores = JSON.parse(stored);
                if (Array.isArray(scores)) {
                    return scores.slice(0, this.maxScores);
                }
            }
        } catch (e) {
            console.warn('Failed to read high scores:', e);
        }
        return [];
    }

    /**
     * Save scores to localStorage
     * @param {number[]} scores - Array of times to save
     */
    saveScores(scores) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(scores));
        } catch (e) {
            console.warn('Failed to save high scores:', e);
        }
    }

    /**
     * Submit a new time and check if it made the high score list
     * @param {number} time - The finish time in seconds
     * @returns {{rank: number|null, scores: number[]}} rank is 1-3 if made list, null otherwise
     */
    submitScore(time) {
        const scores = this.getScores();

        // Find where this score should be inserted (sorted ascending - fastest first)
        let insertIndex = scores.length;
        for (let i = 0; i < scores.length; i++) {
            if (time < scores[i]) {
                insertIndex = i;
                break;
            }
        }

        // Check if it made the list
        if (insertIndex < this.maxScores) {
            // Insert the new score
            scores.splice(insertIndex, 0, time);
            // Trim to max scores
            const trimmedScores = scores.slice(0, this.maxScores);
            this.saveScores(trimmedScores);
            return {
                rank: insertIndex + 1, // 1-indexed rank
                scores: trimmedScores
            };
        }

        // Didn't make the list
        return {
            rank: null,
            scores: scores
        };
    }

    /**
     * Clear all high scores
     */
    clearScores() {
        try {
            localStorage.removeItem(this.storageKey);
        } catch (e) {
            console.warn('Failed to clear high scores:', e);
        }
    }
}
