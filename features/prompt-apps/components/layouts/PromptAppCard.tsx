"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import IconButton from "@/components/official/IconButton";
import {
    Eye, Pencil, Play, Copy, Trash2, Loader2, Share2,
    ExternalLink, Globe, Archive, AppWindow, BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast-service";
import { PromptAppActionModal } from "./PromptAppActionModal";
import type { PromptApp } from "@/features/prompt-apps/types";

interface PromptAppCardProps {
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

export function PromptAppCard({
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
}: PromptAppCardProps) {
    const [isActionModalOpen, setIsActionModalOpen] = useState(false);
    const [lastModalCloseTime, setLastModalCloseTime] = useState(0);

    const isPublished = app.status === "published";
    const isDisabled = isNavigating || isAnyNavigating || false;

    const handleEdit = () => {
        if (onNavigate && !isAnyNavigating) {
            onNavigate(app.id, `/prompt-apps/${app.id}`);
        }
    };

    const handleRun = () => {
        if (isPublished) {
            window.open(`/p/${app.slug}`, "_blank");
        } else {
            window.open(`/preview/${app.id}`, "_blank");
        }
    };

    const handleView = () => {
        if (onNavigate && !isAnyNavigating) {
            onNavigate(app.id, `/prompt-apps/${app.id}`);
        }
    };

    const handleDuplicate = () => {
        if (onDuplicate) {
            onDuplicate(app.id);
        }
    };

    const handleDelete = () => {
        if (onDelete) {
            onDelete(app.id);
        }
    };

    const handleShare = () => {
        setIsActionModalOpen(false);
        handleCopyLink();
    };

    const handlePublishToggle = () => {
        if (onPublishToggle) {
            onPublishToggle(app.id, isPublished ? "draft" : "published");
        }
    };

    const handleCopyLink = () => {
        if (isPublished && app.slug) {
            const url = `${window.location.origin}/p/${app.slug}`;
            navigator.clipboard.writeText(url);
            toast.success("Link copied to clipboard!");
        } else {
            toast.info("Publish the app first to get a shareable link.");
        }
    };

    const handleCardClick = () => {
        const timeSinceClose = Date.now() - lastModalCloseTime;
        if (!isDisabled && !isActionModalOpen && timeSinceClose > 300) {
            setIsActionModalOpen(true);
        }
    };

    return (
        <Card
            className={cn(
                "flex flex-col h-full bg-card border border-border transition-all duration-200 overflow-hidden relative",
                isDisabled
                    ? "opacity-60 cursor-not-allowed"
                    : "hover:shadow-lg hover:shadow-primary/10 hover:border-primary/30 cursor-pointer hover:scale-[1.02] group"
            )}
            onClick={handleCardClick}
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
                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-20 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        <span className="text-sm font-medium text-foreground">
                            Loading...
                        </span>
                    </div>
                </div>
            )}

            {/* Status Badge & Icon */}
            <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
                <div
                    className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center shadow-sm transition-all duration-200",
                        isPublished
                            ? "bg-green-500"
                            : "bg-primary",
                        !isDisabled &&
                            "group-hover:shadow-md group-hover:scale-105"
                    )}
                >
                    <AppWindow
                        className={cn(
                            "w-4 h-4 text-white transition-transform duration-200",
                            !isDisabled && "group-hover:scale-110"
                        )}
                    />
                </div>
            </div>

            <div className="absolute top-3 right-3 z-10">
                <Badge
                    variant={isPublished ? "default" : "secondary"}
                    className={cn(
                        "text-xs",
                        isPublished && "bg-green-500/90 hover:bg-green-500"
                    )}
                >
                    {app.status}
                </Badge>
            </div>

            {/* App Name & Tagline */}
            <div className="p-4 pl-12 flex-1 flex flex-col items-center justify-center text-center">
                <h3
                    className={cn(
                        "text-lg font-semibold text-foreground line-clamp-2 break-words transition-colors duration-200",
                        !isDisabled && "group-hover:text-primary"
                    )}
                >
                    {app.name || "Untitled App"}
                </h3>
                {app.tagline && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {app.tagline}
                    </p>
                )}
                {/* Stats Row */}
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                        <BarChart3 className="w-3 h-3" />
                        {app.total_executions} runs
                    </span>
                    {app.tags && app.tags.length > 0 && (
                        <div className="flex items-center gap-1">
                            {app.tags.slice(0, 2).map((tag) => (
                                <Badge
                                    key={tag}
                                    variant="outline"
                                    className="text-[10px] px-1.5 py-0"
                                >
                                    {tag}
                                </Badge>
                            ))}
                            {app.tags.length > 2 && (
                                <span className="text-muted-foreground">
                                    +{app.tags.length - 2}
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Action Bar */}
            <div className="border-t border-border p-1 bg-card rounded-b-lg">
                <div
                    className="flex gap-2 justify-center"
                    onClick={(e) => e.stopPropagation()}
                >
                    <IconButton
                        icon={Play}
                        tooltip={
                            isDisabled
                                ? "Please wait..."
                                : isPublished
                                ? "Run"
                                : "Test"
                        }
                        size="sm"
                        variant="ghost"
                        tooltipSide="top"
                        tooltipAlign="center"
                        onClick={handleRun}
                        disabled={isDisabled}
                    />
                    <IconButton
                        icon={Pencil}
                        tooltip={isDisabled ? "Please wait..." : "Edit"}
                        size="sm"
                        variant="ghost"
                        tooltipSide="top"
                        tooltipAlign="center"
                        onClick={handleEdit}
                        disabled={isDisabled}
                    />
                    <IconButton
                        icon={isDuplicating ? Loader2 : Copy}
                        tooltip={
                            isDuplicating
                                ? "Duplicating..."
                                : isDisabled
                                ? "Please wait..."
                                : "Duplicate"
                        }
                        size="sm"
                        variant="ghost"
                        tooltipSide="top"
                        tooltipAlign="center"
                        onClick={handleDuplicate}
                        disabled={isDuplicating || isDisabled}
                        iconClassName={isDuplicating ? "animate-spin" : ""}
                    />
                    <IconButton
                        icon={isPublished ? ExternalLink : Globe}
                        tooltip={
                            isDisabled
                                ? "Please wait..."
                                : isPublished
                                ? "Copy Link"
                                : "Publish"
                        }
                        size="sm"
                        variant="ghost"
                        tooltipSide="top"
                        tooltipAlign="center"
                        onClick={isPublished ? handleCopyLink : handlePublishToggle}
                        disabled={isDisabled || isPublishing}
                    />
                    <IconButton
                        icon={isDeleting ? Loader2 : Trash2}
                        tooltip={
                            isDeleting
                                ? "Deleting..."
                                : isDisabled
                                ? "Please wait..."
                                : "Delete"
                        }
                        size="sm"
                        variant="ghost"
                        tooltipSide="top"
                        tooltipAlign="center"
                        onClick={handleDelete}
                        disabled={isDeleting || isDisabled}
                        iconClassName={isDeleting ? "animate-spin" : ""}
                    />
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
                onRun={handleRun}
                onEdit={handleEdit}
                onView={handleView}
                onDuplicate={handleDuplicate}
                onShare={handleShare}
                onDelete={handleDelete}
                onPublishToggle={handlePublishToggle}
                onCopyLink={handleCopyLink}
                isDeleting={isDeleting}
                isDuplicating={isDuplicating}
                isPublishing={isPublishing}
            />
        </Card>
    );
}
