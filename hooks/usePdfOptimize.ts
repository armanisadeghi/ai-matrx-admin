import { useState, useCallback } from 'react';

export interface PdfOptimizeResult {
    optimizedFile: File;
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
}

interface UsePdfOptimizeReturn {
    optimizePdf: (file: File, level?: number) => Promise<PdfOptimizeResult | null>;
    isOptimizing: boolean;
    error: string | null;
    clearError: () => void;
}

export function usePdfOptimize(): UsePdfOptimizeReturn {
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const clearError = useCallback(() => setError(null), []);

    const optimizePdf = useCallback(async (file: File, level: number = 2): Promise<PdfOptimizeResult | null> => {
        setError(null);
        setIsOptimizing(true);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('level', String(level));
            formData.append('targetSizeMB', '10');

            const response = await fetch('/api/pdf/compress', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({ error: 'Compression failed' }));
                throw new Error(data.error || 'Compression failed');
            }

            const originalSize = parseInt(response.headers.get('X-Original-Size') || '0', 10);
            const compressedSize = parseInt(response.headers.get('X-Compressed-Size') || '0', 10);
            const compressionRatio = parseFloat(response.headers.get('X-Compression-Ratio') || '0');

            const blob = await response.blob();
            const optimizedFile = new File([blob], file.name, { type: 'application/pdf' });

            return {
                optimizedFile,
                originalSize: originalSize || file.size,
                compressedSize: compressedSize || blob.size,
                compressionRatio,
            };
        } catch (err) {
            const message = err instanceof Error ? err.message : 'PDF optimization failed';
            setError(message);
            return null;
        } finally {
            setIsOptimizing(false);
        }
    }, []);

    return { optimizePdf, isOptimizing, error, clearError };
}
