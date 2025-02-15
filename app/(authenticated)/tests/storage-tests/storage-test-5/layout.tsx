// /layout.tsx
'use client';

import ModuleHeaderWithProvider from '@/components/matrx/navigation/module-header/ModuleHeader';
import {DEFAULT_STORAGE_TREE_CONFIG, filteredPages, MODULE_HOME, MODULE_NAME} from '../config';
import React from "react";
import MatrxDynamicPanel from "@/components/matrx/resizable/MatrxDynamicPanel";
import {DirectoryTree} from "@/components/FileManager/TreeView/concepts/DirectoryTree";
import DebuggerConsole from '@/components/file-operations/debugger/DebuggerConsole';

export default function Layout({children,}: { children: React.ReactNode; }) {
    return (
        <div className="flex flex-col h-full">
            <MatrxDynamicPanel
                initialPosition="left"
                defaultExpanded={true}
                expandButtonProps={{
                    label: 'File Explorer',
                }}
            >
                <DirectoryTree
                    config={DEFAULT_STORAGE_TREE_CONFIG}
                    title="Project Files"
                />
            </MatrxDynamicPanel>
            <MatrxDynamicPanel
                initialPosition="right"
                defaultExpanded={false}
                expandButtonProps={{
                    label: 'File Debugger',
                }}
            >
                <DebuggerConsole />
            </MatrxDynamicPanel>

            <main className="flex-1">
                {children}
            </main>
        </div>
    );
}
