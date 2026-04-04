/**
 * Blog V3 - Modern Blog JavaScript
 * Features: Search, dark mode, view toggle, load more, reading progress
 */

(function() {
    'use strict';

    // Reading Progress Bar
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

    // Dark Mode Toggle
    function initDarkMode() {
        const toggle = document.getElementById('theme-toggle');
        const icon = toggle?.querySelector('.theme-icon');
        
        if (!toggle) return;

        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
            document.documentElement.setAttribute('data-theme', 'dark');
            if (icon) icon.textContent = '☀️';
        }

        toggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            
            if (icon) {
                icon.textContent = newTheme === 'dark' ? '☀️' : '🌙';
            }
        });
    }

    // Search Toggle
    function initSearch() {
        const searchToggle = document.getElementById('search-toggle');
        const searchOverlay = document.getElementById('search-overlay');
        const searchClose = document.getElementById('search-close');
        const searchInput = document.getElementById('search-input');

        if (!searchToggle || !searchOverlay) return;

        searchToggle.addEventListener('click', () => {
            searchOverlay.classList.add('active');
            searchInput?.focus();
        });

        searchClose?.addEventListener('click', () => {
            searchOverlay.classList.remove('active');
        });

        // Close on escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                searchOverlay.classList.remove('active');
            }
        });

        // Close on click outside
        searchOverlay.addEventListener('click', (e) => {
            if (e.target === searchOverlay) {
                searchOverlay.classList.remove('active');
            }
        });
    }

    // Category Filter
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

    // View Toggle (Grid/List)
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
                    postsGrid?.classList.add('list-view');
                } else {
                    postsGrid?.classList.remove('list-view');
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

    // Load More Posts
    function initLoadMore() {
        const loadMoreBtn = document.getElementById('load-more');
        if (!loadMoreBtn) return;

        loadMoreBtn.addEventListener('click', () => {
            loadMoreBtn.innerHTML = '<span>Loading...</span>';
            loadMoreBtn.disabled = true;

            // Simulate loading more posts
            setTimeout(() => {
                loadMoreBtn.innerHTML = '<span>No more posts</span>';
            }, 1000);
        });
    }

    // Newsletter Form
    function initNewsletter() {
        const forms = document.querySelectorAll('.newsletter-form-inline');
        
        forms.forEach(form => {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const email = form.querySelector('input[type="email"]')?.value;
                
                if (email) {
                    form.innerHTML = `
                        <div style="text-align: center; padding: 1rem;">
                            <p>🎉 Thanks for subscribing!</p>
                            <p style="font-size: 0.9rem; color: var(--color-gray-500);">
                                Check your inbox for confirmation.
                            </p>
                        </div>
                    `;
                    
                    console.log(`[Newsletter] New subscriber: ${email}`);
                }
            });
        });
    }

    // Mobile Menu
    function initMobileMenu() {
        const toggle = document.getElementById('mobile-menu-toggle');
        const navMenu = document.getElementById('nav-menu');
        
        if (!toggle || !navMenu) return;

        toggle.addEventListener('click', () => {
            const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
            toggle.setAttribute('aria-expanded', !isExpanded);
            navMenu.classList.toggle('mobile-open');
        });
    }

    // Initialize all
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
        initSearch();
        initCategoryFilter();
        initViewToggle();
        initLoadMore();
        initNewsletter();
        initMobileMenu();
        
        console.log('📝 Blog V3 initialized');
    }

    init();
})();
