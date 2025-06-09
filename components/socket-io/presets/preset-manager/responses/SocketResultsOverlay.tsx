"use client";

import React from "react";
import { SocketAdminOverlay, SocketAdminOverlayProps } from "./SocketAdminOverlay";
import { BookmarkTabConfig } from "./admin-tabs/SocketBookmarkTab";

interface SocketResultsOverlayProps {
    taskId?: string | null;
    isOpen: boolean;
    onClose: () => void;
    customTabs?: BookmarkTabConfig[];
    overlayTitle?: string;
    overlayDescription?: string;
}

/**
 * Standalone socket results overlay component
 * 
 * This component:
 * - Shows results for any taskId
 * - Completely independent of execution logic
 * - Can be rendered anywhere, anytime
 * - Uses the existing SocketAdminOverlay internally
 */
export const SocketResultsOverlay: React.FC<SocketResultsOverlayProps> = ({
    taskId,
    isOpen,
    onClose,
    customTabs,
    overlayTitle,
    overlayDescription
}) => {
    return (
        <SocketAdminOverlay
            taskId={taskId}
            showOverlay={isOpen}
            onClose={onClose}
            customTabs={customTabs}
            overlayTitle={overlayTitle}
            overlayDescription={overlayDescription}
            includeTabs={["tasks", "text", "dynamic", "data", "info", "errors"]}
        />
    );
}; 