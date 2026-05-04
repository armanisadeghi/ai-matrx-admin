'use client';

import { useCallback, useState, type ReactNode } from 'react';
import { ClipboardFallbackDialog } from '@/components/dialogs/clipboard-fallback/ClipboardFallbackDialog';

interface ShareOptions {
    title: string;
    text?: string;
    url?: string;
}

export interface UseShareResult {
    share: (options: ShareOptions) => Promise<void>;
    /** Briefly true after a successful clipboard.writeText. */
    copied: boolean;
    /**
     * Render this in your component tree. It is a hidden dialog until
     * both `navigator.share` and `navigator.clipboard.writeText` fail —
     * at which point it surfaces with the URL in a read-only input
     * pre-selected for manual copy. Replaces the legacy
     * `window.prompt('Copy this link:', url)` fallback.
     */
    fallbackDialog: ReactNode;
}

export function useShare(): UseShareResult {
    const [copied, setCopied] = useState(false);
    const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);

    const share = useCallback(async (options: ShareOptions) => {
        const url =
            options.url ??
            (typeof window !== 'undefined' ? window.location.href : '');
        const payload = { title: options.title, text: options.text, url };

        // Native share sheet — works on iOS Safari, Android Chrome, and desktop Chrome/Edge
        if (typeof navigator !== 'undefined' && navigator.share) {
            try {
                await navigator.share(payload);
                return;
            } catch {
                // User cancelled or share failed — fall through to clipboard
            }
        }

        // Clipboard fallback
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Last resort: surface a Dialog with the URL in a readonly,
            // pre-selected input so the user can copy with Cmd/Ctrl+C.
            // Consumers must render `fallbackDialog` from this hook for
            // this to mount.
            setFallbackUrl(url);
        }
    }, []);

    const fallbackDialog = (
        <ClipboardFallbackDialog
            open={fallbackUrl !== null}
            onOpenChange={(open) => {
                if (!open) setFallbackUrl(null);
            }}
            url={fallbackUrl ?? ''}
        />
    );

    return { share, copied, fallbackDialog };
}
