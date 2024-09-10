// File Location: @app/tests/layout.tsx

import React from 'react';
import BaseLayout from '@/components/layout/base-layout';
import {coreAppLinks} from "@/components/layout/core-links";

export default function AuthenticatedLayout(
    {
        children,
    }: {
        children: React.ReactNode
    }) {
    return (
        <BaseLayout links={coreAppLinks}>
            {children}
        </BaseLayout>
    );
}
