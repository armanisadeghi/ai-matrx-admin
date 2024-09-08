// components/layout/base-layout.tsx
'use client';

import React, { ReactNode } from 'react';
import TopMenu from '@/components/layout/top-menu';
import LeftSidebar from '@/components/layout/left-sidebar-annimated';
import RightSidebar from '@/components/layout/right-sidebar';

interface BaseLayoutProps {
    children: ReactNode;
    leftSidebarProps?: {
        available: boolean;
        state: 'closed' | 'icon' | 'full';
    };
    rightSidebarProps?: {
        available: boolean;
        state: 'closed' | 'full';
    };
}

const BaseLayout: React.FC<BaseLayoutProps> = ({
                                                   children,
                                                   leftSidebarProps = { available: false, state: 'closed' },
                                                   rightSidebarProps = { available: false, state: 'closed' },
                                               }) => {
    return (
        <div className="flex flex-col min-h-screen">
            <TopMenu
                leftSidebarAvailable={leftSidebarProps.available}
                rightSidebarAvailable={rightSidebarProps.available}
                toggleRightSidebar={() => {}} // Placeholder function, modify if needed
            />
            <div className="flex flex-1">
                {leftSidebarProps.available && (
                    <LeftSidebar
                        available={true}
                        state={leftSidebarProps.state}
                    />
                )}
                <main className="flex-1">{children}</main>
                <RightSidebar
                    available={rightSidebarProps.available}
                    state={rightSidebarProps.state}
                />
            </div>
        </div>
    );
};

export default BaseLayout;