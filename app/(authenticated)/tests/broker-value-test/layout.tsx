'use client';

import React from "react";
import {filteredPages, MODULE_HOME, MODULE_NAME} from './config';
import EnhancedEntityAnalyzer from "@/components/admin/redux/EnhancedEntityAnalyzer";
import MatrxDynamicPanel from "@/components/matrx/resizable/MatrxDynamicPanel";
import ModuleHeaderWithProvider from "@/components/matrx/navigation/ModuleHeaderWithProvider";

export default function Layout(
    {
        children,
    }: {
        children: React.ReactNode;
    }) {
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';

    return (
        <div className="flex flex-col h-full w-full overflow-hidden">
            {/* Make the header sticky */}
            <ModuleHeaderWithProvider
                pages={filteredPages}
                currentPath={currentPath}
                moduleHome={MODULE_HOME}
                moduleName={MODULE_NAME}
                className="sticky top-0 z-10"
            />
            <MatrxDynamicPanel
                initialPosition="left"
                defaultExpanded={false}
                expandButtonProps={{
                    label: 'Entity State',
                }}
            >
                <EnhancedEntityAnalyzer
                    defaultExpanded={false}
                    selectedEntityKey="brokerValue"
                />
            </MatrxDynamicPanel>
            <main className="flex-1 overflow-hidden">
                {children}
            </main>
        </div>
    );
}
