const supabase = require('../config/supabase');

exports.getDashboardStats = async (req, res) => {
    try {
        // Count venues
        const { count: venueCount, error: venueError } = await supabase
            .from('venues')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true);

        // Count events
        const { count: eventCount, error: eventError } = await supabase
            .from('events')
            .select('*', { count: 'exact', head: true });

        // Count bookings
        const { count: bookingCount, error: bookingError } = await supabase
            .from('bookings')
            .select('*', { count: 'exact', head: true });

        // Count users (profiles)
        const { count: userCount, error: userError } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true });

        if (venueError || eventError || bookingError || userError) {
            throw new Error('Failed to fetch counts');
        }

        res.json({
            success: true,
            stats: {
                totalVenues: venueCount || 0,
                totalEvents: eventCount || 0,
                totalBookings: bookingCount || 0,
                totalUsers: userCount || 0
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.getEventStatusBreakdown = async (req, res) => {
    try {
        const { data: events, error } = await supabase
            .from('events')
            .select('status');

        if (error) throw error;

        const breakdown = {
            pending: 0,
            approved: 0,
            rejected: 0,
            cancelled: 0
        };

        events.forEach(e => {
            if (breakdown[e.status] !== undefined) {
                breakdown[e.status]++;
            }
        });

        res.json({
            success: true,
            breakdown
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.getEventsByCategory = async (req, res) => {
    try {
        const { data: events, error } = await supabase
            .from('events')
            .select('category');

        if (error) throw error;

        const categories = {};

        events.forEach(e => {
            categories[e.category] = (categories[e.category] || 0) + 1;
        });

        res.json({
            success: true,
            categories
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.getVenueUtilization = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        let query = supabase
            .from('bookings')
            .select('venue_id, start_datetime, end_datetime, status')
            .eq('status', 'confirmed');

        if (startDate) {
            query = query.gte('start_datetime', startDate);
        }
        if (endDate) {
            query = query.lte('start_datetime', endDate);
        }

        const { data: bookings, error } = await query;

        if (error) throw error;

        // Calculate hours booked per venue
        const venueHours = {};
        bookings.forEach(b => {
            const hours = (new Date(b.end_datetime) - new Date(b.start_datetime)) / (1000 * 60 * 60);
            venueHours[b.venue_id] = (venueHours[b.venue_id] || 0) + hours;
        });

        // Get venue names
        const venueIds = Object.keys(venueHours);
        let venueMap = {};
        
        if (venueIds.length > 0) {
            const { data: venues } = await supabase
                .from('venues')
                .select('id, name')
                .in('id', venueIds);
            
            venues?.forEach(v => venueMap[v.id] = v.name);
        }

        const utilization = Object.entries(venueHours).map(([id, hours]) => ({
            venueId: id,
            venueName: venueMap[id] || `Venue ${id}`,
            hoursBooked: Math.round(hours * 10) / 10
        }));

        res.json({
            success: true,
            utilization
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};