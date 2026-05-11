const supabase = require('../config/supabase');

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

        res.status(201).json({
            success: true,
            message: 'Event created successfully',
            event
        });
    } catch (error) {
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
            .select(`
                *,
                creator:profiles!fk_events_created_by_profiles (first_name, last_name, role)
            `);

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

        res.json({
            success: true,
            count: events.length,
            events
        });
    } catch (error) {
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
            .select(`
                *,
                creator:profiles!fk_events_created_by_profiles (first_name, last_name)
            `)
            .eq('id', id)
            .single();

        if (error) throw error;
        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }

        res.json({
            success: true,
            event
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