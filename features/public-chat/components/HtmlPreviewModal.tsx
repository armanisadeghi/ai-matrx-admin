'use client';

import React from 'react';
import HtmlPreviewFullScreenEditor from '@/features/html-pages/components/HtmlPreviewFullScreenEditor';
import { useHtmlPreviewState } from '@/features/html-pages/hooks/useHtmlPreviewState';

interface HtmlPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    content: string;
}

/**
 * Lazy-loaded wrapper for HTML preview functionality.
 * Only loads the heavy useHtmlPreviewState hook and HtmlPreviewFullScreenEditor
 * when this component is actually mounted (i.e., when user clicks to open it).
 */
export default function HtmlPreviewModal({ isOpen, onClose, content }: HtmlPreviewModalProps) {
    // This hook only runs when the component is mounted (lazy loaded)
    const htmlPreviewState = useHtmlPreviewState({
        markdownContent: content,
        user: null, // No user in public context
        isOpen: isOpen,
    });

    return (
        <HtmlPreviewFullScreenEditor
            isOpen={isOpen}
            onClose={onClose}
            htmlPreviewState={htmlPreviewState}
            title="HTML Preview & Publishing"
            description="Edit markdown, preview HTML, and publish your content"
        />
    );
}
