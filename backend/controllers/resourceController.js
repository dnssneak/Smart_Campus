const supabase = require('../config/supabase');

// Resource categories with metadata
const RESOURCE_CATEGORIES = {
    equipment: {
        'projector': { icon: 'fa-video', description: 'Digital presentation display', maxPerVenue: 2 },
        'microphone': { icon: 'fa-microphone', description: 'Audio amplification system', maxPerVenue: 4 },
        'speakers': { icon: 'fa-volume-up', description: 'Sound reinforcement', maxPerVenue: 2 },
        'computers': { icon: 'fa-laptop', description: 'Desktop workstations', maxPerVenue: 30 },
        'interactive-whiteboard': { icon: 'fa-chalkboard', description: 'Smart touch-enabled board', maxPerVenue: 1 },
        'video-conferencing': { icon: 'fa-video', description: 'Remote meeting equipment', maxPerVenue: 1 },
        'recording-equipment': { icon: 'fa-record-vinyl', description: 'Lecture capture system', maxPerVenue: 1 },
        'document-camera': { icon: 'fa-camera', description: 'Visual presenter', maxPerVenue: 1 },
        'laser-pointer': { icon: 'fa-mouse-pointer', description: 'Presentation pointer', maxPerVenue: 2 },
        'printers': { icon: 'fa-print', description: 'Document printing', maxPerVenue: 2 },
        'scanners': { icon: 'fa-scan', description: 'Document digitization', maxPerVenue: 1 },
        '3d-printer': { icon: 'fa-cube', description: 'Additive manufacturing', maxPerVenue: 2 },
        'vr-headsets': { icon: 'fa-vr-cardboard', description: 'Virtual reality equipment', maxPerVenue: 10 },
        'cameras': { icon: 'fa-camera-retro', description: 'Photography and video', maxPerVenue: 3 },
        'charging-stations': { icon: 'fa-battery-full', description: 'Device power stations', maxPerVenue: 4 }
    }
};

const PRIORITY_LEVELS = {
    'critical': { weight: 100, label: 'Critical - Exam/Graduation' },
    'high': { weight: 75, label: 'High - Official Event' },
    'medium': { weight: 50, label: 'Medium - Department Event' },
    'low': { weight: 25, label: 'Low - Club/Student Activity' }
};

// ============================================================================
// FR-RA-01: Real-time Resource Availability Tracking
// ============================================================================
exports.checkResourceAvailability = async (req, res) => {
    try {
        const { venueId, resourceName, startDateTime, endDateTime } = req.query;

        if (!venueId || !resourceName || !startDateTime || !endDateTime) {
            return res.status(400).json({ 
                success: false, 
                message: 'venueId, resourceName, startDateTime, and endDateTime are required' 
            });
        }

        // Get venue equipment
        const { data: venue, error: venueError } = await supabase
            .from('venues')
            .select('equipment')
            .eq('id', venueId)
            .single();

        if (venueError) throw venueError;
        if (!venue) return res.status(404).json({ success: false, message: 'Venue not found' });

        const resourceKey = resourceName.toLowerCase().trim();
        const hasResource = (venue.equipment || []).some(e => e.toLowerCase().trim() === resourceKey);
        
        if (!hasResource) {
            return res.json({ 
                success: true, 
                available: 0,
                total: 0,
                isAvailable: false, 
                reason: 'Venue does not have this resource' 
            });
        }

        // Get max capacity for this resource
        const maxAllowed = RESOURCE_CATEGORIES.equipment[resourceKey]?.maxPerVenue || 1;

        // Check current allocations during the requested time period
        const { data: assignments, error: assignError } = await supabase
            .from('resource_assignments')
            .select('*')
            .eq('venue_id', venueId)
            .ilike('resource_name', resourceName)
            .in('status', ['allocated', 'in-use'])
            .gte('end_datetime', startDateTime)
            .lte('start_datetime', endDateTime);

        if (assignError) throw assignError;

        const assigned = (assignments || []).reduce((sum, a) => sum + (a.quantity || 1), 0);
        const available = Math.max(0, maxAllowed - assigned);

        res.json({
            success: true,
            resource: resourceName,
            venue: venueId,
            total: maxAllowed,
            assigned,
            available,
            isAvailable: available > 0,
            conflictingAssignments: assignments || [],
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Check availability error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================================================
// FR-RA-02: Automatic Resource Allocation
// FR-RA-03: Prevent Resource Overbooking (handled by DB trigger)
// FR-RA-04: Optimize allocation using assignment algorithms
// FR-RA-05: Support resource prioritization
// ============================================================================
exports.autoAllocateResources = async (req, res) => {
    try {
        const { eventId, venueId, requestedResources, priority = 'medium' } = req.body;

        if (!eventId || !venueId || !requestedResources || !Array.isArray(requestedResources)) {
            return res.status(400).json({ 
                success: false, 
                message: 'eventId, venueId, and requestedResources (array) are required' 
            });
        }

        // Get event details
        const { data: event, error: eventError } = await supabase
            .from('events')
            .select('*')
            .eq('id', eventId)
            .single();

        if (eventError) throw eventError;
        if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

        // Get venue details
        const { data: venue, error: venueError } = await supabase
            .from('venues')
            .select('*')
            .eq('id', venueId)
            .single();

        if (venueError) throw venueError;
        if (!venue) return res.status(404).json({ success: false, message: 'Venue not found' });

        const priorityWeight = PRIORITY_LEVELS[priority]?.weight || 50;
        const allocated = [];
        const failed = [];

        // Process each requested resource
        for (const resourceRequest of requestedResources) {
            const resourceName = typeof resourceRequest === 'string' ? resourceRequest : resourceRequest.name;
            const requestedQty = typeof resourceRequest === 'object' ? (resourceRequest.quantity || 1) : 1;
            const resourceKey = resourceName.toLowerCase().trim();

            // Check if venue has this resource
            const venueHasResource = (venue.equipment || []).some(e => e.toLowerCase().trim() === resourceKey);
            
            if (!venueHasResource) {
                failed.push({ 
                    resource: resourceName, 
                    reason: 'Venue does not have this resource' 
                });
                continue;
            }

            // Get max capacity
            const maxAllowed = RESOURCE_CATEGORIES.equipment[resourceKey]?.maxPerVenue || 1;

            // Check current allocations
            const { data: existingAssignments } = await supabase
                .from('resource_assignments')
                .select('*')
                .eq('venue_id', venueId)
                .ilike('resource_name', resourceName)
                .in('status', ['allocated', 'in-use'])
                .gte('end_datetime', event.start_datetime)
                .lte('start_datetime', event.end_datetime);

            const currentlyAssigned = (existingAssignments || []).reduce((sum, a) => sum + (a.quantity || 1), 0);
            const available = maxAllowed - currentlyAssigned;

            if (available <= 0) {
                failed.push({ 
                    resource: resourceName, 
                    reason: `All units currently allocated (${currentlyAssigned}/${maxAllowed})` 
                });
                continue;
            }

            // Allocate what's available (up to requested quantity)
            const allocateQty = Math.min(requestedQty, available);

            const assignment = {
                event_id: eventId,
                venue_id: venueId,
                resource_name: resourceName,
                start_datetime: event.start_datetime,
                end_datetime: event.end_datetime,
                quantity: allocateQty,
                priority,
                priority_weight: priorityWeight,
                assignment_method: 'auto',
                assigned_by: req.user?.id || null,
                status: 'allocated'
            };

            // Insert assignment (DB trigger will prevent overbooking)
            const { data: created, error: insertError } = await supabase
                .from('resource_assignments')
                .insert(assignment)
                .select()
                .single();

            if (insertError) {
                failed.push({ 
                    resource: resourceName, 
                    reason: insertError.message 
                });
            } else {
                allocated.push(created);
                
                // If we couldn't allocate the full requested quantity
                if (allocateQty < requestedQty) {
                    failed.push({ 
                        resource: resourceName, 
                        reason: `Partial allocation: ${allocateQty}/${requestedQty} units (${maxAllowed - currentlyAssigned - allocateQty} remaining)` 
                    });
                }
            }
        }

        res.json({ 
            success: true, 
            allocated, 
            failed, 
            summary: {
                total: requestedResources.length,
                successful: allocated.length,
                failed: failed.length
            },
            message: `Auto-allocated ${allocated.length}/${requestedResources.length} resources` 
        });
    } catch (error) {
        console.error('Auto-allocate error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================================================
// FR-RA-06: Manual Override Allocation
// ============================================================================
exports.manualOverrideAllocation = async (req, res) => {
    try {
        const { assignmentId } = req.params;
        const { newVenueId, newQuantity, reason } = req.body;

        if (!reason) {
            return res.status(400).json({ 
                success: false, 
                message: 'Override reason is required' 
            });
        }

        // Get current assignment
        const { data: current, error: fetchError } = await supabase
            .from('resource_assignments')
            .select('*')
            .eq('id', assignmentId)
            .single();

        if (fetchError) throw fetchError;
        if (!current) return res.status(404).json({ success: false, message: 'Assignment not found' });

        // Prepare update data
        const updateData = {
            was_overridden: true,
            override_reason: reason,
            assignment_method: 'manual',
            assigned_by: req.user?.id
        };

        if (newVenueId) updateData.venue_id = newVenueId;
        if (newQuantity) updateData.quantity = newQuantity;

        // Update assignment (trigger will log override)
        const { data: updated, error: updateError } = await supabase
            .from('resource_assignments')
            .update(updateData)
            .eq('id', assignmentId)
            .select()
            .single();

        if (updateError) throw updateError;

        res.json({ 
            success: true, 
            assignment: updated, 
            message: 'Allocation manually overridden successfully' 
        });
    } catch (error) {
        console.error('Override error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================================================
// Get Current Assignments
// ============================================================================
exports.getCurrentAssignments = async (req, res) => {
    try {
        const { venueId, eventId, date, status, resourceName } = req.query;
        
        let query = supabase
            .from('resource_assignments')
            .select(`
                *,
                event:events(id, title, category, priority),
                venue:venues(id, name, location),
                assigned_by_profile:profiles!resource_assignments_assigned_by_fkey(first_name, last_name)
            `);

        if (venueId) query = query.eq('venue_id', venueId);
        if (eventId) query = query.eq('event_id', eventId);
        if (resourceName) query = query.ilike('resource_name', `%${resourceName}%`);
        
        if (date) {
            const searchDate = new Date(date);
            const nextDay = new Date(searchDate);
            nextDay.setDate(nextDay.getDate() + 1);
            query = query
                .gte('start_datetime', searchDate.toISOString())
                .lt('start_datetime', nextDay.toISOString());
        }
        
        if (status) {
            query = query.eq('status', status);
        } else {
            // Default: show active assignments
            query = query.in('status', ['allocated', 'in-use']);
        }

        const { data: assignments, error } = await query.order('start_datetime', { ascending: true });
        
        if (error) throw error;

        res.json({ 
            success: true, 
            count: assignments?.length || 0, 
            assignments: assignments || [] 
        });
    } catch (error) {
        console.error('Get assignments error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================================================
// Get Assignment History (including overrides)
// ============================================================================
exports.getAssignmentHistory = async (req, res) => {
    try {
        const { assignmentId } = req.params;

        const { data: assignment, error: assignError } = await supabase
            .from('resource_assignments')
            .select('*')
            .eq('id', assignmentId)
            .single();

        if (assignError) throw assignError;
        if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });

        const { data: overrides, error: overrideError } = await supabase
            .from('assignment_overrides')
            .select(`
                *,
                overridden_by_profile:profiles!assignment_overrides_overridden_by_fkey(first_name, last_name),
                previous_venue:venues!assignment_overrides_previous_venue_id_fkey(name),
                new_venue:venues!assignment_overrides_new_venue_id_fkey(name)
            `)
            .eq('assignment_id', assignmentId)
            .order('overridden_at', { ascending: false });

        if (overrideError) throw overrideError;

        res.json({
            success: true,
            assignment,
            overrides: overrides || [],
            overrideCount: overrides?.length || 0
        });
    } catch (error) {
        console.error('Get history error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================================================
// Get All Resources (from venues)
// ============================================================================
exports.getAllResources = async (req, res) => {
    try {
        const { data: venues, error } = await supabase
            .from('venues')
            .select('id, name, location, equipment')
            .eq('is_active', true);

        if (error) throw error;

        // Handle case where no venues exist
        if (!venues || venues.length === 0) {
            return res.json({
                success: true,
                resources: { 
                    equipment: []
                },
                summary: {
                    totalEquipment: 0,
                    totalVenues: 0,
                    assignableResources: 0
                }
            });
        }

        const equipmentMap = new Map();

        venues.forEach(venue => {
            (venue.equipment || []).forEach(eq => {
                const key = eq.toLowerCase().trim();
                if (!equipmentMap.has(key)) {
                    equipmentMap.set(key, {
                        name: eq,
                        count: 0,
                        venues: [],
                        category: RESOURCE_CATEGORIES.equipment[key] || null,
                        maxPerVenue: RESOURCE_CATEGORIES.equipment[key]?.maxPerVenue || 1
                    });
                }
                const item = equipmentMap.get(key);
                item.count++;
                item.venues.push({ 
                    id: venue.id, 
                    name: venue.name, 
                    location: venue.location
                });
            });
        });

        const equipment = Array.from(equipmentMap.values()).sort((a, b) => b.count - a.count);

        res.json({
            success: true,
            resources: { 
                equipment: equipment
            },
            summary: {
                totalEquipment: equipment.length,
                totalVenues: venues.length,
                assignableResources: equipment.length
            }
        });
    } catch (error) {
        console.error('Get resources error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message,
            resources: { equipment: [] }
        });
    }
};

// ============================================================================
// Get Resources by Venue
// ============================================================================
exports.getResourcesByVenue = async (req, res) => {
    try {
        const { venueId } = req.params;

        const { data: venue, error: venueError } = await supabase
            .from('venues')
            .select('*')
            .eq('id', venueId)
            .eq('is_active', true)
            .single();

        if (venueError) throw venueError;
        if (!venue) return res.status(404).json({ success: false, message: 'Venue not found' });

        // Get current assignments for this venue
        const { data: currentAssignments } = await supabase
            .from('resource_assignments')
            .select('*, event:events(title, category, start_datetime, end_datetime, priority)')
            .eq('venue_id', venueId)
            .in('status', ['allocated', 'in-use'])
            .gte('end_datetime', new Date().toISOString())
            .order('start_datetime', { ascending: true });

        const enrichedEquipment = (venue.equipment || []).map(eq => {
            const key = eq.toLowerCase().trim();
            const cat = RESOURCE_CATEGORIES.equipment[key] || {};
            const assigned = (currentAssignments || [])
                .filter(a => a.resource_name.toLowerCase().trim() === key)
                .reduce((sum, a) => sum + (a.quantity || 1), 0);
            
            return {
                name: eq,
                ...cat,
                currentlyAssigned: assigned,
                available: (cat.maxPerVenue || 1) - assigned,
                total: cat.maxPerVenue || 1,
                assignments: (currentAssignments || []).filter(a => a.resource_name.toLowerCase().trim() === key)
            };
        });

        res.json({
            success: true,
            venue: {
                id: venue.id,
                name: venue.name,
                location: venue.location,
                capacity: venue.capacity,
                equipment: enrichedEquipment,
                currentAssignments: currentAssignments || []
            }
        });
    } catch (error) {
        console.error('Get venue resources error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    checkResourceAvailability: exports.checkResourceAvailability,
    autoAllocateResources: exports.autoAllocateResources,
    manualOverrideAllocation: exports.manualOverrideAllocation,
    getCurrentAssignments: exports.getCurrentAssignments,
    getAssignmentHistory: exports.getAssignmentHistory,
    getAllResources: exports.getAllResources,
    getResourcesByVenue: exports.getResourcesByVenue
};
