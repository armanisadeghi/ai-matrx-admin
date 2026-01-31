"use client";
import { useState, useCallback, useRef } from "react";
import SmallCodeEditor from "./SmallCodeEditor";
import CodeBlockHeader from "@/features/code-editor/components/code-block/CodeBlockHeader";
import { languageMap } from "@/features/code-editor/components/code-block/LanguageDisplay";
import { Folder, PanelLeftClose, PanelLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { useMeasure } from "@uidotdev/usehooks";
import { useTheme } from "@/styles/themes/ThemeProvider";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectUser } from "@/lib/redux/selectors/userSelectors";
import { useCanvas } from "@/features/canvas/hooks/useCanvas";
import { HTMLPageService } from "@/features/html-pages/services/htmlPageService";
import { AICodeEditorModalV2 } from "@/features/code-editor/components/AICodeEditorModalV2";
import { ContextAwareCodeEditorModal } from "@/features/code-editor/components/ContextAwareCodeEditorModal";
import { mapLanguageForMonaco, getMonacoFileExtension } from "@/features/code-editor/config/languages";

type AIModalConfig = {
    version: 'v2' | 'v3';
    builtinId: string;
    title: string;
};

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
    
    // CodeBlock-like state management
    const [isCopied, setIsCopied] = useState(false);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [lineNumbers, setLineNumbers] = useState(false);
    const [showWrapLines, setShowWrapLines] = useState(false);
    const [minimapEnabled, setMinimapEnabled] = useState(false);
    const [isCreatingPage, setIsCreatingPage] = useState(false);
    const [formatTrigger, setFormatTrigger] = useState(0);
    const [aiModalConfig, setAiModalConfig] = useState<AIModalConfig | null>(null);
    
    const containerRef = useRef<HTMLDivElement>(null);
    const { mode } = useTheme();
    const isMobile = useIsMobile();
    const user = useAppSelector(selectUser);
    const { open: openCanvas } = useCanvas();

    const currentFile = files.find(f => f.path === activeFile);
    if (!currentFile) return null;
    
    const code = currentFile.content;
    const monacoLanguage = mapLanguageForMonaco(currentFile.language);
    const monacoFileExtension = getMonacoFileExtension(currentFile.language);
    
    // Ensure the path has the correct extension for Monaco to recognize TSX/JSX properly
    const getProperPath = (file: CodeFile): string => {
        const ext = monacoFileExtension || getMonacoFileExtension(file.language);
        if (ext) {
            // If we have a specific extension for TSX/JSX, ensure the path uses it
            const pathWithoutExt = file.path.replace(/\.[^.]+$/, '');
            return `${pathWithoutExt}${ext}`;
        }
        return file.path;
    };
    
    const editorPath = getProperPath(currentFile);
    
    // Calculate editor height: use measured height if available, subtract custom tab height
    // Tab bar is roughly 48px (py-2 + content)
    const tabBarHeight = 48;
    const editorHeight = measuredHeight ? `${measuredHeight - tabBarHeight}px` : "500px";

    const handleFileSelect = useCallback((path: string) => {
        setActiveFile(path);
        onFileSelect?.(path);
    }, [onFileSelect]);

    const handleContentChange = useCallback((content: string | undefined) => {
        if (content !== undefined && activeFile) {
            onChange?.(activeFile, content);
        }
    }, [activeFile, onChange]);
    
    // CodeBlock-like handlers
    const handleCopy = async (e: React.MouseEvent, withLineNumbers: boolean = false) => {
        e.stopPropagation();
        let textToCopy = code;
        
        if (withLineNumbers) {
            const lines = code.split('\n');
            const paddedLines = lines.map((line, index) => {
                const lineNumber = (index + 1).toString().padStart(lines.length.toString().length, ' ');
                return `${lineNumber} | ${line}`;
            });
            textToCopy = paddedLines.join('\n');
        }
        
        await navigator.clipboard.writeText(textToCopy);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    const handleDownload = (e: React.MouseEvent) => {
        e.stopPropagation();
        const blob = new Blob([code], { type: "text/plain" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = currentFile.name;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const toggleLineNumbers = (e: React.MouseEvent) => {
        e.stopPropagation();
        setLineNumbers(!lineNumbers);
    };

    const toggleWrapLines = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowWrapLines(!showWrapLines);
    };

    const toggleFullScreen = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isFullScreen) {
            document.body.style.overflow = "auto";
            setTimeout(() => {
                setIsFullScreen(false);
                setIsCollapsed(false);
            }, 150);
        } else {
            document.body.style.overflow = "hidden";
            setIsFullScreen(true);
            if (isCollapsed) setIsCollapsed(false);
        }
    };

    const toggleCollapse = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (isEditing) return;
        setIsCollapsed(!isCollapsed);
        if (isFullScreen) setIsFullScreen(false);
    };

    const toggleEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsEditing(!isEditing);
        if (!isEditing) {
            setIsCollapsed(false);
        }
    };

    const handleFormat = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isEditing) return;
        setFormatTrigger(prev => prev + 1);
    };

    const handleReset = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isEditing) return;
        // Reset to original file content
        const originalFile = files.find(f => f.path === activeFile);
        if (originalFile) {
            onChange?.(activeFile, originalFile.content);
        }
    };

    const toggleMinimap = (e: React.MouseEvent) => {
        e.stopPropagation();
        setMinimapEnabled(!minimapEnabled);
    };

    const handleOpenAIModal = (config: AIModalConfig) => {
        setAiModalConfig(config);
    };

    const handleCloseAIModal = () => {
        setAiModalConfig(null);
    };

    const handleAICodeChange = (newCode: string, version?: number) => {
        onChange?.(activeFile, newCode);
    };
    
    // Function to detect if code is a complete HTML document
    const isCompleteHTMLDocument = (htmlCode: string): boolean => {
        if (!htmlCode || monacoLanguage !== 'html') return false;
        
        const trimmedCode = htmlCode.trim();
        const hasDoctype = /^\s*<!DOCTYPE\s+html/i.test(trimmedCode);
        const hasHtmlTag = /<html[^>]*>/i.test(trimmedCode) && /<\/html>/i.test(trimmedCode);
        const hasHead = /<head[^>]*>/i.test(trimmedCode) && /<\/head>/i.test(trimmedCode);
        const hasBody = /<body[^>]*>/i.test(trimmedCode) && /<\/body>/i.test(trimmedCode);
        
        return hasDoctype && hasHtmlTag && hasHead && hasBody;
    };

    // Function to handle HTML document viewing in canvas
    const handleViewHTML = async () => {
        if (!user?.id) {
            alert('You must be logged in to view HTML pages');
            return;
        }

        setIsCreatingPage(true);
        try {
            const result = await HTMLPageService.createPage(
                code,
                currentFile.name,
                'Generated from multi-file editor',
                user.id
            );
            
            openCanvas({
                type: 'iframe',
                data: result.url,
                metadata: { 
                    title: currentFile.name,
                }
            });
        } catch (error) {
            console.error('Failed to create HTML page:', error);
            alert(`Failed to create HTML page: ${error.message}`);
        } finally {
            setIsCreatingPage(false);
        }
    };

    // Get the language icon from LanguageDisplay
    const getLanguageIcon = (file: CodeFile, compact = false) => {
        if (file.icon) return file.icon;
        
        const normalizedLang = file.language.toLowerCase();
        const langInfo = languageMap[normalizedLang] || languageMap['code'];
        const Icon = langInfo.icon;
        const size = compact ? 14 : 16;
        
        // Handle custom icons like Python that don't need size prop
        if (langInfo.size === null) {
            return <Icon className={cn(langInfo.color)} />;
        }
        
        return <Icon size={size} className={cn(langInfo.color)} />;
    };

    return (
        <div
            ref={containerRef}
            className={cn(
                "w-full rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-700 transition-all duration-300 ease-in-out",
                isFullScreen &&
                    "fixed left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[95%] h-[90%] z-50 bg-textured flex flex-col shadow-2xl"
            )}
            style={{
                height: isFullScreen ? undefined : height,
                opacity: isFullScreen ? 1 : undefined,
                transform: isFullScreen ? "translate(-50%, -50%) scale(1)" : undefined,
                transition: "opacity 300ms ease-in-out, transform 300ms ease-in-out, width 300ms ease-in-out, height 300ms ease-in-out",
            }}
        >
            <div ref={ref} className={cn("flex h-full", isFullScreen && "flex-1 overflow-hidden")}>
            {sidebarVisible ? (
                <ResizablePanelGroup orientation="horizontal">
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
                                        {getLanguageIcon(file, true)}
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
                            {/* Custom File Tab with CodeBlock Header */}
                            <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-300 dark:border-gray-700">
                                {/* Left: Sidebar Toggle + File Info */}
                                <div className="flex items-center gap-2 min-w-0">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setSidebarVisible(false)}
                                        className="h-6 w-6 p-0 flex-shrink-0 hover:bg-gray-200 dark:hover:bg-gray-700"
                                        title="Hide sidebar"
                                    >
                                        <PanelLeftClose className="h-3.5 w-3.5" />
                                    </Button>
                                    {getLanguageIcon(currentFile)}
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                                        {currentFile.name}
                                    </span>
                                </div>
                                
                                {/* Right: Header Controls (without language display) */}
                                <div className="flex-shrink-0">
                                    <CodeBlockHeader
                                        language={currentFile.language}
                                        linesCount={code.split("\n").length}
                                        isEditing={isEditing}
                                        isFullScreen={isFullScreen}
                                        isCollapsed={isCollapsed}
                                        code={code}
                                        handleCopy={handleCopy}
                                        handleDownload={handleDownload}
                                        toggleEdit={toggleEdit}
                                        toggleFullScreen={toggleFullScreen}
                                        toggleCollapse={toggleCollapse}
                                        toggleLineNumbers={toggleLineNumbers}
                                        toggleWrapLines={toggleWrapLines}
                                        isCopied={isCopied}
                                        isMobile={isMobile}
                                        isCompleteHTML={isCompleteHTMLDocument(code)}
                                        handleViewHTML={handleViewHTML}
                                        isCreatingPage={isCreatingPage}
                                        showWrapLines={showWrapLines}
                                        handleFormat={handleFormat}
                                        handleReset={handleReset}
                                        minimapEnabled={minimapEnabled}
                                        toggleMinimap={toggleMinimap}
                                        showLineNumbers={lineNumbers}
                                        onAIEdit={handleOpenAIModal}
                                        hideLanguageDisplay={true}
                                    />
                                </div>
                            </div>

                            {/* Monaco Editor - uses path prop for multi-model support */}
                            <div className="w-full">
                                <SmallCodeEditor
                                    path={editorPath}
                                    language={monacoLanguage}
                                    fileExtension={monacoFileExtension}
                                    initialCode={currentFile.content}
                                    onChange={handleContentChange}
                                    runCode={runCode}
                                    mode={mode}
                                    autoFormat={autoFormatOnOpen}
                                    defaultWordWrap={defaultWordWrap}
                                    showFormatButton={false}
                                    showCopyButton={false}
                                    showResetButton={false}
                                    showWordWrapToggle={false}
                                    showMinimapToggle={false}
                                    height={editorHeight}
                                    readOnly={!isEditing || currentFile.readOnly}
                                    formatTrigger={formatTrigger}
                                    controlledWordWrap={showWrapLines ? "on" : "off"}
                                    controlledMinimap={minimapEnabled}
                                />
                            </div>
                        </div>
                    </ResizablePanel>
                </ResizablePanelGroup>
            ) : (
                /* Editor without Sidebar */
                <div className="flex-1 flex flex-col">
                    {/* Custom File Tab with CodeBlock Header */}
                    <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-300 dark:border-gray-700">
                        {/* Left: Sidebar Toggle + File Info */}
                        <div className="flex items-center gap-2 min-w-0">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSidebarVisible(true)}
                                className="h-6 w-6 p-0 flex-shrink-0 hover:bg-gray-200 dark:hover:bg-gray-700"
                                title="Show sidebar"
                            >
                                <PanelLeft className="h-3.5 w-3.5" />
                            </Button>
                            {getLanguageIcon(currentFile)}
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                                {currentFile.name}
                            </span>
                        </div>
                        
                        {/* Right: Header Controls (without language display) */}
                        <div className="flex-shrink-0">
                            <CodeBlockHeader
                                language={currentFile.language}
                                linesCount={code.split("\n").length}
                                isEditing={isEditing}
                                isFullScreen={isFullScreen}
                                isCollapsed={isCollapsed}
                                code={code}
                                handleCopy={handleCopy}
                                handleDownload={handleDownload}
                                toggleEdit={toggleEdit}
                                toggleFullScreen={toggleFullScreen}
                                toggleCollapse={toggleCollapse}
                                toggleLineNumbers={toggleLineNumbers}
                                toggleWrapLines={toggleWrapLines}
                                isCopied={isCopied}
                                isMobile={isMobile}
                                isCompleteHTML={isCompleteHTMLDocument(code)}
                                handleViewHTML={handleViewHTML}
                                isCreatingPage={isCreatingPage}
                                showWrapLines={showWrapLines}
                                handleFormat={handleFormat}
                                handleReset={handleReset}
                                minimapEnabled={minimapEnabled}
                                toggleMinimap={toggleMinimap}
                                showLineNumbers={lineNumbers}
                                onAIEdit={handleOpenAIModal}
                                hideLanguageDisplay={true}
                            />
                        </div>
                    </div>

                    {/* Monaco Editor - uses path prop for multi-model support */}
                    <div className="w-full">
                        <SmallCodeEditor
                            path={editorPath}
                            language={monacoLanguage}
                            fileExtension={monacoFileExtension}
                            initialCode={currentFile.content}
                            onChange={handleContentChange}
                            runCode={runCode}
                            mode={mode}
                            autoFormat={autoFormatOnOpen}
                            defaultWordWrap={defaultWordWrap}
                            showFormatButton={false}
                            showCopyButton={false}
                            showResetButton={false}
                            showWordWrapToggle={false}
                            showMinimapToggle={false}
                            height={editorHeight}
                            readOnly={!isEditing || currentFile.readOnly}
                            formatTrigger={formatTrigger}
                            controlledWordWrap={showWrapLines ? "on" : "off"}
                            controlledMinimap={minimapEnabled}
                        />
                    </div>
                </div>
            )}
            </div>
            
            {/* AI Code Editor Modal V2 */}
            {aiModalConfig?.version === 'v2' && (
                <AICodeEditorModalV2
                    open={true}
                    onOpenChange={handleCloseAIModal}
                    currentCode={code}
                    language={monacoLanguage}
                    builtinId={aiModalConfig.builtinId}
                    onCodeChange={handleAICodeChange}
                    title={aiModalConfig.title}
                    allowPromptSelection={false}
                />
            )}
            
            {/* AI Code Editor Modal V3 (Context-Aware) */}
            {aiModalConfig?.version === 'v3' && (
                <ContextAwareCodeEditorModal
                    open={true}
                    onOpenChange={handleCloseAIModal}
                    code={code}
                    language={monacoLanguage}
                    builtinId={aiModalConfig.builtinId}
                    onCodeChange={(newCode: string, version: number) => handleAICodeChange(newCode, version)}
                    title={aiModalConfig.title}
                />
            )}
        </div>
    );
}

