"use client";

import React, { useState, useRef, useEffect } from "react";
import { X, Copy, CheckCircle2, Eye, FileCode, Globe, Settings } from "lucide-react";

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
    const [activeTab, setActiveTab] = useState<"preview" | "html" | "css" | "complete" | "custom">("preview");
    const [wordPressCSS, setWordPressCSS] = useState<string>("");
    
    // Custom copy options
    const [includeBulletStyles, setIncludeBulletStyles] = useState(true);
    const [includeDecorativeLineBreaks, setIncludeDecorativeLineBreaks] = useState(true);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const cssTextareaRef = useRef<HTMLTextAreaElement>(null);
    const completeTextareaRef = useRef<HTMLTextAreaElement>(null);

    // Load WordPress CSS for accurate preview
    useEffect(() => {
        const loadWordPressCSS = async () => {
            try {
                const response = await fetch("/components/matrx/buttons/matrx-wordpress-styles-example.css");
                if (response.ok) {
                    const cssContent = await response.text();
                    setWordPressCSS(cssContent);
                } else {
                    // Fallback: Inline the essential styles
                    setWordPressCSS(getInlineWordPressCSS());
                }
            } catch (error) {
                console.warn("Could not load WordPress CSS file, using inline styles");
                setWordPressCSS(getInlineWordPressCSS());
            }
        };

        if (isOpen) {
            loadWordPressCSS();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    // Fallback CSS function with essential WordPress styles
    const getInlineWordPressCSS = () => `
/* 
 * MATRX WordPress CSS - Production Ready
 * Use this CSS in your WordPress theme to style MATRX content
 * All styles are scoped to .matrx-content-container to avoid conflicts
 */

/* Content Container */
.matrx-content-container {
    width: 100%;
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
    text-decoration-color: #d1d5db;
    text-underline-offset: 3px;
    transition: all 0.2s ease;
}

.matrx-link:hover {
    color: #1f2937;
    text-decoration-color: #9ca3af;
}

/* Lists */
.matrx-list {
    margin: 1.5rem 0;
    padding-left: 0;
}

.matrx-bullet-list {
    list-style: none;
}

.matrx-list-item {
    margin-bottom: 1rem;
    padding-left: 1.5rem;
    position: relative;
    color: #4a4a4a;
}

.matrx-list-item::before {
    content: "•";
    color: #6b7280;
    font-weight: bold;
    position: absolute;
    left: 0;
    top: 0;
    font-size: 1.2rem;
}

/* Code */
.matrx-content-container .matrx-inline-code {
  background-color: #f5f5f5;
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
  font-family: "Monaco", "Menlo", "Ubuntu Mono", monospace;
  font-size: 0.875rem;
  color: #d73a49;
}

.matrx-content-container .matrx-code-block {
  background-color: #f8f8f8;
  border: 1px solid #e1e1e1;
  border-radius: 0.375rem;
  padding: 1rem;
  margin: 1.5rem 0;
  overflow-x: auto;
}

.matrx-content-container .matrx-code {
  font-family: "Monaco", "Menlo", "Ubuntu Mono", monospace;
  font-size: 0.875rem;
  line-height: 1.5;
  color: #333;
}

/* Blockquotes */
.matrx-content-container .matrx-blockquote {
  border-left: 4px solid #e1e1e1;
  padding-left: 1rem;
  margin: 1.5rem 0;
  font-style: italic;
  color: #666;
}

/* Tables */
.matrx-content-container .matrx-table {
  width: 100%;
  border-collapse: collapse;
  margin: 1.5rem 0;
  border: 1px solid #e1e1e1;
}

.matrx-content-container .matrx-table-header {
  background-color: #f8f9fa;
  font-weight: 600;
  padding: 0.75rem;
  border: 1px solid #e1e1e1;
  text-align: left;
}

.matrx-content-container .matrx-table-cell {
  padding: 0.75rem;
  border: 1px solid #e1e1e1;
}

.matrx-content-container .matrx-table-row:nth-child(even) {
  background-color: #f8f9fa;
}

/* Images */
.matrx-content-container .matrx-image {
  max-width: 100%;
  height: auto;
  border-radius: 0.375rem;
  margin: 1rem 0;
}

/* Horizontal Rules */
.matrx-content-container .matrx-hr {
  border: none;
  border-top: 1px solid #e1e1e1;
  margin: 2rem 0;
}

/* FAQ Styles - Clean Design */
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

/* Code Blocks */
.matrx-inline-code {
    background-color: #f5f5f5;
    padding: 0.125rem 0.25rem;
    border-radius: 0.25rem;
    font-family: "Monaco", "Menlo", "Ubuntu Mono", monospace;
    font-size: 0.875rem;
    color: #d73a49;
}

.matrx-code-block {
    background-color: #f8f8f8;
    border: 1px solid #e1e1e1;
    border-radius: 0.375rem;
    padding: 1rem;
    margin: 1.5rem 0;
    overflow-x: auto;
}

.matrx-code {
    font-family: "Monaco", "Menlo", "Ubuntu Mono", monospace;
    font-size: 0.875rem;
    line-height: 1.5;
    color: #333;
}

/* Blockquotes */
.matrx-blockquote {
    border-left: 4px solid #e1e1e1;
    padding-left: 1rem;
    margin: 1.5rem 0;
    font-style: italic;
    color: #666;
}

/* Tables */
.matrx-table {
    width: 100%;
    border-collapse: collapse;
    margin: 1.5rem 0;
    border: 1px solid #e1e1e1;
    color: #333333;
}

.matrx-table-head {
    background-color: #f8f9fa;
}

.matrx-table-body {
    background-color: #ffffff;
}

.matrx-table-header {
    background-color: #f8f9fa;
    font-weight: 600;
    padding: 0.75rem;
    border: 1px solid #e1e1e1;
    text-align: left;
    color: #333333;
}

.matrx-table-cell {
    padding: 0.75rem;
    border: 1px solid #e1e1e1;
    color: #333333;
}

.matrx-table-row {
    color: #333333;
}

.matrx-table-row:nth-child(even) {
    background-color: #f8f9fa;
}

/* Ensure table content doesn't inherit external colors */
.matrx-table * {
    color: inherit;
}

/* Images */
.matrx-image {
    max-width: 100%;
    height: auto;
    border-radius: 0.375rem;
    margin: 1rem 0;
}

/* Horizontal Rules */
.matrx-hr {
    border: none;
    border-top: 1px solid #e1e1e1;
    margin: 2rem 0;
}

/* Utility Classes */
.matrx-div {
    margin: 0.5rem 0;
}

.matrx-span {
    /* Inherit parent styling by default */
}

/* Responsive Design */
@media (max-width: 768px) {
    .matrx-content-container {
        padding: 1rem;
    }

    .matrx-h1 {
        font-size: 2rem;
    }

    .matrx-h2 {
        font-size: 1.5rem;
        margin: 2rem 0 1rem 0 !important;
    }

    .matrx-h3 {
        font-size: 1.2rem;
    }

    .matrx-h4 {
        font-size: 1.05rem;
    }

    .matrx-h5 {
        font-size: 0.95rem;
    }

    .matrx-h6 {
        font-size: 0.9rem;
    }

    .matrx-intro {
        padding: 1rem;
        font-size: 1rem;
    }

    .matrx-faq-question {
        font-size: 1.1rem;
        margin: 1.5rem 0 0.75rem 0;
    }

    .matrx-paragraph {
        text-align: left;
    }

    .matrx-table {
        font-size: 0.875rem;
    }

    .matrx-table-header,
    .matrx-table-cell {
        padding: 0.5rem;
    }

    .matrx-code-block {
        padding: 0.75rem;
        margin: 1rem 0;
    }
}

@media (max-width: 480px) {
    .matrx-content-container {
        padding: 0.75rem;
    }

    .matrx-h1 {
        font-size: 1.75rem;
        margin-bottom: 1rem;
    }

    .matrx-h2 {
        font-size: 1.3rem;
        margin: 1.5rem 0 0.75rem 0 !important;
    }

    .matrx-h3 {
        font-size: 1.1rem;
        margin: 1.5rem 0 0.75rem 0;
    }

    .matrx-h4 {
        font-size: 1rem;
        margin: 1.25rem 0 0.5rem 0;
    }

    .matrx-h5 {
        font-size: 0.9rem;
        margin: 1rem 0 0.5rem 0;
    }

    .matrx-h6 {
        font-size: 0.85rem;
        margin: 1rem 0 0.5rem 0;
    }

    .matrx-intro {
        padding: 0.75rem;
        margin-bottom: 1.5rem;
    }

    .matrx-paragraph {
        margin-bottom: 1.25rem;
    }

    .matrx-list-item {
        margin-bottom: 0.75rem;
    }

    .matrx-table-header,
    .matrx-table-cell {
        padding: 0.375rem;
    }

    .matrx-code-block {
        padding: 0.5rem;
        font-size: 0.8rem;
    }

    .matrx-inline-code {
        font-size: 0.8rem;
    }
}`;

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
        try {
            await navigator.clipboard.writeText(htmlContent);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy HTML:", err);
        }
    };

    const handleCopyHtmlNoBullets = async () => {
        try {
            const noBulletsHtml = stripBulletStyles(htmlContent);
            await navigator.clipboard.writeText(noBulletsHtml);
            setCopiedNoBullets(true);
            setTimeout(() => setCopiedNoBullets(false), 2000);
        } catch (err) {
            console.error("Failed to copy HTML without bullet styles:", err);
        }
    };

    const handleCopyCSS = async () => {
        try {
            await navigator.clipboard.writeText(wordPressCSS);
            setCopiedCSS(true);
            setTimeout(() => setCopiedCSS(false), 2000);
        } catch (err) {
            console.error("Failed to copy CSS:", err);
        }
    };

    const handleCopyComplete = async () => {
        try {
            const completeHTML = generateCompleteHTML();
            await navigator.clipboard.writeText(completeHTML);
            setCopiedComplete(true);
            setTimeout(() => setCopiedComplete(false), 2000);
        } catch (err) {
            console.error("Failed to copy complete HTML:", err);
        }
    };

    const handleCopyCustom = async () => {
        try {
            const customHTML = applyCustomOptions(htmlContent);
            await navigator.clipboard.writeText(customHTML);
            setCopiedCustom(true);
            setTimeout(() => setCopiedCustom(false), 2000);
        } catch (err) {
            console.error("Failed to copy custom HTML:", err);
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
