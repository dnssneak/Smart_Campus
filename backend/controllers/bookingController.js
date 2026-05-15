const supabase = require('../config/supabase');
const { eventBus, EVENTS } = require('../utils/EventBus');
const { priorityCalculator } = require('../utils/PriorityCalculator');

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

        // 5. If conflicts exist, AUTO-ADD TO WAITLIST
        if (conflicts && conflicts.length > 0) {
            // Get user profile for priority calculation
            const { data: userProfile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', req.user.id)
                .single();

            // Calculate priority using PriorityCalculator
            const calculatedPriority = priorityCalculator.calculate(event, userProfile || { role: 'student' });

            // Add to waitlist
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

            if (waitlistError) {
                return res.status(409).json({
                    success: false,
                    message: 'Venue unavailable. Waitlist failed.',
                    conflicts: conflicts.map(c => ({
                        id: c.id,
                        start: c.start_datetime,
                        end: c.end_datetime
                    }))
                });
            }

            // Get alternative slots for response
            const alternatives = await getAlternativeSlots(venueId, startDateTime, endDateTime);

            // Emit waitlist added event
            await eventBus.emit(EVENTS.WAITLIST_ADDED, {
                waitlistId: waitlistEntry.id,
                venueName: venue.name,
                position: calculatedPriority,
                userId: req.user.id
            });

            return res.status(409).json({
                success: false,
                message: 'Venue is booked. You have been added to the waitlist!',
                waitlist: true,
                waitlistId: waitlistEntry.id,
                priority: calculatedPriority,
                conflicts: conflicts.map(c => ({
                    id: c.id,
                    start: c.start_datetime,
                    end: c.end_datetime
                })),
                alternatives
            });
        }

        // 6. No conflicts — create booking
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

        // Emit booking requested event
        await eventBus.emit(EVENTS.BOOKING_REQUESTED, {
            bookingId: booking.id,
            venueName: venue.name,
            date: new Date(startDateTime).toLocaleDateString(),
            userId: req.user.id
        });

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

            if (slotEnd.getHours() > 22 || (slotEnd.getHours() === 22 && slotEnd.getMinutes() > 0)) continue;

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
                event:events!bookings_event_id_fkey (
                    id,
                    title,
                    category,
                    status,
                    priority,
                    description,
                    expected_attendance
                ),
                venue:venues!bookings_venue_id_fkey (
                    id,
                    name,
                    capacity,
                    location,
                    facilities,
                    equipment
                ),
                booked_by_profile:profiles!bookings_booked_by_fkey (
                    id,
                    first_name,
                    last_name,
                    role
                ),
                approved_by_profile:profiles!bookings_approved_by_fkey (
                    id,
                    first_name,
                    last_name,
                    role
                )
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
                event:events!bookings_event_id_fkey (*),
                venue:venues!bookings_venue_id_fkey (*),
                booked_by_profile:profiles!bookings_booked_by_fkey (
                    id,
                    first_name,
                    last_name,
                    role,
                    department
                ),
                approved_by_profile:profiles!bookings_approved_by_fkey (
                    id,
                    first_name,
                    last_name,
                    role
                )
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

            // Get venue name for notification
            const { data: venue } = await supabase
                .from('venues')
                .select('name')
                .eq('id', booking.venue_id)
                .single();

            // Emit booking approved event
            await eventBus.emit(EVENTS.BOOKING_APPROVED, {
                bookingId: booking.id,
                venueName: venue?.name || 'Venue',
                date: new Date(booking.start_datetime).toLocaleDateString(),
                userId: booking.booked_by
            });
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

// Cancel booking + AUTO-PROCESS WAITLIST
exports.cancelBooking = async (req, res) => {
    try {
        const { id } = req.params;

        const { data: existing } = await supabase
            .from('bookings')
            .select('booked_by, event_id, venue_id, start_datetime, end_datetime')
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

        // Cancel the booking
        const { error } = await supabase
            .from('bookings')
            .update({ 
                status: 'cancelled',
                cancelled_at: new Date().toISOString()
            })
            .eq('id', id);

        if (error) throw error;

        // Get venue name for notification
        const { data: venue } = await supabase
            .from('venues')
            .select('name')
            .eq('id', existing.venue_id)
            .single();

        // Emit booking cancelled event
        await eventBus.emit(EVENTS.BOOKING_CANCELLED, {
            bookingId: id,
            venueName: venue?.name || 'Venue',
            date: new Date(existing.start_datetime).toLocaleDateString(),
            userId: existing.booked_by
        });

        // AUTO-PROCESS WAITLIST for this venue/time slot
        const promotionResult = await autoProcessWaitlist(
            existing.venue_id,
            existing.start_datetime,
            existing.end_datetime,
            req.user.id
        );

        res.json({
            success: true,
            message: 'Booking cancelled successfully',
            waitlistProcessed: promotionResult.processed,
            promotedBooking: promotionResult.booking || null
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Auto-process waitlist when slot opens
async function autoProcessWaitlist(venueId, startTime, endTime, adminUserId) {
    try {
        // Find highest priority waitlist entry for this venue/time
        const { data: candidates, error } = await supabase
            .from('waitlists')
            .select(`
                *,
                events!waitlists_booking_request_id_fkey (*)
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

        // Get venue name
        const { data: venue } = await supabase
            .from('venues')
            .select('name')
            .eq('id', venueId)
            .single();

        // Emit waitlist promoted event
        await eventBus.emit(EVENTS.WAITLIST_PROMOTED, {
            bookingId: newBooking.id,
            venueName: venue?.name || 'Venue',
            userId: candidate.user_id
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
}

module.exports = {
    createBooking: exports.createBooking,
    getBookings: exports.getBookings,
    getBookingById: exports.getBookingById,
    approveBooking: exports.approveBooking,
    cancelBooking: exports.cancelBooking
};