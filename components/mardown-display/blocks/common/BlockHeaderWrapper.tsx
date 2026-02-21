"use client";
import React, { useState, useRef, ReactNode } from "react";
import {
    Maximize2, Minimize2, ExternalLink, Upload, Download, LucideIcon
} from "lucide-react";
import { useCanvas } from "@/features/canvas/hooks/useCanvas";
import IconButton from "@/components/official/IconButton";
import type { CanvasContentType } from "@/features/canvas/redux/canvasSlice";

export interface BlockHeaderWrapperProps {
    // Header left side
    icon: LucideIcon;
    iconClassName?: string;
    title: string;
    description?: string;

    // Bottom toolbar (progress, filters, reset, etc.) — rendered inside the gradient card
    controls?: ReactNode;

    // Main content
    children: ReactNode;

    // Canvas integration
    canvasType?: CanvasContentType;
    canvasData?: unknown;
    canvasMetadata?: Record<string, unknown>;
    taskId?: string;

    /**
     * The exact data object to export as JSON.
     * When provided, a Download button appears that saves it as `<exportFilename>.json`.
     */
    exportData?: unknown;
    /** Filename (without extension) used when downloading. Defaults to "export". */
    exportFilename?: string;

    /**
     * Called with the parsed JSON object when the user picks a valid JSON file.
     * The block is responsible for validating/applying the new data.
     */
    onDataImport?: (data: unknown) => void;

    // Custom action buttons rendered between export and canvas
    extraActions?: ReactNode;

    // Styling
    /** Tailwind gradient classes for the header card background */
    headerGradient?: string;
    /** Tailwind border class for the header card */
    headerBorder?: string;
    /** Classes applied to the import/export/fullscreen buttons */
    actionButtonClassName?: string;
    /** Classes applied to the canvas button */
    canvasButtonClassName?: string;
}

/**
 * BlockHeaderWrapper
 *
 * Reusable gradient header wrapper for chat markdown blocks.
 * Provides:
 *   - Branded gradient card with icon, title, and description (top-left)
 *   - Import / Export / Canvas / Fullscreen buttons (top-right)
 *   - An optional bottom-of-card controls slot (progress, filters, etc.)
 *   - Fullscreen backdrop + overlay behaviour
 *
 * The block's specific content is rendered as `children` below the card.
 */
const BlockHeaderWrapper: React.FC<BlockHeaderWrapperProps> = ({
    icon: Icon,
    iconClassName = "bg-blue-500 dark:bg-blue-600",
    title,
    description,
    controls,
    children,
    canvasType,
    canvasData,
    canvasMetadata,
    taskId,
    exportData,
    exportFilename = "export",
    onDataImport,
    extraActions,
    headerGradient = "bg-gradient-to-br from-blue-100 via-indigo-50 to-purple-100 dark:from-blue-950/40 dark:via-indigo-950/30 dark:to-purple-950/40",
    headerBorder = "border-blue-200 dark:border-blue-800/50",
    actionButtonClassName = "bg-primary text-primary-foreground shadow-sm hover:bg-primary/80 hover:shadow-md transform hover:scale-105 transition-all",
    canvasButtonClassName = "bg-secondary text-primary-foreground shadow-sm hover:bg-secondary/80 hover:shadow-md transform hover:scale-105 transition-all",
}) => {
    const [isFullScreen, setIsFullScreen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { open: openCanvas } = useCanvas();

    const handleCanvasOpen = () => {
        if (!canvasType || !canvasData) return;
        openCanvas({
            type: canvasType,
            data: canvasData,
            metadata: {
                ...canvasMetadata,
                sourceTaskId: taskId,
            },
        });
    };

    const handleExport = () => {
        if (exportData === undefined) return;
        const json = JSON.stringify(exportData, null, 2);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${exportFilename}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !onDataImport) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const parsed: unknown = JSON.parse(event.target?.result as string);
                onDataImport(parsed);
            } catch {
                console.error("BlockHeaderWrapper: failed to parse imported JSON file");
            }
        };
        reader.readAsText(file);

        // Reset so the same file can be re-imported if needed
        e.target.value = "";
    };

    const showCanvas = !isFullScreen && canvasType && canvasData;

    return (
        <>
            {/* Hidden file input for import */}
            <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={handleFileChange}
            />

            {/* Fullscreen backdrop */}
            {isFullScreen && (
                <div
                    className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
                    onClick={() => setIsFullScreen(false)}
                />
            )}

            <div
                className={`w-full ${
                    isFullScreen
                        ? "fixed inset-0 z-50 flex items-center justify-center p-2"
                        : "py-3"
                }`}
            >
                <div
                    className={`max-w-6xl mx-auto ${
                        isFullScreen
                            ? "bg-textured rounded-xl shadow-2xl h-full max-h-[98vh] w-full flex flex-col overflow-hidden"
                            : ""
                    }`}
                >
                    {/* Scrollable content */}
                    <div className={isFullScreen ? "flex-1 overflow-y-auto" : ""}>
                        <div className="p-4 space-y-4">

                            {/* Gradient header card */}
                            <div
                                className={`${headerGradient} rounded-xl p-4 shadow-md border ${headerBorder}`}
                            >
                                {/* Top row: icon + title/description | action buttons */}
                                <div className="flex items-start justify-between gap-3 mb-3">
                                    {/* Left: icon + text */}
                                    <div className="flex items-start gap-2 flex-1">
                                        <div
                                            className={`p-2 ${iconClassName} rounded-lg shadow-sm flex-shrink-0`}
                                        >
                                            <Icon className="h-5 w-5 text-primary-foreground" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h1 className="text-sm font-bold text-primary-foreground leading-tight">
                                                {title}
                                            </h1>
                                            {description && (
                                                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                                    {description}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right: action buttons */}
                                    <div className="flex items-center gap-2">
                                        {onDataImport && (
                                            <IconButton
                                                icon={Upload}
                                                tooltip="Import from JSON file"
                                                onClick={handleImportClick}
                                                size="sm"
                                                className={actionButtonClassName}
                                            />
                                        )}
                                        {exportData !== undefined && (
                                            <IconButton
                                                icon={Download}
                                                tooltip="Save as JSON file"
                                                onClick={handleExport}
                                                size="sm"
                                                className={actionButtonClassName}
                                            />
                                        )}
                                        {extraActions}
                                        {showCanvas && (
                                            <IconButton
                                                icon={ExternalLink}
                                                tooltip="Open Canvas"
                                                onClick={handleCanvasOpen}
                                                size="sm"
                                                className={canvasButtonClassName}
                                            />
                                        )}
                                        {!isFullScreen ? (
                                            <IconButton
                                                icon={Maximize2}
                                                tooltip="Expand to full screen"
                                                onClick={() => setIsFullScreen(true)}
                                                size="sm"
                                                className={actionButtonClassName}
                                            />
                                        ) : (
                                            <IconButton
                                                icon={Minimize2}
                                                tooltip="Exit full screen"
                                                onClick={() => setIsFullScreen(false)}
                                                size="sm"
                                                className={actionButtonClassName}
                                            />
                                        )}
                                    </div>
                                </div>

                                {/* Bottom row: progress, filters, etc. */}
                                {controls && (
                                    <div>{controls}</div>
                                )}
                            </div>

                            {/* Block-specific content */}
                            {children}

                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default BlockHeaderWrapper;
