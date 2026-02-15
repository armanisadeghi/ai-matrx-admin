"use client";

import React, { useEffect, useState, useRef } from "react";
import { Loader2 } from "lucide-react";
import { GenericRenderer } from "../GenericRenderer";
import { DynamicToolErrorBoundary } from "./DynamicToolErrorBoundary";
import { fetchAndCompileRenderer, prefetchRenderer } from "./fetcher";
import { getCachedRenderer } from "./cache";
import type { ToolRendererProps } from "../types";
import type { CompiledToolRenderer } from "./types";

// ---------------------------------------------------------------------------
// Loading indicator (shown briefly while fetching + compiling)
// ---------------------------------------------------------------------------

const DynamicLoadingIndicator: React.FC = () => (
    <div className="flex items-center gap-2 py-2 px-1 text-xs text-slate-500 dark:text-slate-400 animate-in fade-in duration-200">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span>Loading tool display...</span>
    </div>
);

// ---------------------------------------------------------------------------
// Inline wrapper
// ---------------------------------------------------------------------------

interface DynamicInlineRendererProps extends ToolRendererProps {
    toolName: string;
}

/**
 * Renders a dynamically loaded inline component for a tool.
 *
 * Lifecycle:
 * 1. Check cache for already-compiled component → render immediately
 * 2. If not cached, show brief loading → fetch + compile → render
 * 3. If fetch/compile fails, render GenericRenderer
 * 4. If runtime error, error boundary catches it → GenericRenderer
 */
export const DynamicInlineRenderer: React.FC<DynamicInlineRendererProps> = ({
    toolName,
    toolUpdates,
    currentIndex,
    onOpenOverlay,
    toolGroupId,
}) => {
    const [compiled, setCompiled] = useState<CompiledToolRenderer | null>(
        () => getCachedRenderer(toolName)
    );
    const [failed, setFailed] = useState(false);
    const fetchedRef = useRef(false);

    useEffect(() => {
        if (compiled || failed || fetchedRef.current) return;
        fetchedRef.current = true;

        fetchAndCompileRenderer(toolName).then((result) => {
            if (result) {
                setCompiled(result);
            } else {
                setFailed(true);
            }
        });
    }, [toolName, compiled, failed]);

    // Still loading
    if (!compiled && !failed) {
        return <DynamicLoadingIndicator />;
    }

    // Failed to load — use generic
    if (failed || !compiled) {
        return (
            <GenericRenderer
                toolUpdates={toolUpdates}
                currentIndex={currentIndex}
                onOpenOverlay={onOpenOverlay}
                toolGroupId={toolGroupId}
            />
        );
    }

    const { InlineComponent } = compiled;

    return (
        <DynamicToolErrorBoundary
            toolName={toolName}
            componentType="inline"
            componentId={compiled.componentId}
            componentVersion={compiled.version}
            toolUpdates={toolUpdates}
            fallback={
                <GenericRenderer
                    toolUpdates={toolUpdates}
                    currentIndex={currentIndex}
                    onOpenOverlay={onOpenOverlay}
                    toolGroupId={toolGroupId}
                />
            }
        >
            <InlineComponent
                toolUpdates={toolUpdates}
                currentIndex={currentIndex}
                onOpenOverlay={onOpenOverlay}
                toolGroupId={toolGroupId}
            />
        </DynamicToolErrorBoundary>
    );
};

// ---------------------------------------------------------------------------
// Overlay wrapper
// ---------------------------------------------------------------------------

interface DynamicOverlayRendererProps extends ToolRendererProps {
    toolName: string;
}

/**
 * Renders a dynamically loaded overlay component for a tool.
 * Falls back to GenericRenderer if no overlay code was provided or on error.
 */
export const DynamicOverlayRenderer: React.FC<DynamicOverlayRendererProps> = ({
    toolName,
    toolUpdates,
    currentIndex,
    onOpenOverlay,
    toolGroupId,
}) => {
    const compiled = getCachedRenderer(toolName);

    // If not cached (shouldn't happen — inline should have loaded it),
    // fall back to generic
    if (!compiled?.OverlayComponent) {
        return (
            <GenericRenderer
                toolUpdates={toolUpdates}
                currentIndex={currentIndex}
                onOpenOverlay={onOpenOverlay}
                toolGroupId={toolGroupId}
            />
        );
    }

    const { OverlayComponent } = compiled;

    return (
        <DynamicToolErrorBoundary
            toolName={toolName}
            componentType="overlay"
            componentId={compiled.componentId}
            componentVersion={compiled.version}
            toolUpdates={toolUpdates}
            fallback={
                <GenericRenderer
                    toolUpdates={toolUpdates}
                    currentIndex={currentIndex}
                    onOpenOverlay={onOpenOverlay}
                    toolGroupId={toolGroupId}
                />
            }
        >
            <OverlayComponent
                toolUpdates={toolUpdates}
                currentIndex={currentIndex}
                onOpenOverlay={onOpenOverlay}
                toolGroupId={toolGroupId}
            />
        </DynamicToolErrorBoundary>
    );
};

// ---------------------------------------------------------------------------
// Prefetch hook
// ---------------------------------------------------------------------------

/**
 * Hook to prefetch a dynamic renderer when a tool name is known.
 * Call this early (e.g. when mcp_input arrives) to minimize loading time.
 */
export function usePrefetchToolRenderer(toolName: string | null): void {
    useEffect(() => {
        if (toolName) {
            prefetchRenderer(toolName);
        }
    }, [toolName]);
}
