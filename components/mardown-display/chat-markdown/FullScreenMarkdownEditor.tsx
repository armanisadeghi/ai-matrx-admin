"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import remarkGfm from "remark-gfm";
import dynamic from "next/dynamic";
import type { Editor as TuiEditorReactComp } from "@toast-ui/react-editor";
import { useTheme } from "@/styles/themes/ThemeProvider";
import EditorLoading from "../text-block/editorLoading";
import MarkdownAnalyzer from "./analyzer/MarkdownAnalyzer";
import { MarkdownAnalysisData } from "./analyzer/types";
import { MarkdownCopyButton } from "@/components/matrx/buttons/MarkdownCopyButton";
import FullScreenOverlay, { TabDefinition } from "@/components/official/FullScreenOverlay";

// Import the Toast UI Editor dark theme CSS
import "@toast-ui/editor/dist/toastui-editor.css";
import "@toast-ui/editor/dist/theme/toastui-editor-dark.css";

const TuiEditor = dynamic(() => import("@toast-ui/react-editor").then((mod) => mod.Editor), {
    ssr: false,
    loading: () => <EditorLoading />,
});

const loadColorSyntaxPlugin = () => import("@toast-ui/editor-plugin-color-syntax").then((mod) => mod.default);
const ReactMarkdown = dynamic(() => import("react-markdown"), { ssr: false });

interface FullScreenMarkdownEditorProps {
    isOpen: boolean;
    initialContent: string;
    onSave?: (newContent: string) => void;
    onCancel?: () => void;
    analysisData?: MarkdownAnalysisData;
    messageId?: string;
    title?: string;
    description?: string;
    showCopyButton?: boolean;
    showSaveButton?: boolean;
    showCancelButton?: boolean;
    tabs?: Array<"write" | "rich" | "preview" | "analysis">;
    initialTab?: "write" | "rich" | "preview" | "analysis";
}

const FullScreenMarkdownEditor: React.FC<FullScreenMarkdownEditorProps> = ({
    isOpen,
    initialContent,
    onSave,
    onCancel,
    analysisData,
    messageId,
    title = "Edit Content",
    description = "A dialog for editing content with options to write in markdown, use a rich text editor, preview the content, or analyze it.",
    showCopyButton = true,
    showSaveButton = true,
    showCancelButton = true,
    tabs = ["write", "rich", "preview", "analysis"],
    initialTab = "write",
}) => {
    const [editedContent, setEditedContent] = useState(initialContent);
    const [activeTab, setActiveTab] = useState<string>(initialTab);
    const editorRef = useRef<TuiEditorReactComp>(null);
    const { mode } = useTheme();
    const [colorSyntaxPlugin, setColorSyntaxPlugin] = useState<any>(null);
    const [isClient, setIsClient] = useState(false);

    // Apply dark mode class to editor when mode changes
    useEffect(() => {
        if (editorRef.current && isClient) {
            try {
                // Get the editor root element directly
                const editorEl = editorRef.current.getRootElement();
                // Find the actual editor container element
                const editorContainer = editorEl?.querySelector(".toastui-editor-defaultUI");
                if (editorContainer) {
                    if (mode === "dark") {
                        editorContainer.classList.add("toastui-editor-dark");
                    } else {
                        editorContainer.classList.remove("toastui-editor-dark");
                    }
                }
            } catch (e) {
                console.error("Error applying dark mode to editor:", e);
            }
        }
    }, [mode, isClient]);

    useEffect(() => {
        setIsClient(true);
        loadColorSyntaxPlugin().then((plugin) => {
            setColorSyntaxPlugin(() => plugin);
        });
    }, []);

    // Update the edited content whenever initialContent changes or editor is opened
    useEffect(() => {
        if (isOpen) {
            setEditedContent(initialContent);
            // If the editor is already open and initialContent changes, update the TUI editor
            if (activeTab === "rich" && editorRef.current) {
                try {
                    const instance = editorRef.current.getInstance();
                    const currentMarkdownInTui = instance.getMarkdown();
                    if (currentMarkdownInTui !== initialContent) {
                        instance.setMarkdown(initialContent, false);
                    }
                } catch (e) {
                    console.error("Error updating TUI editor with new initialContent:", e);
                }
            }
        }
    }, [isOpen, initialContent, activeTab]);

    const handleTuiChange = useCallback(() => {
        if (editorRef.current && activeTab === "rich") {
            try {
                const instance = editorRef.current.getInstance();
                const currentMarkdown = instance.getMarkdown();
                if (currentMarkdown !== editedContent) {
                    setEditedContent(currentMarkdown);
                }
            } catch (e) {
                console.error("Error getting markdown from TUI change:", e);
            }
        }
    }, [activeTab, editedContent]);

    const handleTabChange = (newTab: string) => {
        const currentTab = activeTab;
        if (currentTab === "rich" && editorRef.current) {
            try {
                const instance = editorRef.current.getInstance();
                const markdown = instance.getMarkdown();
                if (markdown !== editedContent) {
                    setEditedContent(markdown);
                }
            } catch (e) {
                console.error("Error getting markdown on tab change:", e);
            }
        }
        setActiveTab(newTab);
        if (newTab === "rich") {
            queueMicrotask(() => {
                if (editorRef.current) {
                    try {
                        const instance = editorRef.current.getInstance();
                        const currentMarkdownInTui = instance.getMarkdown();
                        if (currentMarkdownInTui !== editedContent) {
                            instance.setMarkdown(editedContent, false);
                        }
                        // Ensure dark mode is applied when switching tabs
                        const editorEl = editorRef.current.getRootElement();
                        const editorContainer = editorEl?.querySelector(".toastui-editor-defaultUI");
                        if (editorContainer) {
                            if (mode === "dark") {
                                editorContainer.classList.add("toastui-editor-dark");
                            } else {
                                editorContainer.classList.remove("toastui-editor-dark");
                            }
                        }
                    } catch (e) {
                        console.error("Error setting markdown on tab change:", e);
                    }
                }
            });
        }
    };

    const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        if (activeTab === "write") {
            setEditedContent(e.target.value);
        }
    };

    const handleSave = () => {
        let finalMarkdown = editedContent;
        if (activeTab === "rich" && editorRef.current) {
            try {
                const instance = editorRef.current.getInstance();
                finalMarkdown = instance.getMarkdown();
            } catch (e) {
                console.error("Error getting final markdown from TUI editor on save:", e);
            }
        }
        if (onSave) {
            onSave(finalMarkdown);
        }
    };

    const handleImageUpload = async (blob: File | Blob, callback: (url: string, altText?: string) => void) => {
        console.warn("Image upload not implemented.");
        alert("Image upload not configured. See console for details.");
        // callback('error.jpg', 'upload error');
    };

    const editorPlugins = isClient && colorSyntaxPlugin ? [colorSyntaxPlugin] : [];

    // Define tabs content
    const tabDefinitions: TabDefinition[] = [];
    
    if (tabs.includes("write")) {
        tabDefinitions.push({
            id: "write",
            label: "Write",
            content: (
                <textarea
                    className="w-full h-full p-4 outline-none resize-none border-none bg-background text-foreground text-base font-mono"
                    value={editedContent}
                    onChange={handleTextareaChange}
                    placeholder="Start writing markdown..."
                    aria-label="Markdown Editor"
                />
            ),
            className: "p-0"
        });
    }
    
    if (tabs.includes("rich")) {
        tabDefinitions.push({
            id: "rich",
            label: "Rich Text",
            content: (
                <div className="w-full h-full tui-editor-wrapper">
                    {isOpen && isClient && (
                        <TuiEditor
                            ref={editorRef}
                            key={`${activeTab}-${mode}-${isOpen}`}
                            initialValue={editedContent}
                            initialEditType="wysiwyg"
                            previewStyle="tab"
                            height="100%"
                            usageStatistics={false}
                            plugins={editorPlugins}
                            hooks={{
                                addImageBlobHook: handleImageUpload,
                            }}
                            onChange={handleTuiChange}
                        />
                    )}
                    {!isClient && <EditorLoading />}
                </div>
            ),
            className: "overflow-hidden p-0 bg-background"
        });
    }
    
    if (tabs.includes("preview")) {
        tabDefinitions.push({
            id: "preview",
            label: "Preview",
            content: (
                <div className="prose dark:prose-invert max-w-none">
                    {isClient && <ReactMarkdown remarkPlugins={[remarkGfm]}>{editedContent}</ReactMarkdown>}
                </div>
            ),
            className: "p-4"
        });
    }
    
    if (tabs.includes("analysis")) {
        tabDefinitions.push({
            id: "analysis",
            label: "Analysis",
            content: <MarkdownAnalyzer messageId={messageId} />,
            className: "p-4"
        });
    }

    // Define additional buttons
    const additionalButtons = showCopyButton ? (
        <MarkdownCopyButton markdownContent={editedContent} className="mr-2 bg-inherit text-inherit" />
    ) : null;

    return (
        <FullScreenOverlay
            isOpen={isOpen}
            onClose={() => onCancel?.()}
            title={title}
            description={description}
            tabs={tabDefinitions}
            initialTab={activeTab}
            onTabChange={handleTabChange}
            showSaveButton={showSaveButton}
            onSave={handleSave}
            showCancelButton={showCancelButton}
            onCancel={onCancel}
            additionalButtons={additionalButtons}
        />
    );
};

export default FullScreenMarkdownEditor;