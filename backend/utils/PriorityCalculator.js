/**
 * PriorityCalculator - Calculate waitlist priority scores
 * Determines queue position based on multiple factors
 */

class PriorityCalculator {
    /**
     * Calculate priority score for waitlist entry
     * @param {Object} event - Event object
     * @param {Object} user - User object
     * @param {Object} options - Additional options
     * @returns {number} Priority score (1-10)
     */
    calculate(event, user, options = {}) {
        let priority = 0;

        // 1. Event priority weight (1-4 points)
        priority += this.getEventPriorityScore(event.priority);

        // 2. Event category boost (0-2 points)
        priority += this.getCategoryBoost(event.category);

        // 3. User role boost (0-3 points)
        priority += this.getUserRoleBoost(user.role);

        // 4. Time sensitivity (0-2 points)
        priority += this.getTimeSensitivityScore(event.start_datetime);

        // 5. Department priority (0-1 point)
        if (options.departmentPriority) {
            priority += 1;
        }

        // Cap at 10
        return Math.min(Math.max(priority, 1), 10);
    }

    /**
     * Get score based on event priority
     * @param {string} eventPriority - Event priority level
     * @returns {number} Score (1-4)
     */
    getEventPriorityScore(eventPriority) {
        const priorityWeights = {
            'urgent': 4,
            'high': 3,
            'medium': 2,
            'low': 1
        };
        return priorityWeights[eventPriority] || 2;
    }

    /**
     * Get boost based on event category
     * @param {string} category - Event category
     * @returns {number} Boost score (0-2)
     */
    getCategoryBoost(category) {
        const categoryBoosts = {
            'academic': 2,      // Highest priority
            'seminar': 1.5,
            'conference': 1.5,
            'workshop': 1,
            'meeting': 1,
            'cultural': 0.5,
            'sports': 0.5,
            'other': 0
        };
        return categoryBoosts[category] || 0;
    }

    /**
     * Get boost based on user role
     * @param {string} role - User role
     * @returns {number} Boost score (0-3)
     */
    getUserRoleBoost(role) {
        const roleBoosts = {
            'admin': 3,
            'faculty': 2,
            'staff': 1,
            'student': 0
        };
        return roleBoosts[role] || 0;
    }

    /**
     * Get score based on how soon the event is
     * @param {string} startDateTime - Event start date/time
     * @returns {number} Score (0-2)
     */
    getTimeSensitivityScore(startDateTime) {
        const eventDate = new Date(startDateTime);
        const now = new Date();
        const daysUntilEvent = Math.ceil((eventDate - now) / (1000 * 60 * 60 * 24));

        if (daysUntilEvent <= 2) return 2;      // Very urgent
        if (daysUntilEvent <= 5) return 1.5;    // Urgent
        if (daysUntilEvent <= 7) return 1;      // Soon
        if (daysUntilEvent <= 14) return 0.5;   // Moderate
        return 0;                                // Not urgent
    }

    /**
     * Calculate priority with reason explanation
     * @param {Object} event - Event object
     * @param {Object} user - User object
     * @param {Object} options - Additional options
     * @returns {Object} Priority score and reason
     */
    calculateWithReason(event, user, options = {}) {
        const reasons = [];
        let priority = 0;

        // Event priority
        const eventScore = this.getEventPriorityScore(event.priority);
        priority += eventScore;
        reasons.push(`Event priority: ${event.priority} (+${eventScore})`);

        // Category boost
        const categoryScore = this.getCategoryBoost(event.category);
        if (categoryScore > 0) {
            priority += categoryScore;
            reasons.push(`Category: ${event.category} (+${categoryScore})`);
        }

        // User role
        const roleScore = this.getUserRoleBoost(user.role);
        if (roleScore > 0) {
            priority += roleScore;
            reasons.push(`User role: ${user.role} (+${roleScore})`);
        }

        // Time sensitivity
        const timeScore = this.getTimeSensitivityScore(event.start_datetime);
        if (timeScore > 0) {
            priority += timeScore;
            const daysUntil = Math.ceil((new Date(event.start_datetime) - new Date()) / (1000 * 60 * 60 * 24));
            reasons.push(`Event in ${daysUntil} days (+${timeScore})`);
        }

        // Department priority
        if (options.departmentPriority) {
            priority += 1;
            reasons.push('Department priority (+1)');
        }

        const finalPriority = Math.min(Math.max(priority, 1), 10);

        return {
            priority: finalPriority,
            reason: reasons.join(', '),
            breakdown: {
                eventPriority: eventScore,
                categoryBoost: categoryScore,
                roleBoost: roleScore,
                timeSensitivity: timeScore,
                departmentBoost: options.departmentPriority ? 1 : 0
            }
        };
    }

    /**
     * Compare two waitlist entries
     * @param {Object} entry1 - First waitlist entry
     * @param {Object} entry2 - Second waitlist entry
     * @returns {number} Comparison result (-1, 0, 1)
     */
    compare(entry1, entry2) {
        // Higher priority comes first
        if (entry1.priority !== entry2.priority) {
            return entry2.priority - entry1.priority;
        }

        // If same priority, earlier creation time comes first
        const time1 = new Date(entry1.created_at);
        const time2 = new Date(entry2.created_at);
        return time1 - time2;
    }

    /**
     * Sort waitlist entries by priority
     * @param {Array} entries - Waitlist entries
     * @returns {Array} Sorted entries
     */
    sortWaitlist(entries) {
        return entries.sort((a, b) => this.compare(a, b));
    }

    /**
     * Get position in waitlist
     * @param {Array} entries - All waitlist entries
     * @param {Object} targetEntry - Entry to find position for
     * @returns {number} Position (1-based)
     */
    getPosition(entries, targetEntry) {
        const sorted = this.sortWaitlist([...entries]);
        const index = sorted.findIndex(e => e.id === targetEntry.id);
        return index >= 0 ? index + 1 : -1;
    }

    /**
     * Recalculate priorities for all waitlist entries
     * @param {Array} entries - Waitlist entries with event and user data
     * @returns {Array} Entries with updated priorities
     */
    recalculateAll(entries) {
        return entries.map(entry => ({
            ...entry,
            calculatedPriority: this.calculate(entry.event, entry.user),
            priorityDetails: this.calculateWithReason(entry.event, entry.user)
        }));
    }
}

// Create singleton instance
const priorityCalculator = new PriorityCalculator();

module.exports = {
    priorityCalculator,
    PriorityCalculator
};
