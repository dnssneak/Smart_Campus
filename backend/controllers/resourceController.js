const supabase = require('../config/supabase');

// Get all resources (equipment, facilities)
exports.getAllResources = async (req, res) => {
    try {
        // Get unique facilities and equipment from all venues
        const { data: venues, error } = await supabase
            .from('venues')
            .select('facilities, equipment')
            .eq('is_active', true);

        if (error) throw error;

        // Aggregate all unique resources
        const allFacilities = new Set();
        const allEquipment = new Set();

        venues.forEach(venue => {
            (venue.facilities || []).forEach(f => allFacilities.add(f));
            (venue.equipment || []).forEach(e => allEquipment.add(e));
        });

        res.json({
            success: true,
            resources: {
                facilities: Array.from(allFacilities).sort(),
                equipment: Array.from(allEquipment).sort()
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get resources by venue
exports.getResourcesByVenue = async (req, res) => {
    try {
        const { venueId } = req.params;

        const { data: venue, error } = await supabase
            .from('venues')
            .select('id, name, facilities, equipment')
            .eq('id', venueId)
            .eq('is_active', true)
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
            venue: {
                id: venue.id,
                name: venue.name,
                facilities: venue.facilities || [],
                equipment: venue.equipment || []
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Search venues by required resources
exports.searchVenuesByResources = async (req, res) => {
    try {
        const { facilities, equipment, minCapacity } = req.query;

        let query = supabase
            .from('venues')
            .select('*')
            .eq('is_active', true);

        // Filter by minimum capacity if provided
        if (minCapacity) {
            query = query.gte('capacity', parseInt(minCapacity));
        }

        const { data: venues, error } = await query;
        if (error) throw error;

        // Filter venues that have the required facilities/equipment
        let filteredVenues = venues;

        if (facilities) {
            const requiredFacilities = facilities.split(',').map(f => f.trim());
            filteredVenues = filteredVenues.filter(venue =>
                requiredFacilities.every(rf =>
                    (venue.facilities || []).some(vf =>
                        vf.toLowerCase().includes(rf.toLowerCase())
                    )
                )
            );
        }

        if (equipment) {
            const requiredEquipment = equipment.split(',').map(e => e.trim());
            filteredVenues = filteredVenues.filter(venue =>
                requiredEquipment.every(re =>
                    (venue.equipment || []).some(ve =>
                        ve.toLowerCase().includes(re.toLowerCase())
                    )
                )
            );
        }

        res.json({
            success: true,
            count: filteredVenues.length,
            venues: filteredVenues
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get resource utilization statistics
exports.getResourceUtilization = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'startDate and endDate are required'
            });
        }

        // Get all bookings in the date range
        const { data: bookings, error } = await supabase
            .from('bookings')
            .select(`
                *,
                venue:venues!fk_bookings_venue_id_venues (id, name, facilities, equipment)
            `)
            .eq('status', 'confirmed')
            .gte('start_datetime', startDate)
            .lte('end_datetime', endDate);

        if (error) throw error;

        // Aggregate resource usage
        const facilityUsage = {};
        const equipmentUsage = {};

        bookings.forEach(booking => {
            if (booking.venue) {
                (booking.venue.facilities || []).forEach(facility => {
                    facilityUsage[facility] = (facilityUsage[facility] || 0) + 1;
                });
                (booking.venue.equipment || []).forEach(equip => {
                    equipmentUsage[equip] = (equipmentUsage[equip] || 0) + 1;
                });
            }
        });

        res.json({
            success: true,
            period: { startDate, endDate },
            totalBookings: bookings.length,
            utilization: {
                facilities: Object.entries(facilityUsage)
                    .map(([name, count]) => ({ name, count }))
                    .sort((a, b) => b.count - a.count),
                equipment: Object.entries(equipmentUsage)
                    .map(([name, count]) => ({ name, count }))
                    .sort((a, b) => b.count - a.count)
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    getAllResources: exports.getAllResources,
    getResourcesByVenue: exports.getResourcesByVenue,
    searchVenuesByResources: exports.searchVenuesByResources,
    getResourceUtilization: exports.getResourceUtilization
};
