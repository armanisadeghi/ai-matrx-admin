"use client"

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { IconX } from '@tabler/icons-react';
import {ExplorerPanel, OutputPanel, ProblemsPanel, TerminalPanel} from "@/app/kelvin/code-editor/version-1/workspace/[workspaceId]/components/ExplorerPanel";
import {PanelConfig} from "./WorkspaceLayout/types";
import {DEFAULT_PANELS} from "./WorkspaceLayout/config";
import { WorkspaceLayout } from '../[workspaceId]/WorkspaceLayout/Layout';

// Dynamically import Monaco Editor to avoid SSR issues
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

export default function Page() {
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [fileContent, setFileContent] = useState<string>('');
    const [terminalContent, setTerminalContent] = useState<string[]>(['$ npm start']);

    // Sample directory structure
    const directoryStructure = {
        src: {
            'App.tsx': 'export default function App() {\n  return <div>Hello World</div>;\n}',
            'index.tsx': 'import App from "./App";\n\nrender(<App />, document.getElementById("root"));'
        },
        'package.json': '{\n  "name": "my-project",\n  "version": "1.0.0"\n}'
    };

    const handleFileSelect = async (path: string) => {
        setSelectedFile(path);
        const pathParts = path.split('/');
        let content: any = directoryStructure;
        for (const part of pathParts) {
            content = content[part as keyof typeof content];
        }
        setFileContent(typeof content === 'string' ? content : '');
    };

    // Custom panel configurations with actual components
    const panels: PanelConfig[] = [
        {
            ...DEFAULT_PANELS.find(p => p.id === 'explorer')!,
            component: () => (
                <ExplorerPanel
                    structure={directoryStructure}
                    onSelect={handleFileSelect}
                />
            )
        },
        {
            ...DEFAULT_PANELS.find(p => p.id === 'terminal')!,
            component: () => (
                <TerminalPanel content={terminalContent} />
            )
        },
        {
            ...DEFAULT_PANELS.find(p => p.id === 'output')!,
            component: OutputPanel
        },
        {
            ...DEFAULT_PANELS.find(p => p.id === 'problems')!,
            component: ProblemsPanel
        }
    ];

    // Initial layout state
    const initialLayoutState = {
        panels: {
            explorer: { isVisible: true, size: 250, position: 1 },
            terminal: { isVisible: true, size: 300, position: 1 },
            output: { isVisible: false, size: 250, position: 1 },
            problems: { isVisible: false, size: 250, position: 2 }
        },
        activePanel: {
            left: 'explorer',
            bottom: 'terminal'
        }
    };

    // Main editor content
    const editorContent = (
        <div className="h-full flex flex-col">
            {/* Editor Tabs */}
            {selectedFile && (
                <div className="h-9 bg-neutral-900 border-b border-neutral-700 flex items-center px-2">
                    <div className="flex items-center gap-2 px-3 py-1 bg-neutral-800 rounded-sm text-sm">
                        <span>{selectedFile}</span>
                        <IconX
                            size={14}
                            className="cursor-pointer"
                            onClick={() => setSelectedFile(null)}
                        />
                    </div>
                </div>
            )}

            {/* Monaco Editor */}
            <div className="flex-1">
                {selectedFile ? (
                    <MonacoEditor
                        height="100%"
                        defaultLanguage="typescript"
                        value={fileContent}
                        theme="vs-dark"
                        options={{
                            minimap: { enabled: true },
                            fontSize: 14,
                            wordWrap: 'on',
                            automaticLayout: true,
                        }}
                        onChange={(value) => setFileContent(value || '')}
                    />
                ) : (
                    <div className="h-full flex items-center justify-center text-neutral-400">
                        Select a file to start editing
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <WorkspaceLayout
            panels={panels}
            initialState={initialLayoutState}
            onLayoutChange={(newState) => {
                // Handle layout changes if needed
                console.log('Layout changed:', newState);
            }}
        >
            {editorContent}
        </WorkspaceLayout>
    );
}