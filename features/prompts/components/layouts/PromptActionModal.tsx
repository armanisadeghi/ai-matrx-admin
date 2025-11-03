"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Play, Pencil, X, Eye, Copy, Share2, Trash2, Loader2 } from "lucide-react";
import { useState } from "react";

interface PromptActionModalProps {
    isOpen: boolean;
    onClose: () => void;
    promptName: string;
    promptDescription?: string;
    onRun: () => void;
    onEdit: () => void;
    // Optional additional actions
    onView?: () => void;
    onDuplicate?: () => void;
    onShare?: () => void;
    onDelete?: () => void;
    // Control which actions are shown
    showView?: boolean;
    showDuplicate?: boolean;
    showShare?: boolean;
    showDelete?: boolean;
    // External loading states
    isDeleting?: boolean;
    isDuplicating?: boolean;
}

export function PromptActionModal({ 
    isOpen, 
    onClose, 
    promptName,
    promptDescription,
    onRun, 
    onEdit,
    onView,
    onDuplicate,
    onShare,
    onDelete,
    showView = true,
    showDuplicate = true,
    showShare = true,
    showDelete = true,
    isDeleting = false,
    isDuplicating = false,
}: PromptActionModalProps) {
    const [activeAction, setActiveAction] = useState<string | null>(null);

    const handleAction = async (actionName: string, actionFn: () => void) => {
        setActiveAction(actionName);
        try {
            await actionFn();
            // Don't close for share action, close for others after a brief delay
            if (actionName !== 'share') {
                setTimeout(() => {
                    onClose();
                    setActiveAction(null);
                }, 100);
            } else {
                setActiveAction(null);
            }
        } catch (error) {
            console.error(`Error executing ${actionName}:`, error);
            setActiveAction(null);
        }
    };

    const isAnyActionActive = activeAction !== null || isDeleting || isDuplicating;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            if (!open && !isAnyActionActive) {
                onClose();
            }
        }}>
            <DialogContent className="sm:max-w-md max-h-[100dvh] overflow-y-auto bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-950 border-slate-200 dark:border-slate-700">
                <DialogHeader>
                    <DialogTitle className="text-xl sm:text-2xl font-bold text-center text-gray-900 dark:text-gray-100 mb-2">
                        {promptName || "Untitled Prompt"}
                    </DialogTitle>
                    {promptDescription && (
                        <DialogDescription className="text-center text-gray-600 dark:text-gray-400 pt-2 text-sm">
                            {promptDescription}
                        </DialogDescription>
                    )}
                </DialogHeader>
                
                <div className="space-y-3 sm:space-y-4 py-4 sm:py-6">
                    {/* Run Prompt Option */}
                    <button
                        onClick={() => handleAction('run', onRun)}
                        disabled={isAnyActionActive}
                        className={`w-full group relative overflow-hidden rounded-lg border-2 border-blue-200 dark:border-blue-800 transition-all duration-300 ${
                            isAnyActionActive 
                                ? 'opacity-50 cursor-not-allowed' 
                                : 'hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-xl hover:scale-[1.02]'
                        }`}
                    >
                        {activeAction === 'run' && (
                            <div className="absolute inset-0 bg-blue-500/20 dark:bg-blue-600/30 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
                                <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
                            </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 dark:from-blue-600/20 dark:to-purple-600/20 group-hover:from-blue-500/20 group-hover:to-purple-500/20 transition-all duration-300" />
                        <div className="relative p-4 sm:p-6 md:p-8 flex flex-col items-center">
                            <div className="mb-3 sm:mb-4 p-3 sm:p-4 bg-blue-500 dark:bg-blue-600 rounded-full group-hover:bg-blue-600 dark:group-hover:bg-blue-700 transition-colors duration-300 group-hover:scale-110 transform">
                                <Play className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                            </div>
                            <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 mb-1 sm:mb-2">
                                Run Prompt
                            </h3>
                            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 text-center">
                                Execute this prompt with AI models
                            </p>
                        </div>
                    </button>

                    {/* Edit Prompt Option */}
                    <button
                        onClick={() => handleAction('edit', onEdit)}
                        disabled={isAnyActionActive}
                        className={`w-full group relative overflow-hidden rounded-lg border-2 border-purple-200 dark:border-purple-800 transition-all duration-300 ${
                            isAnyActionActive 
                                ? 'opacity-50 cursor-not-allowed' 
                                : 'hover:border-purple-400 dark:hover:border-purple-600 hover:shadow-xl hover:scale-[1.02]'
                        }`}
                    >
                        {activeAction === 'edit' && (
                            <div className="absolute inset-0 bg-purple-500/20 dark:bg-purple-600/30 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
                                <Loader2 className="w-8 h-8 text-purple-600 dark:text-purple-400 animate-spin" />
                            </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 dark:from-purple-600/20 dark:to-pink-600/20 group-hover:from-purple-500/20 group-hover:to-pink-500/20 transition-all duration-300" />
                        <div className="relative p-4 sm:p-6 md:p-8 flex flex-col items-center">
                            <div className="mb-3 sm:mb-4 p-3 sm:p-4 bg-purple-500 dark:bg-purple-600 rounded-full group-hover:bg-purple-600 dark:group-hover:bg-purple-700 transition-colors duration-300 group-hover:scale-110 transform">
                                <Pencil className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                            </div>
                            <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 mb-1 sm:mb-2">
                                Edit Prompt
                            </h3>
                            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 text-center">
                                Modify messages, settings, and variables
                            </p>
                        </div>
                    </button>
                </div>

                {/* Additional Actions */}
                {(showView || showDuplicate || showShare || showDelete) && (
                    <div className="border-t border-slate-200 dark:border-slate-700 pt-3 sm:pt-4">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 sm:mb-3 text-center font-medium uppercase tracking-wider">
                            Additional Actions
                        </p>
                        <div className="grid grid-cols-2 gap-2 sm:gap-2">
                            {showView && onView && (
                                <Button
                                    variant="outline"
                                    onClick={() => handleAction('view', onView)}
                                    disabled={isAnyActionActive}
                                    className="flex items-center justify-start gap-1.5 sm:gap-2 h-auto py-2.5 sm:py-3 px-3 sm:px-4 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 relative"
                                >
                                    {activeAction === 'view' && (
                                        <div className="absolute inset-0 bg-slate-500/20 dark:bg-slate-600/30 backdrop-blur-sm flex items-center justify-center rounded-md">
                                            <Loader2 className="w-4 h-4 text-slate-600 dark:text-slate-400 animate-spin" />
                                        </div>
                                    )}
                                    <Eye className="w-4 h-4 flex-shrink-0" />
                                    <span className="text-xs sm:text-sm font-medium">View</span>
                                </Button>
                            )}
                            
                            {showDuplicate && onDuplicate && (
                                <Button
                                    variant="outline"
                                    onClick={() => handleAction('duplicate', onDuplicate)}
                                    disabled={isAnyActionActive}
                                    className="flex items-center justify-start gap-1.5 sm:gap-2 h-auto py-2.5 sm:py-3 px-3 sm:px-4 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 relative"
                                >
                                    {(activeAction === 'duplicate' || isDuplicating) && (
                                        <div className="absolute inset-0 bg-slate-500/20 dark:bg-slate-600/30 backdrop-blur-sm flex items-center justify-center rounded-md">
                                            <Loader2 className="w-4 h-4 text-slate-600 dark:text-slate-400 animate-spin" />
                                        </div>
                                    )}
                                    <Copy className="w-4 h-4 flex-shrink-0" />
                                    <span className="text-xs sm:text-sm font-medium">Duplicate</span>
                                </Button>
                            )}
                            
                            {showShare && onShare && (
                                <Button
                                    variant="outline"
                                    onClick={() => handleAction('share', onShare)}
                                    disabled={isAnyActionActive}
                                    className="flex items-center justify-start gap-1.5 sm:gap-2 h-auto py-2.5 sm:py-3 px-3 sm:px-4 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                                >
                                    <Share2 className="w-4 h-4 flex-shrink-0" />
                                    <span className="text-xs sm:text-sm font-medium">Share</span>
                                </Button>
                            )}
                            
                            {showDelete && onDelete && (
                                <Button
                                    variant="outline"
                                    onClick={() => handleAction('delete', onDelete)}
                                    disabled={isAnyActionActive}
                                    className="flex items-center justify-start gap-1.5 sm:gap-2 h-auto py-2.5 sm:py-3 px-3 sm:px-4 border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 relative"
                                >
                                    {(activeAction === 'delete' || isDeleting) && (
                                        <div className="absolute inset-0 bg-red-500/20 dark:bg-red-600/30 backdrop-blur-sm flex items-center justify-center rounded-md">
                                            <Loader2 className="w-4 h-4 text-red-600 dark:text-red-400 animate-spin" />
                                        </div>
                                    )}
                                    <Trash2 className="w-4 h-4 flex-shrink-0" />
                                    <span className="text-xs sm:text-sm font-medium">Delete</span>
                                </Button>
                            )}
                        </div>
                    </div>
                )}

                <Button
                    variant="ghost"
                    onClick={onClose}
                    disabled={isAnyActionActive}
                    className="w-full mt-2 py-2 sm:py-2.5"
                >
                    <X className="w-4 h-4 mr-2" />
                    <span className="text-sm">Cancel</span>
                </Button>
            </DialogContent>
        </Dialog>
    );
}

