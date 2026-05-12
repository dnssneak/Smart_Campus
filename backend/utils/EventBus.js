/**
 * EventBus - Centralized event-driven communication system
 * Enables decoupled communication between services
 */

class EventBus {
    constructor() {
        this.listeners = new Map();
    }

    /**
     * Subscribe to an event
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     * @returns {Function} Unsubscribe function
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        
        this.listeners.get(event).push(callback);
        
        // Return unsubscribe function
        return () => this.off(event, callback);
    }

    /**
     * Unsubscribe from an event
     * @param {string} event - Event name
     * @param {Function} callback - Callback function to remove
     */
    off(event, callback) {
        if (!this.listeners.has(event)) return;
        
        const callbacks = this.listeners.get(event);
        const index = callbacks.indexOf(callback);
        
        if (index > -1) {
            callbacks.splice(index, 1);
        }
        
        if (callbacks.length === 0) {
            this.listeners.delete(event);
        }
    }

    /**
     * Emit an event
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    async emit(event, data) {
        if (!this.listeners.has(event)) return;
        
        const callbacks = this.listeners.get(event);
        
        // Execute all callbacks
        const promises = callbacks.map(callback => {
            try {
                return Promise.resolve(callback(data));
            } catch (error) {
                console.error(`Error in event listener for ${event}:`, error);
                return Promise.resolve();
            }
        });
        
        await Promise.all(promises);
    }

    /**
     * Emit an event synchronously
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    emitSync(event, data) {
        if (!this.listeners.has(event)) return;
        
        const callbacks = this.listeners.get(event);
        
        callbacks.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in event listener for ${event}:`, error);
            }
        });
    }

    /**
     * Remove all listeners for an event
     * @param {string} event - Event name
     */
    removeAllListeners(event) {
        if (event) {
            this.listeners.delete(event);
        } else {
            this.listeners.clear();
        }
    }

    /**
     * Get listener count for an event
     * @param {string} event - Event name
     * @returns {number} Number of listeners
     */
    listenerCount(event) {
        return this.listeners.has(event) ? this.listeners.get(event).length : 0;
    }
}

// Event types constants
const EVENTS = {
    // Event lifecycle
    EVENT_CREATED: 'event:created',
    EVENT_UPDATED: 'event:updated',
    EVENT_APPROVED: 'event:approved',
    EVENT_REJECTED: 'event:rejected',
    EVENT_CANCELLED: 'event:cancelled',
    
    // Booking lifecycle
    BOOKING_REQUESTED: 'booking:requested',
    BOOKING_APPROVED: 'booking:approved',
    BOOKING_REJECTED: 'booking:rejected',
    BOOKING_CANCELLED: 'booking:cancelled',
    BOOKING_COMPLETED: 'booking:completed',
    
    // Waitlist
    WAITLIST_ADDED: 'waitlist:added',
    WAITLIST_PROMOTED: 'waitlist:promoted',
    WAITLIST_CANCELLED: 'waitlist:cancelled',
    WAITLIST_EXPIRED: 'waitlist:expired',
    
    // Resources
    RESOURCE_ALLOCATED: 'resource:allocated',
    RESOURCE_RELEASED: 'resource:released',
    RESOURCE_UNAVAILABLE: 'resource:unavailable',
    
    // Conflicts
    CONFLICT_DETECTED: 'conflict:detected',
    CONFLICT_RESOLVED: 'conflict:resolved',
    
    // System
    SYSTEM_ERROR: 'system:error',
    CACHE_INVALIDATED: 'cache:invalidated'
};

// Create singleton instance
const eventBus = new EventBus();

module.exports = {
    eventBus,
    EVENTS
};
