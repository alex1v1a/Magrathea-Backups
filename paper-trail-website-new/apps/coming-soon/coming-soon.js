/**
 * =============================================================================
 * COMING SOON - PROJECT APP PAGE JAVASCRIPT
 * =============================================================================
 * File: apps/coming-soon/coming-soon.js
 * Purpose: Interactivity for Coming Soon page
 * 
 * FEATURES:
 * - Glitch text effect
 * - Form submission handling
 * - Animated background particles
 * =============================================================================
 */

(function() {
    'use strict';

    /**
     * =========================================================================
     * GLITCH TEXT EFFECT
     * =========================================================================
     * Adds random glitch animation to title
     */
    function initGlitchEffect() {
        const glitches = document.querySelectorAll('.glitch');
        
        if (!glitches.length || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            return;
        }

        setInterval(() => {
            glitches.forEach(el => {
                // Randomly trigger glitch
                if (Math.random() > 0.7) {
                    el.style.animation = 'glitch 0.3s ease';
                    setTimeout(() => {
                        el.style.animation = '';
                    }, 300);
                }
            });
        }, 3000);
    }

    // Add glitch keyframes
    const style = document.createElement('style');
    style.textContent = `
        @keyframes glitch {
            0% { transform: translate(0); }
            20% { transform: translate(-2px, 2px); }
            40% { transform: translate(-2px, -2px); }
            60% { transform: translate(2px, 2px); }
            80% { transform: translate(2px, -2px); }
            100% { transform: translate(0); }
        }
    `;
    document.head.appendChild(style);

    /**
     * =========================================================================
     * FORM HANDLING
     * =========================================================================
     * Handle email signup form
     */
    function initFormHandling() {
        const form = document.querySelector('.signup-form');
        
        if (!form) return;

        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const email = form.querySelector('#email').value;
            const submitBtn = form.querySelector('button[type="submit"]');
            
            // Disable button during submission
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span>Joining...</span>';
            
            // Simulate API call (replace with actual endpoint)
            setTimeout(() => {
                // Show success message
                form.innerHTML = `
                    <div class="success-message" style="
                        text-align: center;
                        padding: 40px;
                        background: rgba(168, 85, 247, 0.1);
                        border: 1px solid var(--cs-purple);
                        border-radius: 10px;
                    ">
                        <div style="font-size: 4rem; margin-bottom: 20px;">🎉</div>
                        <h3 style="color: var(--cs-cyan); margin-bottom: 10px;">You're on the list!</h3>
                        <p style="color: var(--cs-gray);">We'll notify you when Project Cartwheel launches.</p>
                    </div>
                `;
                
                // Log for analytics
                console.log(`[Waitlist] New signup: ${email}`);
            }, 1500);
        });
    }

    /**
     * =========================================================================
     * HINT CARD INTERACTIONS
     * =========================================================================
     * Reveal more info on hover (for unlocked cards)
     */
    function initHintCards() {
        const hintCards = document.querySelectorAll('.hint-card:not(.locked)');
        
        hintCards.forEach(card => {
            card.addEventListener('mouseenter', function() {
                this.style.transform = 'translateY(-5px) scale(1.02)';
            });
            
            card.addEventListener('mouseleave', function() {
                this.style.transform = '';
            });
        });
    }

    /**
     * =========================================================================
     * COUNTDOWN TIMER (placeholder - set actual date when known)
     * =========================================================================
     */
    function initCountdown() {
        // Uncomment and set date when launch date is confirmed
        /*
        const launchDate = new Date('2024-12-01').getTime();
        
        function updateCountdown() {
            const now = new Date().getTime();
            const distance = launchDate - now;
            
            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            
            // Update DOM elements
        }
        
        setInterval(updateCountdown, 1000);
        */
    }

    /**
     * =========================================================================
     * PARTICLE BACKGROUND
     * =========================================================================
     * Add floating particles for depth
     */
    function initParticles() {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            return;
        }

        const container = document.querySelector('.cs-bg-animation');
        if (!container) return;

        // Create additional particles
        for (let i = 0; i < 20; i++) {
            const particle = document.createElement('span');
            particle.style.cssText = `
                position: absolute;
                width: ${Math.random() * 3 + 1}px;
                height: ${Math.random() * 3 + 1}px;
                background: ${Math.random() > 0.5 ? 'var(--cs-purple)' : 'var(--cs-cyan)'};
                border-radius: 50%;
                left: ${Math.random() * 100}%;
                top: ${Math.random() * 100}%;
                opacity: ${Math.random() * 0.5 + 0.2};
                animation: float ${Math.random() * 10 + 10}s infinite;
                animation-delay: ${Math.random() * 5}s;
            `;
            container.appendChild(particle);
        }
    }

    /**
     * =========================================================================
     * INITIALIZE
     * =========================================================================
     */
    function init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', onReady);
        } else {
            onReady();
        }
    }

    function onReady() {
        initGlitchEffect();
        initFormHandling();
        initHintCards();
        initCountdown();
        initParticles();
        
        console.log('🔮 Coming Soon page initialized!');
    }

    init();

})();
