import React from 'react';
import BaseLayout from '@/components/layout/base-layout';
import {CameraProvider} from "@/components/matrx/camera/camera-provider";
import {Providers} from "@/lib/redux-old/providers";

export default function CounterLayout(
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
