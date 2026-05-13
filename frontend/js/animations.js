// ===== ANIMATIONS AND MOVING OBJECTS =====

// Add floating background shapes
function addFloatingShapes() {
    // Check if floating-bg already exists
    if (document.querySelector('.floating-bg')) return;
    
    const floatingBg = document.createElement('div');
    floatingBg.className = 'floating-bg';
    floatingBg.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 0;
        overflow: hidden;
    `;
    
    // Create 8 floating shapes with different colors
    const colors = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899'];
    for (let i = 1; i <= 8; i++) {
        const shape = document.createElement('div');
        shape.className = 'floating-shape';
        shape.style.cssText = `
            position: absolute;
            width: ${50 + Math.random() * 100}px;
            height: ${50 + Math.random() * 100}px;
            background: ${colors[Math.floor(Math.random() * colors.length)]};
            opacity: 0.05;
            border-radius: 50%;
            top: ${Math.random() * 100}%;
            left: ${Math.random() * 100}%;
            animation: float ${10 + Math.random() * 20}s ease-in-out infinite;
            animation-delay: ${Math.random() * 5}s;
        `;
        floatingBg.appendChild(shape);
    }
    
    document.body.appendChild(floatingBg);
}

// Add particle effects
function addParticles() {
    const particleCount = 20;
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.cssText = `
            position: fixed;
            width: 4px;
            height: 4px;
            background: #6366f1;
            border-radius: 50%;
            pointer-events: none;
            opacity: 0.3;
            left: ${Math.random() * 100}%;
            top: 100%;
            animation: particleRise ${10 + Math.random() * 10}s linear infinite;
            animation-delay: ${Math.random() * 15}s;
            z-index: 0;
        `;
        document.body.appendChild(particle);
    }
}

// Add stagger animation to list items
function addStaggerAnimation(selector) {
    const items = document.querySelectorAll(selector);
    items.forEach((item, index) => {
        item.classList.add('stagger-item');
        item.style.cssText += `
            animation: fadeInUp 0.6s ease forwards;
            animation-delay: ${index * 0.08}s;
            opacity: 0;
        `;
    });
}

// Add page enter animation
function addPageEnterAnimation() {
    const main = document.querySelector('main');
    if (main) {
        main.style.cssText += `
            animation: fadeIn 0.5s ease forwards;
        `;
    }
}

// Add ripple effect to buttons
function addRippleEffect() {
    document.addEventListener('click', function(e) {
        const target = e.target.closest('button, .btn, .btn-modern, .btn-primary, .btn-secondary');
        if (!target) return;
        
        const ripple = document.createElement('span');
        const rect = target.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;
        
        ripple.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.5);
            left: ${x}px;
            top: ${y}px;
            pointer-events: none;
            animation: ripple 0.6s ease-out;
        `;
        
        target.style.position = 'relative';
        target.style.overflow = 'hidden';
        target.appendChild(ripple);
        
        setTimeout(() => ripple.remove(), 600);
    });
}

// Add smooth scroll behavior
function addSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href === '#' || href === '#!') return;
            
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Add hover tilt effect to cards
function addCardTiltEffect() {
    const cards = document.querySelectorAll('.stat-card, .venue-card, .event-card, .modern-event-card');
    
    cards.forEach(card => {
        card.addEventListener('mousemove', function(e) {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const rotateX = (y - centerY) / 20;
            const rotateY = (centerX - x) / 20;
            
            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
        });
        
        card.addEventListener('mouseleave', function() {
            card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale(1)';
        });
    });
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
    
    // Add ripple effect
    addRippleEffect();
    
    // Add smooth scroll
    addSmoothScroll();
    
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
        addStaggerAnimation('.stat-card');
        addStaggerAnimation('.stat-card-modern');
    }, 200);
    
    // Add card tilt effect
    setTimeout(() => {
        addCardTiltEffect();
    }, 500);
}

// Run animations when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAnimations);
} else {
    initAnimations();
}

// Add CSS animations dynamically
function addAnimationStyles() {
    if (document.getElementById('animation-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'animation-styles';
    style.textContent = `
        @keyframes float {
            0%, 100% { transform: translate(0, 0) rotate(0deg); }
            25% { transform: translate(10px, -10px) rotate(5deg); }
            50% { transform: translate(-5px, -20px) rotate(-5deg); }
            75% { transform: translate(-10px, -10px) rotate(3deg); }
        }
        
        @keyframes particleRise {
            0% { transform: translateY(0) scale(1); opacity: 0.3; }
            50% { opacity: 0.5; }
            100% { transform: translateY(-100vh) scale(0); opacity: 0; }
        }
        
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        @keyframes ripple {
            0% {
                transform: scale(0);
                opacity: 1;
            }
            100% {
                transform: scale(4);
                opacity: 0;
            }
        }
        
        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
        }
        
        @keyframes slideInRight {
            from {
                opacity: 0;
                transform: translateX(50px);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }
        
        .glow-on-hover {
            position: relative;
            overflow: hidden;
        }
        
        .glow-on-hover::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            width: 0;
            height: 0;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.3);
            transform: translate(-50%, -50%);
            transition: width 0.6s, height 0.6s;
        }
        
        .glow-on-hover:hover::before {
            width: 300px;
            height: 300px;
        }
    `;
    document.head.appendChild(style);
}

// Initialize animation styles
addAnimationStyles();

// Export functions for manual use
window.smartCampusAnimations = {
    addFloatingShapes,
    addParticles,
    addStaggerAnimation,
    addPageEnterAnimation,
    animateOnScroll,
    addGlowToButtons,
    addRippleEffect,
    addSmoothScroll,
    addCardTiltEffect,
    initAnimations
};
