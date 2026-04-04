/**
 * =============================================================================
 * BLOG V2 - PROFESSIONAL BLOG JAVASCRIPT
 * =============================================================================
 * Features:
 * - Reading progress bar
 * - Dark mode toggle
 * - Category filtering
 * - Grid/List view toggle
 * - Sticky newsletter popup
 * - Intersection Observer animations
 * =============================================================================
 */

(function() {
    'use strict';

    /**
     * =========================================================================
     * READING PROGRESS BAR
     * =========================================================================
     */
    function initReadingProgress() {
        const progressBar = document.getElementById('reading-progress');
        if (!progressBar) return;

        window.addEventListener('scroll', () => {
            const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
            const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            const scrolled = (winScroll / height) * 100;
            progressBar.style.width = scrolled + '%';
        }, { passive: true });
    }

    /**
     * =========================================================================
     * DARK MODE TOGGLE
     * =========================================================================
     */
    function initDarkMode() {
        const themeToggle = document.getElementById('theme-toggle');
        const themeIcon = themeToggle?.querySelector('.theme-icon');
        
        if (!themeToggle) return;

        // Check for saved theme preference
        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
            document.documentElement.setAttribute('data-theme', 'dark');
            if (themeIcon) themeIcon.textContent = '☀️';
        }

        themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            
            if (themeIcon) {
                themeIcon.textContent = newTheme === 'dark' ? '☀️' : '🌙';
            }
        });
    }

    /**
     * =========================================================================
     * CATEGORY FILTERING
     * =========================================================================
     */
    function initCategoryFilter() {
        const categoryLinks = document.querySelectorAll('.category-link');
        const postCards = document.querySelectorAll('.post-card');
        const featuredPost = document.querySelector('.featured-post');

        categoryLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                
                const filter = link.dataset.category;
                
                // Update active state
                categoryLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
                
                // Filter posts
                postCards.forEach(card => {
                    if (filter === 'all' || card.dataset.category === filter) {
                        card.style.display = 'block';
                        card.style.animation = 'fadeInUp 0.5s ease forwards';
                    } else {
                        card.style.display = 'none';
                    }
                });
                
                // Show/hide featured post
                if (featuredPost) {
                    if (filter === 'all' || filter === 'tech') {
                        featuredPost.style.display = 'grid';
                    } else {
                        featuredPost.style.display = 'none';
                    }
                }
            });
        });
    }

    /**
     * =========================================================================
     * GRID/LIST VIEW TOGGLE
     * =========================================================================
     */
    function initViewToggle() {
        const viewButtons = document.querySelectorAll('.view-btn');
        const postsGrid = document.getElementById('posts-grid');

        viewButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const view = btn.dataset.view;
                
                // Update active state
                viewButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Toggle view
                if (view === 'list') {
                    postsGrid.classList.add('list-view');
                } else {
                    postsGrid.classList.remove('list-view');
                }
                
                // Save preference
                localStorage.setItem('blogView', view);
            });
        });

        // Restore saved preference
        const savedView = localStorage.getItem('blogView');
        if (savedView === 'list') {
            postsGrid?.classList.add('list-view');
            viewButtons.forEach(b => {
                b.classList.toggle('active', b.dataset.view === 'list');
            });
        }
    }

    /**
     * =========================================================================
     * STICKY NEWSLETTER POPUP
     * =========================================================================
     */
    function initStickyNewsletter() {
        const newsletter = document.getElementById('sticky-newsletter');
        const closeBtn = document.getElementById('sticky-close');
        
        if (!newsletter) return;

        // Check if user has closed it before
        const isClosed = sessionStorage.getItem('newsletterClosed');
        if (isClosed) return;

        // Show after scrolling 50% of page
        let shown = false;
        
        window.addEventListener('scroll', () => {
            if (shown) return;
            
            const scrollPercent = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
            
            if (scrollPercent > 30) {
                newsletter.classList.add('visible');
                shown = true;
            }
        }, { passive: true });

        // Close button
        closeBtn?.addEventListener('click', () => {
            newsletter.classList.remove('visible');
            sessionStorage.setItem('newsletterClosed', 'true');
        });

        // Form submission
        const form = newsletter.querySelector('form');
        form?.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = form.querySelector('input[type="email"]').value;
            
            // Simulate subscription
            newsletter.innerHTML = `
                <div class="container">
                    <div style="text-align: center; padding: 1rem;">
                        <p>🎉 Thanks for subscribing! Check your inbox.</p>
                    </div>
                </div>
            `;
            
            setTimeout(() => {
                newsletter.classList.remove('visible');
            }, 3000);
            
            console.log(`[Newsletter] New subscriber: ${email}`);
        });
    }

    /**
     * =========================================================================
     * LOAD MORE POSTS
     * =========================================================================
     */
    function initLoadMore() {
        const loadMoreBtn = document.getElementById('load-more');
        if (!loadMoreBtn) return;

        loadMoreBtn.addEventListener('click', () => {
            // Simulate loading more posts
            loadMoreBtn.innerHTML = '<span>Loading...</span>';
            loadMoreBtn.disabled = true;

            setTimeout(() => {
                // In a real implementation, this would fetch more posts
                loadMoreBtn.innerHTML = '<span>No more posts</span>';
            }, 1000);
        });
    }

    /**
     * =========================================================================
     * SIDEBAR NEWSLETTER FORM
     * =========================================================================
     */
    function initSidebarNewsletter() {
        const form = document.getElementById('sidebar-newsletter');
        if (!form) return;

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = form.querySelector('input[type="email"]').value;
            
            form.innerHTML = `
                <div style="text-align: center; padding: 1rem;">
                    <p>🎉 Subscribed!</p>
                    <p style="font-size: 0.9rem; color: var(--text-muted);">
                        Welcome to The Paper Trail.
                    </p>
                </div>
            `;
            
            console.log(`[Sidebar Newsletter] New subscriber: ${email}`);
        });
    }

    /**
     * =========================================================================
     * SCROLL ANIMATIONS
     * =========================================================================
     */
    function initScrollAnimations() {
        const observerOptions = {
            root: null,
            rootMargin: '0px',
            threshold: 0.1
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, observerOptions);

        document.querySelectorAll('.post-card, .sidebar-widget').forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(20px)';
            el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            observer.observe(el);
        });
    }

    /**
     * =========================================================================
     * MOBILE MENU
     * =========================================================================
     */
    function initMobileMenu() {
        const toggle = document.querySelector('.mobile-menu-toggle');
        const nav = document.querySelector('.category-nav');
        
        if (!toggle || !nav) return;

        toggle.addEventListener('click', () => {
            const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
            toggle.setAttribute('aria-expanded', !isExpanded);
            nav.classList.toggle('mobile-open');
        });
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
        initReadingProgress();
        initDarkMode();
        initCategoryFilter();
        initViewToggle();
        initStickyNewsletter();
        initLoadMore();
        initSidebarNewsletter();
        initScrollAnimations();
        initMobileMenu();
        
        console.log('📝 Paper Trail Blog v2 initialized');
    }

    init();

})();
