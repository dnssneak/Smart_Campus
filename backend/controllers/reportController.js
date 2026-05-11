const supabase = require('../config/supabase');

// Dashboard overview stats
exports.getDashboardStats = async (req, res) => {
    try {
        // Total counts
        const { count: totalVenues } = await supabase
            .from('venues')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true);

        const { count: totalEvents } = await supabase
            .from('events')
            .select('*', { count: 'exact', head: true });

        const { count: totalBookings } = await supabase
            .from('bookings')
            .select('*', { count: 'exact', head: true });

        const { count: totalUsers } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true });

        // Status breakdowns
        const { data: eventStatus } = await supabase
            .from('events')
            .select('status')
            .order('status');

        const eventStatusCounts = {};
        eventStatus?.forEach(e => {
            eventStatusCounts[e.status] = (eventStatusCounts[e.status] || 0) + 1;
        });

        const { data: bookingStatus } = await supabase
            .from('bookings')
            .select('status')
            .order('status');

        const bookingStatusCounts = {};
        bookingStatus?.forEach(b => {
            bookingStatusCounts[b.status] = (bookingStatusCounts[b.status] || 0) + 1;
        });

        // Category breakdown
        const { data: categories } = await supabase
            .from('events')
            .select('category')
            .order('category');

        const categoryCounts = {};
        categories?.forEach(c => {
            categoryCounts[c.category] = (categoryCounts[c.category] || 0) + 1;
        });

        // Most booked venues
        const { data: venueBookings } = await supabase
            .from('bookings')
            .select('venue_id, venues:venue_id (name)')
            .eq('status', 'confirmed')
            .order('venue_id');

        const venueUsage = {};
        venueBookings?.forEach(b => {
            const name = b.venues?.name || 'Unknown';
            venueUsage[name] = (venueUsage[name] || 0) + 1;
        });

        // Monthly bookings trend (last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const { data: monthlyData } = await supabase
            .from('bookings')
            .select('created_at')
            .gte('created_at', sixMonthsAgo.toISOString())
            .order('created_at');

        const monthlyTrends = {};
        monthlyData?.forEach(b => {
            const month = new Date(b.created_at).toLocaleString('default', { month: 'short', year: 'numeric' });
            monthlyTrends[month] = (monthlyTrends[month] || 0) + 1;
        });

        res.json({
            success: true,
            stats: {
                totalVenues,
                totalEvents,
                totalBookings,
                totalUsers,
                eventStatusCounts,
                bookingStatusCounts,
                categoryCounts,
                venueUsage,
                monthlyTrends
            }
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Venue usage report
exports.getVenueUsageReport = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        let query = supabase
            .from('bookings')
            .select(`
                *,
                events:event_id (title, category),
                venues:venue_id (name, capacity, location)
            `)
            .eq('status', 'confirmed');

        if (startDate) query = query.gte('start_datetime', startDate);
        if (endDate) query = query.lte('end_datetime', endDate);

        const { data: bookings, error } = await query.order('start_datetime');

        if (error) throw error;

        // Calculate utilization per venue
        const venueStats = {};
        bookings?.forEach(b => {
            const venueName = b.venues?.name || 'Unknown';
            if (!venueStats[venueName]) {
                venueStats[venueName] = {
                    venue: venueName,
                    location: b.venues?.location,
                    capacity: b.venues?.capacity,
                    totalBookings: 0,
                    totalHours: 0,
                    events: []
                };
            }
            const hours = (new Date(b.end_datetime) - new Date(b.start_datetime)) / 3600000;
            venueStats[venueName].totalBookings++;
            venueStats[venueName].totalHours += hours;
            venueStats[venueName].events.push({
                title: b.events?.title,
                start: b.start_datetime,
                end: b.end_datetime
            });
        });

        res.json({
            success: true,
            count: bookings?.length || 0,
            venueStats: Object.values(venueStats)
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Event statistics report
exports.getEventStatsReport = async (req, res) => {
    try {
        const { category, status, startDate, endDate } = req.query;

        let query = supabase
            .from('events')
            .select(`
                *,
                profiles:created_by (first_name, last_name, role),
                bookings:event_id (id, status, venue_id, venues:venue_id (name))
            `);

        if (category) query = query.eq('category', category);
        if (status) query = query.eq('status', status);
        if (startDate) query = query.gte('start_datetime', startDate);
        if (endDate) query = query.lte('end_datetime', endDate);

        const { data: events, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;

        // Calculate stats
        const stats = {
            total: events?.length || 0,
            byCategory: {},
            byStatus: {},
            byPriority: {},
            withVenue: 0,
            withoutVenue: 0,
            upcoming: 0,
            past: 0
        };

        const now = new Date();

        events?.forEach(e => {
            // Category
            stats.byCategory[e.category] = (stats.byCategory[e.category] || 0) + 1;
            // Status
            stats.byStatus[e.status] = (stats.byStatus[e.status] || 0) + 1;
            // Priority
            stats.byPriority[e.priority] = (stats.byPriority[e.priority] || 0) + 1;
            // Venue booking
            const hasBooking = e.bookings && e.bookings.some(b => b.status === 'confirmed');
            if (hasBooking) stats.withVenue++;
            else stats.withoutVenue++;
            // Upcoming vs past
            if (new Date(e.start_datetime) > now) stats.upcoming++;
            else stats.past++;
        });

        res.json({
            success: true,
            stats,
            events: events?.map(e => ({
                id: e.id,
                title: e.title,
                category: e.category,
                status: e.status,
                priority: e.priority,
                start_datetime: e.start_datetime,
                expected_attendance: e.expected_attendance,
                creator: `${e.profiles?.first_name || ''} ${e.profiles?.last_name || ''}`,
                hasBooking: e.bookings?.some(b => b.status === 'confirmed'),
                venueName: e.bookings?.find(b => b.status === 'confirmed')?.venues?.name
            }))
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// User activity report (admin only)
exports.getUserActivityReport = async (req, res) => {
    try {
        const { data: users, error } = await supabase
            .from('profiles')
            .select(`
                id,
                first_name,
                last_name,
                email,
                role,
                department,
                created_at,
                events:created_by (count),
                bookings:booked_by (count)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const userStats = users?.map(u => ({
            id: u.id,
            name: `${u.first_name || ''} ${u.last_name || ''}`.trim(),
            email: u.email,
            role: u.role,
            department: u.department,
            memberSince: u.created_at,
            eventsCreated: u.events?.[0]?.count || 0,
            bookingsMade: u.bookings?.[0]?.count || 0
        }));

        res.json({
            success: true,
            count: userStats?.length || 0,
            users: userStats
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};