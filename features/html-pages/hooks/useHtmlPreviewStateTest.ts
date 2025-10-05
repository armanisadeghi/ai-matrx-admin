"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { copyToClipboard } from "@/components/matrx/buttons/markdown-copy-utils";
import { getWordPressCSS } from "@/features/html-pages/css/wordpress-styles";
import { useHTMLPages } from "@/features/html-pages/hooks/useHTMLPages";
import {
    convertMarkdownToHtml,
    prepareHtmlForPublish,
    prepareMetadataForPublish,
    extractTitleFromHTML,
    extractDescriptionFromHTML,
    extractBodyContent,
    stripBulletStyles,
    stripDecorativeLineBreaks,
    applyCustomOptions,
    generateCompleteHTML,
    getCharacterCountStatus,
    getSEORecommendation,
} from "@/features/html-pages/utils/html-preview-utils";
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

    // HTML content (generated from markdown using utility)
    const [generatedHtmlContent, setGeneratedHtmlContent] = useState<string>(() => {
        return htmlContent || convertMarkdownToHtml(markdownContent);
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

    // Wrapper for extractBodyContent with fallback to generatedHtmlContent
    const extractBodyContentWithFallback = useCallback(
        (completeHtml: string) => {
            return extractBodyContent(completeHtml, generatedHtmlContent);
        },
        [generatedHtmlContent]
    );

    // Unified page generation/update - SIMPLIFIED to just orchestrate utilities and API
    const handleRegenerateHtml = useCallback(
        async (useMetadata: boolean = false) => {
            if (!user?.id) {
                alert("You must be logged in to generate pages");
                return;
            }

            try {
                // Step 1: Prepare HTML using utility
                const { bodyHtml, completeHtmlToPublish, newlyGeneratedHtml } = prepareHtmlForPublish({
                    isMarkdownDirty,
                    isHtmlDirty,
                    currentMarkdown,
                    editedCompleteHtml,
                    generatedHtmlContent,
                });

                // Step 2: Update state if new HTML was generated from markdown
                if (newlyGeneratedHtml) {
                    setGeneratedHtmlContent(newlyGeneratedHtml);
                }

                // Step 3: Clear dirty flags
                setIsMarkdownDirty(false);
                setIsHtmlDirty(false);

                // Step 4: Prepare metadata using utility
                const { title, description, metaFields } = prepareMetadataForPublish({
                    useMetadata,
                    bodyHtml,
                    pageTitle,
                    pageDescription,
                    metaTitle,
                    metaDescription,
                    metaKeywords,
                    ogImage,
                    canonicalUrl,
                });

                // Step 5: Build complete HTML (use existing if available, otherwise generate)
                const completeHtml = completeHtmlToPublish || generateCompleteHTML({
                    bodyContent: bodyHtml,
                    css: wordPressCSS,
                    title,
                });

                // Step 6: API call - Create or update page
                let result;
                if (publishedPageId) {
                    result = await updateHTMLPage(publishedPageId, completeHtml, title, description, metaFields);
                } else {
                    result = await createHTMLPage(completeHtml, title, description, metaFields);
                    onPageIdChange?.(result.pageId);
                }

                // Step 7: Update state with results
                setPublishedPageUrl(result.url);
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

    // Reset: Revert to original markdown and regenerate HTML locally - SIMPLIFIED
    const handleRefreshMarkdown = useCallback(() => {
        // Reset markdown to original
        setCurrentMarkdown(initialMarkdown);
        
        // Convert to HTML using utility
        const newHtml = convertMarkdownToHtml(initialMarkdown);
        setGeneratedHtmlContent(newHtml);
        
        // Clear all edit states
        setIsMarkdownDirty(false);
        setIsHtmlDirty(false);
        setEditedCompleteHtmlInternal("");
        
        // Note: Does NOT update database - user must click Regenerate to publish
    }, [initialMarkdown]);

    // Wrapper to generate complete HTML with current state
    const generateCompleteHTMLWithState = useCallback(() => {
        return generateCompleteHTML({
            bodyContent: generatedHtmlContent,
            css: wordPressCSS,
        });
    }, [generatedHtmlContent, wordPressCSS]);

    // Get current HTML content
    const getCurrentHtmlContent = useCallback(() => {
        return editedCompleteHtml || generateCompleteHTMLWithState();
    }, [editedCompleteHtml, generateCompleteHTMLWithState]);

    // No need for wrapper functions - use utilities directly

    // Get current preview URL
    const getCurrentPreviewUrl = useCallback((): string | null => {
        return publishedPageUrl;
    }, [publishedPageUrl]);

    // SEO helpers are now imported from utilities

    // Copy handlers
    const handleCopyHtml = useCallback(async () => {
        const currentCompleteHtml = getCurrentHtmlContent();
        const bodyContent = extractBodyContentWithFallback(currentCompleteHtml);
        await copyToClipboard(bodyContent, {
            onSuccess: () => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            },
            onError: (err) => console.error("Failed to copy HTML:", err),
        });
    }, [getCurrentHtmlContent, extractBodyContentWithFallback]);

    const handleCopyHtmlNoBullets = useCallback(async () => {
        const currentCompleteHtml = getCurrentHtmlContent();
        const bodyContent = extractBodyContentWithFallback(currentCompleteHtml);
        const noBulletsHtml = stripBulletStyles(bodyContent);
        await copyToClipboard(noBulletsHtml, {
            onSuccess: () => {
                setCopiedNoBullets(true);
                setTimeout(() => setCopiedNoBullets(false), 2000);
            },
            onError: (err) => console.error("Failed to copy HTML without bullet styles:", err),
        });
    }, [getCurrentHtmlContent, extractBodyContentWithFallback]);

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
        const bodyContent = extractBodyContentWithFallback(currentCompleteHtml);
        const customHTML = applyCustomOptions(bodyContent, {
            includeBulletStyles,
            includeDecorativeLineBreaks,
        });
        await copyToClipboard(customHTML, {
            onSuccess: () => {
                setCopiedCustom(true);
                setTimeout(() => setCopiedCustom(false), 2000);
            },
            onError: (err) => console.error("Failed to copy custom HTML:", err),
        });
    }, [getCurrentHtmlContent, extractBodyContentWithFallback, includeBulletStyles, includeDecorativeLineBreaks]);

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
            // Also regenerate HTML from the markdown using utility
            const newHtml = convertMarkdownToHtml(markdownContent);
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
            const completeHtml = generateCompleteHTMLWithState();
            setEditedCompleteHtmlInternal(completeHtml);
        }
    }, [isOpen, generatedHtmlContent, wordPressCSS, generateCompleteHTMLWithState]);

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

        // Utilities - using imported utilities from html-preview-utils
        generateCompleteHTML: generateCompleteHTMLWithState,
        getCurrentHtmlContent,
        getCurrentPreviewUrl,
        extractBodyContent: extractBodyContentWithFallback,
        stripBulletStyles,  // imported
        stripDecorativeLineBreaks,  // imported
        applyCustomOptions: (html: string) => applyCustomOptions(html, { includeBulletStyles, includeDecorativeLineBreaks }),
        extractTitleFromHTML,  // imported
        extractDescriptionFromHTML,  // imported
        getCharacterCountStatus,  // imported
        getSEORecommendation,  // imported
        clearError,
    };
}
