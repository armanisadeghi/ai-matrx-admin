// File Location: @app/(public)/DynamicLayout.tsx

import React from 'react';
import { PublicProviders } from './PublicProviders';
import PublicTopMenu from "@/components/matrx/ClientTopMenu";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
    return (
        <PublicProviders>
            <PublicTopMenu initialTheme='light' />
            {children}
        </PublicProviders>
    );
}
