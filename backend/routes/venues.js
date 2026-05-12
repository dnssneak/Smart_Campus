const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const { venueRecommender } = require('../utils/VenueRecommender');

// Get all venues
router.get('/', auth, async (req, res) => {
    try {
        let query = supabase
            .from('venues')
            .select('*')
            .eq('is_active', true);

        const { data: venues, error } = await query.order('name');

        if (error) throw error;

        res.json({
            success: true,
            count: venues.length,
            venues
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Get venue by ID
router.get('/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;

        const { data: venue, error } = await supabase
            .from('venues')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        if (!venue) {
            return res.status(404).json({
                success: false,
                message: 'Venue not found'
            });
        }

        res.json({
            success: true,
            venue
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Get venue recommendations (NEW)
router.post('/recommendations', auth, async (req, res) => {
    try {
        const {
            expectedAttendance,
            requiredResources,
            startDateTime,
            endDateTime,
            category,
            priority
        } = req.body;

        if (!expectedAttendance || !startDateTime || !endDateTime) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: expectedAttendance, startDateTime, endDateTime'
            });
        }

        const recommendations = await venueRecommender.recommendVenues({
            expectedAttendance,
            requiredResources: requiredResources || [],
            startDateTime,
            endDateTime,
            category: category || 'other',
            priority: priority || 'medium'
        });

        res.json({
            success: true,
            count: recommendations.length,
            recommendations
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Get venue availability
router.get('/:id/availability', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const { startDateTime, endDateTime } = req.query;

        if (!startDateTime || !endDateTime) {
            return res.status(400).json({
                success: false,
                message: 'Missing required query parameters: startDateTime, endDateTime'
            });
        }

        // Check for conflicts
        const { data: conflicts, error } = await supabase
            .from('bookings')
            .select('*')
            .eq('venue_id', id)
            .in('status', ['confirmed', 'pending'])
            .lt('start_datetime', endDateTime)
            .gt('end_datetime', startDateTime);

        if (error) throw error;

        const isAvailable = conflicts.length === 0;

        res.json({
            success: true,
            isAvailable,
            conflicts: conflicts.map(c => ({
                id: c.id,
                start: c.start_datetime,
                end: c.end_datetime,
                status: c.status
            }))
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Get venue utilization stats (NEW)
router.get('/:id/utilization', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const { days } = req.query;

        const stats = await venueRecommender.getVenueUtilization(
            parseInt(id),
            days ? parseInt(days) : 30
        );

        if (!stats) {
            return res.status(404).json({
                success: false,
                message: 'Unable to calculate utilization'
            });
        }

        res.json({
            success: true,
            utilization: stats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Create venue (admin only)
router.post('/', auth, roleCheck(['admin']), async (req, res) => {
    try {
        const {
            name,
            description,
            capacity,
            location,
            facilities,
            equipment,
            imageUrl
        } = req.body;

        const { data: venue, error } = await supabase
            .from('venues')
            .insert({
                name,
                description,
                capacity,
                location,
                facilities: facilities || [],
                equipment: equipment || [],
                image_url: imageUrl,
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
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Update venue (admin only)
router.put('/:id', auth, roleCheck(['admin']), async (req, res) => {
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
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Delete/deactivate venue (admin only)
router.delete('/:id', auth, roleCheck(['admin']), async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('venues')
            .update({ is_active: false })
            .eq('id', id);

        if (error) throw error;

        res.json({
            success: true,
            message: 'Venue deactivated successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;
