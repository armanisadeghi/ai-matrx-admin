/**
 * Utility functions for HTML preview and processing
 * Extracted from useHtmlPreviewState to keep the hook focused on state management
 */

import { removeThinkingContent } from "@/components/matrx/buttons/markdown-copy-utils";
import { markdownToWordPressHTML } from "./markdown-wordpress-utils";

/**
 * Simple conversion: markdown -> clean HTML
 */
export function convertMarkdownToHtml(markdown: string): string {
    const cleanedMarkdown = removeThinkingContent(markdown);
    return markdownToWordPressHTML(cleanedMarkdown);
}

/**
 * Determine which HTML to use for publishing based on edit state
 */
export function prepareHtmlForPublish(params: {
    isMarkdownDirty: boolean;
    isHtmlDirty: boolean;
    currentMarkdown: string;
    editedCompleteHtml: string;
    generatedHtmlContent: string;
}): {
    bodyHtml: string;
    completeHtmlToPublish?: string;
    newlyGeneratedHtml?: string;
} {
    const { isMarkdownDirty, isHtmlDirty, currentMarkdown, editedCompleteHtml, generatedHtmlContent } = params;

    // Case 1: Markdown was edited -> regenerate from markdown
    if (isMarkdownDirty || !editedCompleteHtml) {
        const newHtml = convertMarkdownToHtml(currentMarkdown);
        return {
            bodyHtml: newHtml,
            newlyGeneratedHtml: newHtml,
        };
    }

    // Case 2: HTML was directly edited -> use edited HTML
    if (isHtmlDirty && editedCompleteHtml) {
        return {
            bodyHtml: extractBodyContent(editedCompleteHtml, generatedHtmlContent),
            completeHtmlToPublish: editedCompleteHtml,
        };
    }

    // Case 3: No changes -> use current generated HTML
    return {
        bodyHtml: generatedHtmlContent,
    };
}

/**
 * Prepare metadata for publishing
 */
export function prepareMetadataForPublish(params: {
    useMetadata: boolean;
    bodyHtml: string;
    pageTitle: string;
    pageDescription: string;
    metaTitle: string;
    metaDescription: string;
    metaKeywords: string;
    ogImage: string;
    canonicalUrl: string;
}): {
    title: string;
    description: string;
    metaFields: Record<string, any>;
} {
    const extractedTitle = extractTitleFromHTML(params.bodyHtml);
    
    if (params.useMetadata) {
        const title = params.pageTitle.trim() || extractedTitle || "Generated Content";
        const description = params.pageDescription.trim() || "";
        
        return {
            title,
            description,
            metaFields: {
                metaTitle: params.metaTitle.trim() || title,
                metaDescription: params.metaDescription.trim() || description,
                metaKeywords: params.metaKeywords.trim() || null,
                ogImage: params.ogImage.trim() || null,
                canonicalUrl: params.canonicalUrl.trim() || null,
            },
        };
    }

    // No metadata - just use extracted values
    return {
        title: extractedTitle || "Generated Content",
        description: "",
        metaFields: {},
    };
}

/**
 * Extract the title from HTML content by finding the first h1 or h2
 */
export function extractTitleFromHTML(htmlContent: string): string {
    try {
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = htmlContent;

        const h1 = tempDiv.querySelector("h1");
        if (h1 && h1.textContent?.trim()) {
            return h1.textContent.trim();
        }

        const h2 = tempDiv.querySelector("h2");
        if (h2 && h2.textContent?.trim()) {
            return h2.textContent.trim();
        }

        return "";
    } catch (error) {
        console.error("Error extracting title from HTML:", error);
        return "";
    }
}

/**
 * Extract a description from HTML content by finding the first paragraph after a heading
 */
export function extractDescriptionFromHTML(htmlContent: string): string {
    try {
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = htmlContent;

        let firstHeading = tempDiv.querySelector("h1");
        if (!firstHeading) {
            firstHeading = tempDiv.querySelector("h2");
        }

        if (firstHeading) {
            let nextElement = firstHeading.nextElementSibling;
            while (nextElement) {
                if (nextElement.tagName === "P" && nextElement.textContent?.trim()) {
                    const fullText = nextElement.textContent.trim();
                    const firstSentence = fullText.split(/[.!?]/)[0];
                    return firstSentence.trim() + (firstSentence.length < fullText.length ? "." : "");
                }
                nextElement = nextElement.nextElementSibling;
            }
        } else {
            const firstP = tempDiv.querySelector("p");
            if (firstP && firstP.textContent?.trim()) {
                const fullText = firstP.textContent.trim();
                const firstSentence = fullText.split(/[.!?]/)[0];
                return firstSentence.trim() + (firstSentence.length < fullText.length ? "." : "");
            }
        }

        return "";
    } catch (error) {
        console.error("Error extracting description from HTML:", error);
        return "";
    }
}

/**
 * Extract body content from a complete HTML document
 */
export function extractBodyContent(completeHtml: string, fallbackContent: string = ""): string {
    const match = completeHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    return match ? match[1] : fallbackContent;
}

/**
 * Remove bullet style classes from HTML
 */
export function stripBulletStyles(html: string): string {
    return html.replace(/class="matrx-list-item"/g, "");
}

/**
 * Remove decorative line breaks from HTML
 */
export function stripDecorativeLineBreaks(html: string): string {
    return html.replace(/<hr class="matrx-hr"[^>]*>/g, "");
}

/**
 * Apply custom HTML processing options
 */
export function applyCustomOptions(
    html: string,
    options: {
        includeBulletStyles?: boolean;
        includeDecorativeLineBreaks?: boolean;
    }
): string {
    let processedHtml = html;

    if (options.includeBulletStyles === false) {
        processedHtml = stripBulletStyles(processedHtml);
    }

    if (options.includeDecorativeLineBreaks === false) {
        processedHtml = stripDecorativeLineBreaks(processedHtml);
    }

    return processedHtml;
}

/**
 * Generate a complete HTML document with CSS
 */
export function generateCompleteHTML(params: {
    bodyContent: string;
    css: string;
    title?: string;
}): string {
    const pageTitle = params.title || extractTitleFromHTML(params.bodyContent) || "WordPress Content";

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${pageTitle}</title>
    <style>
${params.css}
    </style>
</head>
<body>
    ${params.bodyContent}
</body>
</html>`;
}

/**
 * SEO character count status
 */
export interface CharacterCountStatus {
    status: "empty" | "good" | "warning" | "error";
    color: string;
}

/**
 * Get character count status for SEO fields
 */
export function getCharacterCountStatus(
    text: string,
    ideal: number,
    max: number
): CharacterCountStatus {
    const length = text.length;
    if (length === 0) return { status: "empty", color: "text-gray-400" };
    if (length <= ideal) return { status: "good", color: "text-green-600 dark:text-green-400" };
    if (length <= max) return { status: "warning", color: "text-yellow-600 dark:text-yellow-400" };
    return { status: "error", color: "text-red-600 dark:text-red-400" };
}

/**
 * Get SEO recommendation for a field
 */
export function getSEORecommendation(text: string, field: string): string {
    const length = text.length;
    switch (field) {
        case "title":
            if (length === 0) return "Page title is required";
            if (length < 30) return "Consider a longer, more descriptive title";
            if (length > 60) return "Title may be truncated in search results";
            return "Good title length";
        case "description":
            if (length === 0) return "Description helps with SEO";
            if (length < 120) return "Consider a longer description";
            if (length > 160) return "Description may be truncated";
            return "Good description length";
        case "metaTitle":
            if (length === 0) return "Will use page title if empty";
            if (length < 30) return "Consider a longer meta title";
            if (length > 60) return "Meta title may be truncated";
            return "Good meta title length";
        case "metaDescription":
            if (length === 0) return "Will use page description if empty";
            if (length < 120) return "Consider a longer meta description";
            if (length > 160) return "Meta description may be truncated";
            return "Good meta description length";
        default:
            return "";
    }
}

