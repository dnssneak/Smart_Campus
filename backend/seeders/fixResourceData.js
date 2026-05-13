const supabase = require('../config/supabase');

const fixResourceData = async () => {
    console.log('🔧 Fixing resource data...\n');

    try {
        // Step 1: Approve all pending events so they show up in the resource allocation
        console.log('1️⃣  Approving pending events...');
        const { data: updatedEvents, error: approveError } = await supabase
            .from('events')
            .update({ 
                status: 'approved',
                approved_at: new Date().toISOString()
            })
            .eq('status', 'pending')
            .select();

        if (approveError) throw approveError;
        console.log(`   ✅ Approved ${updatedEvents?.length || 0} events`);

        // Step 2: Standardize equipment names to match controller expectations
        console.log('\n2️⃣  Standardizing equipment names...');
        
        const equipmentMapping = {
            'Microphones': 'microphone',
            'Projector': 'projector',
            'Speakers': 'speakers',
            'Podium': 'laser-pointer',
            'Conference Phone': 'video-conferencing',
            'Whiteboard Markers': 'interactive-whiteboard',
            'Laptop': 'computers',
            'Sports Equipment': 'equipment',
            'Scoreboard': 'equipment'
        };

        // Get all venues
        const { data: venues, error: venuesError } = await supabase
            .from('venues')
            .select('*');

        if (venuesError) throw venuesError;

        // Update each venue's equipment
        for (const venue of venues) {
            const standardizedEquipment = (venue.equipment || []).map(eq => {
                return equipmentMapping[eq] || eq.toLowerCase().replace(/\s+/g, '-');
            });

            const { error: updateError } = await supabase
                .from('venues')
                .update({ equipment: standardizedEquipment })
                .eq('id', venue.id);

            if (updateError) throw updateError;
            console.log(`   ✅ Updated ${venue.name}: ${JSON.stringify(standardizedEquipment)}`);
        }

        // Step 3: Approve bookings
        console.log('\n3️⃣  Confirming pending bookings...');
        const { data: updatedBookings, error: bookingError } = await supabase
            .from('bookings')
            .update({ 
                status: 'confirmed',
                approved_at: new Date().toISOString()
            })
            .eq('status', 'pending')
            .select();

        if (bookingError) throw bookingError;
        console.log(`   ✅ Confirmed ${updatedBookings?.length || 0} bookings`);

        console.log('\n✅ Resource data fixed successfully!');
        console.log('\n📌 Summary:');
        console.log(`   - Events approved: ${updatedEvents?.length || 0}`);
        console.log(`   - Venues updated: ${venues?.length || 0}`);
        console.log(`   - Bookings confirmed: ${updatedBookings?.length || 0}`);

    } catch (error) {
        console.error('\n❌ Fix failed:', error.message);
        throw error;
    }
};

// Run if called directly
if (require.main === module) {
    fixResourceData().then(() => {
        console.log('\n🎉 Done!');
        process.exit(0);
    }).catch(err => {
        console.error(err);
        process.exit(1);
    });
}

module.exports = fixResourceData;
