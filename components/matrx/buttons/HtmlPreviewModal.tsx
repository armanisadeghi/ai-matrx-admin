"use client";

import React, { useState, useRef, useEffect } from "react";
import { X, Copy, CheckCircle2, Eye, FileCode, Globe, Settings, Save, ExternalLink, Loader2 } from "lucide-react";
import { useHTMLPages } from "@/features/html-pages/hooks/useHTMLPages";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectUser } from "@/lib/redux/selectors/userSelectors";
import { copyToClipboard, removeThinkingContent } from "./markdown-copy-utils";
import { getWordPressCSS, loadWordPressCSS } from "./css/wordpress-styles";

interface HtmlPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    htmlContent: string;
    title?: string;
}

export default function HtmlPreviewModal({ isOpen, onClose, htmlContent, title = "HTML Preview" }: HtmlPreviewModalProps) {
    const [copied, setCopied] = useState(false);
    const [copiedNoBullets, setCopiedNoBullets] = useState(false);
    const [copiedCSS, setCopiedCSS] = useState(false);
    const [copiedComplete, setCopiedComplete] = useState(false);
    const [copiedCustom, setCopiedCustom] = useState(false);
    const [activeTab, setActiveTab] = useState<"preview" | "html" | "css" | "complete" | "custom" | "save">("preview");
    const [wordPressCSS, setWordPressCSS] = useState<string>("");
    
    // Custom copy options
    const [includeBulletStyles, setIncludeBulletStyles] = useState(true);
    const [includeDecorativeLineBreaks, setIncludeDecorativeLineBreaks] = useState(true);
    
    // HTML Pages system
    const user = useAppSelector(selectUser);
    const { createHTMLPage, isCreating, error, clearError } = useHTMLPages(user?.id);
    const [savedPage, setSavedPage] = useState<any>(null);
    const [pageTitle, setPageTitle] = useState<string>("");
    const [pageDescription, setPageDescription] = useState<string>("");
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const cssTextareaRef = useRef<HTMLTextAreaElement>(null);
    const completeTextareaRef = useRef<HTMLTextAreaElement>(null);

    // Load WordPress CSS for accurate preview
    useEffect(() => {
        const loadCSS = async () => {
            const cssContent = await loadWordPressCSS();
            setWordPressCSS(cssContent);
        };

        if (isOpen) {
            loadCSS();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    // Note: CSS now loaded from centralized source

    const stripBulletStyles = (html: string) => {
        return html.replace(/class="matrx-list-item"/g, '');
    };

    const stripDecorativeLineBreaks = (html: string) => {
        return html.replace(/<hr class="matrx-hr"[^>]*>/g, '');
    };

    const applyCustomOptions = (html: string) => {
        let processedHtml = html;
        
        if (!includeBulletStyles) {
            processedHtml = stripBulletStyles(processedHtml);
        }
        
        if (!includeDecorativeLineBreaks) {
            processedHtml = stripDecorativeLineBreaks(processedHtml);
        }
        
        return processedHtml;
    };

    const handleCopyHtml = async () => {
        await copyToClipboard(htmlContent, {
            onSuccess: () => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            },
            onError: (err) => console.error("Failed to copy HTML:", err)
        });
    };

    const handleCopyHtmlNoBullets = async () => {
        const noBulletsHtml = stripBulletStyles(htmlContent);
        await copyToClipboard(noBulletsHtml, {
            onSuccess: () => {
                setCopiedNoBullets(true);
                setTimeout(() => setCopiedNoBullets(false), 2000);
            },
            onError: (err) => console.error("Failed to copy HTML without bullet styles:", err)
        });
    };

    const handleCopyCSS = async () => {
        await copyToClipboard(wordPressCSS, {
            onSuccess: () => {
                setCopiedCSS(true);
                setTimeout(() => setCopiedCSS(false), 2000);
            },
            onError: (err) => console.error("Failed to copy CSS:", err)
        });
    };

    const handleCopyComplete = async () => {
        const completeHTML = generateCompleteHTML();
        await copyToClipboard(completeHTML, {
            onSuccess: () => {
                setCopiedComplete(true);
                setTimeout(() => setCopiedComplete(false), 2000);
            },
            onError: (err) => console.error("Failed to copy complete HTML:", err)
        });
    };

    const handleCopyCustom = async () => {
        const customHTML = applyCustomOptions(htmlContent);
        await copyToClipboard(customHTML, {
            onSuccess: () => {
                setCopiedCustom(true);
                setTimeout(() => setCopiedCustom(false), 2000);
            },
            onError: (err) => console.error("Failed to copy custom HTML:", err)
        });
    };

    // HTML Page save handlers
    const handleSavePage = async () => {
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
            
            // Generate complete HTML with thinking content filtered out
            const filteredContent = removeThinkingContent(htmlContent);
            const completeHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WordPress Content</title>
    <style>
${wordPressCSS}
    </style>
</head>
<body>
    ${filteredContent}
</body>
</html>`;
            
            const result = await createHTMLPage(completeHTML, pageTitle.trim(), pageDescription.trim());
            setSavedPage(result);
            
            // Clear form after successful save
            setPageTitle('');
            setPageDescription('');
            
            console.log('Page saved successfully:', result);
        } catch (err) {
            console.error('Save failed:', err);
            alert(`Save failed: ${err.message}`);
        }
    };

    const handleSelectAll = () => {
        if (textareaRef.current) {
            textareaRef.current.select();
            textareaRef.current.setSelectionRange(0, 99999); // For mobile devices
        }
    };

    const handleSelectAllCSS = () => {
        if (cssTextareaRef.current) {
            cssTextareaRef.current.select();
            cssTextareaRef.current.setSelectionRange(0, 99999); // For mobile devices
        }
    };

    const handleSelectAllComplete = () => {
        if (completeTextareaRef.current) {
            completeTextareaRef.current.select();
            completeTextareaRef.current.setSelectionRange(0, 99999); // For mobile devices
        }
    };

    const generateCompleteHTML = () => {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WordPress Content</title>
    <style>
${wordPressCSS}
    </style>
</head>
<body>
    ${htmlContent}
</body>
</html>`;
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-7xl w-full h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col min-h-0">
                    {/* Tabs */}
                    <div className="flex border-b border-gray-200 dark:border-gray-700">
                        <button
                            onClick={() => setActiveTab("preview")}
                            className={`px-4 py-2 text-sm font-medium transition-colors ${
                                activeTab === "preview"
                                    ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                            }`}
                        >
                            <Eye size={16} className="inline mr-1" />
                            Preview
                        </button>
                        <button
                            onClick={() => setActiveTab("html")}
                            className={`px-4 py-2 text-sm font-medium transition-colors ${
                                activeTab === "html"
                                    ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                            }`}
                        >
                            <Copy size={16} className="inline mr-1" />
                            HTML Code
                        </button>
                         <button
                             onClick={() => setActiveTab("css")}
                             className={`px-4 py-2 text-sm font-medium transition-colors ${
                                 activeTab === "css"
                                     ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                                     : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                             }`}
                         >
                             <FileCode size={16} className="inline mr-1" />
                             WordPress CSS
                         </button>
                         <button
                             onClick={() => setActiveTab("complete")}
                             className={`px-4 py-2 text-sm font-medium transition-colors ${
                                 activeTab === "complete"
                                     ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                                     : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                             }`}
                         >
                             <Globe size={16} className="inline mr-1" />
                             Complete HTML
                         </button>
                         <button
                             onClick={() => setActiveTab("custom")}
                             className={`px-4 py-2 text-sm font-medium transition-colors ${
                                 activeTab === "custom"
                                     ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                                     : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                             }`}
                         >
                             <Settings size={16} className="inline mr-1" />
                             Custom Copy
                         </button>
                         <button
                             onClick={() => setActiveTab("save")}
                             className={`px-4 py-2 text-sm font-medium transition-colors ${
                                 activeTab === "save"
                                     ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                                     : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                             }`}
                         >
                             <Save size={16} className="inline mr-1" />
                             Save Page
                         </button>
                    </div>

                    {/* Tab Content */}
                    <div className="flex-1 p-4 min-h-0">
                        {activeTab === "preview" ? (
                            // Preview Tab
                            <div className="h-full flex flex-col">
                                <div className="mb-3 flex justify-end gap-2">
                                    <button
                                        onClick={handleCopyHtml}
                                        className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded transition-colors ${
                                            copied
                                                ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                                                : "bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300"
                                        }`}
                                    >
                                        {copied ? (
                                            <>
                                                <CheckCircle2 size={16} />
                                                Copied!
                                            </>
                                        ) : (
                                            <>
                                                <Copy size={16} />
                                                Copy HTML
                                            </>
                                        )}
                                    </button>
                                    <button
                                        onClick={handleCopyHtmlNoBullets}
                                        className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded transition-colors ${
                                            copiedNoBullets
                                                ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                                                : "bg-orange-100 hover:bg-orange-200 dark:bg-orange-900 dark:hover:bg-orange-800 text-orange-700 dark:text-orange-300"
                                        }`}
                                    >
                                        {copiedNoBullets ? (
                                            <>
                                                <CheckCircle2 size={16} />
                                                Copied!
                                            </>
                                        ) : (
                                            <>
                                                <Copy size={16} />
                                                Copy HTML No Bullet Styles
                                            </>
                                        )}
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto overflow-x-auto border border-gray-300 dark:border-gray-600 rounded-md bg-white p-4">
                                    {/* Inject WordPress CSS for accurate preview */}
                                    <style dangerouslySetInnerHTML={{ __html: wordPressCSS }} />
                                    <div className="wordpress-preview-container" dangerouslySetInnerHTML={{ __html: htmlContent }} />
                                </div>
                            </div>
                        ) : activeTab === "html" ? (
                            // HTML Code Tab
                            <div className="h-full flex flex-col">
                                <div className="mb-3 flex gap-2 flex-wrap">
                                    <button
                                        onClick={handleSelectAll}
                                        className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded transition-colors"
                                    >
                                        Select All
                                    </button>
                                    <button
                                        onClick={handleCopyHtml}
                                        className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded transition-colors ${
                                            copied
                                                ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                                                : "bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300"
                                        }`}
                                    >
                                        {copied ? (
                                            <>
                                                <CheckCircle2 size={16} />
                                                Copied!
                                            </>
                                        ) : (
                                            <>
                                                <Copy size={16} />
                                                Copy HTML
                                            </>
                                        )}
                                    </button>
                                    <button
                                        onClick={handleCopyHtmlNoBullets}
                                        className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded transition-colors ${
                                            copiedNoBullets
                                                ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                                                : "bg-orange-100 hover:bg-orange-200 dark:bg-orange-900 dark:hover:bg-orange-800 text-orange-700 dark:text-orange-300"
                                        }`}
                                    >
                                        {copiedNoBullets ? (
                                            <>
                                                <CheckCircle2 size={16} />
                                                Copied!
                                            </>
                                        ) : (
                                            <>
                                                <Copy size={16} />
                                                Copy HTML No Bullet Styles
                                            </>
                                        )}
                                    </button>
                                </div>
                                <textarea
                                    ref={textareaRef}
                                    value={htmlContent}
                                    readOnly
                                    className="flex-1 w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent overflow-y-auto"
                                />
                            </div>
                        ) : activeTab === "css" ? (
                            // WordPress CSS Tab
                            <div className="h-full flex flex-col">
                                <div className="mb-3 flex justify-between items-center">
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                        Copy this CSS to your WordPress theme to style the HTML content
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleSelectAllCSS}
                                            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded transition-colors"
                                        >
                                            Select All
                                        </button>
                                        <button
                                            onClick={handleCopyCSS}
                                            className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded transition-colors ${
                                                copiedCSS
                                                    ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                                                    : "bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300"
                                            }`}
                                        >
                                            {copiedCSS ? (
                                                <>
                                                    <CheckCircle2 size={16} />
                                                    Copied!
                                                </>
                                            ) : (
                                                <>
                                                    <FileCode size={16} />
                                                    Copy CSS
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                                 <textarea
                                     ref={cssTextareaRef}
                                     value={wordPressCSS}
                                     readOnly
                                     className="flex-1 w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent overflow-y-auto"
                                     placeholder="Loading CSS..."
                                 />
                             </div>
                         ) : activeTab === "custom" ? (
                             // Custom Copy Tab
                             <div className="h-full flex flex-col justify-center items-center">
                                 <div className="max-w-md w-full space-y-6">
                                     <div className="text-center">
                                         <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Custom Copy Options</h3>
                                         <p className="text-sm text-gray-600 dark:text-gray-400">
                                             Select which elements to include in your copied HTML
                                         </p>
                                     </div>
                                     
                                     <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                                         <div className="space-y-4">
                                             <label className="flex items-center space-x-3 cursor-pointer">
                                                 <input
                                                     type="checkbox"
                                                     checked={includeBulletStyles}
                                                     onChange={(e) => setIncludeBulletStyles(e.target.checked)}
                                                     className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                                 />
                                                 <div className="flex-1">
                                                     <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                         Include Bullet Styles
                                                     </span>
                                                     <p className="text-xs text-gray-500 dark:text-gray-400">
                                                         Keep custom bullet point styling in lists
                                                     </p>
                                                 </div>
                                             </label>
                                             
                                             <label className="flex items-center space-x-3 cursor-pointer">
                                                 <input
                                                     type="checkbox"
                                                     checked={includeDecorativeLineBreaks}
                                                     onChange={(e) => setIncludeDecorativeLineBreaks(e.target.checked)}
                                                     className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                                 />
                                                 <div className="flex-1">
                                                     <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                         Include Decorative Line Breaks
                                                     </span>
                                                     <p className="text-xs text-gray-500 dark:text-gray-400">
                                                         Keep horizontal rule separators (hr elements)
                                                     </p>
                                                 </div>
                                             </label>
                                         </div>
                                     </div>
                                     
                                     <div className="text-center">
                                         <button
                                             onClick={handleCopyCustom}
                                             className={`inline-flex items-center gap-3 px-6 py-3 text-sm font-medium rounded-lg transition-colors ${
                                                 copiedCustom
                                                     ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                                                     : "bg-blue-600 hover:bg-blue-700 text-white"
                                             }`}
                                         >
                                             {copiedCustom ? (
                                                 <>
                                                     <CheckCircle2 size={18} />
                                                     Copied to Clipboard!
                                                 </>
                                             ) : (
                                                 <>
                                                     <Copy size={18} />
                                                     Copy Custom HTML
                                                 </>
                                             )}
                                         </button>
                                         
                                         {!includeBulletStyles && !includeDecorativeLineBreaks && (
                                             <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                                                 All styling options are disabled
                                             </p>
                                         )}
                                     </div>
                                 </div>
                             </div>
                         ) : activeTab === "save" ? (
                             // Save Page Tab
                             <div className="h-full flex flex-col">
                                 <div className="max-w-2xl mx-auto w-full space-y-6">
                                     <div className="text-center">
                                         <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Save HTML Page</h3>
                                         <p className="text-sm text-gray-600 dark:text-gray-400">
                                             Save your HTML page to the database and get a shareable URL
                                         </p>
                                     </div>

                                     {/* User Info */}
                                     {user && (
                                         <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                                             <div className="flex items-center gap-3">
                                                 <div className="text-blue-600 dark:text-blue-400 text-sm">
                                                     <strong>Logged in as:</strong> {user.email}
                                                 </div>
                                             </div>
                                         </div>
                                     )}

                                     {!user && (
                                         <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
                                             <div className="text-yellow-800 dark:text-yellow-300 text-sm">
                                                 <strong>Note:</strong> You must be logged in to save HTML pages.
                                             </div>
                                         </div>
                                     )}

                                     {/* Save Form */}
                                     <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 space-y-4">
                                         <div>
                                             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                 Page Title *
                                             </label>
                                             <input
                                                 type="text"
                                                 value={pageTitle}
                                                 onChange={(e) => setPageTitle(e.target.value)}
                                                 className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                 placeholder="Enter page title"
                                                 disabled={!user}
                                             />
                                         </div>
                                         
                                         <div>
                                             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                 Description (optional)
                                             </label>
                                             <input
                                                 type="text"
                                                 value={pageDescription}
                                                 onChange={(e) => setPageDescription(e.target.value)}
                                                 className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                 placeholder="Brief description (optional)"
                                                 disabled={!user}
                                             />
                                         </div>
                                     </div>

                                     {/* Error Display */}
                                     {error && (
                                         <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
                                             <div className="flex items-start gap-3">
                                                 <div className="text-red-600 dark:text-red-400 text-sm">
                                                     <strong>Error:</strong> {error}
                                                 </div>
                                             </div>
                                         </div>
                                     )}

                                     {/* Save Button */}
                                     <div className="text-center">
                                         <button
                                             onClick={handleSavePage}
                                             disabled={isCreating || !pageTitle.trim() || !user}
                                             className={`inline-flex items-center gap-3 px-6 py-3 text-sm font-medium rounded-lg transition-colors ${
                                                 isCreating || !pageTitle.trim() || !user
                                                     ? "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                                                     : "bg-green-600 hover:bg-green-700 text-white"
                                             }`}
                                         >
                                             {isCreating ? (
                                                 <>
                                                     <Loader2 size={18} className="animate-spin" />
                                                     Saving...
                                                 </>
                                             ) : (
                                                 <>
                                                     <Save size={18} />
                                                     Save HTML Page
                                                 </>
                                             )}
                                         </button>
                                     </div>

                                     {/* Saved Page Display */}
                                     {savedPage && (
                                         <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-6 space-y-4">
                                             <div className="text-center">
                                                 <h4 className="font-semibold text-green-800 dark:text-green-300 mb-2">
                                                     Page Saved Successfully! 🎉
                                                 </h4>
                                                 <div className="space-y-2 text-sm">
                                                     <p className="text-green-700 dark:text-green-400">
                                                         <strong>Title:</strong> {savedPage.title}
                                                     </p>
                                                     <p className="text-green-700 dark:text-green-400">
                                                         <strong>Page ID:</strong> {savedPage.pageId}
                                                     </p>
                                                     <p className="text-green-700 dark:text-green-400">
                                                         <strong>URL:</strong> {savedPage.url}
                                                     </p>
                                                     <div className="flex justify-center gap-3 mt-4">
                                                         <a
                                                             href={savedPage.url}
                                                             target="_blank"
                                                             rel="noopener noreferrer"
                                                             className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors"
                                                         >
                                                             <ExternalLink size={16} />
                                                             View Live Page
                                                         </a>
                                                     </div>
                                                 </div>
                                             </div>
                                             
                                             {/* Preview iframe */}
                                             <div className="mt-6">
                                                 <h5 className="font-medium text-green-800 dark:text-green-300 mb-3 text-center">
                                                     Live Preview:
                                                 </h5>
                                                 <div className="border-2 border-green-200 dark:border-green-700 rounded-lg overflow-hidden">
                                                     <iframe
                                                         src={savedPage.url}
                                                         className="w-full h-96"
                                                         title={savedPage.title}
                                                         sandbox="allow-scripts allow-same-origin"
                                                     />
                                                 </div>
                                             </div>
                                         </div>
                                     )}
                                 </div>
                             </div>
                         ) : (
                             // Complete HTML Tab
                             <div className="h-full flex flex-col">
                                 <div className="mb-3 flex justify-between items-center">
                                     <div className="text-sm text-gray-600 dark:text-gray-400">
                                         Complete HTML page with embedded CSS - ready to save as .html file
                                     </div>
                                     <div className="flex gap-2">
                                         <button
                                             onClick={handleSelectAllComplete}
                                             className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded transition-colors"
                                         >
                                             Select All
                                         </button>
                                         <button
                                             onClick={handleCopyComplete}
                                             className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded transition-colors ${
                                                 copiedComplete
                                                     ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                                                     : "bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300"
                                             }`}
                                         >
                                             {copiedComplete ? (
                                                 <>
                                                     <CheckCircle2 size={16} />
                                                     Copied!
                                                 </>
                                             ) : (
                                                 <>
                                                     <Globe size={16} />
                                                     Copy Complete HTML
                                                 </>
                                             )}
                                         </button>
                                     </div>
                                 </div>
                                 <textarea
                                     ref={completeTextareaRef}
                                     value={generateCompleteHTML()}
                                     readOnly
                                     className="flex-1 w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent overflow-y-auto"
                                     placeholder="Loading complete HTML..."
                                 />
                             </div>
                         )}
                     </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-md transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
