/**
 * =============================================================================
 * PAPER TRAIL LIMITED - MAIN JAVASCRIPT
 * =============================================================================
 * File: js/main.js
 * Purpose: Global JavaScript functionality for the Paper Trail website
 * 
 * FEATURES:
 * - Mobile navigation toggle
 * - Smooth scroll behavior
 * - Current year updater for footer
 * - Intersection Observer for scroll animations
 * - Keyboard navigation support
 * 
 * BROWSER SUPPORT:
 * - Modern browsers (Chrome, Firefox, Safari, Edge)
 * - ES6+ features used
 * - Graceful degradation for older browsers
 * =============================================================================
 */

(function() {
    'use strict';

    /**
     * =========================================================================
     * UTILITY FUNCTIONS
     * =========================================================================
     */

    /**
     * Debounce function to limit how often a function can fire
     * Used for scroll events to improve performance
     * @param {Function} func - Function to debounce
     * @param {number} wait - Milliseconds to wait
     * @returns {Function} Debounced function
     */
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Check if user prefers reduced motion
     * Respects accessibility settings
     * @returns {boolean} True if reduced motion is preferred
     */
    function prefersReducedMotion() {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    /**
     * =========================================================================
     * MOBILE NAVIGATION
     * =========================================================================
     * Handles the hamburger menu toggle for mobile devices
     */

    function initMobileNavigation() {
        const toggle = document.querySelector('.mobile-menu-toggle');
        const navMenu = document.getElementById('nav-menu');
        
        // Exit if elements don't exist (shouldn't happen, but safety first)
        if (!toggle || !navMenu) {
            console.warn('Mobile navigation elements not found');
            return;
        }

        /**
         * Toggle the mobile menu open/closed state
         */
        function toggleMenu() {
            const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
            
            // Toggle the aria-expanded attribute for accessibility
            toggle.setAttribute('aria-expanded', !isExpanded);
            
            // Toggle the menu visibility
            if (isExpanded) {
                // Closing the menu
                navMenu.style.display = 'none';
                navMenu.setAttribute('aria-hidden', 'true');
                document.body.style.overflow = ''; // Restore scrolling
            } else {
                // Opening the menu
                navMenu.style.display = 'flex';
                navMenu.style.flexDirection = 'column';
                navMenu.style.position = 'absolute';
                navMenu.style.top = '100%';
                navMenu.style.left = '0';
                navMenu.style.right = '0';
                navMenu.style.backgroundColor = 'var(--color-primary)';
                navMenu.style.padding = 'var(--space-4)';
                navMenu.style.boxShadow = 'var(--shadow-lg)';
                navMenu.setAttribute('aria-hidden', 'false');
                document.body.style.overflow = 'hidden'; // Prevent background scrolling
            }
        }

        /**
         * Close the mobile menu
         */
        function closeMenu() {
            toggle.setAttribute('aria-expanded', 'false');
            navMenu.style.display = 'none';
            navMenu.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
        }

        // Toggle menu on button click
        toggle.addEventListener('click', toggleMenu);

        // Close menu when clicking outside
        document.addEventListener('click', function(event) {
            if (!toggle.contains(event.target) && !navMenu.contains(event.target)) {
                closeMenu();
            }
        });

        // Close menu on escape key
        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
                closeMenu();
            }
        });

        // Close menu when window is resized to desktop size
        window.addEventListener('resize', debounce(function() {
            if (window.innerWidth >= 768) {
                closeMenu();
                // Reset styles for desktop
                navMenu.style.cssText = '';
            }
        }, 150));
    }

    /**
     * =========================================================================
     * CURRENT YEAR UPDATER
     * =========================================================================
     * Updates the footer copyright year automatically
     */

    function initCurrentYear() {
        const yearElement = document.getElementById('current-year');
        if (yearElement) {
            yearElement.textContent = new Date().getFullYear();
        }
    }

    /**
     * =========================================================================
     * SMOOTH SCROLL FOR ANCHOR LINKS
     * =========================================================================
     * Enhances default anchor link behavior with smooth scrolling
     */

    function initSmoothScroll() {
        // Only add if user doesn't prefer reduced motion
        if (prefersReducedMotion()) {
            return;
        }

        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(event) {
                const href = this.getAttribute('href');
                
                // Skip if it's just "#" (empty anchor)
                if (href === '#') {
                    return;
                }

                const target = document.querySelector(href);
                if (target) {
                    event.preventDefault();
                    
                    // Calculate offset for fixed header
                    const headerOffset = 80; // Height of header + some padding
                    const elementPosition = target.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                    window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                    });

                    // Update URL without jumping
                    history.pushState(null, '', href);
                }
            });
        });
    }

    /**
     * =========================================================================
     * SCROLL ANIMATIONS
     * =========================================================================
     * Uses Intersection Observer to animate elements as they enter viewport
     */

    function initScrollAnimations() {
        // Skip if user prefers reduced motion or if IntersectionObserver not supported
        if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
            return;
        }

        // Elements to animate
        const animatedElements = document.querySelectorAll(
            '.about-card, .app-card, .domain-item'
        );

        // Add initial hidden state
        animatedElements.forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(30px)';
            el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        });

        // Create observer
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Animate in
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                    
                    // Stop observing once animated
                    observer.unobserve(entry.target);
                }
            });
        }, {
            root: null,
            rootMargin: '0px 0px -50px 0px',
            threshold: 0.1
        });

        // Observe all elements
        animatedElements.forEach(el => observer.observe(el));
    }

    /**
     * =========================================================================
     * HEADER SCROLL BEHAVIOR
     * =========================================================================
     * Adds shadow to header when scrolling down
     */

    function initHeaderScroll() {
        const header = document.querySelector('.site-header');
        if (!header) return;

        let lastScroll = 0;

        const handleScroll = debounce(function() {
            const currentScroll = window.pageYOffset;

            // Add/remove scrolled class based on scroll position
            if (currentScroll > 50) {
                header.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
            } else {
                header.style.boxShadow = '';
            }

            lastScroll = currentScroll;
        }, 10);

        window.addEventListener('scroll', handleScroll, { passive: true });
    }

    /**
     * =========================================================================
     * ACTIVE NAVIGATION HIGHLIGHTING
     * =========================================================================
     * Highlights the current page in navigation
     */

    function initActiveNavHighlight() {
        const currentPath = window.location.pathname;
        const navLinks = document.querySelectorAll('.nav-link');

        navLinks.forEach(link => {
            const linkPath = link.getAttribute('href');
            
            // Check if this link matches current page
            if (linkPath === currentPath || 
                (currentPath === '/' && linkPath === '/') ||
                (linkPath !== '/' && currentPath.startsWith(linkPath))) {
                link.classList.add('active');
                link.setAttribute('aria-current', 'page');
            } else {
                link.classList.remove('active');
                link.removeAttribute('aria-current');
            }
        });
    }

    /**
     * =========================================================================
     * FORM VALIDATION HELPERS (if forms exist)
     * =========================================================================
     */

    function initFormValidation() {
        const forms = document.querySelectorAll('form[data-validate]');
        
        forms.forEach(form => {
            form.addEventListener('submit', function(event) {
                let isValid = true;
                const requiredFields = form.querySelectorAll('[required]');

                requiredFields.forEach(field => {
                    if (!field.value.trim()) {
                        isValid = false;
                        field.classList.add('error');
                        
                        // Add error message if not present
                        let errorMsg = field.parentElement.querySelector('.error-message');
                        if (!errorMsg) {
                            errorMsg = document.createElement('span');
                            errorMsg.className = 'error-message';
                            errorMsg.textContent = 'This field is required';
                            errorMsg.style.color = 'var(--color-accent)';
                            errorMsg.style.fontSize = 'var(--text-sm)';
                            field.parentElement.appendChild(errorMsg);
                        }
                    } else {
                        field.classList.remove('error');
                        const errorMsg = field.parentElement.querySelector('.error-message');
                        if (errorMsg) {
                            errorMsg.remove();
                        }
                    }
                });

                if (!isValid) {
                    event.preventDefault();
                }
            });
        });
    }

    /**
     * =========================================================================
     * INITIALIZE EVERYTHING
     * =========================================================================
     */

    function init() {
        // Check if DOM is already loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', onReady);
        } else {
            onReady();
        }
    }

    function onReady() {
        // Initialize all modules
        initMobileNavigation();
        initCurrentYear();
        initSmoothScroll();
        initScrollAnimations();
        initHeaderScroll();
        initActiveNavHighlight();
        initFormValidation();

        // Log initialization (remove in production if desired)
        console.log('📝 Paper Trail website initialized');
    }

    // Start the app
    init();

})();
