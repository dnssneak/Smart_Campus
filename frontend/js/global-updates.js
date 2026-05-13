// ===== GLOBAL UPDATES SCRIPT =====
// This script applies common updates across all pages

(function() {
    'use strict';
    
    // Update all logout functions to redirect to index.html
    window.logout = function() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'index.html';
    };
    
    // Add dark mode and animation styles to pages that don't have them
    function ensureStylesLoaded() {
        const head = document.head;
        
        // Check if dark-mode.css is loaded
        if (!document.querySelector('link[href="css/dark-mode.css"]')) {
            const darkModeLink = document.createElement('link');
            darkModeLink.rel = 'stylesheet';
            darkModeLink.href = 'css/dark-mode.css';
            head.appendChild(darkModeLink);
        }
    }
    
    // Initialize on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', ensureStylesLoaded);
    } else {
        ensureStylesLoaded();
    }
    
    // Add smooth page transitions
    window.addEventListener('beforeunload', function() {
        document.body.style.opacity = '0';
        document.body.style.transition = 'opacity 0.3s ease';
    });
    
    // Fade in on load
    window.addEventListener('load', function() {
        document.body.style.opacity = '0';
        document.body.style.transition = 'opacity 0.5s ease';
        setTimeout(() => {
            document.body.style.opacity = '1';
        }, 10);
    });
    
})();
