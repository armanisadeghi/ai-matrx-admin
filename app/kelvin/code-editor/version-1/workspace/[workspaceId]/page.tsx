"use client"

import React, {useState} from 'react';
import dynamic from 'next/dynamic';
import {IconX} from '@tabler/icons-react';
import {DirectoryTree} from '@/components/DirectoryTree/DirectoryTree';
import {DirectoryTreeConfig} from '@/components/DirectoryTree/config';

// Dynamically import Monaco Editor to avoid SSR issues
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {ssr: false});

// Directory tree configuration
const treeConfig: DirectoryTreeConfig = {
    excludeFiles: [
        '*.log',
        'package-lock.json',
        'yarn.lock',
        '*.map'
    ],
    excludeDirs: [
        'node_modules',
        '.git',
        '.next',
        'coverage'
    ],
    hideHiddenFiles: false,
    showIcons: true,
    indentSize: 24,
    sortFoldersFirst: true,
    contextMenu: {
        enabled: true,
        actions: {
            preview: true,
            download: true,
            copy: true,
            delete: true,
            rename: true
        }
    }
};

export default function Page() {
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [fileContent, setFileContent] = useState<string>('');

    // Sample directory structure (you would replace this with your actual data)
    const directoryStructure: Record<string, string | Record<string, string>> | string = {
        src: {
            'App.tsx': 'export default function App() {\n  return <div>Hello World</div>;\n}',
            'index.tsx': 'import App from "./App";\n\nrender(<App />, document.getElementById("root"));'
        },
        'package.json': '{\n  "name": "my-project",\n  "version": "1.0.0"\n}'
    };

    const handleFileSelect = async (path: string) => {
        setSelectedFile(path);
        // In a real implementation, you would load the file content here
        // For now, we'll just simulate it with the sample content
        const pathParts = path.split('/');
        let content: any = directoryStructure;
        for (const part of pathParts) {
            content = content[part as keyof typeof content];
        }
        setFileContent(typeof content === 'string' ? content : '');
    };

    return (
        <>
            {/* Sidebar */}
                <div className="w-64 bg-neutral-900 border-r border-neutral-700 flex flex-col">
                    <DirectoryTree
                        structure={directoryStructure}
                        onSelect={handleFileSelect}
                        config={treeConfig}
                        title="File Explorer"
                        className="bg-transparent border-none rounded-none"
                    />
                </div>

                {/* Editor Area */}
                <div className="flex-1 flex flex-col">
                    {/* Editor Tabs */}
                    {selectedFile?.length > 0 &&
                        <div className="h-9 bg-neutral-900 border-b border-neutral-700 flex items-center px-2">
                            {selectedFile && (
                                <div className="flex items-center gap-2 px-3 py-1 bg-neutral-800 rounded-sm text-sm">
                                    <span>{selectedFile}</span>
                                    <IconX
                                        size={14}
                                        className="cursor-pointer"
                                        onClick={() => setSelectedFile(null)}
                                    />
                                </div>
                            )}
                        </div>
                    }

                    {/* Monaco Editor */}
                    <div className="flex-1">
                        {selectedFile ? (
                            <MonacoEditor
                                height="100%"
                                defaultLanguage="typescript"
                                value={fileContent}
                                theme="vs-dark"
                                options={{
                                    minimap: {enabled: true},
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
        </>
    );
}