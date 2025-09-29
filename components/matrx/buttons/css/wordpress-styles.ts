/**
 * SINGLE SOURCE OF TRUTH for WordPress/HTML Preview CSS
 * 
 * This file contains the master CSS that is used everywhere:
 * - HTML Preview Modal
 * - Copy operations
 * - Saved HTML pages
 * - Message options menu
 * 
 * ANY changes to styling should ONLY be made here!
 */

export const WORDPRESS_CSS = `/* 
 * MATRX WordPress CSS - Production Ready
 * Use this CSS in your WordPress theme to style MATRX content
 * All styles are scoped to .matrx-content-container to avoid conflicts
 */

/* Content Container */
.matrx-content-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
    line-height: 1.6;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
}

/* Typography */
.matrx-h1 {
    font-size: 2.5rem;
    font-weight: 700;
    margin: 0 0 1.5rem 0;
    color: #1a1a1a;
    line-height: 1.2;
}

.matrx-h2 {
    font-size: 1.8rem;
    font-weight: 600;
    margin: 3rem 0 1rem 0 !important;
    color: #2a2a2a;
    line-height: 1.3 !important;
    border-bottom: 2px solid #e5e5e5;
    padding-bottom: 0.75rem !important;
    padding-top: 0 !important;
}

.matrx-h3 {
    font-size: 1.3rem;
    font-weight: 600;
    margin: 2rem 0 1rem 0;
    color: #3a3a3a;
    line-height: 1.4;
}

.matrx-h4 {
    font-size: 1.1rem;
    font-weight: 600;
    margin: 1.5rem 0 0.75rem 0;
    color: #3a3a3a;
    line-height: 1.4;
}

.matrx-h5 {
    font-size: 1rem;
    font-weight: 600;
    margin: 1.25rem 0 0.5rem 0;
    color: #3a3a3a;
    line-height: 1.4;
}

.matrx-h6 {
    font-size: 0.9rem;
    font-weight: 600;
    margin: 1rem 0 0.5rem 0;
    color: #3a3a3a;
    line-height: 1.4;
}

/* Paragraphs */
.matrx-intro {
    font-size: 1.1rem;
    color: #4a4a4a;
    margin-bottom: 2rem;
    padding: 1.5rem;
    background: #f8f9fa;
    border-left: 4px solid #d1d5db;
    border-radius: 0 8px 8px 0;
}

.matrx-paragraph {
    font-size: 1rem;
    color: #4a4a4a;
    margin-bottom: 1.5rem;
    text-align: justify;
}

/* Text Formatting */
.matrx-em {
    font-style: italic;
    color: #2a2a2a;
}

.matrx-strong {
    font-weight: 600;
    color: #2a2a2a;
}

/* Links */
.matrx-link {
    color: #374151;
    text-decoration: underline;
    text-underline-offset: 2px;
}

.matrx-link:hover {
    color: #1f2937;
    text-decoration: none;
}

/* Lists */
.matrx-list {
    margin: 1.5rem 0;
    padding-left: 0;
}

.matrx-bullet-list {
    list-style: none;
    margin: 1.5rem 0;
}

.matrx-numbered-list {
    list-style: none;
    counter-reset: item;
    margin: 1.5rem 0;
}

.matrx-list-item {
    margin-bottom: 1rem;
    padding-left: 1.5rem;
    position: relative;
    color: #4a4a4a;
    line-height: 1.6;
}

.matrx-bullet-list .matrx-list-item::before {
    content: "•";
    color: #6b7280;
    font-weight: bold;
    position: absolute;
    left: 0;
    top: 0;
    font-size: 1.2rem;
}

.matrx-numbered-list .matrx-list-item {
    counter-increment: item;
}

.matrx-numbered-list .matrx-list-item::before {
    content: counter(item) ".";
    color: #6b7280;
    font-weight: bold;
    position: absolute;
    left: 0;
    top: 0;
}

/* FAQ Styling */
.matrx-faq-item {
    margin-bottom: 2rem;
    padding: 1.5rem;
    background: #f8f9fa;
    border-radius: 8px;
    border-left: 4px solid #d1d5db;
}

.matrx-faq-question {
    font-size: 1.2rem;
    font-weight: 600;
    margin: 0 0 0.75rem 0;
    color: #2a2a2a;
}

.matrx-faq-answer {
    margin: 0;
    color: #4a4a4a;
    line-height: 1.6;
}

/* Horizontal Rules */
.matrx-hr {
    border: none;
    border-top: 2px solid #e5e5e5;
    margin: 2.5rem auto;
    width: 60%;
    opacity: 0.7;
}

/* Code Blocks */
.matrx-code-block {
    background: #f8f9fa;
    border: 1px solid #e9ecef;
    border-radius: 6px;
    padding: 1rem;
    margin: 1.5rem 0;
    overflow-x: auto;
    font-family: 'Courier New', Consolas, monospace;
    font-size: 0.9rem;
    line-height: 1.4;
}

/* Inline Code */
.matrx-code {
    background: #f8f9fa;
    border: 1px solid #e9ecef;
    border-radius: 3px;
    padding: 0.2rem 0.4rem;
    font-family: 'Courier New', Consolas, monospace;
    font-size: 0.9em;
    color: #d73a49;
}

/* Blockquotes */
.matrx-blockquote {
    border-left: 4px solid #d1d5db;
    margin: 1.5rem 0;
    padding: 1rem 1.5rem;
    background: #f8f9fa;
    font-style: italic;
    color: #4a4a4a;
}

/* Tables */
.matrx-table {
    width: 100%;
    border-collapse: collapse;
    margin: 1.5rem 0;
    background: white;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.matrx-table th,
.matrx-table td {
    padding: 0.75rem 1rem;
    text-align: left;
    border-bottom: 1px solid #e9ecef;
}

.matrx-table th {
    background: #f8f9fa;
    font-weight: 600;
    color: #2a2a2a;
}

.matrx-table tr:hover {
    background: #f8f9fa;
}

/* Responsive Design */
@media (max-width: 768px) {
    .matrx-content-container {
        max-width: 100%;
        padding: 1rem;
    }
    
    .matrx-h1 {
        font-size: 2rem;
    }
    
    .matrx-h2 {
        font-size: 1.5rem;
    }
    
    .matrx-h3 {
        font-size: 1.2rem;
    }
    
    .matrx-table {
        font-size: 0.9rem;
    }
    
    .matrx-table th,
    .matrx-table td {
        padding: 0.5rem;
    }
}`;

/**
 * Get the WordPress CSS as a string
 * This is the ONLY function that should be used to get CSS content
 */
export function getWordPressCSS(): string {
    return WORDPRESS_CSS;
}

/**
 * Load WordPress CSS from file with fallback to embedded CSS
 * Use this for async loading scenarios
 */
export async function loadWordPressCSS(): Promise<string> {
    try {
        const response = await fetch('/components/matrx/buttons/matrx-wordpress-styles-example.css');
        if (response.ok) {
            return await response.text();
        }
    } catch (error) {
        console.warn('Could not load WordPress CSS file, using embedded styles');
    }
    
    // Fallback to embedded CSS
    return getWordPressCSS();
}
