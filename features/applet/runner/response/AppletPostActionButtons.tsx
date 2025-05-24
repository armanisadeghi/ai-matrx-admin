"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Edit3, Sparkles, Share2, Copy, ChevronDown } from "lucide-react";
import { copyToClipboard } from "../../../../components/matrx/buttons/markdown-copy-utils";
import { FcGoogle } from "react-icons/fc";
import { FaMicrosoft } from "react-icons/fa";
import { FileText } from "lucide-react";

interface AppletPostActionButtonsProps {
    appletId: string;
    className?: string;
    content?: string;
}

export default function AppletPostActionButtons({ appletId, className = "", content = "" }: AppletPostActionButtonsProps) {
    const router = useRouter();
    const [showReviseModal, setShowReviseModal] = useState(false);
    const [reviseComments, setReviseComments] = useState("");
    const [showCopyOptions, setShowCopyOptions] = useState(false);
    const [copied, setCopied] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState("below");
    const copyButtonRef = useRef<HTMLButtonElement>(null);
    
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
        router.push("/chat/");
    };

    const handleReviseSubmit = () => {
        // TODO: Implement revise functionality
        console.log("Revise comments:", reviseComments);
        setShowReviseModal(false);
        setReviseComments("");
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

    return (
        <>
            <div className={`flex flex-wrap gap-3 justify-end mt-6 ${className}`}>
                {/* Share Button */}
                <button
                    onClick={() => handlePlaceholderAction("Share")}
                    className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-all duration-200 font-medium shadow-sm hover:shadow-md border border-slate-200 dark:border-slate-600"
                >
                    <Share2 size={18} />
                    Share
                </button>

                {/* Copy Button with Dropdown */}
                <div className="relative">
                    <button
                        ref={copyButtonRef}
                        onClick={() => setShowCopyOptions(!showCopyOptions)}
                        disabled={!content}
                        className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-all duration-200 font-medium shadow-sm hover:shadow-md border border-slate-200 dark:border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Copy size={18} />
                        {copied ? "Copied!" : "Copy"}
                        {!copied && <ChevronDown size={14} />}
                    </button>
                    
                    {/* Copy Options Dropdown */}
                    {showCopyOptions && content && (
                        <div 
                            className={`absolute ${
                                dropdownPosition === "above" 
                                    ? "bottom-full mb-1" 
                                    : "top-full mt-1"
                            } min-w-48 right-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-30`}
                        >
                            <button
                                onClick={handleCopyPlainText}
                                className="block w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center first:rounded-t-lg"
                            >
                                <FileText className="h-4 w-4 mr-3" />
                                Plain Text
                            </button>
                            <button
                                onClick={handleCopyGoogleDocs}
                                className="block w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center border-t border-slate-100 dark:border-slate-600"
                            >
                                <FcGoogle className="h-4 w-4 mr-3" />
                                Google Docs
                            </button>
                            <button
                                onClick={handleCopyMicrosoftWord}
                                className="block w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center border-t border-slate-100 dark:border-slate-600 last:rounded-b-lg"
                            >
                                <FaMicrosoft className="h-4 w-4 mr-3 text-blue-500" />
                                Microsoft Word
                            </button>
                        </div>
                    )}
                </div>

                {/* Enhance Button */}
                <button
                    onClick={() => handlePlaceholderAction("Enhance")}
                    className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-all duration-200 font-medium shadow-sm hover:shadow-md border border-slate-200 dark:border-slate-600"
                >
                    <Sparkles size={18} />
                    Enhance
                </button>

                {/* Revise with Comments Button */}
                <button
                    onClick={() => setShowReviseModal(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-all duration-200 font-medium shadow-sm hover:shadow-md border border-slate-200 dark:border-slate-600"
                >
                    <Edit3 size={18} />
                    Revise with Comments
                </button>
                
                {/* Improve in Chat Button - Primary Action */}
                <button
                    onClick={handleImproveInChat}
                    className="flex items-center gap-2 px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white rounded-lg transition-all duration-200 font-medium shadow-sm hover:shadow-md"
                >
                    <MessageSquare size={18} />
                    Improve in Chat
                </button>
            </div>

            {/* Close dropdown when clicking outside */}
            {showCopyOptions && (
                <div 
                    className="fixed inset-0 z-20" 
                    onClick={() => setShowCopyOptions(false)}
                />
            )}

            {/* Revise Comments Modal */}
            {showReviseModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden border border-slate-100 dark:border-slate-700">
                        <div className="p-6">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Revise with Comments</h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                                Provide specific feedback or suggestions for improvement:
                            </p>
                            <textarea
                                value={reviseComments}
                                onChange={(e) => setReviseComments(e.target.value)}
                                placeholder="Enter your comments and suggestions here..."
                                className="w-full h-32 p-3 border border-slate-300 dark:border-slate-600 rounded-lg resize-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all duration-200 bg-white dark:bg-slate-800/50 text-slate-800 dark:text-slate-200 placeholder-slate-500 dark:placeholder-slate-400"
                                autoFocus
                            />
                        </div>
                        <div className="flex justify-end gap-3 px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-600">
                            <button
                                onClick={() => {
                                    setShowReviseModal(false);
                                    setReviseComments("");
                                }}
                                className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all duration-200"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleReviseSubmit}
                                disabled={!reviseComments.trim()}
                                className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 dark:bg-indigo-500 dark:hover:bg-indigo-600 disabled:bg-slate-400 dark:disabled:bg-slate-600 text-white rounded-lg transition-all duration-200 disabled:cursor-not-allowed font-medium shadow-sm hover:shadow"
                            >
                                Submit
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
