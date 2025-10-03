/**
 * Types for HTML Preview components
 */

export interface HtmlPreviewState {
    // Copy states
    copied: boolean;
    copiedNoBullets: boolean;
    copiedCSS: boolean;
    copiedComplete: boolean;
    copiedCustom: boolean;
    copiedUrl: boolean;
    
    // Markdown content (source of truth)
    initialMarkdown: string;
    currentMarkdown: string;
    
    // HTML content (generated from markdown)
    generatedHtmlContent: string;
    editedCompleteHtml: string;
    wordPressCSS: string;
    
    // Source of truth tracking
    isMarkdownDirty: boolean;  // True when markdown is edited
    isHtmlDirty: boolean;      // True when HTML is directly edited
    
    // Custom copy options
    includeBulletStyles: boolean;
    includeDecorativeLineBreaks: boolean;
    
    // Save page states
    savedPage: any;
    publishedPageUrl: string | null;  // Single URL for the published page
    pageTitle: string;
    pageDescription: string;
    metaTitle: string;
    metaDescription: string;
    metaKeywords: string;
    ogImage: string;
    canonicalUrl: string;
    showAdvancedMeta: boolean;
    
    // HTML Pages system
    isCreating: boolean;
    error: string | null;
}

export interface HtmlPreviewActions {
    // Copy state setters
    setCopied: (value: boolean) => void;
    setCopiedNoBullets: (value: boolean) => void;
    setCopiedCSS: (value: boolean) => void;
    setCopiedComplete: (value: boolean) => void;
    setCopiedCustom: (value: boolean) => void;
    setCopiedUrl: (value: boolean) => void;
    
    // Markdown content setters
    setCurrentMarkdown: (value: string) => void;
    
    // HTML content setters
    setEditedCompleteHtml: (value: string) => void;
    setGeneratedHtmlContent: (value: string) => void;
    
    // Custom copy options setters
    setIncludeBulletStyles: (value: boolean) => void;
    setIncludeDecorativeLineBreaks: (value: boolean) => void;
    
    // Save page setters
    setSavedPage: (value: any) => void;
    setPublishedPageUrl: (value: string | null) => void;  // Single setter for URL
    setPageTitle: (value: string) => void;
    setPageDescription: (value: string) => void;
    setMetaTitle: (value: string) => void;
    setMetaDescription: (value: string) => void;
    setMetaKeywords: (value: string) => void;
    setOgImage: (value: string) => void;
    setCanonicalUrl: (value: string) => void;
    setShowAdvancedMeta: (value: boolean) => void;
    
    // Actions
    handleCopyHtml: () => Promise<void>;
    handleCopyHtmlNoBullets: () => Promise<void>;
    handleCopyCSS: () => Promise<void>;
    handleCopyComplete: () => Promise<void>;
    handleCopyCustom: () => Promise<void>;
    handleCopyUrl: (url: string) => Promise<void>;
    handleSavePage: () => Promise<void>;
    handleRegenerateHtml: (useMetadata?: boolean) => Promise<void>;
    handleRefreshMarkdown: () => void;
    
    // Utility functions
    generateCompleteHTML: () => string;
    getCurrentHtmlContent: () => string;
    getCurrentPreviewUrl: () => string | null;
    extractBodyContent: (completeHtml: string) => string;
    stripBulletStyles: (html: string) => string;
    stripDecorativeLineBreaks: (html: string) => string;
    applyCustomOptions: (html: string) => string;
    extractTitleFromHTML: (htmlContent: string) => string;
    extractDescriptionFromHTML: (htmlContent: string) => string;
    getCharacterCountStatus: (text: string, ideal: number, max: number) => { status: string; color: string };
    getSEORecommendation: (text: string, field: string) => string;
    
    // Error handling
    clearError: () => void;
}

export interface HtmlPreviewHookProps {
    markdownContent: string;
    htmlContent?: string;
    user: any;
    isOpen?: boolean;
    publishedPageId?: string | null;  // ID of the published page (persists across edits)
    onPageIdChange?: (pageId: string) => void;  // Callback when page ID is created
    resetKey?: number;  // Optional key to trigger complete state reset (e.g., for new tasks)
}

export interface HtmlPreviewTabProps {
    state: HtmlPreviewState;
    actions: HtmlPreviewActions;
    user?: any;
}

export interface MarkdownTabProps {
    state: HtmlPreviewState;
    actions: HtmlPreviewActions;
    activeTab?: string;
    analysisData?: any;
    messageId?: string;
}

