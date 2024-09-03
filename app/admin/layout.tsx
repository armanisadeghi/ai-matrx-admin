// File Location: @app/admin/layout.tsx

import React from 'react';
import BaseLayout from '@/components/layout/base-layout';
import StoreProvider from "@/app/StoreProvider";

export default function BasicLayout(
    {
        children,
    }: {
        children: React.ReactNode
    }) {
    return (
        <StoreProvider>
            <BaseLayout
                leftSidebarProps={{available: true, state: 'closed'}}
                rightSidebarProps={{available: true, state: 'full'}}
            >
                {children}
            </BaseLayout>
        </StoreProvider>
    );
}
