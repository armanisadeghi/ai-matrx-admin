import React from 'react';
import BaseLayout from '@/components/layout/base-layout';
import {CameraProvider} from "@/components/ui/added-ui/camera/camera-provider";

export default function CounterLayout(
    {
        children,
    }: {
        children: React.ReactNode
    }) {
    return (
        <BaseLayout
            leftSidebarProps={{available: true, state: 'full'}}
            rightSidebarProps={{available: true, state: 'full'}}
        >
            <CameraProvider>{children}</CameraProvider>
        </BaseLayout>
    );
}
