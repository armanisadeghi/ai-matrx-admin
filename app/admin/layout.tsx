// File Location: @app/admin/layout.tsx

'use client';

import React from 'react';
import BaseLayout from '@/components/layout/base-layout';
import {coreAppLinks} from "@/components/layout/core-links";
import {useWindowAware} from '@/hooks/useWindowAware';

export default function AuthenticatedLayout(
    {
        children,
    }: {
        children: React.ReactNode
    }) {
    const {layoutStyle} = useWindowAware();

    return (
        <BaseLayout links={coreAppLinks}>
            {children}
        </BaseLayout>
    );
}