"use client";
import React from "react";
import { useState, useRef, useCallback, useEffect } from "react";
import { useMonaco } from "@monaco-editor/react";
import Editor from "@monaco-editor/react";
import { useMeasure } from "@uidotdev/usehooks";
import { Button } from "@/components/ui/button";
import { Wand2, Copy, RotateCcw, CheckCircle2, WrapText, Type, Maximize2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import CodeEditorLoading from "./CodeEditorLoading";
import type { editor } from "monaco-editor";
import { configureMonaco } from "../../config/monaco-config";

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
    readOnly?: boolean;
    formatTrigger?: number; // Increment this to trigger formatting externally
    controlledWordWrap?: "on" | "off"; // Controlled word wrap from parent
    controlledMinimap?: boolean; // Controlled minimap from parent
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
    height: customHeight,
    readOnly = false,
    formatTrigger = 0,
    controlledWordWrap,
    controlledMinimap
}: CodeEditorProps) => {
    const [ref, { width, height }] = useMeasure();
    const monaco = useMonaco();
    const [output, setOutput] = useState<string>("");
    const [copied, setCopied] = useState(false);
    const [internalWordWrap, setInternalWordWrap] = useState<"off" | "on">(defaultWordWrap);
    const [internalMinimapEnabled, setInternalMinimapEnabled] = useState(false);
    const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
    
    // Use controlled props if provided, otherwise use internal state
    const wordWrap = controlledWordWrap !== undefined ? controlledWordWrap : internalWordWrap;
    const minimapEnabled = controlledMinimap !== undefined ? controlledMinimap : internalMinimapEnabled;
    
    // SIMPLE FIX: Just use built-in Monaco themes - they work perfectly
    // Custom themes can interfere with syntax highlighting token rules
    const editorTheme = mode === "dark" ? "vs-dark" : "vs";

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

    // CRITICAL: Update language when it changes to ensure syntax highlighting
    useEffect(() => {
        const editor = editorRef.current;
        if (!editor || !monaco || !language) return;

        const model = editor.getModel();
        if (!model) return;

        // Update the model's language to trigger syntax highlighting
        const currentLanguage = model.getLanguageId();
        if (currentLanguage !== language) {
            monaco.editor.setModelLanguage(model, language);
        }
    }, [language, monaco]);

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

    // External format trigger
    useEffect(() => {
        if (!formatTrigger || formatTrigger === 0 || !editorRef.current) return;

        const formatFromExternal = async () => {
            const editor = editorRef.current;
            if (!editor) return;

            const model = editor.getModel();
            if (!model) return;

            // Wait for content to settle
            await new Promise(resolve => setTimeout(resolve, 200));

            try {
                const formatAction = editor.getAction('editor.action.formatDocument');
                if (formatAction) {
                    await formatAction.run();
                }
            } catch (error) {
                console.warn('External format trigger failed:', error);
            }
        };

        formatFromExternal();
    }, [formatTrigger]); // Trigger when formatTrigger changes

    // CRITICAL: Configure Monaco BEFORE it mounts - this is lazy loaded
    const handleEditorWillMount = useCallback((monaco: any) => {
        // This triggers Monaco configuration only when editor is about to mount
        // Returns immediately if already configured
        configureMonaco().catch(error => {
            console.error('Failed to configure Monaco:', error);
        });
    }, []);

    const handleEditorDidMount = useCallback((editor: editor.IStandaloneCodeEditor, monaco: any) => {
        editorRef.current = editor;
        
        // CRITICAL: Ensure the model uses the correct language for syntax highlighting
        const model = editor.getModel();
        if (model && language) {
            // Force set the language mode to ensure syntax highlighting is activated
            // Use setTimeout to ensure Monaco's language services are ready
            setTimeout(() => {
                monaco.editor.setModelLanguage(model, language);
                console.log(`✅ Monaco Editor: Language set to "${language}"`);
            }, 0);
        }
        
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
    }, [autoFormat, language]);

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
        setInternalWordWrap(newWrap);
        if (editorRef.current) {
            editorRef.current.updateOptions({ wordWrap: newWrap });
        }
    }, [wordWrap]);

    const handleToggleMinimap = useCallback(() => {
        const newMinimapEnabled = !minimapEnabled;
        setInternalMinimapEnabled(newMinimapEnabled);
        if (editorRef.current) {
            editorRef.current.updateOptions({ 
                minimap: { enabled: newMinimapEnabled } 
            });
        }
    }, [minimapEnabled]);
    
    // Update editor when controlled props change
    React.useEffect(() => {
        if (editorRef.current && controlledWordWrap !== undefined) {
            editorRef.current.updateOptions({ wordWrap: controlledWordWrap });
        }
    }, [controlledWordWrap]);
    
    React.useEffect(() => {
        if (editorRef.current && controlledMinimap !== undefined) {
            editorRef.current.updateOptions({ minimap: { enabled: controlledMinimap } });
        }
    }, [controlledMinimap]);

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
                    theme={editorTheme}
                    onChange={onChange}
                    beforeMount={handleEditorWillMount}
                    onMount={handleEditorDidMount}
                    loading={<CodeEditorLoading />}
                    options={{
                        minimap: { enabled: minimapEnabled },
                        fontSize: 14,
                        lineNumbers: "on",
                        scrollBeyondLastLine: true,
                        automaticLayout: true,
                        formatOnPaste: true,
                        formatOnType: false,
                        wordWrap: wordWrap,
                        wrappingIndent: "indent",
                        padding: { top: 16, bottom: 16 },
                        readOnly: readOnly,
                        // Simplified - let Monaco handle syntax highlighting defaults
                        quickSuggestions: {
                            other: true,
                            comments: false,
                            strings: false
                        },
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