const supabase = require('../config/supabase');

// Get user's waitlist — FIXED: No relationship query, manual join
exports.getMyWaitlist = async (req, res) => {
    try {
        // Get waitlist entries
        const { data: waitlist, error } = await supabase
            .from('waitlists')
            .select('*')
            .eq('user_id', req.user.id)
            .order('priority', { ascending: false })
            .order('created_at', { ascending: true });

        if (error) throw error;

        // Manually fetch related data
        const enrichedWaitlist = [];
        for (const entry of (waitlist || [])) {
            // Get event info
            const { data: event } = await supabase
                .from('events')
                .select('title, category, priority')
                .eq('id', entry.booking_request_id)
                .single();

            // Get venue info
            const { data: venue } = await supabase
                .from('venues')
                .select('name, location, capacity')
                .eq('id', entry.venue_id)
                .single();

            enrichedWaitlist.push({
                ...entry,
                events: event || { title: 'Unknown Event' },
                venues: venue || { name: 'Unknown Venue' }
            });
        }

        res.json({
            success: true,
            count: enrichedWaitlist.length,
            waitlist: enrichedWaitlist
        });
    } catch (error) {
        console.error('Get my waitlist error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get all waitlist (admin) — FIXED
exports.getAllWaitlist = async (req, res) => {
    try {
        const { status, venueId } = req.query;

        let query = supabase
            .from('waitlists')
            .select('*');

        if (status) query = query.eq('status', status);
        if (venueId) query = query.eq('venue_id', venueId);

        const { data: waitlist, error } = await query
            .order('priority', { ascending: false })
            .order('created_at', { ascending: true });

        if (error) throw error;

        // Manually enrich with related data
        const enrichedWaitlist = [];
        for (const entry of (waitlist || [])) {
            const { data: event } = await supabase
                .from('events')
                .select('title, category')
                .eq('id', entry.booking_request_id)
                .single();

            const { data: venue } = await supabase
                .from('venues')
                .select('name, location')
                .eq('id', entry.venue_id)
                .single();

            const { data: profile } = await supabase
                .from('profiles')
                .select('first_name, last_name, email')
                .eq('id', entry.user_id)
                .single();

            enrichedWaitlist.push({
                ...entry,
                events: event || { title: 'Unknown' },
                venues: venue || { name: 'Unknown' },
                profiles: profile || { first_name: 'Unknown', last_name: '', email: '' }
            });
        }

        res.json({
            success: true,
            count: enrichedWaitlist.length,
            waitlist: enrichedWaitlist
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Add to waitlist when booking conflicts
exports.addToWaitlist = async (req, res) => {
    try {
        const {
            eventId,
            venueId,
            requestedStartTime,
            requestedEndTime,
            priority = 0,
            priorityReason = 'request_time'
        } = req.body;

        // Get event for priority calculation
        const { data: event } = await supabase
            .from('events')
            .select('priority, category')
            .eq('id', eventId)
            .single();

        let calculatedPriority = priority;
        if (event) {
            const priorityWeights = { low: 1, medium: 2, high: 3, urgent: 4 };
            calculatedPriority = priorityWeights[event.priority] || 2;
            if (event.category === 'academic') calculatedPriority += 1;
        }

        const { data: waitlistEntry, error } = await supabase
            .from('waitlists')
            .insert({
                booking_request_id: eventId,
                venue_id: venueId,
                requested_start_time: requestedStartTime,
                requested_end_time: requestedEndTime,
                priority: calculatedPriority,
                priority_reason: priorityReason,
                status: 'waiting',
                user_id: req.user.id
            })
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({
            success: true,
            message: 'Added to waitlist',
            waitlistEntry
        });
    } catch (error) {
        console.error('Add to waitlist error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Process waitlist when booking cancelled
exports.processWaitlist = async (req, res) => {
    try {
        const { venueId, startTime, endTime } = req.body;

        // Find highest priority waitlist entry
        const { data: candidates, error } = await supabase
            .from('waitlists')
            .select('*')
            .eq('venue_id', venueId)
            .eq('status', 'waiting')
            .lte('requested_start_time', endTime)
            .gte('requested_end_time', startTime)
            .order('priority', { ascending: false })
            .order('created_at', { ascending: true })
            .limit(1);

        if (error) throw error;

        if (!candidates || candidates.length === 0) {
            return res.json({
                success: true,
                message: 'No waitlist entries found for this slot'
            });
        }

        const candidate = candidates[0];

        // Check slot is available
        const { data: conflicts } = await supabase
            .from('bookings')
            .select('id')
            .eq('venue_id', venueId)
            .in('status', ['confirmed', 'pending'])
            .lt('start_datetime', candidate.requested_end_time)
            .gt('end_datetime', candidate.requested_start_time)
            .limit(1);

        if (conflicts && conflicts.length > 0) {
            return res.json({
                success: false,
                message: 'Slot still not available'
            });
        }

        // Create booking
        const { data: newBooking, error: bookingError } = await supabase
            .from('bookings')
            .insert({
                event_id: candidate.booking_request_id,
                venue_id: venueId,
                start_datetime: candidate.requested_start_time,
                end_datetime: candidate.requested_end_time,
                status: 'confirmed',
                conflict_status: 'none',
                booked_by: candidate.user_id,
                approved_by: req.user.id,
                approved_at: new Date().toISOString()
            })
            .select()
            .single();

        if (bookingError) throw bookingError;

        // Update waitlist
        await supabase
            .from('waitlists')
            .update({
                status: 'promoted',
                promoted_at: new Date().toISOString()
            })
            .eq('id', candidate.id);

        // Approve event
        await supabase
            .from('events')
            .update({ status: 'approved' })
            .eq('id', candidate.booking_request_id);

        // Notify user
        const { data: event } = await supabase
            .from('events')
            .select('title')
            .eq('id', candidate.booking_request_id)
            .single();

        await supabase
            .from('notifications')
            .insert({
                user_id: candidate.user_id,
                type: 'waitlist_promotion',
                title: 'Waitlist Promotion!',
                message: `Your waitlist request for ${event?.title || 'event'} has been promoted to confirmed booking!`,
                is_read: false,
                related_id: newBooking.id,
                related_type: 'booking'
            });

        res.json({
            success: true,
            message: 'Waitlist entry promoted to booking',
            booking: newBooking
        });

    } catch (error) {
        console.error('Process waitlist error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Cancel waitlist entry
exports.cancelWaitlist = async (req, res) => {
    try {
        const { id } = req.params;

        const { data: existing } = await supabase
            .from('waitlists')
            .select('user_id')
            .eq('id', id)
            .single();

        if (!existing) {
            return res.status(404).json({
                success: false,
                message: 'Waitlist entry not found'
            });
        }

        if (existing.user_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized'
            });
        }

        const { error } = await supabase
            .from('waitlists')
            .update({ status: 'cancelled' })
            .eq('id', id);

        if (error) throw error;

        res.json({
            success: true,
            message: 'Waitlist entry cancelled'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
