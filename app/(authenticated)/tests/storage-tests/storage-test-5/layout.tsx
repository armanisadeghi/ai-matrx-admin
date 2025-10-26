// /layout.tsx
'use client';

import React from "react";
import MatrxDynamicPanel from "@/components/matrx/resizable/MatrxDynamicPanel";
import {DirectoryTree} from "@/components/FileManager/TreeView/concepts/DirectoryTree";
import DebuggerConsole from '@/components/file-operations/debugger/DebuggerConsole';
import { DirectoryTreeConfig } from "@/components/DirectoryTree/config";

const DEFAULT_STORAGE_TREE_CONFIG: DirectoryTreeConfig = {
    excludeFiles: [],
    excludeDirs: [],
    hideHiddenFiles: false,
    showIcons: true,
    indentSize: 24,
    sortFoldersFirst: true,
};


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
