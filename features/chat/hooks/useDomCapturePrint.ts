"use client";

import { useRef, useState, useCallback } from "react";
import type { DomCaptureOptions } from "@/features/chat/utils/dom-capture-print-utils";

export interface UseDomCapturePrintReturn {
    /** Attach this ref to the element you want to capture */
    captureRef: React.RefObject<HTMLDivElement>;
    /** Whether a capture/export is in progress */
    isCapturing: boolean;
    /** Progress 0-100 during multi-page capture */
    progress: number;
    /** Trigger PDF capture of the attached element */
    captureAsPDF: (options?: DomCaptureOptions) => Promise<void>;
    /** Error from last capture attempt, if any */
    error: string | null;
}

/**
 * Hook for capturing a DOM subtree as a PDF.
 *
 * Usage:
 *   const { captureRef, isCapturing, captureAsPDF } = useDomCapturePrint();
 *   <div ref={captureRef}>...all blocks...</div>
 *   <button onClick={() => captureAsPDF({ filename: 'response' })} disabled={isCapturing}>
 *     Full Print
 *   </button>
 */
export function useDomCapturePrint(): UseDomCapturePrintReturn {
    const captureRef = useRef<HTMLDivElement>(null);
    const [isCapturing, setIsCapturing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const captureAsPDF = useCallback(async (options: DomCaptureOptions = {}) => {
        const el = captureRef.current;
        if (!el) {
            setError("Nothing to capture — captureRef is not attached to any element.");
            return;
        }

        setIsCapturing(true);
        setProgress(0);
        setError(null);

        try {
            const { captureToPDF } = await import("@/features/chat/utils/dom-capture-print-utils");
            await captureToPDF(el, {
                filename: 'ai-response',
                scale: 2,
                ...options,
                onProgress: (page, total) => {
                    setProgress(Math.round((page / Math.max(total, 1)) * 100));
                    options.onProgress?.(page, total);
                },
            });
        } catch (err) {
            const msg = err instanceof Error ? err.message : "PDF export failed";
            setError(msg);
        } finally {
            setIsCapturing(false);
            setProgress(0);
        }
    }, []);

    return { captureRef, isCapturing, progress, captureAsPDF, error };
}
