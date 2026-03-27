"use client";

import { useEffect, useRef } from "react";
import type { PromptMessage, PromptVariable, PromptSettings } from "@/features/prompts/types/core";
import {
    STORAGE_KEY,
    type AutoSaveData,
} from "@/features/prompts/components/builder/PromptBuilderErrorBoundary";

const DEBOUNCE_MS = 2000;

interface UsePromptAutoSaveParams {
    promptId?: string;
    promptName: string;
    developerMessage: string;
    messages: PromptMessage[];
    variableDefaults: PromptVariable[];
    modelConfig: PromptSettings;
    model: string;
    isDirty: boolean;
}

export function usePromptAutoSave({
    promptId,
    promptName,
    developerMessage,
    messages,
    variableDefaults,
    modelConfig,
    model,
    isDirty,
}: UsePromptAutoSaveParams) {
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!isDirty) return;

        if (timerRef.current) clearTimeout(timerRef.current);

        timerRef.current = setTimeout(() => {
            try {
                const data: AutoSaveData = {
                    promptId,
                    promptName,
                    developerMessage,
                    messages: [
                        { role: "system", content: developerMessage },
                        ...messages,
                    ],
                    variableDefaults: variableDefaults.map((v) => ({
                        name: v.name,
                        defaultValue: v.defaultValue,
                    })),
                    modelConfig: modelConfig as Record<string, unknown>,
                    model,
                    timestamp: Date.now(),
                };
                localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            } catch {
                // quota exceeded or private browsing — silently ignore
            }
        }, DEBOUNCE_MS);

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [
        promptId,
        promptName,
        developerMessage,
        messages,
        variableDefaults,
        modelConfig,
        model,
        isDirty,
    ]);

    // Clear auto-save when the prompt is successfully saved (isDirty goes false)
    useEffect(() => {
        if (!isDirty) {
            try {
                localStorage.removeItem(STORAGE_KEY);
            } catch {
                // ignore
            }
        }
    }, [isDirty]);
}
