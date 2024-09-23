// File Location: @app/(public)/layout.tsx

import React from 'react';
import { PublicProviders } from './PublicProviders';
import PublicTopMenu from "@/components/matrx/PublicTopMenu";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
    return (
        <PublicProviders>
            <PublicTopMenu />
            {children}
        </PublicProviders>
    );
}
