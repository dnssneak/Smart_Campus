/**
 * NotificationEngine - Centralized notification management system
 * Handles creation and dispatch of notifications to users
 */

const supabase = require('../config/supabase');
const { eventBus, EVENTS } = require('./EventBus');

class NotificationEngine {
    constructor() {
        this.templates = this.initializeTemplates();
        this.setupEventListeners();
    }

    /**
     * Initialize notification templates
     */
    initializeTemplates() {
        return {
            // Event notifications
            EVENT_CREATED: {
                type: 'system',
                title: '📝 New Event Created',
                message: (data) => `Event "${data.eventTitle}" has been created and is pending approval.`
            },
            EVENT_APPROVED: {
                type: 'event_approved',
                title: '✅ Event Approved',
                message: (data) => `Your event "${data.eventTitle}" has been approved!`
            },
            EVENT_REJECTED: {
                type: 'event_rejected',
                title: '❌ Event Rejected',
                message: (data) => `Your event "${data.eventTitle}" has been rejected. ${data.reason || ''}`
            },
            EVENT_CANCELLED: {
                type: 'system',
                title: '🚫 Event Cancelled',
                message: (data) => `Event "${data.eventTitle}" has been cancelled.`
            },
            
            // Booking notifications
            BOOKING_REQUESTED: {
                type: 'booking_confirmed',
                title: '📅 Booking Requested',
                message: (data) => `Booking request for ${data.venueName} on ${data.date} is pending approval.`
            },
            BOOKING_APPROVED: {
                type: 'booking_confirmed',
                title: '✅ Booking Confirmed',
                message: (data) => `Your booking for ${data.venueName} on ${data.date} has been confirmed!`
            },
            BOOKING_REJECTED: {
                type: 'booking_cancelled',
                title: '❌ Booking Rejected',
                message: (data) => `Your booking request for ${data.venueName} has been rejected.`
            },
            BOOKING_CANCELLED: {
                type: 'booking_cancelled',
                title: '🚫 Booking Cancelled',
                message: (data) => `Booking for ${data.venueName} on ${data.date} has been cancelled.`
            },
            
            // Waitlist notifications
            WAITLIST_ADDED: {
                type: 'system',
                title: '⏳ Added to Waitlist',
                message: (data) => `You've been added to the waitlist for ${data.venueName}. Position: #${data.position}`
            },
            WAITLIST_PROMOTED: {
                type: 'waitlist_promotion',
                title: '🎉 Waitlist Promotion!',
                message: (data) => `Great news! Your waitlist request for ${data.venueName} has been promoted to a confirmed booking!`
            },
            
            // Conflict notifications
            CONFLICT_DETECTED: {
                type: 'venue_conflict',
                title: '⚠️ Booking Conflict',
                message: (data) => `A conflict has been detected for ${data.venueName} on ${data.date}.`
            },
            
            // Admin notifications
            ADMIN_APPROVAL_NEEDED: {
                type: 'system',
                title: '👨‍💼 Approval Required',
                message: (data) => `New ${data.type} requires your approval.`
            },
            
            // Resource notifications
            RESOURCE_UNAVAILABLE: {
                type: 'system',
                title: '⚠️ Resource Unavailable',
                message: (data) => `Required resource "${data.resourceName}" is not available.`
            }
        };
    }

    /**
     * Setup event listeners for automatic notifications
     */
    setupEventListeners() {
        // Event lifecycle
        eventBus.on(EVENTS.EVENT_CREATED, (data) => this.handleEventCreated(data));
        eventBus.on(EVENTS.EVENT_APPROVED, (data) => this.handleEventApproved(data));
        eventBus.on(EVENTS.EVENT_REJECTED, (data) => this.handleEventRejected(data));
        eventBus.on(EVENTS.EVENT_CANCELLED, (data) => this.handleEventCancelled(data));
        
        // Booking lifecycle
        eventBus.on(EVENTS.BOOKING_REQUESTED, (data) => this.handleBookingRequested(data));
        eventBus.on(EVENTS.BOOKING_APPROVED, (data) => this.handleBookingApproved(data));
        eventBus.on(EVENTS.BOOKING_CANCELLED, (data) => this.handleBookingCancelled(data));
        
        // Waitlist
        eventBus.on(EVENTS.WAITLIST_ADDED, (data) => this.handleWaitlistAdded(data));
        eventBus.on(EVENTS.WAITLIST_PROMOTED, (data) => this.handleWaitlistPromoted(data));
        
        // Conflicts
        eventBus.on(EVENTS.CONFLICT_DETECTED, (data) => this.handleConflictDetected(data));
    }

    /**
     * Create a notification
     * @param {string} userId - User ID to notify
     * @param {string} type - Notification type
     * @param {string} title - Notification title
     * @param {string} message - Notification message
     * @param {number} relatedId - Related entity ID
     * @param {string} relatedType - Related entity type
     */
    async createNotification(userId, type, title, message, relatedId = null, relatedType = null) {
        try {
            const { data, error } = await supabase
                .from('notifications')
                .insert({
                    user_id: userId,
                    type,
                    title,
                    message,
                    related_id: relatedId,
                    related_type: relatedType,
                    is_read: false
                })
                .select()
                .single();

            if (error) throw error;
            return { success: true, notification: data };
        } catch (error) {
            console.error('Create notification error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Notify multiple users
     * @param {Array<string>} userIds - Array of user IDs
     * @param {string} type - Notification type
     * @param {string} title - Notification title
     * @param {string} message - Notification message
     * @param {number} relatedId - Related entity ID
     * @param {string} relatedType - Related entity type
     */
    async notifyMultiple(userIds, type, title, message, relatedId = null, relatedType = null) {
        const notifications = userIds.map(userId => ({
            user_id: userId,
            type,
            title,
            message,
            related_id: relatedId,
            related_type: relatedType,
            is_read: false
        }));

        try {
            const { data, error } = await supabase
                .from('notifications')
                .insert(notifications)
                .select();

            if (error) throw error;
            return { success: true, count: data.length };
        } catch (error) {
            console.error('Notify multiple error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get all admin user IDs
     */
    async getAdminUserIds() {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id')
                .eq('role', 'admin')
                .eq('is_active', true);

            if (error) throw error;
            return data.map(profile => profile.id);
        } catch (error) {
            console.error('Get admin users error:', error);
            return [];
        }
    }

    // Event handlers
    async handleEventCreated(data) {
        const { eventId, eventTitle, createdBy } = data;
        const template = this.templates.EVENT_CREATED;
        
        // Notify admins
        const adminIds = await this.getAdminUserIds();
        await this.notifyMultiple(
            adminIds,
            template.type,
            template.title,
            template.message({ eventTitle }),
            eventId,
            'event'
        );
    }

    async handleEventApproved(data) {
        const { eventId, eventTitle, userId } = data;
        const template = this.templates.EVENT_APPROVED;
        
        await this.createNotification(
            userId,
            template.type,
            template.title,
            template.message({ eventTitle }),
            eventId,
            'event'
        );
    }

    async handleEventRejected(data) {
        const { eventId, eventTitle, userId, reason } = data;
        const template = this.templates.EVENT_REJECTED;
        
        await this.createNotification(
            userId,
            template.type,
            template.title,
            template.message({ eventTitle, reason }),
            eventId,
            'event'
        );
    }

    async handleEventCancelled(data) {
        const { eventId, eventTitle, affectedUserIds } = data;
        const template = this.templates.EVENT_CANCELLED;
        
        if (affectedUserIds && affectedUserIds.length > 0) {
            await this.notifyMultiple(
                affectedUserIds,
                template.type,
                template.title,
                template.message({ eventTitle }),
                eventId,
                'event'
            );
        }
    }

    async handleBookingRequested(data) {
        const { bookingId, venueName, date, userId } = data;
        const template = this.templates.BOOKING_REQUESTED;
        
        // Notify user
        await this.createNotification(
            userId,
            template.type,
            template.title,
            template.message({ venueName, date }),
            bookingId,
            'booking'
        );
        
        // Notify admins
        const adminIds = await this.getAdminUserIds();
        await this.notifyMultiple(
            adminIds,
            'system',
            '👨‍💼 New Booking Pending',
            `New booking request for ${venueName} requires approval.`,
            bookingId,
            'booking'
        );
    }

    async handleBookingApproved(data) {
        const { bookingId, venueName, date, userId } = data;
        const template = this.templates.BOOKING_APPROVED;
        
        await this.createNotification(
            userId,
            template.type,
            template.title,
            template.message({ venueName, date }),
            bookingId,
            'booking'
        );
    }

    async handleBookingCancelled(data) {
        const { bookingId, venueName, date, userId } = data;
        const template = this.templates.BOOKING_CANCELLED;
        
        await this.createNotification(
            userId,
            template.type,
            template.title,
            template.message({ venueName, date }),
            bookingId,
            'booking'
        );
    }

    async handleWaitlistAdded(data) {
        const { waitlistId, venueName, position, userId } = data;
        const template = this.templates.WAITLIST_ADDED;
        
        await this.createNotification(
            userId,
            template.type,
            template.title,
            template.message({ venueName, position }),
            waitlistId,
            'waitlist'
        );
    }

    async handleWaitlistPromoted(data) {
        const { bookingId, venueName, userId } = data;
        const template = this.templates.WAITLIST_PROMOTED;
        
        await this.createNotification(
            userId,
            template.type,
            template.title,
            template.message({ venueName }),
            bookingId,
            'booking'
        );
    }

    async handleConflictDetected(data) {
        const { venueName, date, affectedUserIds } = data;
        const template = this.templates.CONFLICT_DETECTED;
        
        // Notify admins
        const adminIds = await this.getAdminUserIds();
        await this.notifyMultiple(
            adminIds,
            template.type,
            template.title,
            template.message({ venueName, date }),
            null,
            'conflict'
        );
    }
}

// Create singleton instance
const notificationEngine = new NotificationEngine();

module.exports = {
    notificationEngine,
    NotificationEngine
};
