"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, X } from 'lucide-react';
import remarkGfm from 'remark-gfm';
import dynamic from 'next/dynamic';
import type { Editor as TuiEditorReactComp } from '@toast-ui/react-editor';
import { useTheme } from "@/styles/themes/ThemeProvider";
import EditorLoading from '../text-block/editorLoading';
import MarkdownAnalyzer from './analyzer/MarkdownAnalyzer';
import { MarkdownAnalysisData } from './analyzer/types';


// Import the Toast UI Editor dark theme CSS
import '@toast-ui/editor/dist/toastui-editor.css';
import '@toast-ui/editor/dist/theme/toastui-editor-dark.css';

const TuiEditor = dynamic(
    () => import('@toast-ui/react-editor').then(mod => mod.Editor),
    { ssr: false, loading: () => <EditorLoading /> }
);

const loadColorSyntaxPlugin = () => import('@toast-ui/editor-plugin-color-syntax').then(mod => mod.default);

const ReactMarkdown = dynamic(() => import('react-markdown'), { ssr: false });

interface FullScreenMarkdownEditorProps {
    isOpen: boolean;
    initialContent: string;
    onSave: (newContent: string) => void;
    onCancel: () => void;
    analysisData?: MarkdownAnalysisData;
    messageId?: string;
}

const FullScreenMarkdownEditor: React.FC<FullScreenMarkdownEditorProps> = ({
    isOpen,
    initialContent,
    onSave,
    onCancel,
    analysisData,
    messageId,
}) => {
    const [editedContent, setEditedContent] = useState(initialContent);
    const [activeTab, setActiveTab] = useState<string>("write");
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
                const editorContainer = editorEl?.querySelector('.toastui-editor-defaultUI');
                
                if (editorContainer) {
                    if (mode === 'dark') {
                        editorContainer.classList.add('toastui-editor-dark');
                    } else {
                        editorContainer.classList.remove('toastui-editor-dark');
                    }
                }
            } catch (e) {
                console.error("Error applying dark mode to editor:", e);
            }
        }
    }, [mode, isClient]);

    useEffect(() => {
        setIsClient(true);
        loadColorSyntaxPlugin().then(plugin => {
            setColorSyntaxPlugin(() => plugin);
        });
    }, []);

    useEffect(() => {
        if (isOpen) {
            setEditedContent(initialContent);
            setActiveTab("write");
        }
    }, [isOpen, initialContent]);

    const handleTuiChange = useCallback(() => {
        if (editorRef.current && activeTab === 'rich') {
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

        if (currentTab === 'rich' && editorRef.current) {
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

        if (newTab === 'rich') {
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
                        const editorContainer = editorEl?.querySelector('.toastui-editor-defaultUI');
                        
                        if (editorContainer) {
                            if (mode === 'dark') {
                                editorContainer.classList.add('toastui-editor-dark');
                            } else {
                                editorContainer.classList.remove('toastui-editor-dark');
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
         if (activeTab === 'write') {
             setEditedContent(e.target.value);
         }
     };

    const handleSave = () => {
        let finalMarkdown = editedContent;
        if (activeTab === 'rich' && editorRef.current) {
             try {
                 const instance = editorRef.current.getInstance();
                 finalMarkdown = instance.getMarkdown();
             } catch(e) {
                 console.error("Error getting final markdown from TUI editor on save:", e);
             }
        }
        onSave(finalMarkdown);
    };

    const handleImageUpload = async (blob: File | Blob, callback: (url: string, altText?: string) => void) => {
        console.warn("Image upload not implemented.");
        alert("Image upload not configured. See console for details.");
        // callback('error.jpg', 'upload error');
    };

    const editorPlugins = isClient && colorSyntaxPlugin ? [colorSyntaxPlugin] : [];

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
            <DialogContent className="flex flex-col w-[80vw] max-w-[80vw] h-[80vh] max-h-[80vh] p-0 gap-0">
                <DialogHeader className="flex flex-row justify-between items-center border-b px-4 py-2 flex-shrink-0">
                    <DialogTitle>Edit Content</DialogTitle>
                    <Tabs value={activeTab} onValueChange={handleTabChange} className="mx-auto">
                        <TabsList>
                            <TabsTrigger value="write">Write</TabsTrigger>
                            <TabsTrigger value="rich">Rich Text</TabsTrigger>
                            <TabsTrigger value="preview">Preview</TabsTrigger>
                            <TabsTrigger value="analysis">Analysis</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </DialogHeader>
                {/* Add DialogDescription here */}
                <DialogDescription className="sr-only">
                    A dialog for editing content with options to write in markdown, use a rich text editor, preview the content, or analyze it.
                </DialogDescription>


                <Tabs value={activeTab} className="flex-grow flex flex-col overflow-hidden">
                    <TabsContent value="write" className="flex-grow mt-0 border-none p-0 outline-none ring-0">
                        <textarea
                            className="w-full h-full p-4 outline-none resize-none bg-background text-foreground text-base font-mono"
                            value={editedContent}
                            onChange={handleTextareaChange}
                            placeholder="Start writing markdown..."
                            aria-label="Markdown Editor"
                        />
                    </TabsContent>

                    <TabsContent value="rich" className="flex-grow mt-0 border-none overflow-hidden p-0 bg-background outline-none ring-0">
                         <div className="w-full h-full tui-editor-wrapper">
                             {isOpen && isClient && (
                                <TuiEditor
                                    ref={editorRef}
                                    key={`${initialContent}-${mode}`}
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
                    </TabsContent>

                    <TabsContent value="preview" className="flex-grow mt-0 border-none overflow-auto p-4 outline-none ring-0">
                        <div className="prose dark:prose-invert max-w-none">
                            {isClient && (
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {editedContent}
                                </ReactMarkdown>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="analysis" className="flex-grow mt-0 border-none overflow-auto p-4 outline-none ring-0">

                        {/* TODO: Add analysis here */}
                        <MarkdownAnalyzer messageId={messageId} />

                    </TabsContent>
                </Tabs>

                <DialogFooter className="border-t p-4 flex justify-end flex-shrink-0">
                    <Button variant="outline" onClick={onCancel}>Cancel</Button>
                    <Button onClick={handleSave}>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default FullScreenMarkdownEditor;