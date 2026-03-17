'use client';

import React from 'react';
import HtmlPreviewFullScreenEditor from '@/features/html-pages/components/HtmlPreviewFullScreenEditor';
import { useHtmlPreviewState } from '@/features/html-pages/hooks/useHtmlPreviewState';
import { useAppSelector } from '@/lib/redux/hooks';
import { selectUser } from '@/lib/redux/selectors/userSelectors';

interface HtmlPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    content: string;
}

/**
 * Lazy-loaded wrapper for HTML preview functionality.
 * Only loads the heavy useHtmlPreviewState hook and HtmlPreviewFullScreenEditor
 * when this component is actually mounted (i.e., when user clicks to open it).
 *
 * User is read from Redux — works in both authenticated SSR routes and public
 * routes (where Redux is available but user may be null).
 */
export default function HtmlPreviewModal({ isOpen, onClose, content }: HtmlPreviewModalProps) {
    let user: any = null;
    try {
        // Safe — Redux provider is available in SSR routes; public routes without
        // Redux will catch the error and fall back to null (save button disabled).
        // eslint-disable-next-line react-hooks/rules-of-hooks
        user = useAppSelector(selectUser);
    } catch {
        // Public context without Redux provider — save features disabled
    }

    const htmlPreviewState = useHtmlPreviewState({
        markdownContent: content,
        user: user?.id ? user : null,
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
