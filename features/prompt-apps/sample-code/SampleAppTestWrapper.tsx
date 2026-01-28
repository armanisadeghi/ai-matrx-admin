'use client';

/**
 * Client-side wrapper for testing sample app code
 * 
 * This mirrors how production works:
 * - Production: component_code string is only evaluated CLIENT-SIDE
 * - Test: SampleAppCode is only imported CLIENT-SIDE (here)
 * 
 * The server page renders this wrapper, keeping the test flow
 * identical to production where component code never touches the server.
 */
import { PromptAppPublicRendererFastAPI } from '@/features/prompt-apps/components/PromptAppPublicRendererFastAPI';
import SampleAppCode from './sample-app-code';
import type { PromptApp } from '../types';

interface SampleAppTestWrapperProps {
    app: PromptApp;
    slug: string;
}

export function SampleAppTestWrapper({ app, slug }: SampleAppTestWrapperProps) {
    return (
        <PromptAppPublicRendererFastAPI
            app={app}
            slug={slug}
            TestComponent={SampleAppCode}
        />
    );
}
