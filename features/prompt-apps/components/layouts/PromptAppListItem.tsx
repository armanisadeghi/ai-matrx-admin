"use client";

import { useState } from "react";
import {
    Loader2, MoreVertical, Play, Pencil, Eye, Copy,
    Trash2, ExternalLink, Globe, Archive, AppWindow, BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast-service";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { PromptAppActionModal } from "./PromptAppActionModal";
import type { PromptApp } from "@/features/prompt-apps/types";

interface PromptAppListItemProps {
    app: PromptApp;
    onDelete?: (id: string) => void;
    onDuplicate?: (id: string) => void;
    onNavigate?: (id: string, path: string) => void;
    onPublishToggle?: (id: string, newStatus: "published" | "draft") => void;
    isDeleting?: boolean;
    isDuplicating?: boolean;
    isPublishing?: boolean;
    isNavigating?: boolean;
    isAnyNavigating?: boolean;
}

export function PromptAppListItem({
    app,
    onDelete,
    onDuplicate,
    onNavigate,
    onPublishToggle,
    isDeleting,
    isDuplicating,
    isPublishing,
    isNavigating,
    isAnyNavigating,
}: PromptAppListItemProps) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isActionModalOpen, setIsActionModalOpen] = useState(false);
    const [lastModalCloseTime, setLastModalCloseTime] = useState(0);

    const isPublished = app.status === "published";
    const isDisabled = isNavigating || isAnyNavigating || false;

    const handleItemClick = () => {
        const timeSinceClose = Date.now() - lastModalCloseTime;
        if (!isDisabled && !isActionModalOpen && timeSinceClose > 300) {
            setIsActionModalOpen(true);
        }
    };

    const handleEdit = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (onNavigate && !isDisabled) {
            onNavigate(app.id, `/prompt-apps/${app.id}`);
        }
    };

    const handleRun = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (isPublished) {
            window.open(`/p/${app.slug}`, "_blank");
        } else {
            window.open(`/preview/${app.id}`, "_blank");
        }
    };

    const handleView = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (onNavigate && !isDisabled) {
            onNavigate(app.id, `/prompt-apps/${app.id}`);
        }
    };

    const handleDuplicate = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (onDuplicate) {
            onDuplicate(app.id);
        }
    };

    const handleDelete = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (onDelete) {
            onDelete(app.id);
        }
    };

    const handlePublishToggle = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (onPublishToggle) {
            onPublishToggle(app.id, isPublished ? "draft" : "published");
        }
    };

    const handleCopyLink = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (isPublished && app.slug) {
            const url = `${window.location.origin}/p/${app.slug}`;
            navigator.clipboard.writeText(url);
            toast.success("Link copied to clipboard!");
        } else {
            toast.info("Publish the app first to get a shareable link.");
        }
    };

    const handleShare = () => {
        setIsActionModalOpen(false);
        handleCopyLink();
    };

    return (
        <>
            <div
                className={cn(
                    "flex items-center gap-2 px-3 py-2 border border-border rounded-lg",
                    "transition-all relative bg-card",
                    !isDisabled &&
                        "hover:bg-accent/50 hover:border-primary/30 cursor-pointer hover:shadow-sm",
                    isDisabled && "opacity-50 cursor-not-allowed"
                )}
                onClick={handleItemClick}
                title={
                    isDisabled
                        ? isNavigating
                            ? "Navigating..."
                            : "Please wait..."
                        : "Click to choose action"
                }
            >
                {/* Loading Overlay */}
                {isNavigating && (
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
                        <Loader2 className="w-4 h-4 text-primary animate-spin" />
                    </div>
                )}

                {/* Icon */}
                <div className="flex-shrink-0">
                    <div
                        className={cn(
                            "w-7 h-7 rounded-md flex items-center justify-center",
                            isPublished
                                ? "bg-green-500/10"
                                : "bg-primary/10"
                        )}
                    >
                        <AppWindow
                            className={cn(
                                "w-3.5 h-3.5",
                                isPublished
                                    ? "text-green-500"
                                    : "text-primary"
                            )}
                        />
                    </div>
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-foreground truncate">
                        {app.name || "Untitled App"}
                    </h4>
                </div>

                {/* Status Badge */}
                <Badge
                    variant={isPublished ? "default" : "secondary"}
                    className={cn(
                        "text-[10px] flex-shrink-0 whitespace-nowrap",
                        isPublished && "bg-green-500/90 hover:bg-green-500"
                    )}
                >
                    {app.status}
                </Badge>

                {/* Stats */}
                <span className="text-xs text-muted-foreground flex-shrink-0 flex items-center gap-1">
                    <BarChart3 className="w-3 h-3" />
                    {app.total_executions}
                </span>

                {/* Actions Menu */}
                <div
                    className="flex-shrink-0"
                    onClick={(e) => e.stopPropagation()}
                >
                    <DropdownMenu
                        open={isMenuOpen}
                        onOpenChange={setIsMenuOpen}
                    >
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                disabled={isDisabled}
                            >
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                                onClick={() => handleRun()}
                                disabled={isDisabled}
                            >
                                <Play className="mr-2 h-4 w-4" />
                                {isPublished ? "Run" : "Test"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => handleEdit()}
                                disabled={isDisabled}
                            >
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => handleView()}
                                disabled={isDisabled}
                            >
                                <Eye className="mr-2 h-4 w-4" />
                                View
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => handleDuplicate()}
                                disabled={isDuplicating || isDisabled}
                            >
                                {isDuplicating ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Copy className="mr-2 h-4 w-4" />
                                )}
                                {isDuplicating ? "Duplicating..." : "Duplicate"}
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            {isPublished && (
                                <DropdownMenuItem
                                    onClick={() => handleCopyLink()}
                                    disabled={isDisabled}
                                >
                                    <ExternalLink className="mr-2 h-4 w-4" />
                                    Copy Link
                                </DropdownMenuItem>
                            )}

                            <DropdownMenuItem
                                onClick={() => handlePublishToggle()}
                                disabled={isPublishing || isDisabled}
                            >
                                {isPublishing ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : isPublished ? (
                                    <Archive className="mr-2 h-4 w-4" />
                                ) : (
                                    <Globe className="mr-2 h-4 w-4" />
                                )}
                                {isPublishing
                                    ? "Updating..."
                                    : isPublished
                                    ? "Unpublish"
                                    : "Publish"}
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                                onClick={() => handleDelete()}
                                disabled={isDeleting || isDisabled}
                                className="text-destructive focus:text-destructive"
                            >
                                {isDeleting ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Trash2 className="mr-2 h-4 w-4" />
                                )}
                                {isDeleting ? "Deleting..." : "Delete"}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Action Modal */}
            <PromptAppActionModal
                isOpen={isActionModalOpen}
                onClose={() => {
                    setIsActionModalOpen(false);
                    setLastModalCloseTime(Date.now());
                }}
                appName={app.name}
                appTagline={app.tagline}
                appStatus={app.status}
                onRun={() => handleRun()}
                onEdit={() => handleEdit()}
                onView={() => handleView()}
                onDuplicate={() => handleDuplicate()}
                onShare={handleShare}
                onDelete={() => handleDelete()}
                onPublishToggle={() => handlePublishToggle()}
                onCopyLink={() => handleCopyLink()}
                isDeleting={isDeleting}
                isDuplicating={isDuplicating}
                isPublishing={isPublishing}
            />
        </>
    );
}
