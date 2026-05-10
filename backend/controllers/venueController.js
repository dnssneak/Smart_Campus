const supabase = require('../config/supabase');

// Get all venues
exports.getAllVenues = async (req, res) => {
    try {
        const { data: venues, error } = await supabase
            .from('venues')
            .select('*')
            .eq('is_active', true)
            .order('id');

        if (error) throw error;

        res.json({
            success: true,
            count: venues.length,
            venues
        });
    } catch (error) {
        console.error('Get venues error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get single venue by ID
exports.getVenueById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const { data: venue, error } = await supabase
            .from('venues')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        if (!venue) return res.status(404).json({ success: false, message: 'Venue not found' });

        res.json({ success: true, venue });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get venue availability for a date
exports.getVenueAvailability = async (req, res) => {
    try {
        const { id } = req.params;
        const { date } = req.query; // YYYY-MM-DD

        if (!date) {
            return res.status(400).json({ success: false, message: 'Date parameter required (YYYY-MM-DD)' });
        }

        // Get bookings for this venue on this date
        const startOfDay = `${date}T00:00:00`;
        const endOfDay = `${date}T23:59:59`;

        const { data: bookings, error } = await supabase
            .from('bookings')
            .select('start_datetime, end_datetime, status')
            .eq('venue_id', id)
            .in('status', ['confirmed', 'pending'])
            .gte('start_datetime', startOfDay)
            .lte('start_datetime', endOfDay);

        if (error) throw error;

        // Generate time slots (8 AM to 10 PM, 1-hour slots)
        const slots = [];
        for (let hour = 8; hour < 22; hour++) {
            const slotStart = `${date}T${String(hour).padStart(2, '0')}:00:00`;
            const slotEnd = `${date}T${String(hour + 1).padStart(2, '0')}:00:00`;

            const isBooked = bookings?.some(b => {
                const bStart = new Date(b.start_datetime);
                const bEnd = new Date(b.end_datetime);
                const sStart = new Date(slotStart);
                const sEnd = new Date(slotEnd);
                return bStart < sEnd && bEnd > sStart;
            }) || false;

            slots.push({
                start: slotStart,
                end: slotEnd,
                available: !isBooked
            });
        }

        res.json({
            success: true,
            venueId: id,
            date,
            slots
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Create venue (admin only)
exports.createVenue = async (req, res) => {
    try {
        const { name, description, capacity, location, facilities, equipment } = req.body;

        const { data: venue, error } = await supabase
            .from('venues')
            .insert({
                name,
                description,
                capacity,
                location,
                facilities: facilities || [],
                equipment: equipment || [],
                is_active: true
            })
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({
            success: true,
            message: 'Venue created successfully',
            venue
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update venue (admin only)
exports.updateVenue = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const { data: venue, error } = await supabase
            .from('venues')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            message: 'Venue updated successfully',
            venue
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Delete venue (soft delete - admin only)
exports.deleteVenue = async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('venues')
            .update({ is_active: false })
            .eq('id', id);

        if (error) throw error;

        res.json({
            success: true,
            message: 'Venue deleted successfully'
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};