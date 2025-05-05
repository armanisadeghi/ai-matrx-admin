'use client';

import React from "react";
import ResponsiveModuleHeaderWithProvider from '@/components/matrx/navigation/ResponsiveModuleHeaderWithProvider';
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
        <div className="flex flex-col h-full">
            <div className="sticky top-0 z-10 bg-matrx-card-background">
                <ResponsiveModuleHeaderWithProvider
                    pages={filteredPages}
                    currentPath={currentPath}
                    moduleHome={MODULE_HOME}
                    moduleName={MODULE_NAME}
                />
            </div>
            <MatrxDynamicPanel
                initialPosition="left"
                defaultExpanded={false}
                expandButtonProps={{
                    label: 'Registered Function State',
                }}
            >
                <EnhancedEntityAnalyzer
                    defaultExpanded={false}/>
            </MatrxDynamicPanel>
            <main className="flex-1">
                {children}
            </main>
        </div>
    );
}
