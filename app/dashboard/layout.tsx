// File Location: @app/dashboard/layout.tsx

'use client';

import React, { useEffect } from 'react';
import BaseLayout from '@/components/layout/base-layout';
import { coreAppLinks } from "@/components/layout/core-links";
import { useDispatch } from 'react-redux';
import { setLayoutStyle } from '@/lib/redux/slices/layoutSlice';
import { useWindowAware } from '@/hooks/useWindowAware';

export default function DashboardLayout({
                                            children,
                                        }: {
    children: React.ReactNode
}) {
    const dispatch = useDispatch();
    const { layoutStyle } = useWindowAware();

    useEffect(() => {
        dispatch(setLayoutStyle('normal'));
    }, [dispatch]);

    return (
        <BaseLayout links={coreAppLinks}>
            {children}
        </BaseLayout>
    );
}