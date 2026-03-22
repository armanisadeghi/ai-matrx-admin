"use client";

import React from "react";
import { CircleDot } from "lucide-react";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectSessionHasUnsavedChanges } from "@/features/cx-conversation/redux/selectors";

interface UnsavedChangesIndicatorProps {
    sessionId: string;
}

export function UnsavedChangesIndicator({ sessionId }: UnsavedChangesIndicatorProps) {
    const hasUnsavedChanges = useAppSelector((state) =>
        selectSessionHasUnsavedChanges(state, sessionId)
    );

    if (!hasUnsavedChanges) return null;

    return (
        <div className="fixed top-12 right-4 z-40 flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-amber-500/30 bg-card/90 backdrop-blur-sm shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
            <CircleDot className="w-3 h-3 text-amber-500 animate-pulse" />
            <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                Unsaved changes
            </span>
        </div>
    );
}
