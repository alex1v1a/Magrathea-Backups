/**
 * =============================================================================
 * REEL REVIEWS - APP PAGE JAVASCRIPT
 * =============================================================================
 * File: apps/reel-reviews/reel-reviews.js
 * Purpose: App-specific interactivity for Reel Reviews page
 * 
 * FEATURES:
 * - Parallax scrolling effects on hero
 * - Interactive step animations
 * - Bubble float animations
 * - Comic book sound effect randomizer
 * =============================================================================
 */

(function() {
    'use strict';

    /**
     * =========================================================================
     * PARALLAX HERO EFFECT
     * =========================================================================
     * Creates subtle parallax movement on hero section during scroll
     */
    function initParallaxHero() {
        const hero = document.querySelector('.rr-hero');
        const hook = document.querySelector('.fishing-hook');
        
        if (!hero || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            return;
        }

        let ticking = false;

        function updateParallax() {
            const scrolled = window.pageYOffset;
            const rate = scrolled * 0.3;
            
            // Move background elements at different rates
            if (hook) {
                hook.style.transform = `translateY(${rate * 0.5}px) rotate(${Math.sin(scrolled * 0.01) * 5}deg)`;
            }
            
            ticking = false;
        }

        window.addEventListener('scroll', function() {
            if (!ticking) {
                requestAnimationFrame(updateParallax);
                ticking = true;
            }
        }, { passive: true });
    }

    /**
     * =========================================================================
     * STEP REVEAL ANIMATION
     * =========================================================================
     * Animates the "How It Works" steps as they scroll into view
     */
    function initStepAnimations() {
        const steps = document.querySelectorAll('.how-step');
        
        if (!steps.length || !('IntersectionObserver' in window)) {
            return;
        }

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry, index) => {
                if (entry.isIntersecting) {
                    // Stagger the animations
                    setTimeout(() => {
                        entry.target.style.opacity = '1';
                        entry.target.style.transform = 'translateX(0)';
                    }, index * 200);
                    
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.2,
            rootMargin: '0px 0px -50px 0px'
        });

        steps.forEach((step, index) => {
            // Set initial state
            step.style.opacity = '0';
            step.style.transform = index % 2 === 0 ? 'translateX(-50px)' : 'translateX(50px)';
            step.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            
            observer.observe(step);
        });
    }

    /**
     * =========================================================================
     * COMIC BOUNCE ANIMATION
     * =========================================================================
     * Adds bounce effect to cards on hover
     */
    function initComicBounce() {
        const cards = document.querySelectorAll('.problem-card, .feature-card');
        
        cards.forEach(card => {
            card.addEventListener('mouseenter', function() {
                this.style.animation = 'comicBounce 0.5s ease';
            });
            
            card.addEventListener('animationend', function() {
                this.style.animation = '';
            });
        });
    }

    // Add bounce keyframes dynamically
    const style = document.createElement('style');
    style.textContent = `
        @keyframes comicBounce {
            0%, 100% { transform: scale(1) rotate(var(--rotation, 0deg)); }
            25% { transform: scale(1.05) rotate(calc(var(--rotation, 0deg) + 2deg)); }
            50% { transform: scale(1.05) rotate(calc(var(--rotation, 0deg) - 2deg)); }
            75% { transform: scale(1.02) rotate(calc(var(--rotation, 0deg) + 1deg)); }
        }
    `;
    document.head.appendChild(style);

    /**
     * =========================================================================
     * RANDOM COMIC SOUND EFFECTS
     * =========================================================================
     * Occasionally shows comic sound effects near the cursor
     * (Subtle, not annoying)
     */
    function initComicSounds() {
        const sounds = ['POW!', 'ZAP!', 'BAM!', 'WHAM!', 'BOOM!'];
        const colors = ['#e63946', '#ffd60a', '#fb8500', '#1d3557'];
        
        let lastSound = 0;
        const soundCooldown = 3000; // Minimum 3 seconds between sounds
        
        document.addEventListener('click', function(e) {
            const now = Date.now();
            if (now - lastSound < soundCooldown) return;
            
            // 30% chance to show a sound effect on click
            if (Math.random() > 0.7) {
                lastSound = now;
                showSoundEffect(e.pageX, e.pageY);
            }
        });
        
        function showSoundEffect(x, y) {
            const sound = sounds[Math.floor(Math.random() * sounds.length)];
            const color = colors[Math.floor(Math.random() * colors.length)];
            
            const el = document.createElement('div');
            el.textContent = sound;
            el.style.cssText = `
                position: absolute;
                left: ${x}px;
                top: ${y}px;
                font-family: 'Bangers', cursive;
                font-size: 2rem;
                color: ${color};
                text-shadow: 2px 2px 0 white, 4px 4px 0 rgba(0,0,0,0.3);
                pointer-events: none;
                z-index: 9999;
                transform: translate(-50%, -50%) rotate(${Math.random() * 20 - 10}deg);
                animation: soundFloat 1s ease-out forwards;
            `;
            
            document.body.appendChild(el);
            
            setTimeout(() => el.remove(), 1000);
        }
    }

    // Add sound float animation
    const soundStyle = document.createElement('style');
    soundStyle.textContent = `
        @keyframes soundFloat {
            0% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(0.5) rotate(var(--rot, 0deg));
            }
            50% {
                opacity: 1;
                transform: translate(-50%, -100%) scale(1.2) rotate(var(--rot, 0deg));
            }
            100% {
                opacity: 0;
                transform: translate(-50%, -150%) scale(1) rotate(var(--rot, 0deg));
            }
        }
    `;
    document.head.appendChild(soundStyle);

    /**
     * =========================================================================
     * STAT COUNTER ANIMATION
     * =========================================================================
     * Animates the "67%" number counting up
     */
    function initStatCounter() {
        const statNumber = document.querySelector('.stat-number');
        
        if (!statNumber || !('IntersectionObserver' in window)) {
            return;
        }

        const targetNumber = 67;
        let hasAnimated = false;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !hasAnimated) {
                    hasAnimated = true;
                    animateCounter(statNumber, targetNumber);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });

        observer.observe(statNumber);
    }

    function animateCounter(element, target) {
        const duration = 1500;
        const start = 0;
        const startTime = performance.now();

        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function for smooth animation
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            
            const current = Math.floor(start + (target - start) * easeOutQuart);
            element.textContent = current + '%';
            
            if (progress < 1) {
                requestAnimationFrame(update);
            }
        }

        requestAnimationFrame(update);
    }

    /**
     * =========================================================================
     * FISH SPAWN INTERACTION
     * =========================================================================
     * Spawns fish emoji when clicking in the catch section
     */
    function initFishSpawn() {
        const catchSection = document.querySelector('.rr-catch');
        
        if (!catchSection) return;

        catchSection.addEventListener('click', function(e) {
            // Don't spawn if clicking a button
            if (e.target.closest('a, button')) return;
            
            const fish = document.createElement('span');
            const fishEmojis = ['🐟', '🐠', '🐡', '🦈'];
            fish.textContent = fishEmojis[Math.floor(Math.random() * fishEmojis.length)];
            
            const rect = catchSection.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            fish.style.cssText = `
                position: absolute;
                left: ${x}px;
                top: ${y}px;
                font-size: 2rem;
                pointer-events: none;
                z-index: 10;
                animation: fishPop 1s ease-out forwards;
            `;
            
            catchSection.appendChild(fish);
            setTimeout(() => fish.remove(), 1000);
        });
    }

    // Add fish pop animation
    const fishStyle = document.createElement('style');
    fishStyle.textContent = `
        @keyframes fishPop {
            0% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(0) rotate(0deg);
            }
            50% {
                opacity: 1;
                transform: translate(-50%, -100%) scale(1.5) rotate(180deg);
            }
            100% {
                opacity: 0;
                transform: translate(-50%, -200%) scale(1) rotate(360deg);
            }
        }
    `;
    document.head.appendChild(fishStyle);

    /**
     * =========================================================================
     * STORE BUTTON TRACKING
     * =========================================================================
     * Tracks clicks on store buttons (for analytics)
     */
    function initStoreTracking() {
        const storeButtons = document.querySelectorAll('.store-btn');
        
        storeButtons.forEach(btn => {
            btn.addEventListener('click', function(e) {
                // Prevent default for demo (remove in production)
                e.preventDefault();
                
                const store = this.classList.contains('app-store') ? 'App Store' : 'Google Play';
                
                // Show coming soon message
                alert(`🎣 Reel Reviews coming soon to ${store}!\n\nThanks for your interest! We'll notify you when it's available.`);
                
                // Log for analytics (replace with actual analytics in production)
                console.log(`[Analytics] Store button clicked: ${store}`);
            });
        });
    }

    /**
     * =========================================================================
     * INITIALIZE ALL MODULES
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
        initParallaxHero();
        initStepAnimations();
        initComicBounce();
        initComicSounds();
        initStatCounter();
        initFishSpawn();
        initStoreTracking();
        
        console.log('🎣 Reel Reviews page initialized!');
    }

    init();

})();
