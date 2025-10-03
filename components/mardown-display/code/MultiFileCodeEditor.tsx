"use client";
import { useState, useCallback } from "react";
import SmallCodeEditor from "./SmallCodeEditor";
import { File, FileCode, FileType, Folder } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CodeFile {
    name: string;
    path: string;
    language: string;
    content: string;
    icon?: React.ReactNode;
}

interface MultiFileCodeEditorProps {
    files: CodeFile[];
    onChange?: (path: string, content: string) => void;
    onFileSelect?: (path: string) => void;
    runCode?: () => void;
    autoFormatOnOpen?: boolean;
    showSidebar?: boolean;
    height?: string;
}

export default function MultiFileCodeEditor({
    files,
    onChange,
    onFileSelect,
    runCode,
    autoFormatOnOpen = false,
    showSidebar = true,
    height = "600px"
}: MultiFileCodeEditorProps) {
    const [activeFile, setActiveFile] = useState<string>(files[0]?.path || "");

    const currentFile = files.find(f => f.path === activeFile);

    const handleFileSelect = useCallback((path: string) => {
        setActiveFile(path);
        onFileSelect?.(path);
    }, [onFileSelect]);

    const handleContentChange = useCallback((content: string | undefined) => {
        if (content !== undefined && activeFile) {
            onChange?.(activeFile, content);
        }
    }, [activeFile, onChange]);

    const getFileIcon = (file: CodeFile) => {
        if (file.icon) return file.icon;
        
        const ext = file.name.split('.').pop()?.toLowerCase();
        switch (ext) {
            case 'html':
            case 'htm':
                return <FileCode className="h-4 w-4 text-orange-500 dark:text-orange-400" />;
            case 'css':
            case 'scss':
            case 'sass':
                return <FileType className="h-4 w-4 text-blue-500 dark:text-blue-400" />;
            case 'js':
            case 'jsx':
            case 'ts':
            case 'tsx':
                return <FileCode className="h-4 w-4 text-yellow-500 dark:text-yellow-400" />;
            case 'json':
                return <File className="h-4 w-4 text-green-500 dark:text-green-400" />;
            default:
                return <File className="h-4 w-4 text-gray-500 dark:text-gray-400" />;
        }
    };

    if (!currentFile) return null;

    return (
        <div className="flex h-full border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden" style={{ height }}>
            {/* File Sidebar */}
            {showSidebar && (
                <div className="w-48 bg-gray-50 dark:bg-gray-900 border-r border-gray-300 dark:border-gray-700 overflow-y-auto">
                    <div className="p-2 border-b border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
                        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                            <Folder className="h-4 w-4" />
                            Files
                        </div>
                    </div>
                    <div className="p-1">
                        {files.map((file) => (
                            <button
                                key={file.path}
                                onClick={() => handleFileSelect(file.path)}
                                className={cn(
                                    "w-full flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors",
                                    "hover:bg-gray-200 dark:hover:bg-gray-800",
                                    activeFile === file.path
                                        ? "bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100 font-medium"
                                        : "text-gray-700 dark:text-gray-300"
                                )}
                            >
                                {getFileIcon(file)}
                                <span className="truncate">{file.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Editor Area */}
            <div className="flex-1 flex flex-col">
                {/* Active File Tab */}
                <div className="px-4 py-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                        {getFileIcon(currentFile)}
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {currentFile.name}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                            {currentFile.language}
                        </span>
                    </div>
                </div>

                {/* Monaco Editor - uses path prop for multi-model support */}
                <div className="flex-1">
                    <SmallCodeEditor
                        path={activeFile}
                        language={currentFile.language}
                        initialCode={currentFile.content}
                        onChange={handleContentChange}
                        runCode={runCode}
                        autoFormat={autoFormatOnOpen}
                        showFormatButton={true}
                        showCopyButton={true}
                        showResetButton={true}
                        showWordWrapToggle={true}
                        showMinimapToggle={false}
                        height="100%"
                    />
                </div>
            </div>
        </div>
    );
}

