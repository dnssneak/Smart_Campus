const supabase = require('../config/supabase');

// Create booking (connects event + venue)
exports.createBooking = async (req, res) => {
    try {
        const { eventId, venueId, startDateTime, endDateTime } = req.body;

        // 1. Verify event exists and belongs to user (or user is admin)
        const { data: event, error: eventError } = await supabase
            .from('events')
            .select('*')
            .eq('id', eventId)
            .single();

        if (eventError || !event) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }

        if (event.created_by !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized: This is not your event'
            });
        }

        // 2. Verify venue exists
        const { data: venue, error: venueError } = await supabase
            .from('venues')
            .select('*')
            .eq('id', venueId)
            .eq('is_active', true)
            .single();

        if (venueError || !venue) {
            return res.status(404).json({
                success: false,
                message: 'Venue not found or inactive'
            });
        }

        // 3. Check capacity
        if (event.expected_attendance && event.expected_attendance > venue.capacity) {
            return res.status(400).json({
                success: false,
                message: `Venue capacity (${venue.capacity}) is less than expected attendance (${event.expected_attendance})`
            });
        }

        // 4. CHECK CONFLICTS — CSP / Graph Coloring core logic
        const { data: conflicts, error: conflictError } = await supabase
            .from('bookings')
            .select('*')
            .eq('venue_id', venueId)
            .in('status', ['confirmed', 'pending'])
            .lt('start_datetime', endDateTime)
            .gt('end_datetime', startDateTime);

        if (conflictError) throw conflictError;

        if (conflicts && conflicts.length > 0) {
            // Get alternative slots
            const alternatives = await getAlternativeSlots(venueId, startDateTime, endDateTime);
            
            return res.status(409).json({
                success: false,
                message: 'Venue is not available at requested time',
                conflicts: conflicts.map(c => ({
                    id: c.id,
                    start: c.start_datetime,
                    end: c.end_datetime
                })),
                alternatives
            });
        }

        // 5. Create booking
        const { data: booking, error: bookingError } = await supabase
            .from('bookings')
            .insert({
                event_id: eventId,
                venue_id: venueId,
                start_datetime: startDateTime,
                end_datetime: endDateTime,
                status: 'pending',
                conflict_status: 'none',
                booked_by: req.user.id
            })
            .select()
            .single();

        if (bookingError) throw bookingError;

        // 6. Update event status to approved if auto-approve (optional)
        // For now, keep event pending until admin approves

        res.status(201).json({
            success: true,
            message: 'Booking request submitted successfully',
            booking
        });

    } catch (error) {
        console.error('Create booking error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get alternative time slots (Recommendation engine)
async function getAlternativeSlots(venueId, preferredStart, preferredEnd, durationMinutes = null) {
    if (!durationMinutes) {
        durationMinutes = (new Date(preferredEnd) - new Date(preferredStart)) / 60000;
    }

    const date = new Date(preferredStart).toISOString().split('T')[0];
    const alternatives = [];

    // Check every 30 min from 8 AM to 10 PM
    for (let hour = 8; hour < 22; hour++) {
        for (let min of [0, 30]) {
            const slotStart = new Date(`${date}T${String(hour).padStart(2,'0')}:${String(min).padStart(2,'0')}:00`);
            const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60000);

            if (slotEnd.getHours() > 22) continue;

            // Check if available
            const { data: existing } = await supabase
                .from('bookings')
                .select('id')
                .eq('venue_id', venueId)
                .in('status', ['confirmed', 'pending'])
                .lt('start_datetime', slotEnd.toISOString())
                .gt('end_datetime', slotStart.toISOString())
                .limit(1);

            if (!existing || existing.length === 0) {
                alternatives.push({
                    start: slotStart.toISOString(),
                    end: slotEnd.toISOString()
                });
                if (alternatives.length >= 5) break;
            }
        }
        if (alternatives.length >= 5) break;
    }

    return alternatives;
}

// Get all bookings
exports.getBookings = async (req, res) => {
    try {
        let query = supabase
            .from('bookings')
            .select(`
                *,
                events:event_id (title, category, status, priority),
                venues:venue_id (name, capacity, location)
            `);

        // Non-admins see only their bookings
        if (req.user.role !== 'admin') {
            query = query.eq('booked_by', req.user.id);
        }

        const { data: bookings, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;

        res.json({
            success: true,
            count: bookings.length,
            bookings
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get single booking
exports.getBookingById = async (req, res) => {
    try {
        const { id } = req.params;

        const { data: booking, error } = await supabase
            .from('bookings')
            .select(`
                *,
                events:event_id (*),
                venues:venue_id (*)
            `)
            .eq('id', id)
            .single();

        if (error) throw error;
        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        // Check authorization
        if (booking.booked_by !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized'
            });
        }

        res.json({
            success: true,
            booking
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Approve booking (admin only)
exports.approveBooking = async (req, res) => {
    try {
        const { id } = req.params;

        const { data: booking, error } = await supabase
            .from('bookings')
            .update({
                status: 'confirmed',
                approved_by: req.user.id,
                approved_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        // Also approve the associated event
        if (booking) {
            await supabase
                .from('events')
                .update({ status: 'approved' })
                .eq('id', booking.event_id);
        }

        res.json({
            success: true,
            message: 'Booking approved',
            booking
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Cancel booking
exports.cancelBooking = async (req, res) => {
    try {
        const { id } = req.params;

        const { data: existing } = await supabase
            .from('bookings')
            .select('booked_by, event_id')
            .eq('id', id)
            .single();

        if (!existing) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        if (existing.booked_by !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized'
            });
        }

        const { error } = await supabase
            .from('bookings')
            .update({ status: 'cancelled' })
            .eq('id', id);

        if (error) throw error;

        // Check waitlist for this venue/time
        await processWaitlist(existing.event_id);

        res.json({
            success: true,
            message: 'Booking cancelled successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Process waitlist when booking cancelled
async function processWaitlist(eventId) {
    // Simple waitlist check — will expand in Phase 8
    const { data: waitlistItems } = await supabase
        .from('waitlists')
        .select('*')
        .eq('status', 'waiting')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(1);

    if (waitlistItems && waitlistItems.length > 0) {
        console.log('Waitlist items found:', waitlistItems.length);
        // Will promote in Phase 8
    }
}