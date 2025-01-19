"use client"

import {useState} from 'react';
import dynamic from 'next/dynamic';
import {IconX} from '@tabler/icons-react';
import {FileExplorer, IFileStructure} from '../components';

// Dynamically import Monaco Editor to avoid SSR issues
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {ssr: false});

export default function Page() {
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [files] = useState<IFileStructure[]>([
        {
            name: 'src',
            type: 'folder',
            children: [
                {
                    name: 'App.tsx',
                    type: 'file',
                    content: 'export default function App() {\n  return <div>Hello World</div>;\n}'
                },
                {
                    name: 'index.tsx',
                    type: 'file',
                    content: 'import App from "./App";\n\nrender(<App />, document.getElementById("root"));'
                }
            ]
        },
        {
            name: 'package.json',
            type: 'file',
            content: '{\n  "name": "my-project",\n  "version": "1.0.0"\n}'
        }
    ]);

    const findFileContent = (fileName: string): string => {
        const findInItems = (items: IFileStructure[]): string | undefined => {
            for (const item of items) {
                if (item.name === fileName) return item.content;
                if (item.children) {
                    const content = findInItems(item.children);
                    if (content) return content;
                }
            }
            return undefined;
        };
        return findInItems(files) || '';
    };

    return (
        <>
            {/* Sidebar */}
            <div className="w-64 bg-neutral-900 border-r border-neutral-700 flex flex-col">
                <div className="p-4 text-sm font-medium">Explorer</div>
                <FileExplorer
                    items={files}
                    selectedFile={selectedFile}
                    onFileSelect={setSelectedFile}
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
                            defaultValue={findFileContent(selectedFile)}
                            theme="vs-dark"
                            options={{
                                minimap: {enabled: true},
                                fontSize: 14,
                                wordWrap: 'on',
                                automaticLayout: true,
                            }}
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