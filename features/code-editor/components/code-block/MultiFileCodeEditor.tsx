"use client";
import { useState, useCallback } from "react";
import SmallCodeEditor from "./SmallCodeEditor";
import { File, FileCode, FileType, Folder, PanelLeftClose, PanelLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { useMeasure } from "@uidotdev/usehooks";

export interface CodeFile {
    name: string;
    path: string;
    language: string;
    content: string;
    icon?: React.ReactNode;
    readOnly?: boolean;
}

interface MultiFileCodeEditorProps {
    files: CodeFile[];
    onChange?: (path: string, content: string) => void;
    onFileSelect?: (path: string) => void;
    runCode?: () => void;
    autoFormatOnOpen?: boolean;
    defaultWordWrap?: "on" | "off";
    showSidebar?: boolean;
    height?: string;
}

export default function MultiFileCodeEditor({
    files,
    onChange,
    onFileSelect,
    runCode,
    autoFormatOnOpen = false,
    defaultWordWrap = "off",
    showSidebar: initialShowSidebar = true,
    height = "600px"
}: MultiFileCodeEditorProps) {
    const [ref, { height: measuredHeight }] = useMeasure();
    const [activeFile, setActiveFile] = useState<string>(files[0]?.path || "");
    const [sidebarVisible, setSidebarVisible] = useState(initialShowSidebar);

    const currentFile = files.find(f => f.path === activeFile);
    
    // Calculate editor height: use measured height if available, subtract tab header height (44px)
    const editorHeight = measuredHeight ? `${measuredHeight - 44}px` : "500px";

    const handleFileSelect = useCallback((path: string) => {
        setActiveFile(path);
        onFileSelect?.(path);
    }, [onFileSelect]);

    const handleContentChange = useCallback((content: string | undefined) => {
        if (content !== undefined && activeFile) {
            onChange?.(activeFile, content);
        }
    }, [activeFile, onChange]);

    const getFileIcon = (file: CodeFile, compact = false) => {
        if (file.icon) return file.icon;
        
        const size = compact ? "h-3.5 w-3.5" : "h-4 w-4";
        const ext = file.name.split('.').pop()?.toLowerCase();
        switch (ext) {
            case 'html':
            case 'htm':
                return <FileCode className={`${size} text-orange-500 dark:text-orange-400`} />;
            case 'css':
            case 'scss':
            case 'sass':
                return <FileType className={`${size} text-blue-500 dark:text-blue-400`} />;
            case 'js':
            case 'jsx':
            case 'ts':
            case 'tsx':
                return <FileCode className={`${size} text-yellow-500 dark:text-yellow-400`} />;
            case 'json':
                return <File className={`${size} text-green-500 dark:text-green-400`} />;
            default:
                return <File className={`${size} text-gray-500 dark:text-gray-400`} />;
        }
    };

    if (!currentFile) return null;

    return (
        <div ref={ref} className="flex h-full border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden" style={{ height }}>
            {sidebarVisible ? (
                <ResizablePanelGroup direction="horizontal">
                    {/* File Sidebar */}
                    <ResizablePanel defaultSize={15} minSize={10} maxSize={30}>
                        <div className="h-full bg-gray-50 dark:bg-gray-900 border-r border-gray-300 dark:border-gray-700 overflow-y-auto">
                            {/* VS Code-style compact header */}
                            <div className="px-2 py-1 border-b border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
                                <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                                    <Folder className="h-3.5 w-3.5" />
                                    Explorer
                                </div>
                            </div>
                            {/* VS Code-style compact file list */}
                            <div className="py-0.5">
                                {files.map((file) => (
                                    <button
                                        key={file.path}
                                        onClick={() => handleFileSelect(file.path)}
                                        className={cn(
                                            "w-full flex items-center gap-1.5 px-2 py-0.5 text-xs transition-colors",
                                            "hover:bg-gray-200 dark:hover:bg-gray-800",
                                            activeFile === file.path
                                                ? "bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                                : "text-gray-700 dark:text-gray-300"
                                        )}
                                    >
                                        {getFileIcon(file, true)}
                                        <span className="truncate">{file.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </ResizablePanel>

                    <ResizableHandle withHandle />

                    {/* Editor Area */}
                    <ResizablePanel defaultSize={85}>
                        <div className="h-full flex flex-col">
                            {/* Active File Tab with Toggle Button */}
                            <div className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700">
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setSidebarVisible(false)}
                                        className="h-6 w-6 p-0 hover:bg-gray-200 dark:hover:bg-gray-700"
                                        title="Hide sidebar"
                                    >
                                        <PanelLeftClose className="h-3.5 w-3.5" />
                                    </Button>
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
                            <div className="w-full">
                                <SmallCodeEditor
                                    path={activeFile}
                                    language={currentFile.language}
                                    initialCode={currentFile.content}
                                    onChange={handleContentChange}
                                    runCode={runCode}
                                    autoFormat={autoFormatOnOpen}
                                    defaultWordWrap={defaultWordWrap}
                                    showFormatButton={false}
                                    showCopyButton={false}
                                    showResetButton={false}
                                    showWordWrapToggle={false}
                                    showMinimapToggle={false}
                                    height={editorHeight}
                                    readOnly={currentFile.readOnly}
                                />
                            </div>
                        </div>
                    </ResizablePanel>
                </ResizablePanelGroup>
            ) : (
                /* Editor without Sidebar */
                <div className="flex-1 flex flex-col">
                    {/* Active File Tab with Show Button */}
                    <div className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700">
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSidebarVisible(true)}
                                className="h-6 w-6 p-0 hover:bg-gray-200 dark:hover:bg-gray-700"
                                title="Show sidebar"
                            >
                                <PanelLeft className="h-3.5 w-3.5" />
                            </Button>
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
                    <div className="w-full">
                        <SmallCodeEditor
                            path={activeFile}
                            language={currentFile.language}
                            initialCode={currentFile.content}
                            onChange={handleContentChange}
                            runCode={runCode}
                            autoFormat={autoFormatOnOpen}
                            defaultWordWrap={defaultWordWrap}
                            showFormatButton={false}
                            showCopyButton={false}
                            showResetButton={false}
                            showWordWrapToggle={false}
                            showMinimapToggle={false}
                            height={editorHeight}
                            readOnly={currentFile.readOnly}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

