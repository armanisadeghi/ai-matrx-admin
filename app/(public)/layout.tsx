import React from 'react';
import BaseLayout from '@/components/layout/base-layout';

export default function AuthenticatedLayout({
                                                children,
                                            }: {
    children: React.ReactNode
}) {
    return (
        <BaseLayout
            leftSidebarProps={{ available: true, state: 'full' }}
            rightSidebarProps={{ available: true, state: 'full' }}
        >
            {children}
        </BaseLayout>
    );
}
