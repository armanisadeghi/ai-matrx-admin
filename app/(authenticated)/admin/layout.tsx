'use client';

import React from "react";
import {ModuleHeader} from '@/components/matrx/navigation';
import {filteredPages, MODULE_HOME, MODULE_NAME} from './config';
import EnhancedEntityAnalyzer from "@/components/admin/redux/EnhancedEntityAnalyzer";
import MatrxDynamicPanel from "@/components/matrx/resizable/MatrxDynamicPanel";

export default function Layout(
    {
        children,
    }: {
        children: React.ReactNode;
    }) {
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';

    return (
        <div className="flex flex-col h-full w-full">
            {/* Make the header sticky */}
            <ModuleHeader
                pages={filteredPages}
                currentPath={currentPath}
                moduleHome={MODULE_HOME}
                moduleName={MODULE_NAME}
                className="sticky top-0 z-10"
            />
            <main className="flex-1">
                {children}
            </main>
        </div>
    );
}
