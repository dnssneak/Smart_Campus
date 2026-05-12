const supabase = require('../config/supabase');

const RESOURCE_CATEGORIES = {
    facilities: {
        'lecture-hall': { icon: 'fa-chalkboard-teacher', description: 'Large teaching space with tiered seating' },
        'classroom': { icon: 'fa-school', description: 'Standard teaching room' },
        'seminar-room': { icon: 'fa-users', description: 'Small collaborative discussion space' },
        'computer-lab': { icon: 'fa-desktop', description: 'IT-equipped teaching lab' },
        'science-lab': { icon: 'fa-flask', description: 'Specialized lab for experiments' },
        'auditorium': { icon: 'fa-theater-masks', description: 'Large presentation venue' },
        'conference-room': { icon: 'fa-handshake', description: 'Formal meeting space' },
        'study-room': { icon: 'fa-book-reader', description: 'Quiet individual or group study' },
        'library-space': { icon: 'fa-book', description: 'Library reading or research area' },
        'atrium': { icon: 'fa-building', description: 'Open public gathering space' },
        'sports-hall': { icon: 'fa-running', description: 'Indoor sports facility' },
        'gym': { icon: 'fa-dumbbell', description: 'Fitness and exercise space' },
        'music-room': { icon: 'fa-music', description: 'Practice and rehearsal space' },
        'art-studio': { icon: 'fa-palette', description: 'Creative workspace' },
        'cafeteria': { icon: 'fa-utensils', description: 'Food service area' },
        'outdoor-space': { icon: 'fa-tree', description: 'External campus grounds' },
        'parking': { icon: 'fa-parking', description: 'Vehicle parking area' },
        'common-room': { icon: 'fa-couch', description: 'Social relaxation space' }
    },
    equipment: {
        'projector': { icon: 'fa-video', description: 'Digital presentation display', assignable: true, maxPerVenue: 2 },
        'interactive-whiteboard': { icon: 'fa-chalkboard', description: 'Smart touch-enabled board', assignable: true, maxPerVenue: 1 },
        'microphone': { icon: 'fa-microphone', description: 'Audio amplification system', assignable: true, maxPerVenue: 4 },
        'speakers': { icon: 'fa-volume-up', description: 'Sound reinforcement', assignable: true, maxPerVenue: 2 },
        'document-camera': { icon: 'fa-camera', description: 'Visual presenter for documents', assignable: true, maxPerVenue: 1 },
        'laser-pointer': { icon: 'fa-mouse-pointer', description: 'Presentation pointer', assignable: true, maxPerVenue: 2 },
        'video-conferencing': { icon: 'fa-video', description: 'Remote meeting equipment', assignable: true, maxPerVenue: 1 },
        'recording-equipment': { icon: 'fa-record-vinyl', description: 'Lecture capture system', assignable: true, maxPerVenue: 1 },
        'computers': { icon: 'fa-laptop', description: 'Desktop workstations', assignable: true, maxPerVenue: 30 },
        'printers': { icon: 'fa-print', description: 'Document printing', assignable: true, maxPerVenue: 2 },
        'scanners': { icon: 'fa-scan', description: 'Document digitization', assignable: true, maxPerVenue: 1 },
        '3d-printer': { icon: 'fa-cube', description: 'Additive manufacturing', assignable: true, maxPerVenue: 2 },
        'vr-headsets': { icon: 'fa-vr-cardboard', description: 'Virtual reality equipment', assignable: true, maxPerVenue: 10 },
        'arduino-kits': { icon: 'fa-microchip', description: 'Electronics prototyping', assignable: true, maxPerVenue: 15 },
        'lab-equipment': { icon: 'fa-vials', description: 'Scientific instruments', assignable: true, maxPerVenue: 20 },
        'sports-equipment': { icon: 'fa-basketball-ball', description: 'Athletic gear', assignable: true, maxPerVenue: 50 },
        'musical-instruments': { icon: 'fa-guitar', description: 'Performance instruments', assignable: true, maxPerVenue: 10 },
        'cameras': { icon: 'fa-camera-retro', description: 'Photography and video', assignable: true, maxPerVenue: 3 },
        'flipcharts': { icon: 'fa-sticky-note', description: 'Portable whiteboards', assignable: true, maxPerVenue: 5 },
        'wifi': { icon: 'fa-wifi', description: 'Wireless internet', assignable: false },
        'charging-stations': { icon: 'fa-battery-full', description: 'Device power stations', assignable: true, maxPerVenue: 4 },
        'wheelchair-access': { icon: 'fa-wheelchair', description: 'Accessibility features', assignable: false },
        'hearing-loop': { icon: 'fa-deaf', description: 'Hearing assistance', assignable: false },
        'climate-control': { icon: 'fa-snowflake', description: 'AC and heating', assignable: false }
    }
};

const PRIORITY_LEVELS = {
    'critical': { weight: 100, label: 'Critical - Exam/Graduation' },
    'high': { weight: 75, label: 'High - Official Event' },
    'medium': { weight: 50, label: 'Medium - Department Event' },
    'low': { weight: 25, label: 'Low - Club/Student Activity' }
};

exports.getAllResources = async (req, res) => {
    try {
        const { data: venues, error } = await supabase
            .from('venues')
            .select('facilities, equipment, id, name, building, floor')
            .eq('is_active', true);
        if (error) throw error;

        const allFacilities = new Map();
        const allEquipment = new Map();

        venues.forEach(venue => {
            (venue.facilities || []).forEach(f => {
                const key = f.toLowerCase().trim();
                if (!allFacilities.has(key)) {
                    allFacilities.set(key, { name: f, count: 0, venues: [], category: RESOURCE_CATEGORIES.facilities[key] || null });
                }
                const item = allFacilities.get(key);
                item.count++;
                item.venues.push({ id: venue.id, name: venue.name, building: venue.building, floor: venue.floor });
            });

            (venue.equipment || []).forEach(e => {
                const key = e.toLowerCase().trim();
                if (!allEquipment.has(key)) {
                    allEquipment.set(key, {
                        name: e, count: 0, venues: [],
                        category: RESOURCE_CATEGORIES.equipment[key] || null,
                        assignable: RESOURCE_CATEGORIES.equipment[key]?.assignable || false,
                        maxPerVenue: RESOURCE_CATEGORIES.equipment[key]?.maxPerVenue || 1
                    });
                }
                const item = allEquipment.get(key);
                item.count++;
                item.venues.push({ id: venue.id, name: venue.name, building: venue.building, floor: venue.floor });
            });
        });

        res.json({
            success: true,
            resources: {
                facilities: Array.from(allFacilities.values()).sort((a, b) => b.count - a.count),
                equipment: Array.from(allEquipment.values()).sort((a, b) => b.count - a.count)
            },
            summary: {
                totalFacilities: allFacilities.size,
                totalEquipment: allEquipment.size,
                totalVenues: venues.length,
                assignableResources: Array.from(allEquipment.values()).filter(e => e.assignable).length
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getResourcesByVenue = async (req, res) => {
    try {
        const { venueId } = req.params;
        const { data: venue, error } = await supabase
            .from('venues')
            .select('id, name, building, floor, room_number, capacity, facilities, equipment, description, images, opening_hours, contact_email, phone_extension, is_accessible, has_parking')
            .eq('id', venueId)
            .eq('is_active', true)
            .single();

        if (error) throw error;
        if (!venue) return res.status(404).json({ success: false, message: 'Venue not found' });

        const { data: currentAssignments } = await supabase
            .from('resource_assignments')
            .select('*, event:events(title, type, start_datetime, end_datetime, priority)')
            .eq('venue_id', venueId)
            .gte('end_datetime', new Date().toISOString())
            .order('start_datetime', { ascending: true });

        const enrichedFacilities = (venue.facilities || []).map(f => ({
            name: f, ...RESOURCE_CATEGORIES.facilities[f.toLowerCase().trim()]
        }));

        const enrichedEquipment = (venue.equipment || []).map(e => {
            const key = e.toLowerCase().trim();
            const cat = RESOURCE_CATEGORIES.equipment[key] || {};
            const assigned = (currentAssignments || []).filter(a => a.resource_name.toLowerCase() === key);
            return {
                name: e, ...cat,
                currentlyAssigned: assigned.length,
                available: (cat.maxPerVenue || 1) - assigned.length,
                assignments: assigned
            };
        });

        res.json({
            success: true,
            venue: {
                id: venue.id, name: venue.name,
                location: { building: venue.building, floor: venue.floor, room: venue.room_number },
                capacity: venue.capacity,
                facilities: enrichedFacilities,
                equipment: enrichedEquipment,
                currentAssignments: currentAssignments || []
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.searchVenuesByResources = async (req, res) => {
    try {
        const { facilities, equipment, minCapacity, maxCapacity, building, accessibleOnly, date, startTime, endTime } = req.query;

        let query = supabase
            .from('venues')
            .select('*, bookings:bookings!fk_bookings_venue_id_venues(id, start_datetime, end_datetime, status)')
            .eq('is_active', true);

        if (minCapacity) query = query.gte('capacity', parseInt(minCapacity));
        if (maxCapacity) query = query.lte('capacity', parseInt(maxCapacity));
        if (building) query = query.ilike('building', `%${building}%`);
        if (accessibleOnly === 'true') query = query.eq('is_accessible', true);

        const { data: venues, error } = await query;
        if (error) throw error;

        let filteredVenues = venues;

        if (facilities) {
            const requiredFacilities = facilities.split(',').map(f => f.trim().toLowerCase());
            filteredVenues = filteredVenues.filter(venue => {
                const venueFacilities = (venue.facilities || []).map(f => f.toLowerCase());
                return requiredFacilities.every(req => venueFacilities.some(vf => vf.includes(req) || getFacilitySynonyms(req).some(syn => vf.includes(syn))));
            });
        }

        if (equipment) {
            const requiredEquipment = equipment.split(',').map(e => e.trim().toLowerCase());
            filteredVenues = filteredVenues.filter(venue => {
                const venueEquipment = (venue.equipment || []).map(e => e.toLowerCase());
                return requiredEquipment.every(req => venueEquipment.some(ve => ve.includes(req) || getEquipmentSynonyms(req).some(syn => ve.includes(syn))));
            });
        }

        if (date) {
            const searchDate = new Date(date);
            const searchStart = startTime ? new Date(`${date}T${startTime}`) : new Date(`${date}T00:00:00`);
            const searchEnd = endTime ? new Date(`${date}T${endTime}`) : new Date(`${date}T23:59:59`);

            const { data: assignments } = await supabase
                .from('resource_assignments')
                .select('*')
                .gte('start_datetime', searchStart.toISOString())
                .lte('end_datetime', searchEnd.toISOString());

            filteredVenues = filteredVenues.map(venue => {
                const venueAssignments = (assignments || []).filter(a => a.venue_id === venue.id);
                const venueBookings = (venue.bookings || []).filter(b => b.status === 'confirmed' && new Date(b.start_datetime).toDateString() === searchDate.toDateString());

                const equipmentAvailability = {};
                (venue.equipment || []).forEach(eq => {
                    const assigned = venueAssignments.filter(a => a.resource_name.toLowerCase() === eq.toLowerCase()).length;
                    const max = RESOURCE_CATEGORIES.equipment[eq.toLowerCase()]?.maxPerVenue || 1;
                    equipmentAvailability[eq] = { assigned, available: max - assigned, total: max };
                });

                return {
                    ...venue,
                    isAvailable: venueBookings.length === 0,
                    resourceAvailability: equipmentAvailability,
                    conflictingBookings: venueBookings.length,
                    nextAvailable: venueBookings.length > 0 ? getNextAvailableSlot(venueBookings) : 'Available now'
                };
            });
        }

        const cleanVenues = filteredVenues.map(v => {
            const { bookings, ...venueData } = v;
            return venueData;
        });

        res.json({ success: true, count: cleanVenues.length, filters: { facilities: facilities ? facilities.split(',') : null, equipment: equipment ? equipment.split(',') : null, minCapacity, maxCapacity, building, accessibleOnly, date, startTime, endTime }, venues: cleanVenues });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getResourceUtilization = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        if (!startDate || !endDate) return res.status(400).json({ success: false, message: 'startDate and endDate are required' });

        const start = new Date(startDate);
        const end = new Date(endDate);
        const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        if (daysDiff > 90) return res.status(400).json({ success: false, message: 'Date range cannot exceed 90 days' });

        const { data: bookings, error } = await supabase
            .from('bookings')
            .select('id, start_datetime, end_datetime, status, attendees_count, venue:venues!fk_bookings_venue_id_venues (id, name, facilities, equipment, capacity), event:events!fk_bookings_event_id_events (title, type, expected_attendees, priority)')
            .eq('status', 'confirmed')
            .gte('start_datetime', startDate)
            .lte('end_datetime', endDate)
            .order('start_datetime', { ascending: true });

        if (error) throw error;

        const { data: assignments } = await supabase
            .from('resource_assignments')
            .select('*, event:events(title, type, priority)')
            .gte('start_datetime', startDate)
            .lte('end_datetime', endDate);

        const facilityUsage = {};
        const equipmentUsage = {};
        const venueUtilization = {};
        const hourlyDistribution = new Array(24).fill(0);
        const dailyDistribution = {};
        const utilizationByType = {};
        const assignmentStats = { auto: 0, manual: 0, overridden: 0 };

        bookings.forEach(booking => {
            if (!booking.venue) return;
            const duration = (new Date(booking.end_datetime) - new Date(booking.start_datetime)) / (1000 * 60 * 60);
            const hour = new Date(booking.start_datetime).getHours();
            const dayKey = booking.start_datetime.split('T')[0];

            (booking.venue.facilities || []).forEach(facility => {
                const key = facility.toLowerCase().trim();
                if (!facilityUsage[key]) facilityUsage[key] = { name: facility, bookings: 0, hours: 0, uniqueVenues: new Set() };
                facilityUsage[key].bookings++; facilityUsage[key].hours += duration; facilityUsage[key].uniqueVenues.add(booking.venue.id);
            });

            (booking.venue.equipment || []).forEach(equip => {
                const key = equip.toLowerCase().trim();
                if (!equipmentUsage[key]) equipmentUsage[key] = { name: equip, bookings: 0, hours: 0, uniqueVenues: new Set() };
                equipmentUsage[key].bookings++; equipmentUsage[key].hours += duration; equipmentUsage[key].uniqueVenues.add(booking.venue.id);
            });

            const venueId = booking.venue.id;
            if (!venueUtilization[venueId]) venueUtilization[venueId] = { venueName: booking.venue.name, totalBookings: 0, totalHours: 0, capacity: booking.venue.capacity, peakAttendees: 0 };
            venueUtilization[venueId].totalBookings++; venueUtilization[venueId].totalHours += duration;
            venueUtilization[venueId].peakAttendees = Math.max(venueUtilization[venueId].peakAttendees, booking.attendees_count || booking.event?.expected_attendees || 0);

            for (let h = hour; h < Math.min(hour + Math.ceil(duration), 24); h++) hourlyDistribution[h]++;
            dailyDistribution[dayKey] = (dailyDistribution[dayKey] || 0) + 1;

            const eventType = booking.event?.type || 'unknown';
            if (!utilizationByType[eventType]) utilizationByType[eventType] = { count: 0, hours: 0 };
            utilizationByType[eventType].count++; utilizationByType[eventType].hours += duration;
        });

        (assignments || []).forEach(a => {
            if (a.assignment_method === 'auto') assignmentStats.auto++;
            else if (a.assignment_method === 'manual') assignmentStats.manual++;
            if (a.was_overridden) assignmentStats.overridden++;
        });

        const peakHours = hourlyDistribution.map((count, hour) => ({ hour: `${hour}:00`, count })).sort((a, b) => b.count - a.count).slice(0, 5);
        const totalPossibleHours = daysDiff * 12;
        const topVenues = Object.values(venueUtilization).map(v => ({ ...v, utilizationRate: ((v.totalHours / totalPossibleHours) * 100).toFixed(1) })).sort((a, b) => b.totalBookings - a.totalBookings).slice(0, 10);

        res.json({
            success: true,
            period: { startDate, endDate, days: daysDiff },
            summary: {
                totalBookings: bookings.length,
                totalBookingHours: bookings.reduce((sum, b) => sum + (new Date(b.end_datetime) - new Date(b.start_datetime)) / (1000 * 60 * 60), 0).toFixed(1),
                averageBookingDuration: bookings.length > 0 ? (bookings.reduce((sum, b) => sum + (new Date(b.end_datetime) - new Date(b.start_datetime)) / (1000 * 60 * 60), 0) / bookings.length).toFixed(1) : 0,
                totalAssignments: assignments?.length || 0
            },
            assignmentStats,
            utilization: {
                facilities: Object.values(facilityUsage).map(f => ({ name: f.name, bookings: f.bookings, hours: f.hours.toFixed(1), venues: f.uniqueVenues.size })).sort((a, b) => b.bookings - a.bookings),
                equipment: Object.values(equipmentUsage).map(e => ({ name: e.name, bookings: e.bookings, hours: e.hours.toFixed(1), venues: e.uniqueVenues.size })).sort((a, b) => b.bookings - a.bookings)
            },
            analytics: { peakHours, dailyDistribution, utilizationByType, topVenues }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// FR-RA-02: Auto-allocate resources
exports.autoAllocateResources = async (req, res) => {
    try {
        const { eventId, venueId, requestedResources, priority = 'medium' } = req.body;

        const { data: event } = await supabase.from('events').select('*').eq('id', eventId).single();
        if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

        const { data: venue } = await supabase.from('venues').select('*').eq('id', venueId).single();
        if (!venue) return res.status(404).json({ success: false, message: 'Venue not found' });

        const { data: existingAssignments } = await supabase
            .from('resource_assignments')
            .select('*')
            .eq('venue_id', venueId)
            .gte('end_datetime', event.start_datetime)
            .lte('start_datetime', event.end_datetime);

        const allocated = [];
        const failed = [];

        for (const reqResource of requestedResources) {
            const resourceName = reqResource.toLowerCase().trim();
            const maxAllowed = RESOURCE_CATEGORIES.equipment[resourceName]?.maxPerVenue || 1;
            const currentlyAssigned = (existingAssignments || []).filter(a => a.resource_name.toLowerCase() === resourceName).length;
            const available = maxAllowed - currentlyAssigned;

            if (available > 0) {
                const venueHasResource = (venue.equipment || []).some(e => e.toLowerCase() === resourceName);
                if (!venueHasResource) {
                    failed.push({ resource: reqResource, reason: 'Venue does not have this resource' });
                    continue;
                }

                const priorityWeight = PRIORITY_LEVELS[priority]?.weight || 50;

                const assignment = {
                    event_id: eventId, venue_id: venueId, resource_name: reqResource,
                    start_datetime: event.start_datetime, end_datetime: event.end_datetime,
                    quantity: Math.min(reqResource.quantity || 1, available),
                    priority, priority_weight: priorityWeight,
                    assignment_method: 'auto', assigned_by: req.user?.id || null,
                    assigned_at: new Date().toISOString(), status: 'allocated'
                };

                const { data: created, error } = await supabase.from('resource_assignments').insert(assignment).select().single();
                if (!error) allocated.push(created);
            } else {
                failed.push({ resource: reqResource, reason: 'All units currently allocated' });
            }
        }

        res.json({ success: true, allocated, failed, message: `Auto-allocated ${allocated.length}/${requestedResources.length} resources` });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// FR-RA-06: Manual override allocation
exports.manualOverrideAllocation = async (req, res) => {
    try {
        const { assignmentId } = req.params;
        const { newVenueId, newQuantity, reason } = req.body;

        const { data: current } = await supabase.from('resource_assignments').select('*').eq('id', assignmentId).single();
        if (!current) return res.status(404).json({ success: false, message: 'Assignment not found' });

        const override = {
            assignment_id: assignmentId, previous_venue_id: current.venue_id, previous_quantity: current.quantity,
            new_venue_id: newVenueId, new_quantity: newQuantity, overridden_by: req.user?.id,
            reason, overridden_at: new Date().toISOString()
        };

        await supabase.from('assignment_overrides').insert(override);

        const { data: updated } = await supabase
            .from('resource_assignments')
            .update({ venue_id: newVenueId, quantity: newQuantity, was_overridden: true, override_reason: reason })
            .eq('id', assignmentId)
            .select()
            .single();

        res.json({ success: true, assignment: updated, message: 'Allocation manually overridden' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get all current assignments
exports.getCurrentAssignments = async (req, res) => {
    try {
        const { venueId, date, status } = req.query;
        let query = supabase.from('resource_assignments').select('*, event:events(title, type, priority), venue:venues(name, building)');

        if (venueId) query = query.eq('venue_id', venueId);
        if (date) {
            const searchDate = new Date(date);
            query = query.gte('start_datetime', searchDate.toISOString()).lte('end_datetime', new Date(searchDate.setDate(searchDate.getDate() + 1)).toISOString());
        }
        if (status) query = query.eq('status', status);
        else query = query.in('status', ['allocated', 'in-use']);

        const { data: assignments, error } = await query.order('start_datetime', { ascending: true });
        if (error) throw error;

        res.json({ success: true, count: assignments.length, assignments });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// FR-RA-01: Check real-time resource availability
exports.checkResourceAvailability = async (req, res) => {
    try {
        const { venueId, resourceName, startDateTime, endDateTime } = req.query;

        const { data: venue } = await supabase.from('venues').select('equipment').eq('id', venueId).single();
        if (!venue) return res.status(404).json({ success: false, message: 'Venue not found' });

        const hasResource = (venue.equipment || []).some(e => e.toLowerCase() === resourceName.toLowerCase());
        if (!hasResource) return res.json({ success: true, available: false, reason: 'Venue does not have this resource' });

        const maxAllowed = RESOURCE_CATEGORIES.equipment[resourceName.toLowerCase()]?.maxPerVenue || 1;

        const { data: assignments } = await supabase
            .from('resource_assignments')
            .select('*')
            .eq('venue_id', venueId)
            .ilike('resource_name', resourceName)
            .gte('end_datetime', startDateTime)
            .lte('start_datetime', endDateTime);

        const assigned = (assignments || []).reduce((sum, a) => sum + (a.quantity || 1), 0);
        const available = maxAllowed - assigned;

        res.json({
            success: true, resource: resourceName, venue: venueId, total: maxAllowed, assigned,
            available: Math.max(0, available), isAvailable: available > 0,
            conflictingAssignments: assignments || []
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

function getFacilitySynonyms(term) {
    const synonyms = { 'wifi': ['internet', 'wireless', 'network'], 'projector': ['screen', 'display', 'presentation'], 'whiteboard': ['board', 'smart-board'], 'microphone': ['mic', 'audio', 'pa'], 'accessibility': ['wheelchair', 'accessible', 'disabled'] };
    return synonyms[term] || [];
}

function getEquipmentSynonyms(term) {
    const synonyms = { 'projector': ['screen', 'display'], 'microphone': ['mic', 'audio'], 'computer': ['pc', 'desktop', 'workstation'], 'printer': ['printing'], 'wifi': ['internet', 'wireless'] };
    return synonyms[term] || [];
}

function getNextAvailableSlot(bookings) {
    return (!bookings || bookings.length === 0) ? 'Available now' : 'Check calendar';
}

module.exports = {
    getAllResources: exports.getAllResources,
    getResourcesByVenue: exports.getResourcesByVenue,
    searchVenuesByResources: exports.searchVenuesByResources,
    getResourceUtilization: exports.getResourceUtilization,
    autoAllocateResources: exports.autoAllocateResources,
    manualOverrideAllocation: exports.manualOverrideAllocation,
    getCurrentAssignments: exports.getCurrentAssignments,
    checkResourceAvailability: exports.checkResourceAvailability
};