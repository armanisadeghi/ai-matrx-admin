"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Play, Pencil, X, Eye, Copy, Share2, Trash2, Loader2, AppWindow } from "lucide-react";

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
    onCreateApp?: () => void;
    // Control which actions are shown
    showView?: boolean;
    showDuplicate?: boolean;
    showShare?: boolean;
    showDelete?: boolean;
    showCreateApp?: boolean;
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
    onCreateApp,
    showView = true,
    showDuplicate = true,
    showShare = true,
    showDelete = true,
    showCreateApp = true,
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
            <DialogContent className="sm:max-w-md max-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-2rem)] my-4 overflow-y-auto bg-gradient-to-br from-card to-muted border-border">
                <DialogHeader>
                    <DialogTitle className="text-xl sm:text-2xl font-bold text-center text-foreground mb-2">
                        {promptName || "Untitled Prompt"}
                    </DialogTitle>
                    {promptDescription && (
                        <DialogDescription className="text-center text-muted-foreground pt-2 text-sm line-clamp-2">
                            {promptDescription}
                        </DialogDescription>
                    )}
                </DialogHeader>
                
                <div className="space-y-2 sm:space-y-3 py-2 sm:py-4">
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
                        <div className="relative p-3 sm:p-5 md:p-6 flex flex-col items-center">
                            <div className="mb-2 sm:mb-3 p-2 sm:p-3 bg-primary rounded-full group-hover:bg-primary/90 transition-colors duration-300 group-hover:scale-110 transform">
                                <Play className="w-5 h-5 sm:w-7 sm:h-7 text-primary-foreground" />
                            </div>
                            <h3 className="text-base sm:text-lg font-bold text-foreground mb-1">
                                Run Prompt
                            </h3>
                        </div>
                    </button>

                    {/* Edit Prompt Option */}
                    <button
                        onClick={(e) => handleAction(e, 'edit', onEdit)}
                        disabled={isAnyActionActive}
                        className={`w-full group relative overflow-hidden rounded-lg border-2 border-primary/30 transition-all duration-300 ${
                            isAnyActionActive 
                                ? 'opacity-50 cursor-not-allowed' 
                                : 'hover:border-secondary/70 hover:shadow-xl hover:scale-[1.02]'
                        }`}
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-secondary/10 to-accent/10 group-hover:from-secondary/20 group-hover:to-accent/20 transition-all duration-300" />
                        <div className="relative p-3 sm:p-5 md:p-6 flex flex-col items-center">
                            <div className="mb-2 sm:mb-3 p-2 sm:p-3 bg-secondary rounded-full group-hover:bg-secondary/90 transition-colors duration-300 group-hover:scale-110 transform">
                                <Pencil className="w-5 h-5 sm:w-7 sm:h-7 text-secondary-foreground" />
                            </div>
                            <h3 className="text-base sm:text-lg font-bold text-foreground mb-1">
                                Edit Prompt
                            </h3>
                        </div>
                    </button>

                    {/* Create App Option */}
                    {showCreateApp && onCreateApp && (
                        <button
                            onClick={(e) => handleAction(e, 'create-app', onCreateApp)}
                            disabled={isAnyActionActive}
                            className={`w-full group relative overflow-hidden rounded-lg border-2 border-accent/30 transition-all duration-300 ${
                                isAnyActionActive 
                                    ? 'opacity-50 cursor-not-allowed' 
                                    : 'hover:border-accent/70 hover:shadow-xl hover:scale-[1.02]'
                            }`}
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-accent/10 to-primary/10 group-hover:from-accent/20 group-hover:to-primary/20 transition-all duration-300" />
                            <div className="relative p-3 sm:p-5 md:p-6 flex flex-col items-center">
                                <div className="mb-2 sm:mb-3 p-2 sm:p-3 bg-accent rounded-full group-hover:bg-accent/90 transition-colors duration-300 group-hover:scale-110 transform">
                                    <AppWindow className="w-5 h-5 sm:w-7 sm:h-7 text-accent-foreground" />
                                </div>
                                <h3 className="text-base sm:text-lg font-bold text-foreground mb-1">
                                    Create App
                                </h3>
                                <p className="text-xs sm:text-sm text-muted-foreground">
                                    Turn into shareable web app
                                </p>
                            </div>
                        </button>
                    )}
                </div>

                {/* Additional Actions */}
                {(showView || showDuplicate || showShare || showDelete) && (
                    <div className="border-t border-border pt-2 sm:pt-3">
                        <div className="grid grid-cols-2 gap-2">
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
            </DialogContent>
        </Dialog>
    );
}

