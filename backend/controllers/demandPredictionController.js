const supabase = require('../config/supabase');

/**
 * Demand Prediction & Recommendation Controller
 * FR-DP-01: Analyze historical booking data
 * FR-DP-02: Identify peak hours, high-demand venues, frequently booked days
 * FR-DP-03: Recommend suitable venues, less congested slots, optimal schedules
 * FR-DP-04: Generate analytics-based suggestions
 */

// FR-DP-01 & FR-DP-02: Analyze historical booking data and identify patterns
const getBookingAnalytics = async (req, res) => {
    try {
        const { days = 30 } = req.query;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));

        // Get all confirmed bookings in the period
        const { data: bookings, error } = await supabase
            .from('bookings')
            .select(`
                *,
                venues!bookings_venue_id_fkey (id, name, capacity, location)
            `)
            .eq('status', 'confirmed')
            .gte('start_datetime', startDate.toISOString())
            .order('start_datetime', { ascending: true });

        if (error) throw error;

        // Analyze peak hours
        const hourlyDistribution = {};
        for (let i = 0; i < 24; i++) {
            hourlyDistribution[i] = 0;
        }

        // Analyze venue demand
        const venueDemand = {};

        // Analyze day of week patterns
        const dayOfWeekDistribution = {
            0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0
        };

        bookings.forEach(booking => {
            const startTime = new Date(booking.start_datetime);
            const hour = startTime.getHours();
            const dayOfWeek = startTime.getDay();

            // Count bookings per hour
            hourlyDistribution[hour]++;

            // Count bookings per day of week
            dayOfWeekDistribution[dayOfWeek]++;

            // Count bookings per venue
            const venueId = booking.venue_id;
            if (!venueDemand[venueId]) {
                venueDemand[venueId] = {
                    id: venueId,
                    name: booking.venues?.name || 'Unknown',
                    capacity: booking.venues?.capacity || 0,
                    location: booking.venues?.location || '',
                    bookingCount: 0,
                    totalHours: 0
                };
            }
            venueDemand[venueId].bookingCount++;

            // Calculate hours
            const endTime = new Date(booking.end_datetime);
            const hours = (endTime - startTime) / (1000 * 60 * 60);
            venueDemand[venueId].totalHours += hours;
        });

        // Identify peak hours (top 5)
        const peakHours = Object.entries(hourlyDistribution)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([hour, count]) => ({
                hour: parseInt(hour),
                timeRange: `${hour}:00 - ${parseInt(hour) + 1}:00`,
                bookingCount: count
            }));

        // Identify high-demand venues (top 5)
        const highDemandVenues = Object.values(venueDemand)
            .sort((a, b) => b.bookingCount - a.bookingCount)
            .slice(0, 5)
            .map(venue => ({
                ...venue,
                utilizationRate: ((venue.totalHours / (parseInt(days) * 14)) * 100).toFixed(2) + '%'
            }));

        // Identify frequently booked days
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const frequentlyBookedDays = Object.entries(dayOfWeekDistribution)
            .sort((a, b) => b[1] - a[1])
            .map(([day, count]) => ({
                day: dayNames[parseInt(day)],
                dayOfWeek: parseInt(day),
                bookingCount: count
            }));

        res.json({
            success: true,
            analytics: {
                totalBookings: bookings.length,
                periodDays: parseInt(days),
                peakHours,
                highDemandVenues,
                frequentlyBookedDays,
                hourlyDistribution,
                venueDemand: Object.values(venueDemand)
            }
        });

    } catch (error) {
        console.error('Get booking analytics error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// FR-DP-03: Recommend suitable venues based on requirements
const recommendVenues = async (req, res) => {
    try {
        const { 
            expectedAttendance, 
            startDateTime, 
            endDateTime,
            category,
            requiredResources = []
        } = req.body;

        if (!expectedAttendance || !startDateTime || !endDateTime) {
            return res.status(400).json({
                success: false,
                message: 'Missing required parameters: expectedAttendance, startDateTime, endDateTime'
            });
        }

        // Get all active venues
        const { data: venues, error: venuesError } = await supabase
            .from('venues')
            .select('*')
            .eq('is_active', true);

        if (venuesError) throw venuesError;

        // Get historical data for each venue
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);

        const { data: historicalBookings, error: histError } = await supabase
            .from('bookings')
            .select('venue_id, start_datetime, end_datetime')
            .eq('status', 'confirmed')
            .gte('start_datetime', startDate.toISOString());

        if (histError) throw histError;

        // Calculate venue scores
        const scoredVenues = await Promise.all(venues.map(async venue => {
            let score = 0;

            // 1. Capacity match (40 points)
            const capacityRatio = expectedAttendance / venue.capacity;
            if (capacityRatio >= 0.7 && capacityRatio <= 0.9) {
                score += 40; // Perfect fit
            } else if (capacityRatio >= 0.5 && capacityRatio < 0.7) {
                score += 35; // Good fit
            } else if (capacityRatio >= 0.3 && capacityRatio < 0.5) {
                score += 25; // Spacious
            } else if (capacityRatio < 0.3) {
                score += 15; // Very spacious
            } else {
                score += 5; // Near/over capacity
            }

            // 2. Check availability (30 points)
            const { data: conflicts } = await supabase
                .from('bookings')
                .select('id')
                .eq('venue_id', venue.id)
                .in('status', ['confirmed', 'pending'])
                .lt('start_datetime', endDateTime)
                .gt('end_datetime', startDateTime)
                .limit(1);

            const isAvailable = !conflicts || conflicts.length === 0;
            score += isAvailable ? 30 : 0;

            // 3. Historical demand (lower is better for recommendations) (20 points)
            const venueBookings = historicalBookings.filter(b => b.venue_id === venue.id);
            const demandScore = Math.max(0, 20 - (venueBookings.length / 2));
            score += demandScore;

            // 4. Category match (10 points)
            if (category) {
                const venueName = venue.name.toLowerCase();
                if (category === 'academic' && venueName.includes('seminar')) score += 10;
                else if (category === 'sports' && venueName.includes('sports')) score += 10;
                else if (category === 'conference' && venueName.includes('conference')) score += 10;
                else score += 5;
            } else {
                score += 5;
            }

            return {
                ...venue,
                matchScore: Math.round(score),
                isAvailable,
                capacityMatch: getCapacityMatchLevel(venue.capacity, expectedAttendance),
                historicalBookings: venueBookings.length,
                recommendation: score >= 70 ? 'Highly Recommended' : score >= 50 ? 'Recommended' : 'Available'
            };
        }));

        // Sort by score and availability
        const recommendations = scoredVenues
            .sort((a, b) => {
                if (a.isAvailable !== b.isAvailable) return b.isAvailable ? 1 : -1;
                return b.matchScore - a.matchScore;
            })
            .slice(0, 10);

        res.json({
            success: true,
            recommendations
        });

    } catch (error) {
        console.error('Recommend venues error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// FR-DP-03: Recommend less congested time slots
const recommendTimeSlots = async (req, res) => {
    try {
        const { venueId, date, duration = 60 } = req.query;

        if (!venueId || !date) {
            return res.status(400).json({
                success: false,
                message: 'Missing required parameters: venueId, date'
            });
        }

        const targetDate = new Date(date);
        const slots = [];

        // Generate slots from 8 AM to 10 PM
        for (let hour = 8; hour < 22; hour++) {
            for (let minute of [0, 30]) {
                const slotStart = new Date(targetDate);
                slotStart.setHours(hour, minute, 0, 0);
                
                const slotEnd = new Date(slotStart);
                slotEnd.setMinutes(slotEnd.getMinutes() + parseInt(duration));

                if (slotEnd.getHours() >= 22) continue;

                // Check availability
                const { data: conflicts } = await supabase
                    .from('bookings')
                    .select('id')
                    .eq('venue_id', venueId)
                    .in('status', ['confirmed', 'pending'])
                    .lt('start_datetime', slotEnd.toISOString())
                    .gt('end_datetime', slotStart.toISOString())
                    .limit(1);

                const isAvailable = !conflicts || conflicts.length === 0;

                // Get historical demand for this time slot
                const startDate = new Date();
                startDate.setDate(startDate.getDate() - 30);

                const { data: historicalSlots } = await supabase
                    .from('bookings')
                    .select('id')
                    .eq('venue_id', venueId)
                    .eq('status', 'confirmed')
                    .gte('start_datetime', startDate.toISOString())
                    .lte('start_datetime', new Date().toISOString());

                const hourlyDemand = historicalSlots?.filter(b => {
                    const bookingHour = new Date(b.start_datetime).getHours();
                    return bookingHour === hour;
                }).length || 0;

                const congestionLevel = hourlyDemand > 10 ? 'High' : hourlyDemand > 5 ? 'Medium' : 'Low';

                slots.push({
                    startTime: slotStart.toISOString(),
                    endTime: slotEnd.toISOString(),
                    timeLabel: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
                    isAvailable,
                    congestionLevel,
                    historicalDemand: hourlyDemand,
                    recommended: isAvailable && congestionLevel === 'Low'
                });
            }
        }

        // Sort: available first, then by congestion level
        const sortedSlots = slots.sort((a, b) => {
            if (a.isAvailable !== b.isAvailable) return b.isAvailable ? 1 : -1;
            return a.historicalDemand - b.historicalDemand;
        });

        res.json({
            success: true,
            date: targetDate.toISOString().split('T')[0],
            venueId: parseInt(venueId),
            totalSlots: slots.length,
            availableSlots: slots.filter(s => s.isAvailable).length,
            recommendedSlots: slots.filter(s => s.recommended).slice(0, 5),
            allSlots: sortedSlots
        });

    } catch (error) {
        console.error('Recommend time slots error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// FR-DP-04: Generate analytics-based suggestions
const getOptimalScheduleSuggestions = async (req, res) => {
    try {
        const { expectedAttendance, category, duration = 60 } = req.query;

        // Get analytics for the past 30 days
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);

        const { data: bookings, error } = await supabase
            .from('bookings')
            .select(`
                *,
                venues!bookings_venue_id_fkey (name, capacity),
                events!bookings_event_id_fkey (category)
            `)
            .eq('status', 'confirmed')
            .gte('start_datetime', startDate.toISOString());

        if (error) throw error;

        // Analyze patterns
        const hourlySuccess = {};
        const daySuccess = {};
        const venueSuccess = {};

        bookings.forEach(booking => {
            const startTime = new Date(booking.start_datetime);
            const hour = startTime.getHours();
            const day = startTime.getDay();
            const venueId = booking.venue_id;

            hourlySuccess[hour] = (hourlySuccess[hour] || 0) + 1;
            daySuccess[day] = (daySuccess[day] || 0) + 1;
            venueSuccess[venueId] = (venueSuccess[venueId] || 0) + 1;
        });

        // Find optimal times (less congested)
        const optimalHours = Object.entries(hourlySuccess)
            .filter(([hour]) => parseInt(hour) >= 8 && parseInt(hour) < 22)
            .sort((a, b) => a[1] - b[1])
            .slice(0, 5)
            .map(([hour, count]) => ({
                hour: parseInt(hour),
                timeRange: `${hour}:00 - ${parseInt(hour) + 1}:00`,
                congestionLevel: count > 10 ? 'Low' : 'Very Low',
                bookingCount: count
            }));

        // Find optimal days
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const optimalDays = Object.entries(daySuccess)
            .sort((a, b) => a[1] - b[1])
            .slice(0, 3)
            .map(([day, count]) => ({
                day: dayNames[parseInt(day)],
                dayOfWeek: parseInt(day),
                congestionLevel: count > 20 ? 'Low' : 'Very Low',
                bookingCount: count
            }));

        // Generate suggestions
        const suggestions = {
            optimalTimeSlots: optimalHours,
            optimalDays: optimalDays,
            generalRecommendations: [
                'Book during off-peak hours (early morning or late afternoon) for better availability',
                'Weekends typically have lower demand for academic venues',
                'Consider booking 2-3 days in advance for better venue selection',
                'Mid-week days (Tuesday-Thursday) are popular, consider Monday or Friday'
            ]
        };

        if (expectedAttendance) {
            const { data: venues } = await supabase
                .from('venues')
                .select('*')
                .eq('is_active', true)
                .gte('capacity', parseInt(expectedAttendance));

            suggestions.suitableVenues = venues?.slice(0, 5).map(v => ({
                id: v.id,
                name: v.name,
                capacity: v.capacity,
                location: v.location
            }));
        }

        res.json({
            success: true,
            suggestions
        });

    } catch (error) {
        console.error('Get optimal schedule suggestions error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Helper function
function getCapacityMatchLevel(venueCapacity, expectedAttendance) {
    const ratio = expectedAttendance / venueCapacity;
    if (ratio >= 0.7 && ratio <= 0.9) return 'Perfect Fit';
    if (ratio >= 0.5 && ratio < 0.7) return 'Good Fit';
    if (ratio >= 0.3 && ratio < 0.5) return 'Spacious';
    if (ratio < 0.3) return 'Very Spacious';
    return 'Near Capacity';
}

module.exports = {
    getBookingAnalytics,
    recommendVenues,
    recommendTimeSlots,
    getOptimalScheduleSuggestions
};
