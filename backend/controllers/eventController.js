const supabase = require('../config/supabase');
const { createNotification } = require('./notificationController');
const { eventBus, EVENTS } = require('../utils/EventBus');
const { venueRecommender } = require('../utils/VenueRecommender');

exports.createEvent = async (req, res) => {
    try {
        const {
            title,
            description,
            category,
            expectedAttendance,
            startDateTime,
            endDateTime,
            priority,
            requiredResources,
            isRecurring,
            recurrencePattern
        } = req.body;

        if (new Date(endDateTime) <= new Date(startDateTime)) {
            return res.status(400).json({
                success: false,
                message: 'End time must be after start time'
            });
        }

        const { data: event, error } = await supabase
            .from('events')
            .insert({
                title,
                description,
                category,
                expected_attendance: expectedAttendance,
                start_datetime: startDateTime,
                end_datetime: endDateTime,
                priority: priority || 'medium',
                required_resources: requiredResources || [],
                created_by: req.user.id,
                is_recurring: isRecurring || false,
                recurrence_pattern: recurrencePattern || null,
                status: 'pending'
            })
            .select()
            .single();

        if (error) throw error;

        // Emit event created for notifications
        await eventBus.emit(EVENTS.EVENT_CREATED, {
            eventId: event.id,
            eventTitle: event.title,
            createdBy: req.user.id
        });

        // Get venue recommendations
        let venueRecommendations = [];
        if (expectedAttendance && startDateTime && endDateTime) {
            venueRecommendations = await venueRecommender.recommendVenues({
                expectedAttendance,
                requiredResources: requiredResources || [],
                startDateTime,
                endDateTime,
                category: category || 'other',
                priority: priority || 'medium'
            });
        }

        res.status(201).json({
            success: true,
            message: 'Event created successfully',
            event,
            venueRecommendations: venueRecommendations.slice(0, 5) // Top 5 recommendations
        });
    } catch (error) {
        console.error('Create event error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.getEvents = async (req, res) => {
    try {
        let query = supabase
            .from('events')
            .select('*');

        if (req.user.role !== 'admin') {
            query = query.or(`created_by.eq.${req.user.id},status.eq.approved`);
        }
        if (req.query.status) {
            query = query.eq('status', req.query.status);
        }
        if (req.query.category) {
            query = query.eq('category', req.query.category);
        }

        const { data: events, error } = await query.order('start_datetime', { ascending: true });

        if (error) throw error;

        const userIds = [...new Set(events.map(e => e.created_by).filter(Boolean))];
        let profileMap = {};
        
        if (userIds.length > 0) {
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, first_name, last_name, role')
                .in('id', userIds);
            
            profiles?.forEach(p => profileMap[p.id] = p);
        }

        const eventsWithCreator = events.map(e => ({
            ...e,
            creator: profileMap[e.created_by] || null
        }));

        res.json({
            success: true,
            count: eventsWithCreator.length,
            events: eventsWithCreator
        });
    } catch (error) {
        console.error('Get events error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.getEventById = async (req, res) => {
    try {
        const { id } = req.params;

        const { data: event, error } = await supabase
            .from('events')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }

        const { data: creator } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', event.created_by)
            .single();

        res.json({
            success: true,
            event: {
                ...event,
                creator: creator || null
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.updateEvent = async (req, res) => {
    try {
        const { id } = req.params;

        const { data: existing } = await supabase
            .from('events')
            .select('created_by, status')
            .eq('id', id)
            .single();

        if (!existing) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }

        if (existing.created_by !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized to edit this event'
            });
        }

        if (existing.status === 'approved' && req.user.role !== 'admin') {
            return res.status(400).json({
                success: false,
                message: 'Cannot edit approved event. Contact admin.'
            });
        }

        const updates = req.body;
        delete updates.created_by;

        const { data: event, error } = await supabase
            .from('events')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            message: 'Event updated successfully',
            event
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.deleteEvent = async (req, res) => {
    try {
        const { id } = req.params;

        const { data: existing } = await supabase
            .from('events')
            .select('created_by')
            .eq('id', id)
            .single();

        if (!existing) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }

        if (existing.created_by !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized'
            });
        }

        const { error } = await supabase
            .from('events')
            .update({ status: 'cancelled' })
            .eq('id', id);

        if (error) throw error;

        // Get affected users (those with bookings for this event)
        const { data: affectedBookings } = await supabase
            .from('bookings')
            .select('booked_by')
            .eq('event_id', id)
            .in('status', ['pending', 'confirmed']);

        const affectedUserIds = affectedBookings ? 
            [...new Set(affectedBookings.map(b => b.booked_by))] : [];

        // Emit event cancelled
        await eventBus.emit(EVENTS.EVENT_CANCELLED, {
            eventId: id,
            eventTitle: existing.title || 'Event',
            affectedUserIds
        });

        res.json({
            success: true,
            message: 'Event cancelled successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.approveEvent = async (req, res) => {
    try {
        const { id } = req.params;

        const { data: eventBefore, error: eventError } = await supabase
            .from('events')
            .select('title, created_by, status')
            .eq('id', id)
            .single();

        if (eventError || !eventBefore) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }

        const { data: event, error } = await supabase
            .from('events')
            .update({
                status: 'approved',
                approved_by: req.user.id,
                approved_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        // Emit event for notification system
        await eventBus.emit(EVENTS.EVENT_APPROVED, {
            eventId: id,
            eventTitle: eventBefore.title,
            userId: eventBefore.created_by
        });

        // Also update related bookings if any
        await supabase
            .from('bookings')
            .update({ status: 'confirmed' })
            .eq('event_id', id)
            .eq('status', 'pending');

        res.json({
            success: true,
            message: 'Event approved successfully',
            event
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.updateStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['approved', 'rejected', 'pending'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }

        const { data: eventBefore, error: eventError } = await supabase
            .from('events')
            .select('title, created_by, status')
            .eq('id', id)
            .single();

        if (eventError || !eventBefore) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }

        const { data: event, error } = await supabase
            .from('events')
            .update({
                status,
                approved_by: req.user.id,
                approved_at: status === 'approved' ? new Date().toISOString() : null
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        // Emit events for notification system
        if (status === 'approved') {
            await eventBus.emit(EVENTS.EVENT_APPROVED, {
                eventId: id,
                eventTitle: eventBefore.title,
                userId: eventBefore.created_by
            });

            // Also update related bookings if any
            await supabase
                .from('bookings')
                .update({ status: 'confirmed' })
                .eq('event_id', id)
                .eq('status', 'pending');

        } else if (status === 'rejected') {
            await eventBus.emit(EVENTS.EVENT_REJECTED, {
                eventId: id,
                eventTitle: eventBefore.title,
                userId: eventBefore.created_by,
                reason: req.body.reason || ''
            });

            // Cancel related bookings
            await supabase
                .from('bookings')
                .update({ 
                    status: 'cancelled',
                    cancellation_reason: 'Event rejected by admin'
                })
                .eq('event_id', id)
                .in('status', ['pending', 'confirmed']);
        }

        res.json({
            success: true,
            message: `Event ${status} successfully`,
            event
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
