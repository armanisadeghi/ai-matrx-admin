'use client';

import { useState, useCallback } from 'react';

interface ShareOptions {
    title: string;
    text?: string;
    url?: string;
}

export function useShare() {
    const [copied, setCopied] = useState(false);

    const share = useCallback(async (options: ShareOptions) => {
        const url = options.url ?? (typeof window !== 'undefined' ? window.location.href : '');
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
            // Last resort: prompt
            window.prompt('Copy this link:', url);
        }
    }, []);

    return { share, copied };
}
