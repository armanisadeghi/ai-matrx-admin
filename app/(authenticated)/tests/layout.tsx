// File Location: @app/tests/layout.tsx

'use client';

import React, { useEffect } from 'react';
import BaseLayout from '@/components/layout/base-layout';
import { coreAppLinks } from "@/components/layout/core-links";
import { useDispatch } from 'react-redux';
import { setLayoutStyle } from '@/lib/redux/slices/layoutSlice';
import { useWindowAware } from '@/hooks/useWindowAware';

export default function TestsLayout({
                                        children,
                                    }: {
    children: React.ReactNode
}) {
    const dispatch = useDispatch();
    const { isInWindow, layoutStyle } = useWindowAware();

    useEffect(() => {
        if (!isInWindow) {
            dispatch(setLayoutStyle('normal'));
        }
    }, [isInWindow, dispatch]);

    return (
        <BaseLayout links={coreAppLinks}>
            {children}
        </BaseLayout>
    );
}