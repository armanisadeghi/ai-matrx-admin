"use client";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Shield, Copy, Pencil, User, AlertTriangle } from "lucide-react";
import type { PermissionLevel } from "@/utils/permissions/types";

interface SharedPromptWarningModalProps {
    isOpen: boolean;
    onClose: () => void;
    ownerEmail: string | null;
    permissionLevel: PermissionLevel | null;
    onEditOriginal: () => void;
    onCreateCopy: () => void;
    isCreatingCopy?: boolean;
}

export function SharedPromptWarningModal({
    isOpen,
    onClose,
    ownerEmail,
    permissionLevel,
    onEditOriginal,
    onCreateCopy,
    isCreatingCopy = false,
}: SharedPromptWarningModalProps) {
    const ownerDisplayName = ownerEmail?.split('@')[0] || 'another user';
    const isViewerOnly = permissionLevel === 'viewer';
    const canEdit = permissionLevel === 'editor' || permissionLevel === 'admin';

    return (
        <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <AlertDialogContent className="max-w-md">
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                        {isViewerOnly ? "View-Only Access" : "Shared Prompt"}
                    </AlertDialogTitle>
                    <AlertDialogDescription asChild>
                        <div className="space-y-4">
                            {/* Owner Info */}
                            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                                <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                <span className="text-sm">
                                    This prompt belongs to <strong className="text-foreground">{ownerDisplayName}</strong>
                                </span>
                            </div>

                            {/* Warning Message */}
                            {isViewerOnly ? (
                                <p className="text-sm">
                                    You have <strong>view-only</strong> access to this prompt. 
                                    You cannot save changes to the original, but you can create your own copy.
                                </p>
                            ) : (
                                <p className="text-sm">
                                    You have <strong>edit</strong> access to this prompt. 
                                    Saving will modify the original prompt shared with you. 
                                    Alternatively, you can create your own copy.
                                </p>
                            )}
                        </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                    {/* Cancel */}
                    <AlertDialogCancel asChild>
                        <Button variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                    </AlertDialogCancel>

                    {/* Edit Original - only if user has edit permission */}
                    {canEdit && (
                        <AlertDialogAction asChild>
                            <Button 
                                variant="secondary"
                                onClick={() => {
                                    onEditOriginal();
                                    onClose();
                                }}
                                className="gap-2"
                            >
                                <Pencil className="w-4 h-4" />
                                Edit Original
                            </Button>
                        </AlertDialogAction>
                    )}

                    {/* Create Copy - always available */}
                    <AlertDialogAction asChild>
                        <Button 
                            onClick={onCreateCopy}
                            disabled={isCreatingCopy}
                            className="gap-2"
                        >
                            <Copy className="w-4 h-4" />
                            {isCreatingCopy ? "Creating Copy..." : "Save as My Copy"}
                        </Button>
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

/**
 * Shared prompt info banner for display in edit/run pages
 */
interface SharedPromptBannerProps {
    ownerEmail: string | null;
    permissionLevel: PermissionLevel | null;
    className?: string;
}

export function SharedPromptBanner({
    ownerEmail,
    permissionLevel,
    className = "",
}: SharedPromptBannerProps) {
    const ownerDisplayName = ownerEmail?.split('@')[0] || 'another user';
    const isViewerOnly = permissionLevel === 'viewer';

    const permissionConfig: Record<PermissionLevel, { label: string; color: string; bgColor: string }> = {
        viewer: {
            label: "View Only",
            color: "text-blue-600 dark:text-blue-400",
            bgColor: "bg-blue-100 dark:bg-blue-900/30",
        },
        editor: {
            label: "Can Edit",
            color: "text-amber-600 dark:text-amber-400",
            bgColor: "bg-amber-100 dark:bg-amber-900/30",
        },
        admin: {
            label: "Full Access",
            color: "text-green-600 dark:text-green-400",
            bgColor: "bg-green-100 dark:bg-green-900/30",
        },
    };

    const config = permissionLevel ? permissionConfig[permissionLevel] : null;

    return (
        <div className={`flex items-center gap-3 px-4 py-2 bg-secondary/10 border border-secondary/20 rounded-lg ${className}`}>
            <Shield className="w-4 h-4 text-secondary flex-shrink-0" />
            <div className="flex items-center gap-2 flex-wrap text-sm">
                <span className="text-muted-foreground">
                    Shared by <strong className="text-foreground">{ownerDisplayName}</strong>
                </span>
                {config && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}>
                        {config.label}
                    </span>
                )}
            </div>
        </div>
    );
}
