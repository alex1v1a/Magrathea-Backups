/**
 * =============================================================================
 * BLOG JAVASCRIPT
 * =============================================================================
 * File: blog/blog.js
 * Purpose: Blog functionality - filtering, loading, interactions
 * =============================================================================
 */

(function() {
    'use strict';

    /**
     * =========================================================================
     * CATEGORY FILTERING
     * =========================================================================
     */
    function initCategoryFilters() {
        const filterButtons = document.querySelectorAll('.filter-btn');
        const postCards = document.querySelectorAll('.post-card');

        filterButtons.forEach(button => {
            button.addEventListener('click', function() {
                const filter = this.dataset.filter;

                // Update active button
                filterButtons.forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');

                // Filter posts
                postCards.forEach(card => {
                    if (filter === 'all' || card.dataset.category === filter) {
                        card.classList.remove('hidden');
                        card.style.animation = 'fadeIn 0.5s ease';
                    } else {
                        card.classList.add('hidden');
                    }
                });
            });
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

        let postsLoaded = 6; // Initial posts shown
        const postsPerLoad = 3;

        loadMoreBtn.addEventListener('click', function() {
            // In a real implementation, this would fetch more posts
            // For now, we'll just show hidden posts if they exist
            const hiddenPosts = document.querySelectorAll('.post-card.hidden:not([data-category])');
            
            if (hiddenPosts.length === 0) {
                this.textContent = 'No more posts';
                this.disabled = true;
                return;
            }

            hiddenPosts.forEach((post, index) => {
                if (index < postsPerLoad) {
                    post.classList.remove('hidden');
                    post.style.animation = 'fadeInUp 0.5s ease';
                }
            });

            postsLoaded += postsPerLoad;
        });
    }

    /**
     * =========================================================================
     * NEWSLETTER FORM
     * =========================================================================
     */
    function initNewsletterForm() {
        const form = document.querySelector('.newsletter-form');
        if (!form) return;

        form.addEventListener('submit', function(e) {
            e.preventDefault();
            const email = this.querySelector('input[type="email"]').value;
            
            // Simulate subscription
            form.innerHTML = `
                <div class="success-message" style="text-align: center; padding: 20px;">
                    <p>🎉 Thanks for subscribing!</p>
                    <p style="font-size: 0.9rem; color: var(--color-gray-300);">
                        Check your inbox for confirmation.
                    </p>
                </div>
            `;

            console.log(`[Newsletter] New subscriber: ${email}`);
        });
    }

    /**
     * =========================================================================
     * SOCIAL SHARING
     * =========================================================================
     */
    function initSocialSharing() {
        const shareButtons = document.querySelectorAll('.share-btn');
        
        shareButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                const platform = this.classList.contains('share-twitter') ? 'twitter' :
                                this.classList.contains('share-linkedin') ? 'linkedin' : 'facebook';
                const url = encodeURIComponent(window.location.href);
                const title = encodeURIComponent(document.title);

                let shareUrl;
                switch(platform) {
                    case 'twitter':
                        shareUrl = `https://twitter.com/intent/tweet?url=${url}&text=${title}`;
                        break;
                    case 'linkedin':
                        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
                        break;
                    case 'facebook':
                        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
                        break;
                }

                window.open(shareUrl, '_blank', 'width=600,height=400');
            });
        });
    }

    /**
     * =========================================================================
     * ANIMATIONS
     * =========================================================================
     */
    function addAnimationStyles() {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes fadeInUp {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
        `;
        document.head.appendChild(style);
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
        initCategoryFilters();
        initLoadMore();
        initNewsletterForm();
        initSocialSharing();
        addAnimationStyles();
        
        console.log('📝 Blog initialized');
    }

    init();

})();
