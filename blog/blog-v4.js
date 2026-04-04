/**
 * Blog V4 - Professional Blog JavaScript
 * Features: Theme toggle, search, category filter, animations
 */

(function() {
    'use strict';

    // Theme Management
    const ThemeManager = {
        init() {
            const toggle = document.getElementById('theme-toggle');
            if (!toggle) return;

            // Check saved preference or system preference
            const savedTheme = localStorage.getItem('theme');
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            
            if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
                this.setTheme('dark');
            }

            toggle.addEventListener('click', () => {
                const currentTheme = document.body.getAttribute('data-theme');
                const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
                this.setTheme(newTheme);
            });
        },

        setTheme(theme) {
            document.body.setAttribute('data-theme', theme);
            localStorage.setItem('theme', theme);
        }
    };

    // Search Functionality
    const SearchManager = {
        init() {
            const toggle = document.getElementById('search-toggle');
            const overlay = document.getElementById('search-overlay');
            const close = document.getElementById('search-close');
            const input = document.getElementById('search-input');

            if (!toggle || !overlay) return;

            toggle.addEventListener('click', () => this.open(overlay, input));
            close?.addEventListener('click', () => this.close(overlay));
            
            // Close on escape
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') this.close(overlay);
            });

            // Close on backdrop click
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) this.close(overlay);
            });

            // Search input handler
            input?.addEventListener('input', (e) => this.handleSearch(e.target.value));
        },

        open(overlay, input) {
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
            setTimeout(() => input?.focus(), 100);
        },

        close(overlay) {
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        },

        handleSearch(query) {
            // TODO: Implement search functionality
            console.log('[Search]', query);
        }
    };

    // Category Filter
    const CategoryFilter = {
        init() {
            const links = document.querySelectorAll('.category-link');
            const cards = document.querySelectorAll('.post-card');
            const featured = document.querySelector('.featured-post');

            links.forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    
                    const category = link.dataset.category;
                    
                    // Update active state
                    links.forEach(l => l.classList.remove('active'));
                    link.classList.add('active');
                    
                    // Filter posts
                    cards.forEach(card => {
                        const cardCategory = card.dataset.category;
                        if (category === 'all' || cardCategory === category) {
                            card.style.display = 'flex';
                            card.style.animation = 'fadeInUp 0.4s ease forwards';
                        } else {
                            card.style.display = 'none';
                        }
                    });

                    // Show/hide featured
                    if (featured) {
                        const featuredCategory = featured.dataset.category;
                        featured.style.display = (category === 'all' || category === featuredCategory) 
                            ? 'grid' 
                            : 'none';
                    }
                });
            });
        }
    };

    // Reading Progress
    const ReadingProgress = {
        init() {
            const bar = document.getElementById('reading-progress');
            if (!bar) return;

            window.addEventListener('scroll', () => {
                const winScroll = document.documentElement.scrollTop;
                const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
                const scrolled = (winScroll / height) * 100;
                bar.style.width = scrolled + '%';
            }, { passive: true });
        }
    };

    // Newsletter Form
    const NewsletterForm = {
        init() {
            const forms = document.querySelectorAll('.newsletter-form');
            
            forms.forEach(form => {
                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    const email = form.querySelector('input[type="email"]')?.value;
                    
                    if (email) {
                        // Show success state
                        form.innerHTML = `
                            <div style="display: flex; align-items: center; gap: 8px; color: var(--color-accent);">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                                <span>Thanks for subscribing!</span>
                            </div>
                        `;
                        console.log('[Newsletter] New subscriber:', email);
                    }
                });
            });
        }
    };

    // Load More
    const LoadMore = {
        init() {
            const btn = document.getElementById('load-more');
            if (!btn) return;

            btn.addEventListener('click', () => {
                btn.textContent = 'Loading...';
                btn.disabled = true;

                // Simulate loading
                setTimeout(() => {
                    btn.textContent = 'No more articles';
                }, 1000);
            });
        }
    };

    // Initialize all modules
    function init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', onReady);
        } else {
            onReady();
        }
    }

    function onReady() {
        ThemeManager.init();
        SearchManager.init();
        CategoryFilter.init();
        ReadingProgress.init();
        NewsletterForm.init();
        LoadMore.init();
        
        console.log('📝 Blog V4 initialized');
    }

    init();
})();
