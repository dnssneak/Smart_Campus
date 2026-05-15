/**
 * Test script to debug admin notifications
 * Run with: node backend/utils/testNotifications.js
 */

const supabase = require('../config/supabase');
const { eventBus, EVENTS } = require('./EventBus');
const { notificationEngine } = require('./NotificationEngine');

async function testAdminNotifications() {
    console.log('🔍 Testing Admin Notifications System\n');
    
    // Step 1: Check for admin users
    console.log('Step 1: Checking for admin users...');
    try {
        const { data: admins, error } = await supabase
            .from('profiles')
            .select('id, email, role, is_active')
            .eq('role', 'admin');
        
        if (error) {
            console.error('❌ Error fetching admins:', error.message);
            return;
        }
        
        console.log(`✅ Found ${admins.length} admin user(s):`);
        admins.forEach(admin => {
            console.log(`   - ID: ${admin.id}, Email: ${admin.email}, Active: ${admin.is_active}`);
        });
        
        const activeAdmins = admins.filter(a => a.is_active);
        console.log(`✅ Active admins: ${activeAdmins.length}\n`);
        
        if (activeAdmins.length === 0) {
            console.log('⚠️  WARNING: No active admin users found!');
            console.log('   Notifications will not be sent to admins.\n');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        return;
    }
    
    // Step 2: Test notification creation directly
    console.log('Step 2: Testing direct notification creation...');
    try {
        const { data: testAdmin } = await supabase
            .from('profiles')
            .select('id')
            .eq('role', 'admin')
            .eq('is_active', true)
            .limit(1)
            .single();
        
        if (!testAdmin) {
            console.log('⚠️  No active admin to test with. Skipping direct test.\n');
        } else {
            const result = await notificationEngine.createNotification(
                testAdmin.id,
                'system',
                '🧪 Test Notification',
                'This is a test notification to verify the system works.',
                null,
                'test'
            );
            
            if (result.success) {
                console.log('✅ Test notification created successfully!');
                console.log(`   Notification ID: ${result.notification.id}\n`);
            } else {
                console.log('❌ Failed to create test notification:', result.error, '\n');
            }
        }
    } catch (error) {
        console.error('❌ Error creating test notification:', error.message, '\n');
    }
    
    // Step 3: Test EventBus emission
    console.log('Step 3: Testing EventBus + NotificationEngine integration...');
    try {
        // Emit a test booking requested event
        await eventBus.emit(EVENTS.BOOKING_REQUESTED, {
            bookingId: 999,
            venueName: 'Test Venue',
            date: new Date().toLocaleDateString(),
            userId: 'test-user-id'
        });
        
        console.log('✅ BOOKING_REQUESTED event emitted');
        
        // Wait a moment for async processing
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check if notifications were created
        const { data: recentNotifications, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('related_id', 999)
            .eq('related_type', 'booking');
        
        if (error) {
            console.error('❌ Error checking notifications:', error.message);
        } else {
            console.log(`✅ Found ${recentNotifications.length} notification(s) for test booking`);
            recentNotifications.forEach(notif => {
                console.log(`   - To User: ${notif.user_id}, Type: ${notif.type}, Title: ${notif.title}`);
            });
        }
        
    } catch (error) {
        console.error('❌ Error in EventBus test:', error.message);
    }
    
    console.log('\n✅ Test complete!');
    console.log('\n📋 Summary:');
    console.log('   1. Check if admin users exist with role="admin" and is_active=true');
    console.log('   2. Verify NotificationEngine is initialized in server.js');
    console.log('   3. Check if EventBus events are being emitted from bookingController');
    console.log('   4. Review notifications table for recent entries\n');
    
    process.exit(0);
}

// Run the test
testAdminNotifications().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
