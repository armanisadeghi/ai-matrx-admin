"use client";

import { useState, useEffect, useCallback } from "react";
import { copyToClipboard, removeThinkingContent } from "@/components/matrx/buttons/markdown-copy-utils";
import { loadWordPressCSS } from "@/features/html-pages/css/wordpress-styles";
import { markdownToWordPressHTML } from "@/features/html-pages/utils/markdown-wordpress-utils";
import { useHTMLPages } from "@/features/html-pages/hooks/useHTMLPages";
import type { HtmlPreviewState, HtmlPreviewActions, HtmlPreviewHookProps } from "./types";

export function useHtmlPreviewState({ markdownContent, htmlContent, user, isOpen = true }: HtmlPreviewHookProps): HtmlPreviewState & HtmlPreviewActions {
    // Copy states
    const [copied, setCopied] = useState(false);
    const [copiedNoBullets, setCopiedNoBullets] = useState(false);
    const [copiedCSS, setCopiedCSS] = useState(false);
    const [copiedComplete, setCopiedComplete] = useState(false);
    const [copiedCustom, setCopiedCustom] = useState(false);
    const [copiedUrl, setCopiedUrl] = useState(false);
    
    // Markdown content (source of truth)
    const [initialMarkdown] = useState<string>(markdownContent);
    const [currentMarkdown, setCurrentMarkdown] = useState<string>(markdownContent);
    
    // HTML content (generated from markdown)
    const [generatedHtmlContent, setGeneratedHtmlContent] = useState<string>(() => {
        return htmlContent || markdownToWordPressHTML(removeThinkingContent(markdownContent));
    });
    const [editedCompleteHtml, setEditedCompleteHtml] = useState<string>("");
    const [wordPressCSS, setWordPressCSS] = useState<string>("");
    
    // HTML regeneration
    const [isHtmlDirty, setIsHtmlDirty] = useState(false);
    
    // Custom copy options
    const [includeBulletStyles, setIncludeBulletStyles] = useState(true);
    const [includeDecorativeLineBreaks, setIncludeDecorativeLineBreaks] = useState(true);
    
    // Save page states
    const [savedPage, setSavedPage] = useState<any>(null);
    const [originalPageUrl, setOriginalPageUrl] = useState<string | null>(null);
    const [regeneratedPageUrl, setRegeneratedPageUrl] = useState<string | null>(null);
    const [pageTitle, setPageTitle] = useState<string>("");
    const [pageDescription, setPageDescription] = useState<string>("");
    const [metaTitle, setMetaTitle] = useState<string>("");
    const [metaDescription, setMetaDescription] = useState<string>("");
    const [metaKeywords, setMetaKeywords] = useState<string>("");
    const [ogImage, setOgImage] = useState<string>("");
    const [canonicalUrl, setCanonicalUrl] = useState<string>("");
    const [showAdvancedMeta, setShowAdvancedMeta] = useState<boolean>(false);
    
    // HTML Pages system
    const { createHTMLPage, isCreating, error, clearError } = useHTMLPages(user?.id);

    // Extract title from HTML content
    const extractTitleFromHTML = useCallback((htmlContent: string): string => {
        try {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = htmlContent;
            
            const h1 = tempDiv.querySelector('h1');
            if (h1 && h1.textContent?.trim()) {
                return h1.textContent.trim();
            }
            
            const h2 = tempDiv.querySelector('h2');
            if (h2 && h2.textContent?.trim()) {
                return h2.textContent.trim();
            }
            
            return '';
        } catch (error) {
            console.error('Error extracting title from HTML:', error);
            return '';
        }
    }, []);

    // Extract description from HTML content
    const extractDescriptionFromHTML = useCallback((htmlContent: string): string => {
        try {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = htmlContent;
            
            let firstHeading = tempDiv.querySelector('h1');
            if (!firstHeading) {
                firstHeading = tempDiv.querySelector('h2');
            }
            
            if (firstHeading) {
                let nextElement = firstHeading.nextElementSibling;
                while (nextElement) {
                    if (nextElement.tagName === 'P' && nextElement.textContent?.trim()) {
                        const fullText = nextElement.textContent.trim();
                        const firstSentence = fullText.split(/[.!?]/)[0];
                        return firstSentence.trim() + (firstSentence.length < fullText.length ? '.' : '');
                    }
                    nextElement = nextElement.nextElementSibling;
                }
            } else {
                const firstP = tempDiv.querySelector('p');
                if (firstP && firstP.textContent?.trim()) {
                    const fullText = firstP.textContent.trim();
                    const firstSentence = fullText.split(/[.!?]/)[0];
                    return firstSentence.trim() + (firstSentence.length < fullText.length ? '.' : '');
                }
            }
            
            return '';
        } catch (error) {
            console.error('Error extracting description from HTML:', error);
            return '';
        }
    }, []);

    // Regenerate HTML from current markdown and create new preview page
    const handleRegenerateHtml = useCallback(async () => {
        const cleanedMarkdown = removeThinkingContent(currentMarkdown);
        const newHtml = markdownToWordPressHTML(cleanedMarkdown);
        setGeneratedHtmlContent(newHtml);
        setIsHtmlDirty(false);
        setEditedCompleteHtml("");
        
        // Auto-create preview page for regenerated content
        if (user?.id) {
            try {
                const extractedTitle = extractTitleFromHTML(newHtml);
                const title = extractedTitle || "Preview - Regenerated";
                
                const completeHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
${wordPressCSS}
    </style>
</head>
<body>
    ${newHtml}
</body>
</html>`;
                
                const result = await createHTMLPage(completeHtml, title, "Regenerated preview", {});
                setRegeneratedPageUrl(result.url);
                console.log('Regenerated preview page created:', result.url);
            } catch (err) {
                console.error('Failed to create regenerated preview:', err);
            }
        }
    }, [currentMarkdown, user, wordPressCSS, extractTitleFromHTML, createHTMLPage]);

    // Refresh markdown to initial state (and regenerate HTML from initial content)
    const handleRefreshMarkdown = useCallback(() => {
        setCurrentMarkdown(initialMarkdown);
        const cleanedMarkdown = removeThinkingContent(initialMarkdown);
        const newHtml = markdownToWordPressHTML(cleanedMarkdown);
        setGeneratedHtmlContent(newHtml);
        setIsHtmlDirty(false);
        setEditedCompleteHtml("");
        // Reset to original URL without creating new page
        setRegeneratedPageUrl(null);
    }, [initialMarkdown]);

    // Generate complete HTML with CSS
    const generateCompleteHTML = useCallback(() => {
        const extractedTitle = extractTitleFromHTML(generatedHtmlContent);
        const pageTitle = extractedTitle || "WordPress Content";
        
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${pageTitle}</title>
    <style>
${wordPressCSS}
    </style>
</head>
<body>
    ${generatedHtmlContent}
</body>
</html>`;
    }, [generatedHtmlContent, wordPressCSS, extractTitleFromHTML]);

    // Get current HTML content
    const getCurrentHtmlContent = useCallback(() => {
        return editedCompleteHtml || generateCompleteHTML();
    }, [editedCompleteHtml, generateCompleteHTML]);

    // Extract body content from complete HTML
    const extractBodyContent = useCallback((completeHtml: string) => {
        const match = completeHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        return match ? match[1] : generatedHtmlContent;
    }, [generatedHtmlContent]);

    // Strip bullet styles
    const stripBulletStyles = useCallback((html: string) => {
        return html.replace(/class="matrx-list-item"/g, '');
    }, []);

    // Strip decorative line breaks
    const stripDecorativeLineBreaks = useCallback((html: string) => {
        return html.replace(/<hr class="matrx-hr"[^>]*>/g, '');
    }, []);

    // Apply custom options
    const applyCustomOptions = useCallback((html: string) => {
        let processedHtml = html;
        
        if (!includeBulletStyles) {
            processedHtml = stripBulletStyles(processedHtml);
        }
        
        if (!includeDecorativeLineBreaks) {
            processedHtml = stripDecorativeLineBreaks(processedHtml);
        }
        
        return processedHtml;
    }, [includeBulletStyles, includeDecorativeLineBreaks, stripBulletStyles, stripDecorativeLineBreaks]);

    // Get current preview URL (regenerated takes precedence over original)
    const getCurrentPreviewUrl = useCallback((): string | null => {
        return regeneratedPageUrl || originalPageUrl;
    }, [regeneratedPageUrl, originalPageUrl]);

    // SEO helper functions
    const getCharacterCountStatus = useCallback((text: string, ideal: number, max: number) => {
        const length = text.length;
        if (length === 0) return { status: 'empty', color: 'text-gray-400' };
        if (length <= ideal) return { status: 'good', color: 'text-green-600 dark:text-green-400' };
        if (length <= max) return { status: 'warning', color: 'text-yellow-600 dark:text-yellow-400' };
        return { status: 'error', color: 'text-red-600 dark:text-red-400' };
    }, []);

    const getSEORecommendation = useCallback((text: string, field: string) => {
        const length = text.length;
        switch (field) {
            case 'title':
                if (length === 0) return 'Page title is required';
                if (length < 30) return 'Consider a longer, more descriptive title';
                if (length > 60) return 'Title may be truncated in search results';
                return 'Good title length';
            case 'description':
                if (length === 0) return 'Description helps with SEO';
                if (length < 120) return 'Consider a longer description';
                if (length > 160) return 'Description may be truncated';
                return 'Good description length';
            case 'metaTitle':
                if (length === 0) return 'Will use page title if empty';
                if (length < 30) return 'Consider a longer meta title';
                if (length > 60) return 'Meta title may be truncated';
                return 'Good meta title length';
            case 'metaDescription':
                if (length === 0) return 'Will use page description if empty';
                if (length < 120) return 'Consider a longer meta description';
                if (length > 160) return 'Meta description may be truncated';
                return 'Good meta description length';
            default:
                return '';
        }
    }, []);

    // Copy handlers
    const handleCopyHtml = useCallback(async () => {
        const currentCompleteHtml = getCurrentHtmlContent();
        const bodyContent = extractBodyContent(currentCompleteHtml);
        await copyToClipboard(bodyContent, {
            onSuccess: () => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            },
            onError: (err) => console.error("Failed to copy HTML:", err)
        });
    }, [getCurrentHtmlContent, extractBodyContent]);

    const handleCopyHtmlNoBullets = useCallback(async () => {
        const currentCompleteHtml = getCurrentHtmlContent();
        const bodyContent = extractBodyContent(currentCompleteHtml);
        const noBulletsHtml = stripBulletStyles(bodyContent);
        await copyToClipboard(noBulletsHtml, {
            onSuccess: () => {
                setCopiedNoBullets(true);
                setTimeout(() => setCopiedNoBullets(false), 2000);
            },
            onError: (err) => console.error("Failed to copy HTML without bullet styles:", err)
        });
    }, [getCurrentHtmlContent, extractBodyContent, stripBulletStyles]);

    const handleCopyCSS = useCallback(async () => {
        await copyToClipboard(wordPressCSS, {
            onSuccess: () => {
                setCopiedCSS(true);
                setTimeout(() => setCopiedCSS(false), 2000);
            },
            onError: (err) => console.error("Failed to copy CSS:", err)
        });
    }, [wordPressCSS]);

    const handleCopyComplete = useCallback(async () => {
        const completeHTML = getCurrentHtmlContent();
        await copyToClipboard(completeHTML, {
            onSuccess: () => {
                setCopiedComplete(true);
                setTimeout(() => setCopiedComplete(false), 2000);
            },
            onError: (err) => console.error("Failed to copy complete HTML:", err)
        });
    }, [getCurrentHtmlContent]);

    const handleCopyCustom = useCallback(async () => {
        const currentCompleteHtml = getCurrentHtmlContent();
        const bodyContent = extractBodyContent(currentCompleteHtml);
        const customHTML = applyCustomOptions(bodyContent);
        await copyToClipboard(customHTML, {
            onSuccess: () => {
                setCopiedCustom(true);
                setTimeout(() => setCopiedCustom(false), 2000);
            },
            onError: (err) => console.error("Failed to copy custom HTML:", err)
        });
    }, [getCurrentHtmlContent, extractBodyContent, applyCustomOptions]);

    const handleCopyUrl = useCallback(async (url: string) => {
        await copyToClipboard(url, {
            onSuccess: () => {
                setCopiedUrl(true);
                setTimeout(() => setCopiedUrl(false), 1500);
            },
            onError: (err) => console.error("Failed to copy URL:", err)
        });
    }, []);

    // Save page handler
    const handleSavePage = useCallback(async () => {
        if (!pageTitle.trim()) {
            alert('Please enter a page title before saving');
            return;
        }

        if (!user?.id) {
            alert('You must be logged in to save HTML pages');
            return;
        }

        try {
            clearError();
            
            const currentCompleteHtml = getCurrentHtmlContent();
            const bodyContent = extractBodyContent(currentCompleteHtml);
            const filteredBodyContent = removeThinkingContent(bodyContent);
            
            const completeHTML = currentCompleteHtml.replace(
                /<body[^>]*>[\s\S]*?<\/body>/i,
                `<body>\n    ${filteredBodyContent}\n</body>`
            );
            
            const metaFields = {
                metaTitle: metaTitle.trim() || pageTitle.trim(),
                metaDescription: metaDescription.trim() || pageDescription.trim(),
                metaKeywords: metaKeywords.trim() || null,
                ogImage: ogImage.trim() || null,
                canonicalUrl: canonicalUrl.trim() || null
            };

            const result = await createHTMLPage(completeHTML, pageTitle.trim(), pageDescription.trim(), metaFields);
            setSavedPage(result);
            
            setPageTitle('');
            setPageDescription('');
            setMetaTitle('');
            setMetaDescription('');
            setMetaKeywords('');
            setOgImage('');
            setCanonicalUrl('');
            
            console.log('Page saved successfully:', result);
        } catch (err: any) {
            console.error('Save failed:', err);
            alert(`Save failed: ${err.message}`);
        }
    }, [pageTitle, user, pageDescription, metaTitle, metaDescription, metaKeywords, ogImage, canonicalUrl, getCurrentHtmlContent, extractBodyContent, createHTMLPage, clearError]);

    // Update current markdown when the editor opens with new content
    useEffect(() => {
        if (isOpen && markdownContent && !originalPageUrl) {
            setCurrentMarkdown(markdownContent);
            // Also regenerate HTML if content is provided
            const cleanedMarkdown = removeThinkingContent(markdownContent);
            const newHtml = markdownToWordPressHTML(cleanedMarkdown);
            setGeneratedHtmlContent(newHtml);
            setIsHtmlDirty(false);
            
            // Auto-create original preview page on first open
            if (user?.id) {
                (async () => {
                    try {
                        const extractedTitle = extractTitleFromHTML(newHtml);
                        const title = extractedTitle || "Preview - Original";
                        
                        const completeHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
${wordPressCSS}
    </style>
</head>
<body>
    ${newHtml}
</body>
</html>`;
                        
                        const result = await createHTMLPage(completeHtml, title, "Original preview", {});
                        setOriginalPageUrl(result.url);
                        console.log('Original preview page created:', result.url);
                    } catch (err) {
                        console.error('Failed to create original preview:', err);
                    }
                })();
            }
        }
    }, [isOpen, markdownContent, originalPageUrl, user, wordPressCSS, extractTitleFromHTML, createHTMLPage]);

    // Mark HTML as dirty when markdown changes
    useEffect(() => {
        if (currentMarkdown !== initialMarkdown) {
            setIsHtmlDirty(true);
        }
    }, [currentMarkdown, initialMarkdown]);

    // Load WordPress CSS
    useEffect(() => {
        const loadCSS = async () => {
            const cssContent = await loadWordPressCSS();
            setWordPressCSS(cssContent);
        };

        if (isOpen) {
            loadCSS();
        }
    }, [isOpen]);

    // Initialize edited complete HTML when modal opens
    useEffect(() => {
        if (isOpen && generatedHtmlContent && wordPressCSS) {
            const completeHtml = generateCompleteHTML();
            setEditedCompleteHtml(completeHtml);
        }
    }, [isOpen, generatedHtmlContent, wordPressCSS, generateCompleteHTML]);

    // Reset edited complete HTML when modal closes
    useEffect(() => {
        if (!isOpen) {
            setEditedCompleteHtml("");
        }
    }, [isOpen]);

    return {
        // State
        copied,
        copiedNoBullets,
        copiedCSS,
        copiedComplete,
        copiedCustom,
        copiedUrl,
        initialMarkdown,
        currentMarkdown,
        generatedHtmlContent,
        editedCompleteHtml,
        wordPressCSS,
        isHtmlDirty,
        includeBulletStyles,
        includeDecorativeLineBreaks,
        savedPage,
        originalPageUrl,
        regeneratedPageUrl,
        pageTitle,
        pageDescription,
        metaTitle,
        metaDescription,
        metaKeywords,
        ogImage,
        canonicalUrl,
        showAdvancedMeta,
        isCreating,
        error,
        
        // Setters
        setCopied,
        setCopiedNoBullets,
        setCopiedCSS,
        setCopiedComplete,
        setCopiedCustom,
        setCopiedUrl,
        setCurrentMarkdown,
        setEditedCompleteHtml,
        setWordPressCSS,
        setGeneratedHtmlContent,
        setIncludeBulletStyles,
        setIncludeDecorativeLineBreaks,
        setSavedPage,
        setOriginalPageUrl,
        setRegeneratedPageUrl,
        setPageTitle,
        setPageDescription,
        setMetaTitle,
        setMetaDescription,
        setMetaKeywords,
        setOgImage,
        setCanonicalUrl,
        setShowAdvancedMeta,
        
        // Actions
        handleCopyHtml,
        handleCopyHtmlNoBullets,
        handleCopyCSS,
        handleCopyComplete,
        handleCopyCustom,
        handleCopyUrl,
        handleSavePage,
        handleRegenerateHtml,
        handleRefreshMarkdown,
        
        // Utilities
        generateCompleteHTML,
        getCurrentHtmlContent,
        getCurrentPreviewUrl,
        extractBodyContent,
        stripBulletStyles,
        stripDecorativeLineBreaks,
        applyCustomOptions,
        extractTitleFromHTML,
        extractDescriptionFromHTML,
        getCharacterCountStatus,
        getSEORecommendation,
        clearError,
    };
}

