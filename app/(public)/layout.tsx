// File Location: @app/(public)/layout.tsx

import React from 'react';
import { PublicProviders } from './PublicProviders';
import { PublicHeader } from "@/components/matrx/PublicHeader";

/**
 * Public Layout
 * 
 * Architecture:
 * - PublicProviders wraps only client-side necessities (ReactQuery, Theme, Google API)
 * - PublicHeader is a client component that uses delayed auth detection (non-blocking)
 * - Metadata and favicons automatically inherit from root layout
 * - Theme detection happens server-side via cookies in root layout
 * - Mobile-first with proper h-10 header height (--header-height CSS variable)
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
    return (
        <PublicProviders>
            <div className="min-h-dvh flex flex-col">
                <PublicHeader />
                <main className="flex-1">
                    {children}
                </main>
            </div>
        </PublicProviders>
    );
}
