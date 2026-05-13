const supabase = require('../config/supabase');

const checkData = async () => {
    console.log('🔍 Checking database data...\n');

    try {
        // Check venues
        const { data: venues, error: venuesError } = await supabase
            .from('venues')
            .select('id, name, equipment')
            .limit(5);

        if (venuesError) throw venuesError;

        console.log('📍 VENUES:');
        console.log(`  Total venues found: ${venues?.length || 0}`);
        if (venues && venues.length > 0) {
            venues.forEach(v => {
                console.log(`  - ${v.name}: equipment = ${JSON.stringify(v.equipment)}`);
            });
        }

        // Check events
        const { data: events, error: eventsError } = await supabase
            .from('events')
            .select('id, title, status, start_datetime')
            .limit(5);

        if (eventsError) throw eventsError;

        console.log('\n📅 EVENTS:');
        console.log(`  Total events found: ${events?.length || 0}`);
        if (events && events.length > 0) {
            events.forEach(e => {
                console.log(`  - ${e.title} (${e.status})`);
            });
        }

        // Check bookings (event-venue relationship)
        const { data: bookings, error: bookingsError } = await supabase
            .from('bookings')
            .select('id, event_id, venue_id, status')
            .limit(5);

        if (bookingsError) throw bookingsError;

        console.log('\n🎫 BOOKINGS (Event-Venue Links):');
        console.log(`  Total bookings found: ${bookings?.length || 0}`);
        if (bookings && bookings.length > 0) {
            bookings.forEach(b => {
                console.log(`  - Event ${b.event_id} → Venue ${b.venue_id} (${b.status})`);
            });
        }

        // Check resource assignments
        const { data: assignments, error: assignError } = await supabase
            .from('resource_assignments')
            .select('id, resource_name, venue_id, event_id')
            .limit(5);

        if (assignError) {
            console.log('\n⚠️  RESOURCE_ASSIGNMENTS table error:', assignError.message);
        } else {
            console.log('\n🔧 RESOURCE ASSIGNMENTS:');
            console.log(`  Total assignments found: ${assignments?.length || 0}`);
        }

    } catch (error) {
        console.error('\n❌ Check failed:', error.message);
    }
};

checkData().then(() => {
    console.log('\n✅ Check complete!');
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
