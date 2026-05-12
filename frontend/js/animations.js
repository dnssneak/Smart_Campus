// ===== ANIMATIONS AND MOVING OBJECTS =====

// Add floating background shapes
function addFloatingShapes() {
    // Check if floating-bg already exists
    if (document.querySelector('.floating-bg')) return;
    
    const floatingBg = document.createElement('div');
    floatingBg.className = 'floating-bg';
    
    // Create 5 floating shapes
    for (let i = 1; i <= 5; i++) {
        const shape = document.createElement('div');
        shape.className = 'floating-shape';
        floatingBg.appendChild(shape);
    }
    
    document.body.appendChild(floatingBg);
}

// Add particle effects
function addParticles() {
    const particleCount = 15;
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 15 + 's';
        particle.style.animationDuration = (10 + Math.random() * 10) + 's';
        document.body.appendChild(particle);
    }
}

// Add stagger animation to list items
function addStaggerAnimation(selector) {
    const items = document.querySelectorAll(selector);
    items.forEach((item, index) => {
        item.classList.add('stagger-item');
        item.style.animationDelay = (index * 0.1) + 's';
    });
}

// Add page enter animation
function addPageEnterAnimation() {
    const main = document.querySelector('main');
    if (main) {
        main.classList.add('page-enter');
    }
}

// Animate elements on scroll
function animateOnScroll() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, {
        threshold: 0.1
    });
    
    // Observe all cards and widgets
    document.querySelectorAll('.card, .widget, .stat-card, .venue-card, .event-card, .booking-card, .waitlist-card, .notification-card').forEach(el => {
        observer.observe(el);
    });
}

// Add glow effect to buttons
function addGlowToButtons() {
    document.querySelectorAll('.btn-primary, .btn-success').forEach(btn => {
        btn.classList.add('glow-on-hover');
    });
}

// Initialize all animations
function initAnimations() {
    // Add floating shapes and particles
    addFloatingShapes();
    addParticles();
    
    // Add page enter animation
    addPageEnterAnimation();
    
    // Add glow to buttons
    addGlowToButtons();
    
    // Animate on scroll
    setTimeout(() => {
        animateOnScroll();
    }, 100);
    
    // Add stagger animations to common list items
    setTimeout(() => {
        addStaggerAnimation('.event-card');
        addStaggerAnimation('.venue-card');
        addStaggerAnimation('.booking-card');
        addStaggerAnimation('.waitlist-card');
        addStaggerAnimation('.notification-card');
    }, 200);
}

// Run animations when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAnimations);
} else {
    initAnimations();
}

// Export functions for manual use
window.smartCampusAnimations = {
    addFloatingShapes,
    addParticles,
    addStaggerAnimation,
    addPageEnterAnimation,
    animateOnScroll,
    addGlowToButtons,
    initAnimations
};
