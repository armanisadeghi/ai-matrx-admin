"use client";

import React, { useEffect, useState, useRef } from "react";
import { Loader2 } from "lucide-react";
import { GenericRenderer } from "../registry/GenericRenderer";
import { DynamicToolErrorBoundary } from "./DynamicToolErrorBoundary";
import { fetchAndCompileRenderer, prefetchRenderer } from "./fetcher";
import { getCachedRenderer } from "./cache";
import type { ToolRendererProps } from "../types";
import type { CompiledToolRenderer } from "./types";

const DynamicLoadingIndicator: React.FC = () => (
    <div className="flex items-center gap-2 py-2 px-1 text-xs text-slate-500 dark:text-slate-400 animate-in fade-in duration-200">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span>Loading tool display...</span>
    </div>
);

interface DynamicInlineRendererProps extends ToolRendererProps {
    toolName: string;
}

export const DynamicInlineRenderer: React.FC<DynamicInlineRendererProps> = ({
    toolName,
    entry,
    events,
    onOpenOverlay,
    toolGroupId,
    isPersisted,
}) => {
    const [compiled, setCompiled] = useState<CompiledToolRenderer | null>(
        () => getCachedRenderer(toolName),
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

    if (!compiled && !failed) {
        return <DynamicLoadingIndicator />;
    }

    if (failed || !compiled) {
        return (
            <GenericRenderer
                entry={entry}
                events={events}
                onOpenOverlay={onOpenOverlay}
                toolGroupId={toolGroupId}
                isPersisted={isPersisted}
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
            snapshot={{ entry, eventCount: events?.length ?? 0 }}
            fallback={
                <GenericRenderer
                    entry={entry}
                    events={events}
                    onOpenOverlay={onOpenOverlay}
                    toolGroupId={toolGroupId}
                    isPersisted={isPersisted}
                />
            }
        >
            <InlineComponent
                entry={entry}
                events={events}
                onOpenOverlay={onOpenOverlay}
                toolGroupId={toolGroupId}
                isPersisted={isPersisted}
            />
        </DynamicToolErrorBoundary>
    );
};

interface DynamicOverlayRendererProps extends ToolRendererProps {
    toolName: string;
}

export const DynamicOverlayRenderer: React.FC<DynamicOverlayRendererProps> = ({
    toolName,
    entry,
    events,
    onOpenOverlay,
    toolGroupId,
    isPersisted,
}) => {
    const compiled = getCachedRenderer(toolName);

    if (!compiled?.OverlayComponent) {
        return (
            <GenericRenderer
                entry={entry}
                events={events}
                onOpenOverlay={onOpenOverlay}
                toolGroupId={toolGroupId}
                isPersisted={isPersisted}
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
            snapshot={{ entry, eventCount: events?.length ?? 0 }}
            fallback={
                <GenericRenderer
                    entry={entry}
                    events={events}
                    onOpenOverlay={onOpenOverlay}
                    toolGroupId={toolGroupId}
                    isPersisted={isPersisted}
                />
            }
        >
            <OverlayComponent
                entry={entry}
                events={events}
                onOpenOverlay={onOpenOverlay}
                toolGroupId={toolGroupId}
                isPersisted={isPersisted}
            />
        </DynamicToolErrorBoundary>
    );
};

/**
 * Hook to prefetch a dynamic renderer when a tool name is known.
 */
export function usePrefetchToolRenderer(toolName: string | null): void {
    useEffect(() => {
        if (toolName) {
            prefetchRenderer(toolName);
        }
    }, [toolName]);
}
