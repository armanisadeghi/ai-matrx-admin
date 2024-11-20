// EmailAppPage.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { EmailAppLayout } from './EmailAppLayout';

const EmailAppPage = () => {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [activeView, setActiveView] = useState<'list' | 'content'>('list');

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <EmailAppLayout
            isSidebarCollapsed={isSidebarCollapsed}
            setIsSidebarCollapsed={setIsSidebarCollapsed}
            isMobile={isMobile}
            activeView={activeView}
            setActiveView={setActiveView}
        />
    );
};

export default EmailAppPage;


