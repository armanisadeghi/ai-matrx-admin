// File Location: @app/(public)/DynamicLayout.tsx

import React from 'react';
import { PublicProviders } from './PublicProviders';
import { PublicHeader } from "@/components/matrx/PublicHeader";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
    return (
        <PublicProviders>
            <PublicHeader />
            {children}
        </PublicProviders>
    );
}
