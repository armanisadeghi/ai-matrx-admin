// /layout.tsx
"use client";

import { ModuleHeader } from '@/components/layout/new-layout/PageSpecificHeader';
import {filteredPages, MODULE_HOME, MODULE_NAME} from './config';

export default function Layout(
    {
        children,
    }: {
        children: React.ReactNode;
    }) {
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    return (
        <div className="flex flex-col" style={{ height: 'calc(100vh - 12px)' }}>
            <ModuleHeader
                pages={filteredPages}
                currentPath={currentPath}
                moduleHome={MODULE_HOME}
                moduleName={MODULE_NAME}
            />
            <main className="w-full flex-1 min-h-0 bg-gray-100 dark:bg-neutral-800 overflow-hidden">
                {children}
            </main>
        </div>
    );
}
