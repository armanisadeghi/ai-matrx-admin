'use client';

import React, { useRef, useState, useEffect } from "react";
import { cn } from "@/styles/themes/utils";
import SmallCodeEditor from "./SmallCodeEditor";
import CodeBlockHeader from "@/features/code-editor/components/code-block/CodeBlockHeader";
import { useTheme } from "@/styles/themes/ThemeProvider";
import StickyButtons from "./StickyButtons";
import { useIsMobile } from "@/hooks/use-mobile";
import { HTMLPageService } from "@/features/html-pages/services/htmlPageService";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectUser } from "@/lib/redux/selectors/userSelectors";
import { Globe, Loader2 } from "lucide-react";
import { useCanvas } from "@/features/canvas/hooks/useCanvas";
import { Prism as SyntaxHighlighterBase } from "react-syntax-highlighter";
import { toast } from "sonner";
import { vscDarkPlus, vs } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { AICodeEditorModal } from "@/features/code-editor/components/AICodeEditorModal";
import { ContextAwareCodeEditorModal } from "@/features/code-editor/components/ContextAwareCodeEditorModal";
import { mapLanguageForPrism, mapLanguageForMonaco, getMonacoFileExtension } from "@/features/code-editor/config/languages";

// Type assertion to resolve React 19 type incompatibility
const SyntaxHighlighter = SyntaxHighlighterBase as any;

type AIModalConfig = {
    version: 'v2' | 'v3';
    builtinId: string;
    title: string;
};

interface CodeBlockProps {
    code: string;
    language: string;
    fontSize?: number;
    showLineNumbers?: boolean;
    wrapLines?: boolean;
    className?: string;
    onCodeChange?: (newCode: string) => void;
    inline?: boolean;
    isStreamActive?: boolean;
    allowEdit?: boolean;
    customBuiltinKeys?: string[];
}

const CodeBlock: React.FC<CodeBlockProps> = ({
    code: initialCode,
    language: rawLanguage = 'text',
    fontSize = 12,
    showLineNumbers = false,
    wrapLines = true,
    className,
    onCodeChange,
    inline = false,
    isStreamActive = false,
    allowEdit = true,
    customBuiltinKeys = [],
}) => {
    // Map language for respective editors (with additional safety checks)
    const prismLanguage = mapLanguageForPrism(rawLanguage);
    const monacoLanguage = mapLanguageForMonaco(rawLanguage);
    const monacoFileExtension = getMonacoFileExtension(rawLanguage);

    const [editedCode, setEditedCode] = useState<string | null>(null);
    const [isCopied, setIsCopied] = useState(false);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [lineNumbers, setLineNumbers] = useState(showLineNumbers);
    const [showWrapLines, setShowWrapLines] = useState(wrapLines);
    const [minimapEnabled, setMinimapEnabled] = useState(false);
    const [isTopInView, setIsTopInView] = useState(false);
    const [isBottomInView, setIsBottomInView] = useState(false);
    const [isCreatingPage, setIsCreatingPage] = useState(false);
    const [formatTrigger, setFormatTrigger] = useState(0);
    const [aiModalConfig, setAiModalConfig] = useState<AIModalConfig | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const topRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const editorRef = useRef<any>(null);
    const showStickyButtons = isBottomInView && !isTopInView && !isEditing;
    const { mode } = useTheme();
    const isMobile = useIsMobile();
    const user = useAppSelector(selectUser);
    const { open: openCanvas } = useCanvas();

    // Use edited code if available (when user is editing), otherwise use deferred prop value
    const code = editedCode ?? initialCode;

    // Function to detect if code is a complete HTML document
    const isCompleteHTMLDocument = (htmlCode: string): boolean => {
        if (!htmlCode || prismLanguage !== 'html') return false;

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
            toast.error('You must be logged in to view HTML pages');
            return;
        }

        setIsCreatingPage(true);
        try {
            const result = await HTMLPageService.createPage(
                code,
                'HTML Preview',
                'Generated from code block',
                user.id
            );

            // Open the HTML page in the canvas
            openCanvas({
                type: 'iframe',
                data: result.url,
                metadata: {
                    title: 'HTML Preview',
                }
            });
        } catch (error) {
            console.error('Failed to create HTML page:', error);
            toast.error(`Failed to create HTML page: ${error.message}`);
        } finally {
            setIsCreatingPage(false);
        }
    };


    useEffect(() => {
        const observerOptions = {
            root: null,
            rootMargin: "0px",
            threshold: 0,
        };
        const topObserver = new IntersectionObserver(([entry]) => setIsTopInView(entry.isIntersecting), observerOptions);
        const bottomObserver = new IntersectionObserver(([entry]) => setIsBottomInView(entry.isIntersecting), observerOptions);

        if (topRef.current) topObserver.observe(topRef.current);
        if (bottomRef.current) bottomObserver.observe(bottomRef.current);

        return () => {
            if (topRef.current) topObserver.unobserve(topRef.current);
            if (bottomRef.current) bottomObserver.unobserve(bottomRef.current);
            topObserver.disconnect();
            bottomObserver.disconnect();
        };
    }, [isFullScreen]);

    // Handle outside click to close full screen
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            // Check if click is outside the component
            if (isFullScreen && containerRef.current && !containerRef.current.contains(event.target as Node)) {
                // Restore scrolling
                document.body.style.overflow = "auto";

                // Small delay to allow animation to complete before changing state
                setTimeout(() => {
                    setIsFullScreen(false);
                    setIsCollapsed(false);
                }, 50);
            }
        };

        if (isFullScreen) {
            document.addEventListener("mousedown", handleClickOutside);
            // Prevent background scrolling when fullscreen is active
            document.body.style.overflow = "hidden";
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            // Make sure scroll is restored when component unmounts
            document.body.style.overflow = "auto";
        };
    }, [isFullScreen]);

    const handleCopy = async (e: React.MouseEvent, withLineNumbers: boolean = false) => {
        e.stopPropagation();
        let textToCopy = code;

        if (withLineNumbers) {
            // Add line numbers to each line
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
        a.download = `code.${rawLanguage || 'txt'}`;
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

        // Add a small delay when exiting fullscreen to allow animation to complete
        if (isFullScreen) {
            // First start the transition
            document.body.style.overflow = "auto"; // Restore scrolling

            // Small delay to allow animation to complete before changing state
            setTimeout(() => {
                setIsFullScreen(false);
                setIsCollapsed(false);
            }, 150);
        } else {
            // Entering fullscreen
            document.body.style.overflow = "hidden"; // Prevent background scrolling
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
            // Entering edit mode - maintain current fullscreen state
            setIsCollapsed(false);
        }
    };

    const handleCodeChange = (newCode: string | undefined) => {
        if (newCode) {
            setEditedCode(newCode);
            onCodeChange?.(newCode);
        }
    };

    const handleFormat = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isEditing) return;
        // Trigger format in the editor
        setFormatTrigger(prev => prev + 1);
    };

    const handleReset = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isEditing) return;
        // Reset code to initial value
        setEditedCode(initialCode);
        onCodeChange?.(initialCode);
    };

    const toggleMinimap = (e: React.MouseEvent) => {
        e.stopPropagation();
        setMinimapEnabled(!minimapEnabled);
    };

    const handleOpenAIModal = (config: AIModalConfig) => {
        console.log('AI Modal Opening with config:', config);
        setAiModalConfig(config);
    };

    const handleCloseAIModal = () => {
        setAiModalConfig(null);
    };

    const handleAICodeChange = (newCode: string, version?: number) => {
        console.log('AI Code Change:', { version, codeLength: newCode.length });
        setEditedCode(newCode);
        onCodeChange?.(newCode);
    };

    return (
        <div
            ref={containerRef}
            className={cn(
                "w-full my-4 rounded-t-xl rounded-b-lg overflow-hidden border border-neutral-200 dark:border-neutral-700 transition-all duration-300 ease-in-out",
                isFullScreen &&
                "fixed left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[95%] h-[90%] z-50 bg-textured flex flex-col shadow-2xl",
                className
            )}
            style={{
                opacity: isFullScreen ? 1 : undefined,
                transform: isFullScreen ? "translate(-50%, -50%) scale(1)" : undefined,
                transition: "opacity 300ms ease-in-out, transform 300ms ease-in-out, width 300ms ease-in-out, height 300ms ease-in-out",
            }}
        >
            <CodeBlockHeader
                language={rawLanguage}
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
                allowEdit={allowEdit}
                customBuiltinKeys={customBuiltinKeys}
            />
            {showStickyButtons && (
                <StickyButtons
                    linesCount={code.split("\n").length}
                    isCollapsed={isCollapsed}
                    isCopied={isCopied}
                    handleCopy={handleCopy}
                    toggleCollapse={toggleCollapse}
                    isMobile={isMobile}
                />
            )}
            <div className={cn("relative", isFullScreen && "flex-1 overflow-hidden")}>
                {isEditing ? (
                    <div className="w-full">
                        <SmallCodeEditor
                            language={monacoLanguage}
                            fileExtension={monacoFileExtension}
                            initialCode={code}
                            onChange={handleCodeChange}
                            mode={mode}
                            height={isFullScreen ? "calc(100vh - 15rem)" : `${Math.max(400, code.split("\n").length * 20 + 100)}px`}
                            showCopyButton={false}
                            showFormatButton={false}
                            showResetButton={false}
                            showWordWrapToggle={false}
                            showMinimapToggle={false}
                            formatTrigger={formatTrigger}
                            controlledWordWrap={showWrapLines ? "on" : "off"}
                            controlledMinimap={minimapEnabled}
                        />
                    </div>
                ) : (
                    // Code View
                    <div className={cn("relative", isFullScreen && "h-full")}>
                        <div ref={topRef} style={{ height: "1px" }} />
                        <div
                            ref={bottomRef}
                            className={cn(
                                "transition-all duration-300 ease-in-out relative",
                                isCollapsed ? "max-h-[150px]" : "max-h-none",
                                isFullScreen ? "h-full overflow-auto" : "overflow-hidden",
                                showWrapLines && "overflow-x-hidden"
                            )}
                        >
                            <SyntaxHighlighter
                                language={prismLanguage}
                                style={mode === "dark" ? vscDarkPlus : vs}
                                showLineNumbers={lineNumbers}
                                wrapLines={showWrapLines}
                                wrapLongLines={showWrapLines}
                                customStyle={{
                                    paddingTop: "1rem",
                                    paddingRight: "1rem",
                                    paddingBottom: "1rem",
                                    paddingLeft: "1rem",
                                    fontSize: `${fontSize}px`,
                                    height: "auto",
                                    minHeight: "auto",
                                    maxWidth: "100%",
                                    overflowX: showWrapLines ? "hidden" : "auto",
                                    margin: 0,
                                }}
                            >
                                {code}
                            </SyntaxHighlighter>

                            {/* Floating View Button for HTML Documents - Opens in Canvas */}
                            {isCompleteHTMLDocument(code) && !isCollapsed && (
                                <button
                                    onClick={handleViewHTML}
                                    disabled={isCreatingPage}
                                    className={cn(
                                        "absolute bottom-4 right-4 z-20",
                                        "flex items-center gap-2 px-4 py-2 rounded-full",
                                        "bg-purple-600 hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-600",
                                        "text-white text-sm font-medium",
                                        "shadow-lg hover:shadow-xl",
                                        "transition-all duration-200 ease-in-out",
                                        "transform hover:scale-105",
                                        isCreatingPage && "opacity-50 cursor-not-allowed"
                                    )}
                                    title="Open HTML Preview in Side Panel"
                                >
                                    {isCreatingPage ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Creating...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Globe className="w-4 h-4" />
                                            <span>Preview</span>
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                        {isCollapsed && (
                            <div
                                className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-neutral-900 to-transparent opacity-80 cursor-pointer"
                                onClick={toggleCollapse}
                            >
                                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-neutral-400 text-sm">
                                    Click to expand {code.split("\n").length - 3} more lines
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* AI Code Editor Modal V2 - Non-Context Aware (using AICodeEditorModal) */}
            {aiModalConfig?.version === 'v2' && (
                <AICodeEditorModal
                    open={true}
                    onOpenChange={(open) => {
                        if (!open) handleCloseAIModal();
                    }}
                    currentCode={code}
                    language={monacoLanguage}
                    builtinId={aiModalConfig.builtinId}
                    onCodeChange={(newCode) => handleAICodeChange(newCode)}
                    title={aiModalConfig.title}
                    allowPromptSelection={false}
                />
            )}

            {/* AI Code Editor Modal V3 (Context-Aware) - KEEP THIS! IT WORKS! */}
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
};

export default CodeBlock;
