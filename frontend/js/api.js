const API_BASE_URL = 'http://localhost:5001/api';

const api = {
    async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        const token = localStorage.getItem('token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }

        if (config.body && typeof config.body === 'object') {
            config.body = JSON.stringify(config.body);
        }

        try {
            const response = await fetch(url, config);
            
            // Check if response is JSON before parsing
            const contentType = response.headers.get('content-type');
            let data;
            
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                // Handle non-JSON responses (like rate limit HTML pages)
                const text = await response.text();
                data = { message: text.substring(0, 100) }; // Truncate long HTML responses
            }

            if (!response.ok) {
                const error = new Error(data.message || `Request failed: ${response.status}`);
                error.status = response.status;
                throw error;
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    get(endpoint) { return this.request(endpoint, { method: 'GET' }); },
    post(endpoint, body) { return this.request(endpoint, { method: 'POST', body }); },
    put(endpoint, body) { return this.request(endpoint, { method: 'PUT', body }); },
    delete(endpoint) { return this.request(endpoint, { method: 'DELETE' }); }
};

// Auth helpers
function isLoggedIn() {
    return !!localStorage.getItem('token');
}

function getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

function updateAuthUI() {
    // Call this on pages with navbar to update login/logout link
    const authLink = document.getElementById('authLink');
    if (!authLink) return;

    if (isLoggedIn()) {
        authLink.innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout';
        authLink.onclick = (e) => {
            e.preventDefault();
            logout();
        };
    }
}