// ===== BELL NOTIFICATION DROPDOWN =====

// Update bell badge with unread count
async function updateBellBadge() {
    try {
        const response = await api.get('/notifications/unread-count');
        const count = response.unreadCount || 0;
        const badge = document.getElementById('bellBadge');

        if (badge) {
            if (count > 0) {
                badge.textContent = count > 99 ? '99+' : count;
                badge.style.display = 'block';
            } else {
                badge.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Badge error:', error);
    }
}

// Load notifications in bell dropdown
async function loadBellDropdown() {
    try {
        const response = await api.get('/notifications?unreadOnly=true');
        const notifications = response.notifications || [];
        const list = document.getElementById('bellDropdownList');

        if (!list) return;

        if (notifications.length === 0) {
            list.innerHTML = `<p style="padding:1.5rem;text-align:center;color:#94a3b8">No unread notifications</p>`;
            return;
        }

        const iconMap = {
            event_approved: 'fa-check-circle',
            event_rejected: 'fa-times-circle',
            booking_confirmed: 'fa-calendar-check',
            booking_cancelled: 'fa-calendar-times',
            waitlist_promotion: 'fa-arrow-up',
            venue_conflict: 'fa-exclamation-triangle',
            system: 'fa-info-circle'
        };

        list.innerHTML = notifications.slice(0, 5).map(n => `
            <div class="bell-dropdown-item ${n.is_read ? '' : 'unread'}" onclick="window.location.href='notifications.html'">
                <div style="width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:${getIconColor(n.type)};color:white;font-size:0.9rem">
                    <i class="fas ${iconMap[n.type] || 'fa-bell'}"></i>
                </div>
                <div style="flex:1">
                    <div style="font-weight:600;font-size:0.9rem;color:#1e293b">${escapeHtml(n.title)}</div>
                    <div style="font-size:0.8rem;color:#64748b">${escapeHtml(n.message.substring(0, 50))}${n.message.length > 50 ? '...' : ''}</div>
                    <small>${getTimeAgo(n.created_at)}</small>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Dropdown error:', error);
    }
}

// Get icon color based on notification type
function getIconColor(type) {
    const colors = {
        event_approved: '#059669',
        event_rejected: '#dc2626',
        booking_confirmed: '#2563eb',
        booking_cancelled: '#d97706',
        waitlist_promotion: '#6366f1',
        venue_conflict: '#db2777',
        system: '#6b7280'
    };
    return colors[type] || '#6366f1';
}

// Get relative time string
function getTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Toggle bell dropdown visibility
function toggleBellDropdown(e) {
    e.stopPropagation();
    const dropdown = document.getElementById('bellDropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
}

// Mark all notifications as read from bell dropdown
async function markAllAsReadFromBell() {
    try {
        await api.put('/notifications/mark-all-read');
        updateBellBadge();
        loadBellDropdown();
    } catch (error) {
        console.error('Mark all read error:', error);
    }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Close dropdown when clicking outside
document.addEventListener('click', () => {
    const dropdown = document.getElementById('bellDropdown');
    if (dropdown) {
        dropdown.classList.remove('show');
    }
});

// Auto-refresh badge every 30 seconds
setInterval(() => {
    if (localStorage.getItem('token')) {
        updateBellBadge();
    }
}, 30000);

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('token')) {
        updateBellBadge();
        loadBellDropdown();
    }
});
