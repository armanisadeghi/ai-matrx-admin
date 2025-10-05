"use client";

import React, { useState, useEffect } from "react";
import { Save, ExternalLink, Copy, CheckCircle2, RotateCcw, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PreviewPlaceholder } from "../PreviewPlaceholder";
import type { HtmlPreviewTabProps } from "../testTypes";

export function SavePageTab({ state, actions, user }: HtmlPreviewTabProps) {
    const previewUrl = actions.getCurrentPreviewUrl();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [refreshSuccess, setRefreshSuccess] = useState(false);
    const [iframeKey, setIframeKey] = useState(0); // Force iframe refresh

    // Refresh iframe when saved page changes (indicates a successful update)
    useEffect(() => {
        if (state.savedPage) {
            setIframeKey(prev => prev + 1);
        }
    }, [state.savedPage]);

    // Manual refresh handler - extracts metadata FROM current content.html (read-only, safe)
    const handleRefreshMetadata = () => {
        setIsRefreshing(true);
        setRefreshSuccess(false);
        
        // Small delay to show the loading state
        setTimeout(() => {
            actions.extractMetadataFromContent();
            setIsRefreshing(false);
            setRefreshSuccess(true);
            setTimeout(() => setRefreshSuccess(false), 2000);
        }, 150);
    };

    return (
        <div className="h-full flex gap-2 p-4">
            {/* Left side - Metadata Form */}
            <div className="w-1/3 flex flex-col space-y-4 overflow-y-auto pr-4 pl-2">
                {/* Current URL Display */}
                {previewUrl && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                        <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                            CURRENT PAGE URL
                        </div>
                        <div className="flex items-center gap-2">
                            <a
                                href={previewUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 text-sm text-blue-600 dark:text-blue-400 hover:underline truncate"
                            >
                                {previewUrl}
                            </a>
                            <button
                                onClick={() => actions.handleCopyUrl(previewUrl)}
                                className="p-2 hover:bg-blue-100 dark:hover:bg-blue-800 rounded transition-colors"
                                title="Copy URL"
                            >
                                {state.copiedUrl ? (
                                    <CheckCircle2 size={16} className="text-green-600 dark:text-green-400" />
                                ) : (
                                    <Copy size={16} className="text-blue-600 dark:text-blue-400" />
                                )}
                            </button>
                            <a
                                href={previewUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 hover:bg-blue-100 dark:hover:bg-blue-800 rounded transition-colors"
                                title="Open in new tab"
                            >
                                <ExternalLink size={16} className="text-blue-600 dark:text-blue-400" />
                            </a>
                        </div>
                    </div>
                )}

                {/* User Info */}
                {user && (
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                        Logged in as <strong>{user.email}</strong>
                    </div>
                )}

                {!user && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3">
                        <div className="text-yellow-800 dark:text-yellow-300 text-sm">
                            <strong>Note:</strong> You must be logged in to publish pages.
                        </div>
                    </div>
                )}

                {/* Metadata Actions Bar */}
                <div className="flex items-center gap-2 py-2 border-b border-gray-200 dark:border-gray-700">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={handleRefreshMetadata}
                                    disabled={isRefreshing}
                                    className={`p-2 rounded-lg transition-all ${
                                        refreshSuccess
                                            ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                                            : isRefreshing
                                            ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 cursor-wait"
                                            : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                                    }`}
                                    title="Refresh metadata from current HTML"
                                >
                                    {refreshSuccess ? (
                                        <CheckCircle2 className="h-4 w-4" />
                                    ) : (
                                        <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                                    )}
                                </button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>
                                    {refreshSuccess
                                        ? "Metadata updated!"
                                        : isRefreshing
                                        ? "Extracting metadata..."
                                        : "Extract title & description from current HTML"}
                                </p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    <span className={`text-xs transition-colors ${
                        refreshSuccess
                            ? "text-green-600 dark:text-green-400"
                            : "text-gray-500 dark:text-gray-400"
                    }`}>
                        {refreshSuccess ? "Metadata refreshed!" : "Quick Actions"}
                    </span>
                </div>

                {/* Basic Metadata */}
                <div className="space-y-4">
                    {/* Page Title */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Page Title *
                        </label>
                        <input
                            type="text"
                            value={state.metadata.title}
                            onChange={(e) => {
                                actions.setMetadataField('title', e.target.value);
                                actions.setMetadataField('metaTitle', e.target.value);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder:text-gray-400 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            placeholder="Enter page title"
                            disabled={!user}
                        />
                        <div className="flex justify-between items-center mt-1">
                            <span className={`text-xs ${actions.getCharacterCountStatus(state.metadata.title, 50, 60).color}`}>
                                {state.metadata.title.length}/60 characters
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                {actions.getSEORecommendation(state.metadata.title, 'title')}
                            </span>
                        </div>
                    </div>
                    
                    {/* Page Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 placeholder:text-gray-400">
                            Description
                        </label>
                        <textarea
                            value={state.metadata.description}
                            onChange={(e) => {
                                actions.setMetadataField('description', e.target.value);
                                actions.setMetadataField('metaDescription', e.target.value);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder:text-gray-400 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                            placeholder="Brief description for SEO"
                            rows={3}
                            disabled={!user}
                        />
                        <div className="flex justify-between items-center mt-1">
                            <span className={`text-xs ${actions.getCharacterCountStatus(state.metadata.description, 140, 160).color}`}>
                                {state.metadata.description.length}/160 characters
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                {actions.getSEORecommendation(state.metadata.description, 'description')}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Additional SEO Fields */}
                <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                    {/* Meta Keywords */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Meta Keywords
                        </label>
                        <input
                            type="text"
                            value={state.metadata.metaKeywords}
                            onChange={(e) => actions.setMetadataField('metaKeywords', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder:text-gray-400 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            placeholder="keyword1, keyword2, keyword3"
                            disabled={!user}
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Comma-separated (less important for modern SEO)
                        </p>
                    </div>

                    {/* OG Image */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Social Share Image URL
                        </label>
                        <input
                            type="url"
                            value={state.metadata.ogImage}
                            onChange={(e) => actions.setMetadataField('ogImage', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder:text-gray-400 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            placeholder="https://example.com/image.jpg"
                            disabled={!user}
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            1200x630px recommended
                        </p>
                    </div>

                    {/* Canonical URL */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Canonical URL
                        </label>
                        <input
                            type="url"
                            value={state.metadata.canonicalUrl}
                            onChange={(e) => actions.setMetadataField('canonicalUrl', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder:text-gray-400 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            placeholder="https://example.com/canonical-page"
                            disabled={!user}
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Preferred URL (prevents duplicate content)
                        </p>
                    </div>
                </div>

                {/* Error Display */}
                {state.error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3">
                        <div className="text-red-600 dark:text-red-400 text-sm">
                            <strong>Error:</strong> {state.error}
                        </div>
                    </div>
                )}

                {/* Publish Button */}
                <div className="pt-2">
                    <button
                        onClick={actions.handleSavePage}
                        disabled={state.isCreating || !state.metadata.title.trim() || !user}
                        className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                            state.isCreating || !state.metadata.title.trim() || !user
                                ? "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                                : "bg-blue-600 hover:bg-blue-700 text-white"
                        }`}
                    >
                        <Save size={18} />
                        {previewUrl ? "Update Page" : "Generate Page"}
                    </button>
                    <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-2">
                        {previewUrl ? "Update page with current content and metadata" : "Create page with metadata"}
                    </p>
                </div>

                {/* Success Message */}
                {state.savedPage && (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-3">
                        <div className="text-green-800 dark:text-green-300 text-sm text-center">
                            ✓ Metadata saved successfully!
                        </div>
                    </div>
                )}
            </div>

            {/* Right side - Live Preview */}
            <div className="flex-1 flex flex-col">
                <div className="flex justify-between items-center mb-3">
                    <h5 className="font-medium text-gray-800 dark:text-gray-300">
                        Live Preview
                    </h5>
                    
                    {/* Preview Controls */}
                    <div className="flex gap-2">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        onClick={() => {
                                            actions.handleRefreshMarkdown();
                                            setTimeout(() => setIframeKey(prev => prev + 1), 500);
                                        }}
                                        variant="outline"
                                        size="sm"
                                        className="h-8 px-3"
                                        disabled={!previewUrl}
                                    >
                                        <RotateCcw className="h-4 w-4 mr-2" />
                                        Reset
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{previewUrl ? "Reset to original content" : "Generate a page first"}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>

                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        onClick={async () => {
                                            await actions.handleRegenerateHtml();
                                            setTimeout(() => setIframeKey(prev => prev + 1), 500);
                                        }}
                                        variant={(previewUrl && (state.isMarkdownDirty || state.isContentDirty)) ? "default" : "outline"}
                                        size="sm"
                                        className="h-8 px-3"
                                        disabled={!previewUrl || (!state.isMarkdownDirty && !state.isContentDirty)}
                                    >
                                        <RefreshCw className="h-4 w-4 mr-2" />
                                        Regenerate
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>
                                        {!previewUrl ? "Generate a page first" :
                                         state.isMarkdownDirty ? "Update preview from edited markdown" : 
                                         state.isContentDirty ? "Update preview from edited content.html" : 
                                         "Content is up to date"}
                                    </p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </div>
                
                <div className="flex-1 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-950">
                    {previewUrl ? (
                        <iframe
                            key={iframeKey}
                            src={`${previewUrl}?t=${iframeKey}`}
                            className="w-full h-full"
                            title="Page Preview"
                            sandbox="allow-same-origin"
                        />
                    ) : (
                        <PreviewPlaceholder isLoading={state.isCreating} />
                    )}
                </div>
            </div>
        </div>
    );
}

