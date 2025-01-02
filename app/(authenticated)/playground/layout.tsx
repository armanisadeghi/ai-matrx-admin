// /layout.tsx
'use client';

import ModuleHeaderWithProvider from '@/components/matrx/navigation/module-header/ModuleHeader';
import { filteredPages, MODULE_HOME, MODULE_NAME} from './config';
import React from "react";
import MatrxDynamicPanel from '@/components/matrx/resizable/MatrxDynamicPanel';
import EnhancedEntityAnalyzer from '@/components/admin/redux/EnhancedEntityAnalyzer';

export default function Layout({children}: { children: React.ReactNode }) {
    return (
        <div className="flex flex-col h-full">
            <div className="sticky top-0 z-50">
                <ModuleHeaderWithProvider
                    pages={filteredPages}
                    moduleHome={MODULE_HOME}
                    moduleName={MODULE_NAME}
                />
            </div>
            <MatrxDynamicPanel
                initialPosition="left"
                defaultExpanded={false}
                expandButtonProps={{
                    label: 'Entity State',
                }}
            >
                <EnhancedEntityAnalyzer
                    defaultExpanded={false}
                    selectedEntityKey="recipe"
                />
            </MatrxDynamicPanel>

            <main className="flex-1">
                {children}
            </main>
        </div>
    );
}