const supabase = require('../config/supabase');

const seedDatabase = async () => {
    console.log('🌱 Starting database seeding...\n');

    try {
        // ========== CHECK EXISTING DATA ==========
        console.log('📊 Checking existing data...');
        
        const { data: existingVenues } = await supabase
            .from('venues')
            .select('id')
            .limit(1);

        if (existingVenues && existingVenues.length > 0) {
            console.log('  ⏭️  Data already exists. Skipping seed.\n');
            console.log('✅ Database already seeded!');
            return;
        }

        // ========== INSERT VENUES ==========
        console.log('🏢 Inserting venues...');
        
        const { error: venuesError } = await supabase
            .from('venues')
            .insert([
                {
                    name: 'Main Auditorium',
                    description: 'Large auditorium with stage, lighting, and professional sound system. Perfect for conferences, ceremonies, and major events.',
                    capacity: 500,
                    location: 'Building A, Floor 1',
                    facilities: ['AC', 'Stage', 'Lighting Rig', 'Sound System', 'Green Room'],
                    equipment: ['4K Projector', 'Wireless Microphones', 'Speakers', 'Podium'],
                    images: ['auditorium_1.jpg', 'auditorium_2.jpg'],
                    is_active: true
                },
                {
                    name: 'Conference Room A',
                    description: 'Modern conference room with video conferencing capabilities. Ideal for meetings and small workshops.',
                    capacity: 50,
                    location: 'Building B, Floor 2',
                    facilities: ['AC', 'Whiteboard', 'Video Conferencing', 'Catering Available'],
                    equipment: ['HD Projector', 'Conference Phone', 'Computer', 'Flip Chart'],
                    images: ['conference_a.jpg'],
                    is_active: true
                },
                {
                    name: 'Seminar Hall 1',
                    description: 'Medium-sized seminar hall with tiered seating. Great for lectures and training sessions.',
                    capacity: 120,
                    location: 'Building C, Floor 1',
                    facilities: ['AC', 'Projector Screen', 'Tilted Seating', 'Recording Equipment'],
                    equipment: ['Projector', 'Lapel Microphone', 'Document Camera'],
                    images: ['seminar_1.jpg'],
                    is_active: true
                },
                {
                    name: 'Computer Lab 1',
                    description: 'Fully equipped computer lab with 40 workstations. Suitable for coding workshops and technical training.',
                    capacity: 40,
                    location: 'Building D, Floor 3',
                    facilities: ['AC', 'High-Speed Internet', 'Power Backup', 'Printer Access'],
                    equipment: ['40 Desktop Computers', 'Projector', 'Instructor Station'],
                    images: ['lab_1.jpg'],
                    is_active: true
                },
                {
                    name: 'Outdoor Ground',
                    description: 'Large open ground for sports events, cultural festivals, and outdoor activities. Includes parking area.',
                    capacity: 1000,
                    location: 'Campus Ground, North Side',
                    facilities: ['Open Air', 'Parking (200 cars)', 'Restrooms', 'Food Stalls Area'],
                    equipment: ['Portable Sound System', 'Portable Stage', 'Floodlights'],
                    images: ['ground_1.jpg', 'ground_2.jpg'],
                    is_active: true
                },
                {
                    name: 'Library Meeting Room',
                    description: 'Quiet meeting space in the library. Perfect for study groups and small discussions.',
                    capacity: 15,
                    location: 'Library, Floor 2',
                    facilities: ['AC', 'Whiteboard', 'Quiet Zone', 'WiFi'],
                    equipment: ['Projector', 'Chromebook'],
                    images: ['library_room.jpg'],
                    is_active: true
                },
                {
                    name: 'Sports Complex Hall',
                    description: 'Indoor sports hall with wooden flooring. Can be converted for exhibitions and large gatherings.',
                    capacity: 300,
                    location: 'Sports Complex, Floor 1',
                    facilities: ['AC', 'Changing Rooms', 'Showers', 'Equipment Storage'],
                    equipment: ['Scoreboard', 'Sound System', 'Portable Bleachers'],
                    images: ['sports_hall.jpg'],
                    is_active: true
                }
            ]);

        if (venuesError) {
            console.error('❌ Venues insert failed:', venuesError);
            throw venuesError;
        }
        console.log('  ✅ 7 venues inserted');

        // ========== INSERT RESOURCES ==========
        console.log('\n🔧 Inserting resources...');
        
        const { error: resourcesError } = await supabase
            .from('resources')
            .insert([
                {
                    name: 'HD Projector',
                    type: 'projector',
                    total_quantity: 10,
                    available_quantity: 10,
                    description: 'High definition projectors (1080p) for presentations',
                    is_active: true
                },
                {
                    name: 'Sound System (Full)',
                    type: 'sound_system',
                    total_quantity: 5,
                    available_quantity: 5,
                    description: 'Complete sound system with mixer, amplifiers, and speakers',
                    is_active: true
                },
                {
                    name: 'Wireless Microphone',
                    type: 'microphone',
                    total_quantity: 15,
                    available_quantity: 15,
                    description: 'Wireless handheld microphones with receiver',
                    is_active: true
                },
                {
                    name: 'Desktop Computer',
                    type: 'computer',
                    total_quantity: 50,
                    available_quantity: 50,
                    description: 'High performance computers (i7, 16GB RAM, SSD)',
                    is_active: true
                },
                {
                    name: 'Technical Staff',
                    type: 'technical_staff',
                    total_quantity: 8,
                    available_quantity: 8,
                    description: 'Technical support personnel for event setup',
                    is_active: true
                },
                {
                    name: 'LED Display Panel',
                    type: 'other_equipment',
                    total_quantity: 4,
                    available_quantity: 4,
                    description: 'Large LED display panels for digital signage',
                    is_active: true
                },
                {
                    name: 'Podium with Mic',
                    type: 'other_equipment',
                    total_quantity: 6,
                    available_quantity: 6,
                    description: 'Wooden podium with built-in gooseneck microphone',
                    is_active: true
                }
            ]);

        if (resourcesError) {
            console.error('❌ Resources insert failed:', resourcesError);
            throw resourcesError;
        }
        console.log('  ✅ 7 resources inserted');

        console.log('\n✅ Database seeding completed successfully!');
        console.log('\n📌 Next: Set up authentication to create users');

    } catch (error) {
        console.error('\n❌ Seeding failed:', error);
        throw error;
    }
};

// Run if called directly
if (require.main === module) {
    seedDatabase().then(() => {
        console.log('\n🎉 Done! Press Ctrl+C to exit.');
        process.exit(0);
    }).catch(err => {
        console.error(err);
        process.exit(1);
    });
}

module.exports = seedDatabase;