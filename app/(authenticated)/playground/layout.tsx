// /layout.tsx
'use client';

import ModuleHeaderWithProvider from '@/components/matrx/navigation/module-header/ModuleHeader';
import { filteredPages, MODULE_HOME, MODULE_NAME } from './config';
import React from 'react';
import MatrxDynamicPanel from '@/components/matrx/resizable/MatrxDynamicPanel';
import EnhancedEntityAnalyzer from '@/components/admin/redux/EnhancedEntityAnalyzer';
import EditorStateVisualizer from '@/features/rich-text-editor/admin/sidebar-analyzer/EditorStateVisualizer';
import EditorAnalyzer from '@/features/rich-text-editor/admin/sidebar-analyzer/EditorAnalyzer';

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <div className='flex flex-col h-full'>
            {/* <div className='sticky top-0 z-50'>
                <ModuleHeaderWithProvider
                    pages={filteredPages}
                    moduleHome={MODULE_HOME}
                    moduleName={MODULE_NAME}
                />
            </div> */}
            <MatrxDynamicPanel
                initialPosition='left'
                defaultExpanded={false}
                expandButtonProps={{
                    label: 'Admin Entity State',
                }}
            >
                <EnhancedEntityAnalyzer
                    defaultExpanded={false}
                    selectedEntityKey='dataBroker'
                />
            </MatrxDynamicPanel>
            {/* <MatrxDynamicPanel
                initialPosition='left'
                defaultExpanded={false}
                expandButtonProps={{
                    label: 'Editor Analyzer',
                }}
            >
                <EditorAnalyzer />
                <EditorStateVisualizer />
            </MatrxDynamicPanel> */}

            <main className='flex-1'>{children}</main>
        </div>
    );
}
