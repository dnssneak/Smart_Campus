/**
 * AuditLogger - Centralized audit logging system
 * Tracks all important system actions and changes
 */

const supabase = require('../config/supabase');
const { eventBus, EVENTS } = require('./EventBus');

class AuditLogger {
    constructor() {
        this.setupEventListeners();
    }

    /**
     * Setup event listeners for automatic audit logging
     */
    setupEventListeners() {
        // Event lifecycle
        eventBus.on(EVENTS.EVENT_CREATED, (data) => this.logEventCreated(data));
        eventBus.on(EVENTS.EVENT_APPROVED, (data) => this.logEventApproved(data));
        eventBus.on(EVENTS.EVENT_REJECTED, (data) => this.logEventRejected(data));
        eventBus.on(EVENTS.EVENT_CANCELLED, (data) => this.logEventCancelled(data));
        
        // Booking lifecycle
        eventBus.on(EVENTS.BOOKING_REQUESTED, (data) => this.logBookingRequested(data));
        eventBus.on(EVENTS.BOOKING_APPROVED, (data) => this.logBookingApproved(data));
        eventBus.on(EVENTS.BOOKING_CANCELLED, (data) => this.logBookingCancelled(data));
        
        // Waitlist
        eventBus.on(EVENTS.WAITLIST_PROMOTED, (data) => this.logWaitlistPromoted(data));
    }

    /**
     * Create an audit log entry
     * @param {string} tableName - Table name
     * @param {number} recordId - Record ID
     * @param {string} action - Action performed
     * @param {Object} oldData - Old data (for updates/deletes)
     * @param {Object} newData - New data (for inserts/updates)
     * @param {string} changedBy - User ID who made the change
     */
    async log(tableName, recordId, action, oldData = null, newData = null, changedBy = null) {
        try {
            const { error } = await supabase
                .from('audit_logs')
                .insert({
                    table_name: tableName,
                    record_id: recordId,
                    action,
                    old_data: oldData,
                    new_data: newData,
                    changed_by: changedBy,
                    changed_at: new Date().toISOString()
                });

            if (error) {
                console.error('Audit log error:', error);
            }
        } catch (error) {
            console.error('Audit log exception:', error);
        }
    }

    /**
     * Log user login
     * @param {string} userId - User ID
     * @param {string} ipAddress - IP address
     * @param {string} userAgent - User agent
     */
    async logLogin(userId, ipAddress = null, userAgent = null) {
        await this.log('profiles', userId, 'LOGIN', null, {
            ip_address: ipAddress,
            user_agent: userAgent,
            timestamp: new Date().toISOString()
        }, userId);
    }

    /**
     * Log user logout
     * @param {string} userId - User ID
     */
    async logLogout(userId) {
        await this.log('profiles', userId, 'LOGOUT', null, {
            timestamp: new Date().toISOString()
        }, userId);
    }

    // Event-specific logging methods
    async logEventCreated(data) {
        await this.log('events', data.eventId, 'INSERT', null, {
            title: data.eventTitle,
            created_by: data.createdBy
        }, data.createdBy);
    }

    async logEventApproved(data) {
        await this.log('events', data.eventId, 'UPDATE', 
            { status: 'pending' },
            { status: 'approved', title: data.eventTitle },
            data.userId
        );
    }

    async logEventRejected(data) {
        await this.log('events', data.eventId, 'UPDATE',
            { status: 'pending' },
            { status: 'rejected', title: data.eventTitle, reason: data.reason },
            data.userId
        );
    }

    async logEventCancelled(data) {
        await this.log('events', data.eventId, 'UPDATE',
            { status: 'approved' },
            { status: 'cancelled', title: data.eventTitle },
            null
        );
    }

    async logBookingRequested(data) {
        await this.log('bookings', data.bookingId, 'INSERT', null, {
            venue_name: data.venueName,
            date: data.date,
            user_id: data.userId
        }, data.userId);
    }

    async logBookingApproved(data) {
        await this.log('bookings', data.bookingId, 'UPDATE',
            { status: 'pending' },
            { status: 'confirmed', venue_name: data.venueName },
            data.userId
        );
    }

    async logBookingCancelled(data) {
        await this.log('bookings', data.bookingId, 'UPDATE',
            { status: 'confirmed' },
            { status: 'cancelled', venue_name: data.venueName },
            data.userId
        );
    }

    async logWaitlistPromoted(data) {
        await this.log('waitlists', data.bookingId, 'UPDATE',
            { status: 'waiting' },
            { status: 'promoted', venue_name: data.venueName },
            data.userId
        );
    }

    /**
     * Get audit logs for a specific table
     * @param {string} tableName - Table name
     * @param {number} limit - Number of records to return
     * @returns {Array} Audit logs
     */
    async getLogsByTable(tableName, limit = 100) {
        try {
            const { data, error } = await supabase
                .from('audit_logs')
                .select('*')
                .eq('table_name', tableName)
                .order('changed_at', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Get audit logs error:', error);
            return [];
        }
    }

    /**
     * Get audit logs for a specific record
     * @param {string} tableName - Table name
     * @param {number} recordId - Record ID
     * @returns {Array} Audit logs
     */
    async getLogsByRecord(tableName, recordId) {
        try {
            const { data, error } = await supabase
                .from('audit_logs')
                .select('*')
                .eq('table_name', tableName)
                .eq('record_id', recordId)
                .order('changed_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Get audit logs error:', error);
            return [];
        }
    }

    /**
     * Get audit logs for a specific user
     * @param {string} userId - User ID
     * @param {number} limit - Number of records to return
     * @returns {Array} Audit logs
     */
    async getLogsByUser(userId, limit = 100) {
        try {
            const { data, error } = await supabase
                .from('audit_logs')
                .select('*')
                .eq('changed_by', userId)
                .order('changed_at', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Get audit logs error:', error);
            return [];
        }
    }

    /**
     * Get recent audit logs
     * @param {number} limit - Number of records to return
     * @returns {Array} Audit logs
     */
    async getRecentLogs(limit = 50) {
        try {
            const { data, error } = await supabase
                .from('audit_logs')
                .select('*')
                .order('changed_at', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Get audit logs error:', error);
            return [];
        }
    }

    /**
     * Get audit log statistics
     * @param {number} days - Number of days to look back
     * @returns {Object} Statistics
     */
    async getStatistics(days = 30) {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            const { data, error } = await supabase
                .from('audit_logs')
                .select('action, table_name')
                .gte('changed_at', startDate.toISOString());

            if (error) throw error;

            const stats = {
                total: data.length,
                byAction: {},
                byTable: {}
            };

            data.forEach(log => {
                stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1;
                stats.byTable[log.table_name] = (stats.byTable[log.table_name] || 0) + 1;
            });

            return stats;
        } catch (error) {
            console.error('Get audit statistics error:', error);
            return null;
        }
    }
}

// Create singleton instance
const auditLogger = new AuditLogger();

module.exports = {
    auditLogger,
    AuditLogger
};
