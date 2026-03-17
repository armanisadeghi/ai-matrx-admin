"use client";

import React, { useState, useMemo } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, CheckCircle2, Info, RefreshCw, Wrench } from "lucide-react";
import { PromptSettings } from "@/features/prompts/types/core";
import { NormalizedControls } from "@/features/prompts/hooks/useModelControls";

export interface ConflictItem {
    key: string;
    currentValue: unknown;
    /** undefined = key not supported at all by new model; defined = value incompatible */
    newModelDefault: unknown;
    reason: "unsupported_key" | "value_out_of_range" | "invalid_enum_value";
    /** Human-readable description */
    description: string;
}

export interface ModelChangeConflictData {
    prevModelName: string;
    newModelName: string;
    newModelId: string;
    currentSettings: PromptSettings;
    /** Keys from currentSettings that are fully supported by the new model */
    supportedKeys: string[];
    conflicts: ConflictItem[];
    /** Defaults for the new model (for display) */
    newModelControls: NormalizedControls | null;
}

interface ModelChangeConflictModalProps {
    isOpen: boolean;
    onClose: () => void;
    conflictData: ModelChangeConflictData | null;
    /**
     * Called when user confirms. Receives the resolved settings to apply.
     * The modal guarantees currentSettings are preserved for any key
     * the user didn't explicitly choose to reset.
     */
    onConfirm: (resolvedSettings: PromptSettings) => void;
}

function formatValue(value: unknown): string {
    if (value === null || value === undefined) return "—";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
}

function formatKey(key: string): string {
    return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ModelChangeConflictModal({
    isOpen,
    onClose,
    conflictData,
    onConfirm,
}: ModelChangeConflictModalProps) {
    // For each conflict key, track whether the user wants to reset it to the new model default.
    // Default: false = keep current value (safe fallback).
    const [resetKeys, setResetKeys] = useState<Set<string>>(new Set());

    // Reset selections when the modal opens with new data
    const prevConflictDataRef = React.useRef<ModelChangeConflictData | null>(null);
    if (conflictData !== prevConflictDataRef.current) {
        prevConflictDataRef.current = conflictData;
        if (resetKeys.size > 0) setResetKeys(new Set());
    }

    const conflicts = conflictData?.conflicts ?? [];
    const unsupportedKeys = conflicts.filter((c) => c.reason === "unsupported_key");
    const invalidValueKeys = conflicts.filter((c) => c.reason !== "unsupported_key");

    const toggleReset = (key: string) => {
        setResetKeys((prev) => {
            const next = new Set(prev);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }
            return next;
        });
    };

    const handleSelectAll = () => {
        setResetKeys(new Set(conflicts.map((c) => c.key)));
    };

    const handleSelectNone = () => {
        setResetKeys(new Set());
    };

    const handleConfirm = () => {
        if (!conflictData) return;

        // Start from current settings (never lose anything by default)
        const resolved: Record<string, unknown> = { ...conflictData.currentSettings };

        // For each conflict the user chose to reset, apply new model default or remove
        for (const conflict of conflicts) {
            if (resetKeys.has(conflict.key)) {
                if (conflict.reason === "unsupported_key") {
                    // Remove the key entirely — model doesn't support it
                    delete resolved[conflict.key];
                } else {
                    // Replace with new model default
                    if (conflict.newModelDefault !== undefined && conflict.newModelDefault !== null) {
                        resolved[conflict.key] = conflict.newModelDefault;
                    } else {
                        delete resolved[conflict.key];
                    }
                }
            }
        }

        onConfirm(resolved as PromptSettings);
    };

    const handleKeepAll = () => {
        if (!conflictData) return;
        // Keep all current settings unchanged — just apply model switch
        onConfirm({ ...conflictData.currentSettings });
    };

    if (!conflictData) return null;

    const hasConflicts = conflicts.length > 0;
    const resetCount = resetKeys.size;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col gap-0 p-0">
                {/* Header */}
                <DialogHeader className="px-5 py-4 border-b border-border">
                    <DialogTitle className="flex items-center gap-2 text-base">
                        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                        Settings Conflict — Model Changed
                    </DialogTitle>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{conflictData.prevModelName}</span>
                        <span>→</span>
                        <span className="font-medium text-foreground">{conflictData.newModelName}</span>
                    </div>
                </DialogHeader>

                <ScrollArea className="flex-1 overflow-auto">
                    <div className="px-5 py-4 space-y-4">
                        {/* Summary banner */}
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                            <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                                Your current settings are preserved by default. Review the conflicts below and choose which settings you want to reset to the new model&apos;s defaults. You can save at any time regardless of conflicts.
                            </p>
                        </div>

                        {!hasConflicts && (
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                                <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                                <p className="text-xs text-green-800 dark:text-green-200">
                                    All your current settings are compatible with{" "}
                                    <strong>{conflictData.newModelName}</strong>. No changes needed.
                                </p>
                            </div>
                        )}

                        {hasConflicts && (
                            <>
                                {/* Bulk actions */}
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-muted-foreground">
                                        {resetCount} of {conflicts.length} selected to reset
                                    </span>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-6 text-xs px-2"
                                            onClick={handleSelectNone}
                                        >
                                            Keep All
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-6 text-xs px-2"
                                            onClick={handleSelectAll}
                                        >
                                            Reset All
                                        </Button>
                                    </div>
                                </div>

                                {/* Unsupported keys */}
                                {unsupportedKeys.length > 0 && (
                                    <div className="space-y-1.5">
                                        <div className="flex items-center gap-1.5 text-xs font-semibold text-red-600 dark:text-red-400">
                                            <AlertTriangle className="w-3.5 h-3.5" />
                                            Not Supported by {conflictData.newModelName} ({unsupportedKeys.length})
                                        </div>
                                        <div className="rounded-lg border border-red-200 dark:border-red-800 divide-y divide-red-100 dark:divide-red-900 overflow-hidden">
                                            {unsupportedKeys.map((conflict) => (
                                                <ConflictRow
                                                    key={conflict.key}
                                                    conflict={conflict}
                                                    isChecked={resetKeys.has(conflict.key)}
                                                    onToggle={() => toggleReset(conflict.key)}
                                                    newModelName={conflictData.newModelName}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Invalid values */}
                                {invalidValueKeys.length > 0 && (
                                    <div className="space-y-1.5">
                                        <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                                            <Wrench className="w-3.5 h-3.5" />
                                            Value Incompatible ({invalidValueKeys.length})
                                        </div>
                                        <div className="rounded-lg border border-amber-200 dark:border-amber-800 divide-y divide-amber-100 dark:divide-amber-900 overflow-hidden">
                                            {invalidValueKeys.map((conflict) => (
                                                <ConflictRow
                                                    key={conflict.key}
                                                    conflict={conflict}
                                                    isChecked={resetKeys.has(conflict.key)}
                                                    onToggle={() => toggleReset(conflict.key)}
                                                    newModelName={conflictData.newModelName}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Compatible settings summary */}
                                {conflictData.supportedKeys.length > 0 && (
                                    <div className="space-y-1.5">
                                        <div className="flex items-center gap-1.5 text-xs font-semibold text-green-600 dark:text-green-400">
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                            Compatible Settings ({conflictData.supportedKeys.length}) — kept as-is
                                        </div>
                                        <div className="flex flex-wrap gap-1.5 p-2.5 rounded-lg bg-muted/50 border border-border">
                                            {conflictData.supportedKeys.map((key) => (
                                                <Badge
                                                    key={key}
                                                    variant="secondary"
                                                    className="text-xs font-mono"
                                                >
                                                    {key}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </ScrollArea>

                <Separator />

                {/* Footer */}
                <DialogFooter className="px-5 py-3 flex-row items-center justify-between gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                        className="text-xs"
                    >
                        Cancel (Undo Model Change)
                    </Button>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleKeepAll}
                            className="text-xs gap-1.5"
                        >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Keep All Current Settings
                        </Button>
                        {hasConflicts && (
                            <Button
                                size="sm"
                                onClick={handleConfirm}
                                className="text-xs gap-1.5"
                            >
                                <RefreshCw className="w-3.5 h-3.5" />
                                Apply
                                {resetCount > 0 ? ` (Reset ${resetCount})` : " Without Changes"}
                            </Button>
                        )}
                        {!hasConflicts && (
                            <Button
                                size="sm"
                                onClick={handleConfirm}
                                className="text-xs gap-1.5"
                            >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Switch Model
                            </Button>
                        )}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

interface ConflictRowProps {
    conflict: ConflictItem;
    isChecked: boolean;
    onToggle: () => void;
    newModelName: string;
}

function ConflictRow({ conflict, isChecked, onToggle, newModelName }: ConflictRowProps) {
    const isUnsupported = conflict.reason === "unsupported_key";
    const rowBg = isUnsupported
        ? "bg-red-50/50 dark:bg-red-950/20"
        : "bg-amber-50/50 dark:bg-amber-950/20";

    return (
        <div className={`flex items-start gap-3 px-3 py-2.5 ${rowBg}`}>
            <div className="flex items-center pt-0.5">
                <Checkbox
                    id={`conflict-${conflict.key}`}
                    checked={isChecked}
                    onCheckedChange={onToggle}
                    className="cursor-pointer"
                />
            </div>
            <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                    <code className="text-xs font-mono font-semibold text-foreground bg-muted px-1.5 py-0.5 rounded">
                        {conflict.key}
                    </code>
                    <span className="text-xs text-muted-foreground">{formatKey(conflict.key)}</span>
                </div>
                <p className="text-xs text-muted-foreground">{conflict.description}</p>
                <div className="flex items-center gap-3 text-xs flex-wrap">
                    <span>
                        <span className="text-muted-foreground">Current: </span>
                        <code className="font-mono text-foreground bg-muted px-1 rounded">
                            {formatValue(conflict.currentValue)}
                        </code>
                    </span>
                    {!isUnsupported && conflict.newModelDefault !== undefined && (
                        <span>
                            <span className="text-muted-foreground">New default: </span>
                            <code className="font-mono text-foreground bg-muted px-1 rounded">
                                {formatValue(conflict.newModelDefault)}
                            </code>
                        </span>
                    )}
                </div>
            </div>
            <div className="flex-shrink-0 text-xs text-right pt-0.5">
                {isChecked ? (
                    <span className={isUnsupported ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"}>
                        {isUnsupported ? "Remove" : "Reset"}
                    </span>
                ) : (
                    <span className="text-muted-foreground">Keep</span>
                )}
            </div>
        </div>
    );
}
