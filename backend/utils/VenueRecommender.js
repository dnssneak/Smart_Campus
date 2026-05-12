/**
 * VenueRecommender - Smart venue recommendation system
 * Matches venues to events based on multiple criteria
 */

const supabase = require('../config/supabase');

class VenueRecommender {
    /**
     * Recommend venues for an event
     * @param {Object} eventDetails - Event details
     * @returns {Array} Ranked list of venue recommendations
     */
    async recommendVenues(eventDetails) {
        const {
            expectedAttendance,
            requiredResources = [],
            startDateTime,
            endDateTime,
            category,
            priority
        } = eventDetails;

        try {
            // Step 1: Get all active venues
            const { data: venues, error } = await supabase
                .from('venues')
                .select('*')
                .eq('is_active', true);

            if (error) throw error;

            // Step 2: Filter and score venues
            const scoredVenues = await Promise.all(
                venues.map(async (venue) => {
                    // Check capacity
                    if (venue.capacity < expectedAttendance * 0.3) {
                        return null; // Too small
                    }

                    // Check availability
                    const isAvailable = await this.checkAvailability(
                        venue.id,
                        startDateTime,
                        endDateTime
                    );

                    // Calculate match score
                    const score = this.calculateMatchScore(venue, eventDetails);

                    return {
                        ...venue,
                        matchScore: score,
                        isAvailable,
                        capacityMatch: this.getCapacityMatchLevel(venue.capacity, expectedAttendance),
                        resourceMatch: this.calculateResourceMatch(venue, requiredResources)
                    };
                })
            );

            // Step 3: Filter out null values and sort
            const validVenues = scoredVenues
                .filter(v => v !== null)
                .sort((a, b) => {
                    // Prioritize available venues
                    if (a.isAvailable !== b.isAvailable) {
                        return b.isAvailable ? 1 : -1;
                    }
                    // Then by match score
                    return b.matchScore - a.matchScore;
                });

            return validVenues.slice(0, 10); // Return top 10
        } catch (error) {
            console.error('Venue recommendation error:', error);
            return [];
        }
    }

    /**
     * Calculate match score for a venue
     * @param {Object} venue - Venue object
     * @param {Object} eventDetails - Event details
     * @returns {number} Match score (0-100)
     */
    calculateMatchScore(venue, eventDetails) {
        let score = 0;
        const { expectedAttendance, requiredResources = [], category } = eventDetails;

        // 1. Capacity match (40 points)
        const capacityRatio = expectedAttendance / venue.capacity;
        if (capacityRatio >= 0.7 && capacityRatio <= 0.9) {
            score += 40; // Perfect fit
        } else if (capacityRatio >= 0.5 && capacityRatio < 0.7) {
            score += 35; // Good fit
        } else if (capacityRatio >= 0.3 && capacityRatio < 0.5) {
            score += 25; // Acceptable
        } else if (capacityRatio < 0.3) {
            score += 15; // Too large
        } else {
            score += 10; // Slightly over capacity
        }

        // 2. Resource match (30 points)
        const resourceScore = this.calculateResourceMatch(venue, requiredResources);
        score += resourceScore * 30;

        // 3. Historical usage (20 points) - placeholder for now
        // In production, this would check booking history
        score += 15;

        // 4. Category-specific bonus (10 points)
        if (category === 'academic' && venue.name.toLowerCase().includes('seminar')) {
            score += 10;
        } else if (category === 'sports' && venue.name.toLowerCase().includes('sports')) {
            score += 10;
        } else if (category === 'conference' && venue.name.toLowerCase().includes('conference')) {
            score += 10;
        } else {
            score += 5;
        }

        return Math.min(score, 100);
    }

    /**
     * Calculate resource match percentage
     * @param {Object} venue - Venue object
     * @param {Array} requiredResources - Required resources
     * @returns {number} Match percentage (0-1)
     */
    calculateResourceMatch(venue, requiredResources) {
        if (!requiredResources || requiredResources.length === 0) {
            return 1; // No requirements = perfect match
        }

        const venueFacilities = venue.facilities || [];
        const venueEquipment = venue.equipment || [];
        const allVenueResources = [...venueFacilities, ...venueEquipment];

        const matchedCount = requiredResources.filter(resource =>
            allVenueResources.some(vr =>
                vr.toLowerCase().includes(resource.toLowerCase()) ||
                resource.toLowerCase().includes(vr.toLowerCase())
            )
        ).length;

        return matchedCount / requiredResources.length;
    }

    /**
     * Check if venue is available for given time slot
     * @param {number} venueId - Venue ID
     * @param {string} startDateTime - Start date/time
     * @param {string} endDateTime - End date/time
     * @returns {boolean} True if available
     */
    async checkAvailability(venueId, startDateTime, endDateTime) {
        try {
            // Check for booking conflicts
            const { data: bookings, error } = await supabase
                .from('bookings')
                .select('id')
                .eq('venue_id', venueId)
                .in('status', ['confirmed', 'pending'])
                .lt('start_datetime', endDateTime)
                .gt('end_datetime', startDateTime)
                .limit(1);

            if (error) throw error;

            return bookings.length === 0;
        } catch (error) {
            console.error('Check availability error:', error);
            return false;
        }
    }

    /**
     * Get capacity match level description
     * @param {number} venueCapacity - Venue capacity
     * @param {number} expectedAttendance - Expected attendance
     * @returns {string} Match level description
     */
    getCapacityMatchLevel(venueCapacity, expectedAttendance) {
        const ratio = expectedAttendance / venueCapacity;
        if (ratio >= 0.7 && ratio <= 0.9) return 'Perfect Fit';
        if (ratio >= 0.5 && ratio < 0.7) return 'Good Fit';
        if (ratio >= 0.3 && ratio < 0.5) return 'Spacious';
        if (ratio < 0.3) return 'Very Spacious';
        return 'Near Capacity';
    }

    /**
     * Find alternative venues for same time
     * @param {number} originalVenueId - Original venue ID
     * @param {Object} eventDetails - Event details
     * @returns {Array} Alternative venues
     */
    async findAlternativeVenues(originalVenueId, eventDetails) {
        const recommendations = await this.recommendVenues(eventDetails);
        return recommendations.filter(v => v.id !== originalVenueId && v.isAvailable);
    }

    /**
     * Get venue utilization statistics
     * @param {number} venueId - Venue ID
     * @param {number} days - Number of days to look back
     * @returns {Object} Utilization stats
     */
    async getVenueUtilization(venueId, days = 30) {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            const { data: bookings, error } = await supabase
                .from('bookings')
                .select('start_datetime, end_datetime')
                .eq('venue_id', venueId)
                .eq('status', 'confirmed')
                .gte('start_datetime', startDate.toISOString());

            if (error) throw error;

            // Calculate total booked hours
            const totalHours = bookings.reduce((sum, booking) => {
                const start = new Date(booking.start_datetime);
                const end = new Date(booking.end_datetime);
                const hours = (end - start) / (1000 * 60 * 60);
                return sum + hours;
            }, 0);

            // Available hours (8 AM to 10 PM = 14 hours per day)
            const availableHours = days * 14;
            const utilizationPercentage = (totalHours / availableHours) * 100;

            return {
                totalBookings: bookings.length,
                totalHours: Math.round(totalHours * 10) / 10,
                availableHours,
                utilizationPercentage: Math.round(utilizationPercentage * 10) / 10,
                averageBookingDuration: bookings.length > 0 ? totalHours / bookings.length : 0
            };
        } catch (error) {
            console.error('Get venue utilization error:', error);
            return null;
        }
    }
}

// Create singleton instance
const venueRecommender = new VenueRecommender();

module.exports = {
    venueRecommender,
    VenueRecommender
};
