// components/layout/base-layout.tsx
'use client';

import React, {ReactNode, useState, useEffect} from 'react';
import TopMenu from '@/components/layout/top-menu';
import LeftSidebar from '@/components/layout/left-sidebar';
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

const BaseLayout: React.FC<BaseLayoutProps> = (
    {
        children,
        leftSidebarProps = {available: false, state: 'closed'},
        rightSidebarProps = {available: false, state: 'closed'}
    }) => {
    const [leftSidebarState, setLeftSidebarState] = useState<'closed' | 'icon' | 'full'>('closed');
    const [rightSidebarState, setRightSidebarState] = useState<'closed' | 'full'>('closed');

    useEffect(() => {
        setLeftSidebarState(leftSidebarProps.state);
        setRightSidebarState(rightSidebarProps.state);
    }, [leftSidebarProps.state, rightSidebarProps.state]);

    const toggleLeftSidebar = () => {
        setLeftSidebarState(current => {
            if (current === 'closed') return 'icon';
            if (current === 'icon') return 'full';
            return 'closed';
        });
    };

    const toggleRightSidebar = () => {
        setRightSidebarState(current => current === 'closed' ? 'full' : 'closed');
    };

    return (
        <div className="flex flex-col min-h-screen">
            <TopMenu
                leftSidebarAvailable={leftSidebarProps.available}
                rightSidebarAvailable={rightSidebarProps.available}
                toggleLeftSidebar={toggleLeftSidebar}
                toggleRightSidebar={toggleRightSidebar}
            />
            <div className="flex flex-1">
                <LeftSidebar available={leftSidebarProps.available} state={leftSidebarState}/>
                <main className="flex-1">{children}</main>
                <RightSidebar available={rightSidebarProps.available} state={rightSidebarState}/>
            </div>
        </div>
    );
};

export default BaseLayout;
