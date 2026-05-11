const supabase = require('../config/supabase');

// Create waitlist entry (called when booking conflicts)
exports.createWaitlist = async (req, res) => {
    try {
        const { eventId, venueId, startDateTime, endDateTime } = req.body;

        // 1. Verify event exists and belongs to user
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

        // 5. If NO conflicts, create booking directly (not waitlist)
        if (!conflicts || conflicts.length === 0) {
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

            return res.status(201).json({
                success: true,
                message: 'Booking created successfully (no conflicts)',
                booking
            });
        }

        // 6. CONFLICTS EXIST — Add to waitlist
        const priorityWeights = { low: 1, medium: 2, high: 3, urgent: 4 };
        let calculatedPriority = priorityWeights[event.priority] || 2;
        if (event.category === 'academic') calculatedPriority += 1;

        const { data: waitlistEntry, error: waitlistError } = await supabase
            .from('waitlists')
            .insert({
                booking_request_id: eventId,
                venue_id: venueId,
                requested_start_time: startDateTime,
                requested_end_time: endDateTime,
                priority: calculatedPriority,
                priority_reason: 'event_type',
                status: 'waiting',
                user_id: req.user.id
            })
            .select()
            .single();

        if (waitlistError) throw waitlistError;

        // Get alternative slots for response
        const alternatives = await getAlternativeSlots(venueId, startDateTime, endDateTime);

        res.status(409).json({
            success: false,
            message: 'Venue is booked. You have been added to the waitlist!',
            waitlist: true,
            waitlistId: waitlistEntry.id,
            conflicts: conflicts.map(c => ({
                id: c.id,
                start: c.start_datetime,
                end: c.end_datetime
            })),
            alternatives
        });

    } catch (error) {
        console.error('Create waitlist error:', error);
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

    for (let hour = 8; hour < 22; hour++) {
        for (let min of [0, 30]) {
            const slotStart = new Date(`${date}T${String(hour).padStart(2,'0')}:${String(min).padStart(2,'0')}:00`);
            const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60000);

            if (slotEnd.getHours() > 22 || (slotEnd.getHours() === 22 && slotEnd.getMinutes() > 0)) continue;

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

// Get all waitlists for current user (or all for admin)
exports.getWaitlists = async (req, res) => {
    try {
        let query = supabase
            .from('waitlists')
            .select(`
                *,
                event:events!fk_waitlists_booking_request_id_events (title, category, status, priority),
                venue:venues!fk_waitlists_venue_id_venues (name, capacity, location)
            `);

        if (req.user.role !== 'admin') {
            query = query.eq('user_id', req.user.id);
        }

        const { data: waitlists, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;

        res.json({
            success: true,
            count: waitlists.length,
            waitlists
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get single waitlist entry
exports.getWaitlistById = async (req, res) => {
    try {
        const { id } = req.params;

        const { data: waitlist, error } = await supabase
            .from('waitlists')
            .select(`
                *,
                event:events!fk_waitlists_booking_request_id_events (*),
                venue:venues!fk_waitlists_venue_id_venues (*)
            `)
            .eq('id', id)
            .single();

        if (error) throw error;
        if (!waitlist) {
            return res.status(404).json({
                success: false,
                message: 'Waitlist entry not found'
            });
        }

        if (waitlist.user_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized'
            });
        }

        res.json({
            success: true,
            waitlist
        });
    } catch (error) {
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
            message: 'Waitlist entry cancelled successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Auto-process waitlist when slot opens (called from cancelBooking)
exports.autoProcessWaitlist = async (venueId, startTime, endTime, adminUserId) => {
    try {
        // Find highest priority waitlist entry for this venue/time
        const { data: candidates, error } = await supabase
            .from('waitlists')
            .select(`
                *,
                event:events!fk_waitlists_booking_request_id_events (*)
            `)
            .eq('venue_id', venueId)
            .eq('status', 'waiting')
            .lte('requested_start_time', endTime)
            .gte('requested_end_time', startTime)
            .order('priority', { ascending: false })
            .order('created_at', { ascending: true })
            .limit(1);

        if (error || !candidates || candidates.length === 0) {
            return { processed: false, message: 'No waitlist entries found' };
        }

        const candidate = candidates[0];

        // Double-check slot is still available
        const { data: conflicts } = await supabase
            .from('bookings')
            .select('id')
            .eq('venue_id', venueId)
            .in('status', ['confirmed', 'pending'])
            .lt('start_datetime', candidate.requested_end_time)
            .gt('end_datetime', candidate.requested_start_time)
            .limit(1);

        if (conflicts && conflicts.length > 0) {
            return { processed: false, message: 'Slot filled by another booking' };
        }

        // Create confirmed booking for waitlisted user
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
                approved_by: adminUserId,
                approved_at: new Date().toISOString()
            })
            .select()
            .single();

        if (bookingError) throw bookingError;

        // Update waitlist entry to promoted
        await supabase
            .from('waitlists')
            .update({
                status: 'promoted',
                promoted_at: new Date().toISOString()
            })
            .eq('id', candidate.id);

        // Approve the event
        await supabase
            .from('events')
            .update({ status: 'approved' })
            .eq('id', candidate.booking_request_id);

        // Create notification for user
        await supabase
            .from('notifications')
            .insert({
                user_id: candidate.user_id,
                type: 'waitlist_promotion',
                title: 'Waitlist Promotion!',
                message: `Your waitlist request for ${candidate.event?.title || 'event'} has been promoted to a confirmed booking!`,
                is_read: false,
                related_id: newBooking.id,
                related_type: 'booking'
            });

        return {
            processed: true,
            message: 'Waitlist entry promoted',
            booking: newBooking
        };

    } catch (error) {
        console.error('Auto-process waitlist error:', error);
        return { processed: false, message: error.message };
    }
};

// Admin manual process waitlist endpoint
exports.processWaitlist = async (req, res) => {
    try {
        const { venueId, startTime, endTime } = req.body;

        const result = await exports.autoProcessWaitlist(venueId, startTime, endTime, req.user.id);

        if (result.processed) {
            res.json({
                success: true,
                message: 'Waitlist processed successfully',
                booking: result.booking
            });
        } else {
            res.status(400).json({
                success: false,
                message: result.message
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};