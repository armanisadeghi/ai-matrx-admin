"use client";
import { useState } from "react";
import { copyToClipboard } from "./markdown-copy-utils";
import { Copy, CheckCircle2, FileText, FileType2 } from "lucide-react";
import { FcGoogle } from "react-icons/fc";

/**
 * Simple Copy Button Component
 */
export function SimpleCopyButton({ content, label = "Copy", className = "" }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        const success = await copyToClipboard(content, {
            onSuccess: () => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            },
        });
    };

    return (
        <button
            onClick={handleCopy}
            className={`flex items-center gap-2 px-3 py-1.5 rounded bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 ${className}`}
        >
            {copied ? (
                <>
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>Copied!</span>
                </>
            ) : (
                <>
                    <Copy className="w-4 h-4" />
                    <span>{label}</span>
                </>
            )}
        </button>
    );
}

/**
 * Markdown Format Copy Button
 */
export function MarkdownCopyButton({ content, className = "" }) {
    const [copied, setCopied] = useState(false);
    const [showOptions, setShowOptions] = useState(false);

    const handleRegularCopy = async () => {
        const success = await copyToClipboard(content, {
            isMarkdown: true,
            formatForGoogleDocs: false,
            onSuccess: () => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            },
        });
        setShowOptions(false);
    };

    const handleGoogleDocsCopy = async () => {
        const success = await copyToClipboard(content, {
            isMarkdown: true,
            formatForGoogleDocs: true,
            onSuccess: () => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            },
        });
        setShowOptions(false);
    };

    return (
        <div className={`relative ${className}`}>
            {copied ? (
                <button className="flex items-center gap-2 px-3 py-1.5 rounded bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Copied!</span>
                </button>
            ) : (
                <>
                    <button
                        onClick={() => setShowOptions(!showOptions)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
                    >
                        <Copy className="w-4 h-4" />
                        <span>Copy</span>
                    </button>

                    {showOptions && (
                        <div className="absolute top-full mt-1 min-w-48 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg z-30">
                            <button
                                onClick={handleRegularCopy}
                                className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center"
                            >
                                <FileText className="h-4 w-4 mr-2" />
                                Plain Text
                            </button>
                            <button
                                onClick={handleGoogleDocsCopy}
                                className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center"
                            >
                                <FcGoogle className="h-4 w-4 mr-2" />
                                Google Docs
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

/**
 * Inline Copy Button (similar to your original component but using utilities)
 */
export function InlineCopyButton({
    content,
    position = "top-right",
    size = "sm",
    className = "",
    tooltipText = "Copy to clipboard",
    isMarkdown = false,
}) {
    const [copied, setCopied] = useState(false);
    const [showTooltip, setShowTooltip] = useState(false);
    const [showOptions, setShowOptions] = useState(false);

    // Size mapping
    const sizeClasses = {
        xs: "h-4 w-4",
        sm: "h-5 w-5",
        md: "h-6 w-6",
        lg: "h-7 w-7",
        xl: "h-8 w-8",
    };

    // Position mapping
    const positionClasses = {
        "top-right": "absolute top-1 right-1",
        "top-left": "absolute top-1 left-1",
        "bottom-right": "absolute bottom-1 right-1",
        "bottom-left": "absolute bottom-1 left-1",
    };

    const handleMouseEnter = () => {
        setShowTooltip(true);
    };

    const handleMouseLeave = () => {
        setShowTooltip(false);
    };

    const handleButtonClick = () => {
        if (isMarkdown) {
            setShowOptions(!showOptions);
        } else {
            handleRegularCopy();
        }
    };

    const handleRegularCopy = async () => {
        await copyToClipboard(content, {
            isMarkdown,
            formatForGoogleDocs: false,
            onSuccess: () => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            },
        });
        setShowOptions(false);
    };

    const handleGoogleDocsCopy = async () => {
        await copyToClipboard(content, {
            isMarkdown,
            formatForGoogleDocs: true,
            onSuccess: () => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            },
        });
        setShowOptions(false);
    };

    return (
        <div
            className={`${positionClasses[position]} ${className} inline-flex z-10`}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <button
                onClick={handleButtonClick}
                className="bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 p-1 rounded-md transition-colors duration-200 z-10"
                aria-label={tooltipText}
            >
                {copied ? (
                    <CheckCircle2 className={`${sizeClasses[size]} text-green-500`} />
                ) : (
                    <Copy
                        className={`${sizeClasses[size]} text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200`}
                    />
                )}
            </button>

            {showTooltip && !copied && !showOptions && (
                <div className="absolute top-full mt-1 right-0 bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-20">
                    {tooltipText}
                </div>
            )}

            {copied && showTooltip && (
                <div className="absolute top-full mt-1 right-0 bg-green-600 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-20">
                    Copied!
                </div>
            )}

            {showOptions && isMarkdown && (
                <div className="absolute top-full mt-1 min-w-48 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg z-30">
                    <button
                        onClick={handleRegularCopy}
                        className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center"
                    >
                        <FileText className="h-4 w-4 mr-2" />
                        Plain Text
                    </button>
                    <button
                        onClick={handleGoogleDocsCopy}
                        className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center"
                    >
                        <FcGoogle className="h-4 w-4 mr-2" />
                        Google Docs
                    </button>
                </div>
            )}
        </div>
    );
}
