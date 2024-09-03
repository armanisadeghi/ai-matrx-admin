// File Location: @/app/registered-functions/layout.tsx

import React from 'react';
import BaseLayout from '@/components/layout/base-layout';
import {Providers} from "@/lib/redux-old/providers";

export default function BasicLayout(
    {
        children,
    }: {
        children: React.ReactNode
    }) {
    return (
        <Providers>
            <BaseLayout
                leftSidebarProps={{available: true, state: 'full'}}
                rightSidebarProps={{available: true, state: 'full'}}
            >
                {children}
            </BaseLayout>
        </Providers>
    );
}
