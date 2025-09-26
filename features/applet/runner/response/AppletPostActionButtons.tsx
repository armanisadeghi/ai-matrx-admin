"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Edit3, Sparkles, Share2, Copy, ChevronDown, Code } from "lucide-react";
import { copyToClipboard } from "@/components/matrx/buttons/markdown-copy-utils";
import { FcGoogle } from "react-icons/fc";
import { FaMicrosoft } from "react-icons/fa";
import { FileText } from "lucide-react";
import ReviseCommentsModal from "./ReviseCommentsModal";
import HtmlPreviewModal from "@/components/matrx/buttons/HtmlPreviewModal";

interface AppletPostActionButtonsProps {
    appletId: string;
    taskId: string;
    className?: string;
    content?: string;
    data?: any;
}

export default function AppletPostActionButtons({ appletId, taskId, className = "", content = "", data = {} }: AppletPostActionButtonsProps) {
    const router = useRouter();
    const [showReviseModal, setShowReviseModal] = useState(false);
    const [reviseComments, setReviseComments] = useState("");
    const [showCopyOptions, setShowCopyOptions] = useState(false);
    const [copied, setCopied] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState("below");
    const [showHtmlModal, setShowHtmlModal] = useState(false);
    const [htmlContent, setHtmlContent] = useState("");
    const [htmlTitle, setHtmlTitle] = useState("");
    const copyButtonRef = useRef<HTMLButtonElement>(null);
    const [routePath, setRoutePath] = useState("/chat/");
    

    useEffect(() => {
        if (data[0].conversation_id) {
            setRoutePath(`/chat/${data[0].conversation_id}`);
        }
    }, [data]);



    // Check viewport constraints when showing copy options
    useEffect(() => {
        if (showCopyOptions && copyButtonRef.current) {
            const rect = copyButtonRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            // If space below is less than 150px, show dropdown above
            if (spaceBelow < 150) {
                setDropdownPosition("above");
            } else {
                setDropdownPosition("below");
            }
        }
    }, [showCopyOptions]);

    const handleImproveInChat = () => {
        router.push(routePath);
    };

    const handleReviseSubmit = (action: string, value?: string) => {
        // TODO: Implement revise functionality
        console.log("Revise action:", action, "Value:", value);
    };

    const handlePlaceholderAction = (action: string) => {
        // TODO: Implement placeholder actions
        console.log(`${action} clicked`);
    };

    const handleCopySuccess = () => {
        setCopied(true);
        setShowCopyOptions(false);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleCopyPlainText = async () => {
        await copyToClipboard(content, {
            isMarkdown: true,
            formatForGoogleDocs: false,
            onSuccess: handleCopySuccess,
        });
    };

    const handleCopyGoogleDocs = async () => {
        await copyToClipboard(content, {
            isMarkdown: true,
            formatForGoogleDocs: true,
            onSuccess: handleCopySuccess,
        });
    };

    const handleCopyMicrosoftWord = async () => {
        // Microsoft Word uses the same HTML format as Google Docs
        await copyToClipboard(content, {
            isMarkdown: true,
            formatForGoogleDocs: true,
            onSuccess: handleCopySuccess,
        });
    };

    const handleHtmlPreview = async () => {
        await copyToClipboard(content, {
            isMarkdown: true,
            formatForWordPress: true,
            showHtmlPreview: true,
            onShowHtmlPreview: (html) => {
                setHtmlContent(html);
                setHtmlTitle("HTML Preview");
                setShowHtmlModal(true);
            },
            onSuccess: () => {
                setShowCopyOptions(false);
            }
        });
    };

    return (
        <>
            {/* Mobile-first responsive layout */}
            <div className={`flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-3 sm:justify-end mt-6 ${className}`}>
                
                {/* Mobile: Primary action first and full width */}
                <button
                    onClick={handleImproveInChat}
                    className="flex items-center justify-center gap-2 w-full sm:w-auto px-4 sm:px-4 py-3 sm:py-2.5 bg-indigo-500 hover:bg-indigo-600 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white rounded-lg transition-all duration-200 font-medium shadow-sm hover:shadow-md text-base sm:text-sm order-1 sm:order-5"
                >
                    <MessageSquare size={20} className="sm:w-[18px] sm:h-[18px]" />
                    Improve in Chat
                </button>

                {/* Mobile: Secondary actions in a grid */}
                <div className="grid grid-cols-2 gap-2 sm:contents order-2 sm:order-1">
                    {/* Share Button */}
                    <button
                        onClick={() => handlePlaceholderAction("Share")}
                        className="flex items-center justify-center gap-2 px-3 sm:px-4 py-3 sm:py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-all duration-200 font-medium shadow-sm hover:shadow-md border border-slate-200 dark:border-slate-600 text-sm"
                    >
                        <Share2 size={18} className="sm:w-[18px] sm:h-[18px]" />
                        <span className="hidden sm:inline">Share</span>
                    </button>

                    {/* Copy Button with Dropdown */}
                    <div className="relative">
                        <button
                            ref={copyButtonRef}
                            onClick={() => setShowCopyOptions(!showCopyOptions)}
                            disabled={!content}
                            className="flex items-center justify-center gap-2 w-full px-3 sm:px-4 py-3 sm:py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-all duration-200 font-medium shadow-sm hover:shadow-md border border-slate-200 dark:border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                            <Copy size={18} className="sm:w-[18px] sm:h-[18px]" />
                            <span className="hidden sm:inline">{copied ? "Copied!" : "Copy"}</span>
                            {!copied && <ChevronDown size={14} className="hidden sm:inline" />}
                        </button>
                        
                        {/* Copy Options Dropdown - Mobile optimized */}
                        {showCopyOptions && content && (
                            <div 
                                className={`absolute ${
                                    dropdownPosition === "above" 
                                        ? "bottom-full mb-1" 
                                        : "top-full mt-1"
                                } w-full sm:min-w-48 sm:w-auto right-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-30`}
                            >
                                <button
                                    onClick={handleCopyPlainText}
                                    className="block w-full text-left px-4 py-3 sm:py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center first:rounded-t-lg"
                                >
                                    <FileText className="h-4 w-4 mr-3" />
                                    Plain Text
                                </button>
                                <button
                                    onClick={handleCopyGoogleDocs}
                                    className="block w-full text-left px-4 py-3 sm:py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center border-t border-slate-100 dark:border-slate-600"
                                >
                                    <FcGoogle className="h-4 w-4 mr-3" />
                                    Google Docs
                                </button>
                                <button
                                    onClick={handleCopyMicrosoftWord}
                                    className="block w-full text-left px-4 py-3 sm:py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center border-t border-slate-100 dark:border-slate-600"
                                >
                                    <FaMicrosoft className="h-4 w-4 mr-3 text-blue-500" />
                                    Microsoft Word
                                </button>
                                <button
                                    onClick={handleHtmlPreview}
                                    className="block w-full text-left px-4 py-3 sm:py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center border-t border-slate-100 dark:border-slate-600 last:rounded-b-lg"
                                >
                                    <Code className="h-4 w-4 mr-3 text-green-600" />
                                    HTML
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Mobile: Full-width secondary actions */}
                <div className="flex gap-2 order-3 sm:order-2 sm:contents">
                    {/* Enhance Button */}
                    <button
                        onClick={() => handlePlaceholderAction("Enhance")}
                        className="flex items-center justify-center gap-2 flex-1 sm:flex-none sm:w-auto px-3 sm:px-4 py-3 sm:py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-all duration-200 font-medium shadow-sm hover:shadow-md border border-slate-200 dark:border-slate-600 text-sm"
                    >
                        <Sparkles size={18} className="sm:w-[18px] sm:h-[18px]" />
                        <span className="hidden sm:inline">Enhance</span>
                    </button>

                    {/* Revise with Comments Button */}
                    <button
                        onClick={() => setShowReviseModal(true)}
                        className="flex items-center justify-center gap-2 flex-1 sm:flex-none sm:w-auto px-3 sm:px-4 py-3 sm:py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-all duration-200 font-medium shadow-sm hover:shadow-md border border-slate-200 dark:border-slate-600 text-sm"
                    >
                        <Edit3 size={18} className="sm:w-[18px] sm:h-[18px]" />
                        <span className="hidden sm:inline">Revise</span>
                        <span className="hidden md:inline">with Comments</span>
                    </button>
                </div>
            </div>

            {/* Close dropdown when clicking outside */}
            {showCopyOptions && (
                <div 
                    className="fixed inset-0 z-20" 
                    onClick={() => setShowCopyOptions(false)}
                />
            )}

            {/* Revise Comments Modal */}
            <ReviseCommentsModal
                appletId={appletId}
                taskId={taskId}
                className={className}
                content={content}
                data={data}
                showReviseModal={showReviseModal}
                setShowReviseModal={setShowReviseModal}
                reviseComments={reviseComments}
                setReviseComments={setReviseComments}
                onSubmit={handleReviseSubmit}
            />

            {/* HTML Preview Modal */}
            <HtmlPreviewModal
                isOpen={showHtmlModal}
                onClose={() => setShowHtmlModal(false)}
                htmlContent={htmlContent}
                title={htmlTitle}
            />
        </>
    );
}
