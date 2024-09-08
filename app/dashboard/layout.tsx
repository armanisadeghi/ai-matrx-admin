import React from 'react';
import BaseLayout from '@/components/layout/base-layout';
import {Providers} from "@/lib/redux-old/providers";
import {MatrixFloatingMenu} from "@/components/layout/floating-dock";

export default function DashboardLayout(
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
