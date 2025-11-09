'use client';

import { PromptAppRenderer } from './PromptAppRenderer';
import type { PromptApp } from '../types';

interface PromptAppPreviewProps {
    app: PromptApp;
    slug: string;
    isDraft?: boolean;
}

export function PromptAppPreview({ app, slug, isDraft }: PromptAppPreviewProps) {
    return (
        <>
            {isDraft && (
                <div className="bg-warning text-warning-foreground px-4 py-2 text-center text-sm font-medium">
                    ⚠️ PREVIEW MODE - This app is not published yet
                </div>
            )}
            <PromptAppRenderer app={app} slug={slug} />
        </>
    );
}

