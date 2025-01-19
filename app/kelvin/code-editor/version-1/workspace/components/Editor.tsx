import { Editor } from '@monaco-editor/react';
import { IconFile, IconFolder, IconChevronDown, IconX, IconTerminal } from '@tabler/icons-react';
import { useState } from 'react';

interface FileStructure {
    name: string;
    type: 'file' | 'folder';
    content?: string;
    children?: FileStructure[];
}

export const WorkspaceEditor = () => {
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [files] = useState<FileStructure[]>([
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

    const FileExplorer = ({ items }: { items: FileStructure[] }) => {
        return (
            <div className="pl-2">
                {items.map((item) => (
                    <div key={item.name}>
                        <div
                            className={`flex items-center gap-2 p-1 hover:bg-neutral-700 rounded cursor-pointer ${
                                selectedFile === item.name ? 'bg-neutral-700' : ''
                            }`}
                            onClick={() => item.type === 'file' && setSelectedFile(item.name)}
                        >
                            {item.type === 'folder' ? (
                                <>
                                    <IconChevronDown size={16} />
                                    <IconFolder size={16} className="text-blue-400" />
                                </>
                            ) : (
                                <IconFile size={16} className="ml-4 text-neutral-400" />
                            )}
                            <span className="text-sm">{item.name}</span>
                        </div>
                        {item.children && <FileExplorer items={item.children} />}
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="h-screen flex flex-col">
            {/* Header */}
            <div className="h-12 bg-neutral-900 border-b border-neutral-700 flex items-center px-4">
                <h1 className="text-sm font-medium">Workspace Editor</h1>
            </div>

            <div className="flex-1 flex">
                {/* Sidebar */}
                <div className="w-64 bg-neutral-900 border-r border-neutral-700 flex flex-col">
                    <div className="p-4 text-sm font-medium">Explorer</div>
                    <FileExplorer items={files} />
                </div>

                {/* Editor Area */}
                <div className="flex-1 flex flex-col">
                    {/* Editor Tabs */}
                    <div className="h-9 bg-neutral-900 border-b border-neutral-700 flex items-center px-2">
                        {selectedFile && (
                            <div className="flex items-center gap-2 px-3 py-1 bg-neutral-800 rounded-sm text-sm">
                                <span>{selectedFile}</span>
                                <IconX size={14} className="cursor-pointer" onClick={() => setSelectedFile(null)} />
                            </div>
                        )}
                    </div>

                    {/* Monaco Editor */}
                    <div className="flex-1">
                        {selectedFile ? (
                            <Editor
                                height="100%"
                                defaultLanguage="typescript"
                                defaultValue={files.find(f => f.name === selectedFile)?.content || ''}
                                theme="vs-dark"
                                options={{
                                    minimap: { enabled: true },
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

                    {/* Terminal */}
                    <div className="h-48 bg-neutral-900 border-t border-neutral-700">
                        <div className="flex items-center gap-2 p-2 border-b border-neutral-700">
                            <IconTerminal size={16} />
                            <span className="text-sm">Terminal</span>
                        </div>
                        <div className="p-2 text-sm font-mono">
                            <span className="text-green-400">$</span> npm start
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}