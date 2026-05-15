// ===== DARK MODE THEME MANAGER =====

class ThemeManager {
    constructor() {
        this.theme = localStorage.getItem('theme') || 'light';
        this.init();
    }

    init() {
        // Apply saved theme
        this.applyTheme(this.theme);
        
        // Create theme toggle button
        this.createToggleButton();
        
        // Listen for system theme changes
        this.watchSystemTheme();
    }

    applyTheme(theme) {
        this.theme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        
        // Update toggle button icon
        this.updateToggleIcon();
    }

    toggleTheme() {
        const newTheme = this.theme === 'light' ? 'dark' : 'light';
        this.applyTheme(newTheme);
        
        // Add rotation animation
        const button = document.querySelector('.theme-toggle');
        if (button) {
            button.classList.add('rotating');
            setTimeout(() => button.classList.remove('rotating'), 500);
        }
        
        // Show toast notification
        this.showThemeToast(newTheme);
    }

    createToggleButton() {
        // Don't create floating button - theme toggle is in sidebar
        // This method is kept for compatibility but does nothing
        return;
    }

    updateToggleIcon() {
        const button = document.querySelector('.theme-toggle');
        if (button) {
            button.innerHTML = this.theme === 'dark' 
                ? '<i class="fas fa-sun"></i>' 
                : '<i class="fas fa-moon"></i>';
        }
    }

    watchSystemTheme() {
        if (window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            mediaQuery.addEventListener('change', (e) => {
                // Only auto-switch if user hasn't manually set a preference
                if (!localStorage.getItem('theme')) {
                    this.applyTheme(e.matches ? 'dark' : 'light');
                }
            });
        }
    }

    showThemeToast(theme) {
        const message = theme === 'dark' 
            ? '🌙 Dark mode enabled' 
            : '☀️ Light mode enabled';
        
        // Check if showToast function exists
        if (typeof showToast === 'function') {
            showToast(message, 'success');
        } else {
            // Create simple toast
            const toast = document.createElement('div');
            toast.className = 'toast success';
            toast.style.cssText = `
                position: fixed;
                top: 24px;
                right: 24px;
                background: white;
                padding: 16px 24px;
                border-radius: 12px;
                box-shadow: 0 8px 16px rgba(0,0,0,0.2);
                z-index: 9999;
                animation: toastSlideIn 0.3s ease;
            `;
            toast.innerHTML = `
                <i class="fas fa-check-circle" style="color: #10B981; margin-right: 8px;"></i>
                <span>${message}</span>
            `;
            
            document.body.appendChild(toast);
            
            setTimeout(() => {
                toast.style.animation = 'toastSlideIn 0.3s ease reverse';
                setTimeout(() => toast.remove(), 300);
            }, 2000);
        }
    }
}

// Initialize theme manager when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.themeManager = new ThemeManager();
        setupGlobalLogoRedirect();
    });
} else {
    window.themeManager = new ThemeManager();
    setupGlobalLogoRedirect();
}

function setupGlobalLogoRedirect() {
    const logos = document.querySelectorAll('.smart-campus-logo');
    logos.forEach(logo => {
        logo.addEventListener('click', (e) => {
            e.preventDefault();
            if (localStorage.getItem('token')) {
                window.location.href = 'dashboard.html';
            } else {
                window.location.href = 'index.html';
            }
        });
    });
}

// Export for manual use
window.ThemeManager = ThemeManager;
