#!/usr/bin/env node
/**
 * =============================================================================
 * PAPER TRAIL BLOG AUTOMATION
 * =============================================================================
 * File: scripts/blog-automation.js
 * Purpose: Generate and publish blog posts automatically
 * 
 * SCHEDULE: Random times between 8am-4pm, max 3 posts/day
 * POST LENGTH: 400-800 words
 * TOPICS: Tech, Startups, App Development, NZ Business
 * =============================================================================
 */

const fs = require('fs');
const path = require('path');

// Blog topics and research sources
const TOPICS = {
    tech: {
        keywords: ['AI', 'machine learning', 'mobile development', 'React Native', 'Flutter', 'iOS', 'Android', 'cloud computing', 'AWS', 'Azure'],
        sources: ['TechCrunch', 'The Verge', 'Ars Technica', 'Wired'],
        youtubeChannels: ['Fireship', 'The Coding Train', 'Traversy Media']
    },
    startup: {
        keywords: ['venture capital', 'bootstrapping', 'MVP', 'product-market fit', 'customer acquisition', 'SaaS', 'growth hacking'],
        sources: ['Y Combinator Blog', 'First Round Review', 'Paul Graham Essays', 'Indie Hackers'],
        youtubeChannels: ['Y Combinator', 'Startupschool', 'GaryVee']
    },
    apps: {
        keywords: ['user experience', 'UI design', 'app store optimization', 'monetization', 'retention', 'push notifications', 'offline-first'],
        sources: ['Smashing Magazine', 'UX Collective', 'App Annie Blog', 'Sensor Tower'],
        youtubeChannels: ['DesignCourse', 'Flux', 'AJ&Smart']
    },
    nz: {
        keywords: ['New Zealand tech', 'Auckland startup scene', 'Wellington innovation', 'NZTE', 'Callaghan Innovation', 'remote work NZ'],
        sources: ['NZ Herald Tech', 'Stuff Business', 'Newsroom Pro', 'The Spinoff Business'],
        youtubeChannels: ['NZ Tech', 'BusinessNZ']
    }
};

// Blog post templates
const TEMPLATES = [
    {
        title: "The Future of {{TOPIC}} in {{YEAR}}",
        structure: ['intro', 'current_state', 'trends', 'predictions', 'conclusion']
    },
    {
        title: "Why {{TOPIC}} Matters for Kiwi Startups",
        structure: ['problem', 'solution', 'case_study', 'action_items']
    },
    {
        title: "{{NUMBER}} Lessons We Learned Building {{TOPIC}}",
        structure: ['intro', 'lessons', 'examples', 'takeaway']
    },
    {
        title: "How {{TOPIC}} is Changing the Game",
        structure: ['hook', 'explanation', 'impact', 'future']
    }
];

/**
 * Generate a random blog post
 */
function generateBlogPost() {
    const category = Object.keys(TOPICS)[Math.floor(Math.random() * Object.keys(TOPICS).length)];
    const topicData = TOPICS[category];
    const template = TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)];
    
    // Select random topic and sources
    const mainTopic = topicData.keywords[Math.floor(Math.random() * topicData.keywords.length)];
    const sources = topicData.sources.slice(0, 3);
    const youtubeChannel = topicData.youtubeChannels[Math.floor(Math.random() * topicData.youtubeChannels.length)];
    
    // Generate title
    const title = template.title
        .replace('{{TOPIC}}', mainTopic)
        .replace('{{YEAR}}', new Date().getFullYear())
        .replace('{{NUMBER}}', [3, 5, 7, 10][Math.floor(Math.random() * 4)]);
    
    // Generate content (400-800 words)
    const wordCount = Math.floor(Math.random() * 400) + 400;
    const content = generateContent(template.structure, mainTopic, category, wordCount);
    
    // Generate references
    const references = sources.map(source => ({
        text: `${source} - ${mainTopic} insights and analysis`,
        url: `https://www.google.com/search?q=${encodeURIComponent(source + ' ' + mainTopic)}`
    }));
    
    // Add YouTube reference
    references.push({
        text: `YouTube: ${youtubeChannel} - ${mainTopic} tutorials`,
        url: `https://www.youtube.com/results?search_query=${encodeURIComponent(youtubeChannel + ' ' + mainTopic)}`
    });
    
    return {
        title,
        category,
        content,
        references,
        date: new Date(),
        readTime: Math.ceil(wordCount / 200)
    };
}

/**
 * Generate content based on template structure
 */
function generateContent(structure, topic, category, targetWords) {
    const paragraphs = [];
    let currentWords = 0;
    
    const intros = [
        `In the ever-evolving landscape of ${category}, ${topic} has emerged as a game-changer for businesses and developers alike.`,
        `When we started Paper Trail, we never imagined how crucial ${topic} would become to our daily operations.`,
        `The New Zealand tech scene is buzzing with conversations about ${topic}, and for good reason.`
    ];
    
    const bodies = [
        `Recent developments in ${topic} have shown remarkable potential for improving efficiency and user experience. Companies worldwide are investing heavily in this area, with market research indicating a 40% growth year-over-year.`,
        `From our experience building Reel Reviews, we've seen firsthand how ${topic} can make or break an app's success. The key is understanding your users' needs and implementing solutions that genuinely solve problems.`,
        `What makes ${topic} particularly interesting for Kiwi startups is the unique position New Zealand holds in the global market. We're small enough to be agile but connected enough to compete internationally.`
    ];
    
    const conclusions = [
        `As we look ahead, ${topic} will undoubtedly continue shaping how we build and scale applications. The question isn't whether to adopt these technologies, but how quickly we can implement them effectively.`,
        `For New Zealand businesses, the opportunity is clear. By embracing ${topic} early, we can punch above our weight on the global stage.`,
        `The future belongs to those who adapt. ${topic} isn't just a trend—it's the foundation of tomorrow's successful apps.`
    ];
    
    // Build content
    paragraphs.push(`<p>${intros[Math.floor(Math.random() * intros.length)]}</p>`);
    
    while (currentWords < targetWords) {
        const body = bodies[Math.floor(Math.random() * bodies.length)];
        paragraphs.push(`<p>${body}</p>`);
        currentWords += body.split(' ').length;
        
        // Add subheading every few paragraphs
        if (paragraphs.length % 3 === 0) {
            paragraphs.push(`<h2>${generateSubheading(topic)}</h2>`);
        }
    }
    
    paragraphs.push(`<p>${conclusions[Math.floor(Math.random() * conclusions.length)]}</p>`);
    
    return paragraphs.join('\n\n');
}

function generateSubheading(topic) {
    const options = [
        `Why ${topic} Matters`,
        `The ${topic} Advantage`,
        `Getting Started with ${topic}`,
        `${topic} Best Practices`,
        `The Future of ${topic}`
    ];
    return options[Math.floor(Math.random() * options.length)];
}

/**
 * Save blog post to file
 */
function saveBlogPost(post) {
    const postsDir = path.join(__dirname, '..', 'blog', 'posts');
    const slug = post.title.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    
    const filename = `${slug}.html`;
    const filepath = path.join(postsDir, filename);
    
    // Read template
    const templatePath = path.join(postsDir, 'template.html');
    let template = fs.readFileSync(templatePath, 'utf8');
    
    // Replace placeholders
    const dateISO = post.date.toISOString().split('T')[0];
    const dateFormatted = post.date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    template = template
        .replace(/{{TITLE}}/g, post.title)
        .replace('{{META_DESCRIPTION}}', `Insights on ${post.category} from Paper Trail Limited`)
        .replace('{{CATEGORY}}', post.category.charAt(0).toUpperCase() + post.category.slice(1))
        .replace('{{DATE_ISO}}', dateISO)
        .replace('{{DATE_FORMATTED}}', dateFormatted)
        .replace('{{READ_TIME}}', post.readTime)
        .replace('{{CONTENT}}', post.content)
        .replace('{{REFERENCES}}', post.references.map(r => 
            `<li><a href="${r.url}" target="_blank" rel="noopener">${r.text}</a></li>`
        ).join('\n'));
    
    // Save file
    fs.writeFileSync(filepath, template);
    
    // Update blog index
    updateBlogIndex(post, slug);
    
    console.log(`✅ Blog post created: ${filename}`);
    return { filename, slug };
}

/**
 * Update blog index page with new post
 */
function updateBlogIndex(post, slug) {
    const blogIndexPath = path.join(__dirname, '..', 'blog', 'index.html');
    let indexContent = fs.readFileSync(blogIndexPath, 'utf8');
    
    const dateFormatted = post.date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    const postCard = `
                    <article class="post-card" data-category="${post.category}" data-post-id="${slug}">
                        <div class="post-image">
                            <img src="../assets/blog/${post.category}-post.jpg" alt="${post.title}" loading="lazy">
                            <span class="post-category">${post.category.charAt(0).toUpperCase() + post.category.slice(1)}</span>
                        </div>
                        <div class="post-content">
                            <time class="post-date" datetime="${post.date.toISOString().split('T')[0]}">${dateFormatted}</time>
                            <h2 class="post-title">
                                <a href="posts/${slug}.html">${post.title}</a>
                            </h2>
                            <p class="post-excerpt">
                                ${post.content.replace(/<[^>]*>/g, '').substring(0, 150)}...
                            </p>
                            <div class="post-meta">
                                <span class="read-time">${post.readTime} min read</span>
                                <a href="posts/${slug}.html" class="read-more">Read more →</a>
                            </div>
                        </div>
                    </article>
`;
    
    // Insert after the template comment
    const insertMarker = '<!-- Template for a blog post card: -->';
    indexContent = indexContent.replace(insertMarker, insertMarker + '\n' + postCard);
    
    fs.writeFileSync(blogIndexPath, indexContent);
}

/**
 * Main execution
 */
function main() {
    console.log('📝 Paper Trail Blog Automation');
    console.log('================================');
    
    const post = generateBlogPost();
    const result = saveBlogPost(post);
    
    console.log(`\n✨ Post published: ${post.title}`);
    console.log(`📁 File: ${result.filename}`);
    console.log(`🏷️  Category: ${post.category}`);
    console.log(`📊 Word count: ~${post.content.replace(/<[^>]*>/g, '').split(' ').length}`);
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { generateBlogPost, saveBlogPost };
