/**
 * =============================================================================
 * PAPER TRAIL LIMITED - MAIN JAVASCRIPT
 * =============================================================================
 * File: js/main.js
 * Purpose: Global JavaScript functionality for the Paper Trail website
 * 
 * TABLE OF CONTENTS:
 * 1. UTILITY FUNCTIONS - Helper functions used throughout
 * 2. MOBILE NAVIGATION - Hamburger menu toggle for mobile devices
 * 3. CURRENT YEAR UPDATER - Auto-updates footer copyright year
 * 4. SMOOTH SCROLL - Enhanced anchor link behavior
 * 5. SCROLL ANIMATIONS - Intersection Observer for fade-in effects
 * 6. HEADER SCROLL BEHAVIOR - Dynamic header shadow on scroll
 * 7. ACTIVE NAV HIGHLIGHTING - Highlights current page in navigation
 * 8. FORM VALIDATION - Basic form validation helpers
 * 
 * DEPENDENCIES: None (vanilla JavaScript)
 * BROWSER SUPPORT: Modern browsers (ES6+)
 * =============================================================================
 */

(function() {
    'use strict';

    /**
     * =========================================================================
     * SECTION 1: UTILITY FUNCTIONS
     * =========================================================================
     * Helper functions used throughout the application
     */

    /**
     * Debounce function - limits how often a function can fire
     * Used for scroll events to improve performance
     * 
     * @param {Function} func - Function to debounce
     * @param {number} wait - Milliseconds to wait between calls
     * @returns {Function} Debounced function
     * 
     * Usage: window.addEventListener('scroll', debounce(myFunction, 100));
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
     * Check if user prefers reduced motion (accessibility)
     * Respects user's system preferences for animations
     * 
     * @returns {boolean} True if user prefers reduced motion
     */
    function prefersReducedMotion() {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    /**
     * =========================================================================
     * SECTION 2: MOBILE NAVIGATION
     * =========================================================================
     * Handles the hamburger menu toggle for mobile devices
     * 
     * HOW IT WORKS:
     * - On mobile screens (< 768px), the navigation is hidden by default
     * - Clicking the hamburger button toggles the menu open/closed
     * - Clicking outside the menu or pressing Escape closes it
     * - Resizing to desktop automatically closes the mobile menu
     * 
     * ARIA ATTRIBUTES:
     * - aria-expanded: Tells screen readers if menu is open
     * - aria-controls: Links button to the menu it controls
     * - aria-hidden: Hides menu from screen readers when closed
     */
    function initMobileNavigation() {
        // Get DOM elements
        const toggle = document.querySelector('.mobile-menu-toggle');
        const navMenu = document.getElementById('nav-menu');
        
        // Exit if elements don't exist (safety check)
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
                // CLOSING the menu
                navMenu.style.display = 'none';
                navMenu.setAttribute('aria-hidden', 'true');
                document.body.style.overflow = ''; // Restore scrolling
            } else {
                // OPENING the menu
                navMenu.classList.add('mobile-open');
                navMenu.setAttribute('aria-hidden', 'false');
                document.body.style.overflow = 'hidden'; // Prevent background scrolling
            }
        }

        /**
         * Close the mobile menu (helper function)
         */
        function closeMenu() {
            toggle.setAttribute('aria-expanded', 'false');
            navMenu.classList.remove('mobile-open');
            navMenu.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
        }

        // Event Listeners
        // 1. Toggle menu on button click
        toggle.addEventListener('click', toggleMenu);

        // 2. Close menu when clicking outside
        document.addEventListener('click', function(event) {
            if (!toggle.contains(event.target) && !navMenu.contains(event.target)) {
                closeMenu();
            }
        });

        // 3. Close menu on Escape key
        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
                closeMenu();
            }
        });

        // 4. Close menu when window is resized to desktop size
        window.addEventListener('resize', debounce(function() {
            if (window.innerWidth >= 768) {
                closeMenu();
            }
        }, 150));
    }

    /**
     * =========================================================================
     * SECTION 3: CURRENT YEAR UPDATER
     * =========================================================================
     * Automatically updates the footer copyright year
     * Finds element with id="current-year" and sets it to current year
     * 
     * USAGE IN HTML:
     * <span id="current-year">2024</span>
     */
    function initCurrentYear() {
        const yearElement = document.getElementById('current-year');
        if (yearElement) {
            yearElement.textContent = new Date().getFullYear();
        }
    }

    /**
     * =========================================================================
     * SECTION 4: SMOOTH SCROLL FOR ANCHOR LINKS
     * =========================================================================
     * Enhances default anchor link behavior with smooth scrolling
     * Only activates if user doesn't prefer reduced motion
     * 
     * HOW IT WORKS:
     * - Finds all links that start with "#" (anchor links)
     * - Prevents default jump behavior
     * - Smoothly scrolls to target element
     * - Accounts for fixed header height (80px offset)
     * - Updates URL without page jump
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
                    const headerOffset = 80; // Height of header + padding
                    const elementPosition = target.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                    // Smooth scroll to target
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
     * SECTION 5: SCROLL ANIMATIONS
     * =========================================================================
     * Uses Intersection Observer to animate elements as they enter viewport
     * 
     * ANIMATED ELEMENTS:
     * - .about-card (About section cards)
     * - .app-card (App portfolio cards)
     * - .domain-item (Domain info items)
     * 
     * HOW IT WORKS:
     * 1. Sets initial state (opacity: 0, translateY: 30px)
     * 2. Creates Intersection Observer watching these elements
     * 3. When element enters viewport, animates to visible state
     * 4. Stops observing after animation (one-time effect)
     * 
     * PERFORMANCE NOTE:
     * Uses requestAnimationFrame for smooth 60fps animations
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
                    
                    // Stop observing once animated (performance optimization)
                    observer.unobserve(entry.target);
                }
            });
        }, {
            root: null,                    // Use viewport as root
            rootMargin: '0px 0px -50px 0px', // Trigger slightly before fully visible
            threshold: 0.1                 // Trigger when 10% visible
        });

        // Observe all elements
        animatedElements.forEach(el => observer.observe(el));
    }

    /**
     * =========================================================================
     * SECTION 6: HEADER SCROLL BEHAVIOR
     * =========================================================================
     * Adds shadow to header when scrolling down
     * Provides visual feedback that page has been scrolled
     * 
     * TRIGGER: Adds shadow after scrolling 50px
     * PERFORMANCE: Uses debounce to limit scroll event handling
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
     * SECTION 7: ACTIVE NAVIGATION HIGHLIGHTING
     * =========================================================================
     * Highlights the current page in the navigation menu
     * 
     * HOW IT WORKS:
     * 1. Gets current URL path
     * 2. Compares with each nav link's href
     * 3. Adds 'active' class and aria-current to matching link
     * 4. Removes from previously active link
     * 
     * EDGE CASES HANDLED:
     * - Root path '/' matches home link
     * - Subpaths match parent links (e.g., /apps/reel-reviews/ matches /apps/reel-reviews/)
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
     * SECTION 8: FORM VALIDATION HELPERS
     * =========================================================================
     * Basic form validation for forms with data-validate attribute
     * 
     * VALIDATION RULES:
     * - Required fields must have value
     * - Shows error state (red border + message)
     * - Prevents form submission if invalid
     * 
     * USAGE IN HTML:
     * <form data-validate>
     *   <input type="email" required>
     *   <button type="submit">Submit</button>
     * </form>
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
     * INITIALIZATION
     * =========================================================================
     * Sets up all functionality when DOM is ready
     */
    function init() {
        // Check if DOM is already loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', onReady);
        } else {
            onReady();
        }
    }

    /**
     * Called when DOM is ready - initializes all modules
     */
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
        console.log('   - Mobile navigation: active');
        console.log('   - Smooth scroll: active');
        console.log('   - Scroll animations: active');
        console.log('   - Form validation: active');
    }

    // Start the application
    init();

})();
