"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Play, Pencil, X, Eye, Copy, Share2, Trash2, Loader2 } from "lucide-react";

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
    const handleAction = (e: React.MouseEvent, actionName: string, actionFn: () => void) => {
        e.stopPropagation();
        e.preventDefault();
        // Execute action immediately
        actionFn();
        // Close modal for navigation actions (run, edit, view)
        // Keep open for share action to allow ShareModal to open
        if (actionName !== 'share') {
            onClose();
        }
    };

    const isAnyActionActive = isDeleting || isDuplicating;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md max-h-[100dvh] overflow-y-auto bg-gradient-to-br from-card to-muted border-border">
                <DialogHeader>
                    <DialogTitle className="text-xl sm:text-2xl font-bold text-center text-foreground mb-2">
                        {promptName || "Untitled Prompt"}
                    </DialogTitle>
                    {promptDescription && (
                        <DialogDescription className="text-center text-muted-foreground pt-2 text-sm">
                            {promptDescription}
                        </DialogDescription>
                    )}
                </DialogHeader>
                
                <div className="space-y-3 sm:space-y-4 py-4 sm:py-6">
                    {/* Run Prompt Option */}
                    <button
                        onClick={(e) => handleAction(e, 'run', onRun)}
                        disabled={isAnyActionActive}
                        className={`w-full group relative overflow-hidden rounded-lg border-2 border-primary/30 transition-all duration-300 ${
                            isAnyActionActive 
                                ? 'opacity-50 cursor-not-allowed' 
                                : 'hover:border-primary/50 hover:shadow-xl hover:scale-[1.02]'
                        }`}
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-secondary/10 group-hover:from-primary/20 group-hover:to-secondary/20 transition-all duration-300" />
                        <div className="relative p-4 sm:p-6 md:p-8 flex flex-col items-center">
                            <div className="mb-3 sm:mb-4 p-3 sm:p-4 bg-primary rounded-full group-hover:bg-primary/90 transition-colors duration-300 group-hover:scale-110 transform">
                                <Play className="w-6 h-6 sm:w-8 sm:h-8 text-primary-foreground" />
                            </div>
                            <h3 className="text-lg sm:text-xl font-bold text-foreground mb-1 sm:mb-2">
                                Run Prompt
                            </h3>
                            <p className="text-xs sm:text-sm text-muted-foreground text-center">
                                Execute this prompt with AI models
                            </p>
                        </div>
                    </button>

                    {/* Edit Prompt Option */}
                    <button
                        onClick={(e) => handleAction(e, 'edit', onEdit)}
                        disabled={isAnyActionActive}
                        className={`w-full group relative overflow-hidden rounded-lg border-2 border-secondary/30 transition-all duration-300 ${
                            isAnyActionActive 
                                ? 'opacity-50 cursor-not-allowed' 
                                : 'hover:border-secondary/50 hover:shadow-xl hover:scale-[1.02]'
                        }`}
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-secondary/10 to-accent/10 group-hover:from-secondary/20 group-hover:to-accent/20 transition-all duration-300" />
                        <div className="relative p-4 sm:p-6 md:p-8 flex flex-col items-center">
                            <div className="mb-3 sm:mb-4 p-3 sm:p-4 bg-secondary rounded-full group-hover:bg-secondary/90 transition-colors duration-300 group-hover:scale-110 transform">
                                <Pencil className="w-6 h-6 sm:w-8 sm:h-8 text-secondary-foreground" />
                            </div>
                            <h3 className="text-lg sm:text-xl font-bold text-foreground mb-1 sm:mb-2">
                                Edit Prompt
                            </h3>
                            <p className="text-xs sm:text-sm text-muted-foreground text-center">
                                Modify messages, settings, and variables
                            </p>
                        </div>
                    </button>
                </div>

                {/* Additional Actions */}
                {(showView || showDuplicate || showShare || showDelete) && (
                    <div className="border-t border-border pt-3 sm:pt-4">
                        <p className="text-xs text-muted-foreground mb-2 sm:mb-3 text-center font-medium uppercase tracking-wider">
                            Additional Actions
                        </p>
                        <div className="grid grid-cols-2 gap-2 sm:gap-2">
                            {showView && onView && (
                                <Button
                                    variant="outline"
                                    onClick={(e) => handleAction(e, 'view', onView)}
                                    disabled={isAnyActionActive}
                                    className="flex items-center justify-start gap-1.5 sm:gap-2 h-auto py-2.5 sm:py-3 px-3 sm:px-4 border-border hover:bg-accent"
                                >
                                    <Eye className="w-4 h-4 flex-shrink-0" />
                                    <span className="text-xs sm:text-sm font-medium">View</span>
                                </Button>
                            )}
                            
                            {showDuplicate && onDuplicate && (
                                <Button
                                    variant="outline"
                                    onClick={(e) => handleAction(e, 'duplicate', onDuplicate)}
                                    disabled={isAnyActionActive}
                                    className="flex items-center justify-start gap-1.5 sm:gap-2 h-auto py-2.5 sm:py-3 px-3 sm:px-4 border-border hover:bg-accent relative"
                                >
                                    {isDuplicating && (
                                        <div className="absolute inset-0 bg-muted/50 backdrop-blur-sm flex items-center justify-center rounded-md">
                                            <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
                                        </div>
                                    )}
                                    <Copy className="w-4 h-4 flex-shrink-0" />
                                    <span className="text-xs sm:text-sm font-medium">Duplicate</span>
                                </Button>
                            )}
                            
                            {showShare && onShare && (
                                <Button
                                    variant="outline"
                                    onClick={(e) => handleAction(e, 'share', onShare)}
                                    disabled={isAnyActionActive}
                                    className="flex items-center justify-start gap-1.5 sm:gap-2 h-auto py-2.5 sm:py-3 px-3 sm:px-4 border-border hover:bg-accent"
                                >
                                    <Share2 className="w-4 h-4 flex-shrink-0" />
                                    <span className="text-xs sm:text-sm font-medium">Share</span>
                                </Button>
                            )}
                            
                            {showDelete && onDelete && (
                                <Button
                                    variant="outline"
                                    onClick={(e) => handleAction(e, 'delete', onDelete)}
                                    disabled={isAnyActionActive}
                                    className="flex items-center justify-start gap-1.5 sm:gap-2 h-auto py-2.5 sm:py-3 px-3 sm:px-4 border-destructive/30 text-destructive hover:bg-destructive/10 relative"
                                >
                                    {isDeleting && (
                                        <div className="absolute inset-0 bg-destructive/20 backdrop-blur-sm flex items-center justify-center rounded-md">
                                            <Loader2 className="w-4 h-4 text-destructive animate-spin" />
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
                    onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        onClose();
                    }}
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

