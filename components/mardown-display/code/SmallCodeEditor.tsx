"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { useMonaco } from "@monaco-editor/react";
import Editor from "@monaco-editor/react";
import { useMeasure } from "@uidotdev/usehooks";
import { Button } from "@/components/ui/button";
import { useMonacoTheme } from "@/components/code-editor/useMonacoTheme";
import { Wand2, Copy, RotateCcw, CheckCircle2, WrapText, Type, Maximize2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { editor } from "monaco-editor";

interface CodeEditorProps {
    language?: string;
    initialCode?: string;
    path?: string; // For multi-model support - identifies the file/model
    onChange?: (value: string | undefined) => void;
    runCode?: () => void;
    mode?: "dark" | "light";
    showFormatButton?: boolean;
    showCopyButton?: boolean;
    showResetButton?: boolean;
    showWordWrapToggle?: boolean;
    showMinimapToggle?: boolean;
    autoFormat?: boolean;
    defaultWordWrap?: "on" | "off";
    height?: string;
}

const SmallCodeEditor = ({ 
    language = "javascript", 
    initialCode = "// Start coding here...", 
    path,
    onChange, 
    runCode, 
    mode = "dark",
    showFormatButton = true,
    showCopyButton = true,
    showResetButton = true,
    showWordWrapToggle = true,
    showMinimapToggle = true,
    autoFormat = false,
    defaultWordWrap = "off",
    height: customHeight
}: CodeEditorProps) => {
    const [ref, { width, height }] = useMeasure();
    const isDark = useMonacoTheme();
    const [output, setOutput] = useState<string>("");
    const [copied, setCopied] = useState(false);
    const [wordWrap, setWordWrap] = useState<"off" | "on">(defaultWordWrap);
    const [minimapEnabled, setMinimapEnabled] = useState(false);
    const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

    // Sync external changes to initialCode (for multi-model support)
    useEffect(() => {
        const editor = editorRef.current;
        if (!editor || !initialCode) return;

        const model = editor.getModel();
        if (!model) return;

        // Only update if the content is actually different to avoid cursor jumps
        const currentValue = model.getValue();
        if (currentValue !== initialCode) {
            // Preserve cursor position
            const position = editor.getPosition();
            model.setValue(initialCode);
            if (position) {
                editor.setPosition(position);
            }
        }
    }, [initialCode]);

    // Auto-format when switching files (path changes) or when content changes
    useEffect(() => {
        if (!autoFormat || !editorRef.current) return;

        const formatAfterChange = async () => {
            const editor = editorRef.current;
            if (!editor) return;

            const model = editor.getModel();
            if (!model) return;

            // Wait a bit for content to settle and language services to be ready
            await new Promise(resolve => setTimeout(resolve, 300));

            try {
                const formatAction = editor.getAction('editor.action.formatDocument');
                if (formatAction) {
                    await formatAction.run();
                }
            } catch (error) {
                console.warn('Auto-format on file switch failed:', error);
            }
        };

        formatAfterChange();
    }, [path, autoFormat]); // Trigger when path (file) changes

    const handleEditorDidMount = useCallback((editor: editor.IStandaloneCodeEditor, monaco: any) => {
        editorRef.current = editor;
        
        // Auto-format on mount if enabled
        if (autoFormat) {
            // Wait for language services and formatters to be ready
            const attemptFormat = async () => {
                const model = editor.getModel();
                if (!model) return;

                // Wait a bit for language services to initialize
                await new Promise(resolve => setTimeout(resolve, 300));
                
                try {
                    // Try to format using the formatting provider
                    const formatAction = editor.getAction('editor.action.formatDocument');
                    
                    if (formatAction) {
                        await formatAction.run();
                    } else {
                        // Fallback: use monaco's formatting API directly
                        const formattingOptions = {
                            tabSize: model.getOptions().tabSize,
                            insertSpaces: model.getOptions().insertSpaces
                        };
                        
                        const formatEdits = await monaco.languages.provideDocumentFormattingEdits(
                            model,
                            formattingOptions,
                            {}
                        );
                        
                        if (formatEdits && formatEdits.length > 0) {
                            editor.executeEdits('auto-format', formatEdits);
                        }
                    }
                } catch (error) {
                    // If formatting fails, try again after longer delay
                    setTimeout(async () => {
                        try {
                            const formatAction = editor.getAction('editor.action.formatDocument');
                            if (formatAction) {
                                await formatAction.run();
                            }
                        } catch (e) {
                            console.warn('Auto-format failed:', e);
                        }
                    }, 1000);
                }
            };
            
            attemptFormat();
        }
    }, [autoFormat]);

    const handleFormatCode = useCallback(() => {
        if (editorRef.current) {
            editorRef.current.getAction('editor.action.formatDocument')?.run();
        }
    }, []);

    const handleCopyCode = useCallback(async () => {
        if (editorRef.current) {
            const code = editorRef.current.getValue();
            try {
                await navigator.clipboard.writeText(code);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } catch (err) {
                console.error('Failed to copy code:', err);
            }
        }
    }, []);

    const handleResetCode = useCallback(() => {
        if (editorRef.current && initialCode) {
            editorRef.current.setValue(initialCode);
            onChange?.(initialCode);
        }
    }, [initialCode, onChange]);

    const handleToggleWordWrap = useCallback(() => {
        const newWrap = wordWrap === "off" ? "on" : "off";
        setWordWrap(newWrap);
        if (editorRef.current) {
            editorRef.current.updateOptions({ wordWrap: newWrap });
        }
    }, [wordWrap]);

    const handleToggleMinimap = useCallback(() => {
        const newMinimapEnabled = !minimapEnabled;
        setMinimapEnabled(newMinimapEnabled);
        if (editorRef.current) {
            editorRef.current.updateOptions({ 
                minimap: { enabled: newMinimapEnabled } 
            });
        }
    }, [minimapEnabled]);

    return (
        <div ref={ref} className="flex flex-col w-full h-full">
            {/* Toolbar */}
            <div className="flex gap-2 mb-2 flex-wrap">
                {showFormatButton && (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleFormatCode}
                                    className="h-8 px-3"
                                >
                                    <Wand2 className="h-4 w-4 mr-2" />
                                    Format
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Format code (Shift+Alt+F)</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
                
                {showCopyButton && (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleCopyCode}
                                    className="h-8 px-3"
                                >
                                    {copied ? (
                                        <>
                                            <CheckCircle2 className="h-4 w-4 mr-2" />
                                            Copied!
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="h-4 w-4 mr-2" />
                                            Copy
                                        </>
                                    )}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Copy code to clipboard</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
                
                {showResetButton && (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleResetCode}
                                    className="h-8 px-3"
                                >
                                    <RotateCcw className="h-4 w-4 mr-2" />
                                    Reset
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Reset to initial code</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
                
                {showWordWrapToggle && (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant={wordWrap === "on" ? "default" : "outline"}
                                    size="sm"
                                    onClick={handleToggleWordWrap}
                                    className="h-8 px-3"
                                >
                                    <WrapText className="h-4 w-4 mr-2" />
                                    Wrap
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Toggle word wrap (Alt+Z)</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
                
                {showMinimapToggle && (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant={minimapEnabled ? "default" : "outline"}
                                    size="sm"
                                    onClick={handleToggleMinimap}
                                    className="h-8 px-3"
                                >
                                    <Maximize2 className="h-4 w-4 mr-2" />
                                    Map
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Toggle minimap</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
            </div>

            {/* Main editor area */}
            <div className="flex-grow relative">
                <Editor
                    height={customHeight || (height ? `${height - 80}px` : "300px")} // Use custom height or calculate
                    width="100%"
                    path={path} // Multi-model support - each path gets its own model
                    defaultLanguage={language}
                    language={language}
                    defaultValue={initialCode}
                    theme={isDark ? "customDark" : "customLight"}
                    onChange={onChange}
                    onMount={handleEditorDidMount}
                    options={{
                        minimap: { enabled: minimapEnabled },
                        fontSize: 14,
                        lineNumbers: "on",
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        formatOnPaste: true,
                        formatOnType: false,
                        wordWrap: wordWrap,
                        wrappingIndent: "indent",
                    }}
                />
            </div>

            {runCode && (
                <Button 
                    variant="default" 
                    className="w-full mt-2"
                    onClick={runCode}
                >
                    Run Code
                </Button>
            )}
        </div>
    );
};

export default SmallCodeEditor;