"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { copyToClipboard, removeThinkingContent } from "@/components/matrx/buttons/markdown-copy-utils";
import { getWordPressCSS } from "@/features/html-pages/css/wordpress-styles";
import { markdownToWordPressHTML } from "@/features/html-pages/utils/markdown-wordpress-utils";
import { useHTMLPages } from "@/features/html-pages/hooks/useHTMLPages";
import type { HtmlPreviewState, HtmlPreviewActions, HtmlPreviewHookProps } from "../components/types";

export function useHtmlPreviewState({
    markdownContent,
    htmlContent,
    user,
    isOpen = true,
    publishedPageId = null,
    onPageIdChange,
    resetKey,
}: HtmlPreviewHookProps): HtmlPreviewState & HtmlPreviewActions {
    // Copy states
    const [copied, setCopied] = useState(false);
    const [copiedNoBullets, setCopiedNoBullets] = useState(false);
    const [copiedCSS, setCopiedCSS] = useState(false);
    const [copiedComplete, setCopiedComplete] = useState(false);
    const [copiedCustom, setCopiedCustom] = useState(false);
    const [copiedUrl, setCopiedUrl] = useState(false);

    // Markdown content - SINGLE SOURCE OF TRUTH
    const [initialMarkdown] = useState<string>(markdownContent); // Never changes
    const [currentMarkdown, setCurrentMarkdown] = useState<string>(markdownContent); // Can be edited

    // HTML content (generated from markdown)
    const [generatedHtmlContent, setGeneratedHtmlContent] = useState<string>(() => {
        return htmlContent || markdownToWordPressHTML(removeThinkingContent(markdownContent));
    });
    const [editedCompleteHtml, setEditedCompleteHtmlInternal] = useState<string>("");
    const [wordPressCSS] = useState<string>(() => getWordPressCSS());

    // Source of truth tracking
    const [isMarkdownDirty, setIsMarkdownDirty] = useState(false); // Markdown was edited
    const [isHtmlDirty, setIsHtmlDirty] = useState(false); // HTML was directly edited

    // Published page URL (single URL, no "original" vs "regenerated")
    const [publishedPageUrl, setPublishedPageUrl] = useState<string | null>(null);

    // Custom setter for HTML that marks HTML as dirty
    const setEditedCompleteHtml = useCallback((html: string) => {
        setEditedCompleteHtmlInternal(html);
        if (html && html.trim()) {
            setIsHtmlDirty(true);
            setIsMarkdownDirty(false);
        }
    }, []);

    // Custom copy options
    const [includeBulletStyles, setIncludeBulletStyles] = useState(true);
    const [includeDecorativeLineBreaks, setIncludeDecorativeLineBreaks] = useState(true);

    // Save page states (for "Save As New" functionality)
    const [savedPage, setSavedPage] = useState<any>(null);
    const [pageTitle, setPageTitle] = useState<string>("");
    const [pageDescription, setPageDescription] = useState<string>("");
    const [metaTitle, setMetaTitle] = useState<string>("");
    const [metaDescription, setMetaDescription] = useState<string>("");
    const [metaKeywords, setMetaKeywords] = useState<string>("");
    const [ogImage, setOgImage] = useState<string>("");
    const [canonicalUrl, setCanonicalUrl] = useState<string>("");
    const [showAdvancedMeta, setShowAdvancedMeta] = useState<boolean>(false);

    // HTML Pages system
    const { createHTMLPage, updateHTMLPage, isCreating, error, clearError } = useHTMLPages(user?.id);

    // Extract title from HTML content
    const extractTitleFromHTML = useCallback((htmlContent: string): string => {
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
    }, []);

    // Extract description from HTML content
    const extractDescriptionFromHTML = useCallback((htmlContent: string): string => {
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
    }, []);

    // Extract body content from complete HTML
    const extractBodyContent = useCallback(
        (completeHtml: string) => {
            const match = completeHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
            return match ? match[1] : generatedHtmlContent;
        },
        [generatedHtmlContent]
    );

    // Unified page generation/update - Uses metadata from Publish tab
    const handleRegenerateHtml = useCallback(
        async (useMetadata: boolean = false) => {
            if (!user?.id) {
                alert("You must be logged in to generate pages");
                return;
            }

            try {
                // Determine HTML content based on what was edited
                let bodyHtml: string;
                let completeHtmlToPublish: string;

                if (isMarkdownDirty || !editedCompleteHtml) {
                    // Use current markdown as source
                    const cleanedMarkdown = removeThinkingContent(currentMarkdown);
                    const newHtml = markdownToWordPressHTML(cleanedMarkdown);
                    setGeneratedHtmlContent(newHtml);
                    bodyHtml = newHtml;
                } else if (isHtmlDirty && editedCompleteHtml) {
                    // Use edited HTML as source
                    bodyHtml = extractBodyContent(editedCompleteHtml);
                    completeHtmlToPublish = editedCompleteHtml;
                } else {
                    // Use current generated HTML
                    bodyHtml = generatedHtmlContent;
                }

                // Clear dirty flags
                setIsMarkdownDirty(false);
                setIsHtmlDirty(false);

                // Use metadata if provided (from Publish tab), otherwise extract from HTML
                const extractedTitle = extractTitleFromHTML(bodyHtml);
                const title = useMetadata && pageTitle.trim() ? pageTitle : extractedTitle || "Generated Content";
                const description = useMetadata && pageDescription.trim() ? pageDescription : "";

                // Prepare metadata fields
                const metaFields = useMetadata
                    ? {
                          metaTitle: metaTitle.trim() || title,
                          metaDescription: metaDescription.trim() || description,
                          metaKeywords: metaKeywords.trim() || null,
                          ogImage: ogImage.trim() || null,
                          canonicalUrl: canonicalUrl.trim() || null,
                      }
                    : {};

                // Build complete HTML
                const completeHtml =
                    completeHtmlToPublish ||
                    `<!DOCTYPE html>
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
    ${bodyHtml}
</body>
</html>`;

                let result;
                if (publishedPageId) {
                    // Update existing page
                    result = await updateHTMLPage(publishedPageId, completeHtml, title, description, metaFields);
                } else {
                    // Create new page
                    result = await createHTMLPage(completeHtml, title, description, metaFields);
                    onPageIdChange?.(result.pageId);
                }

                setPublishedPageUrl(result.url);

                // Show success for metadata updates
                if (useMetadata) {
                    setSavedPage(result);
                }
            } catch (err: any) {
                console.error("Generate/update failed:", err);
                alert(`Failed to ${publishedPageId ? "update" : "create"} page: ${err.message}`);
            }
        },
        [
            currentMarkdown,
            isMarkdownDirty,
            isHtmlDirty,
            editedCompleteHtml,
            generatedHtmlContent,
            user,
            wordPressCSS,
            extractTitleFromHTML,
            extractBodyContent,
            createHTMLPage,
            updateHTMLPage,
            publishedPageId,
            onPageIdChange,
            pageTitle,
            pageDescription,
            metaTitle,
            metaDescription,
            metaKeywords,
            ogImage,
            canonicalUrl,
        ]
    );

    // Reset: Revert to initial markdown and regenerate HTML locally
    const handleRefreshMarkdown = useCallback(() => {
        setCurrentMarkdown(initialMarkdown);
        const cleanedMarkdown = removeThinkingContent(initialMarkdown);
        const newHtml = markdownToWordPressHTML(cleanedMarkdown);
        setGeneratedHtmlContent(newHtml);
        setIsMarkdownDirty(false);
        setIsHtmlDirty(false);
        setEditedCompleteHtmlInternal("");
        // Note: Does NOT update database - user must click Regenerate to publish
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

    // Strip bullet styles
    const stripBulletStyles = useCallback((html: string) => {
        return html.replace(/class="matrx-list-item"/g, "");
    }, []);

    // Strip decorative line breaks
    const stripDecorativeLineBreaks = useCallback((html: string) => {
        return html.replace(/<hr class="matrx-hr"[^>]*>/g, "");
    }, []);

    // Apply custom options
    const applyCustomOptions = useCallback(
        (html: string) => {
            let processedHtml = html;

            if (!includeBulletStyles) {
                processedHtml = stripBulletStyles(processedHtml);
            }

            if (!includeDecorativeLineBreaks) {
                processedHtml = stripDecorativeLineBreaks(processedHtml);
            }

            return processedHtml;
        },
        [includeBulletStyles, includeDecorativeLineBreaks, stripBulletStyles, stripDecorativeLineBreaks]
    );

    // Get current preview URL
    const getCurrentPreviewUrl = useCallback((): string | null => {
        return publishedPageUrl;
    }, [publishedPageUrl]);

    // SEO helper functions
    const getCharacterCountStatus = useCallback((text: string, ideal: number, max: number) => {
        const length = text.length;
        if (length === 0) return { status: "empty", color: "text-gray-400" };
        if (length <= ideal) return { status: "good", color: "text-green-600 dark:text-green-400" };
        if (length <= max) return { status: "warning", color: "text-yellow-600 dark:text-yellow-400" };
        return { status: "error", color: "text-red-600 dark:text-red-400" };
    }, []);

    const getSEORecommendation = useCallback((text: string, field: string) => {
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
            onError: (err) => console.error("Failed to copy HTML:", err),
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
            onError: (err) => console.error("Failed to copy HTML without bullet styles:", err),
        });
    }, [getCurrentHtmlContent, extractBodyContent, stripBulletStyles]);

    const handleCopyCSS = useCallback(async () => {
        await copyToClipboard(wordPressCSS, {
            onSuccess: () => {
                setCopiedCSS(true);
                setTimeout(() => setCopiedCSS(false), 2000);
            },
            onError: (err) => console.error("Failed to copy CSS:", err),
        });
    }, [wordPressCSS]);

    const handleCopyComplete = useCallback(async () => {
        const completeHTML = getCurrentHtmlContent();
        await copyToClipboard(completeHTML, {
            onSuccess: () => {
                setCopiedComplete(true);
                setTimeout(() => setCopiedComplete(false), 2000);
            },
            onError: (err) => console.error("Failed to copy complete HTML:", err),
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
            onError: (err) => console.error("Failed to copy custom HTML:", err),
        });
    }, [getCurrentHtmlContent, extractBodyContent, applyCustomOptions]);

    const handleCopyUrl = useCallback(async (url: string) => {
        await copyToClipboard(url, {
            onSuccess: () => {
                setCopiedUrl(true);
                setTimeout(() => setCopiedUrl(false), 1500);
            },
            onError: (err) => console.error("Failed to copy URL:", err),
        });
    }, []);

    // Publish/Update page with metadata - Uses unified function
    const handleSavePage = useCallback(async () => {
        if (!pageTitle.trim()) {
            alert("Please enter a page title before publishing");
            return;
        }

        if (!user?.id) {
            alert("You must be logged in to publish HTML pages");
            return;
        }

        try {
            clearError();
            // Call unified function with metadata enabled
            await handleRegenerateHtml(true);
        } catch (err: any) {
            console.error("Publish failed:", err);
            alert(`Publish failed: ${err.message}`);
        }
    }, [pageTitle, user, clearError, handleRegenerateHtml]);

    // Sync markdown content when editor opens
    useEffect(() => {
        if (isOpen && markdownContent) {
            setCurrentMarkdown(markdownContent);
            // Also regenerate HTML from the markdown
            const cleanedMarkdown = removeThinkingContent(markdownContent);
            const newHtml = markdownToWordPressHTML(cleanedMarkdown);
            setGeneratedHtmlContent(newHtml);
        }
    }, [isOpen, markdownContent]);

    // Track when markdown is edited (becomes source of truth)
    useEffect(() => {
        if (currentMarkdown !== initialMarkdown) {
            setIsMarkdownDirty(true);
            // When markdown is edited, HTML edits are no longer relevant
            setIsHtmlDirty(false);
        }
    }, [currentMarkdown, initialMarkdown]);

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
            setEditedCompleteHtmlInternal("");
        }
    }, [isOpen]);

    // Reset all state when resetKey changes (for new tasks)
    useEffect(() => {
        if (resetKey !== undefined && resetKey > 0) {
            // Clear all URLs and page state
            setPublishedPageUrl(null);
            setSavedPage(null);
            // Clear dirty flags
            setIsMarkdownDirty(false);
            setIsHtmlDirty(false);
            // Clear edited content
            setEditedCompleteHtmlInternal("");
            // Reset metadata fields
            setPageTitle("");
            setPageDescription("");
            setMetaTitle("");
            setMetaDescription("");
            setMetaKeywords("");
            setOgImage("");
            setCanonicalUrl("");
            setShowAdvancedMeta(false);
            // Note: publishedPageId is managed by parent and reset there
            // Note: currentMarkdown will sync from parent's markdownContent
        }
    }, [resetKey]);

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
        isMarkdownDirty,
        isHtmlDirty,
        includeBulletStyles,
        includeDecorativeLineBreaks,
        savedPage,
        publishedPageUrl, // Single URL for the published page
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
        setGeneratedHtmlContent,
        setIncludeBulletStyles,
        setIncludeDecorativeLineBreaks,
        setSavedPage,
        setPublishedPageUrl, // Single setter for URL
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
        handleRegenerateHtml, // Creates OR updates based on publishedPageId
        handleRefreshMarkdown, // Resets to initial markdown (local only)

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
