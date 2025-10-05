"use client";

import React, { useState, useRef } from "react";
import TuiEditorContent from "@/components/mardown-display/chat-markdown/tui/TuiEditorContent";
import type { TuiEditorContentRef } from "@/components/mardown-display/chat-markdown/tui/TuiEditorContent";
import { HtmlCodeFilesTab } from "@/features/html-pages/components/tabs/HtmlCodeFilesTabTest";
import { SavePageTab } from "@/features/html-pages/components/tabs/SavePageTabTest";
import { useHtmlPreviewState } from "@/features/html-pages/hooks/useHtmlPreviewStateTest";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectUser } from "@/lib/redux/selectors/userSelectors";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, FileCode } from "lucide-react";
import { SAMPLE_MARKDOWN } from "./constants";


export default function TuiTestPage() {
    const user = useAppSelector(selectUser);
    const [inputMarkdown, setInputMarkdown] = useState(SAMPLE_MARKDOWN);
    const [stagedMarkdown, setStagedMarkdown] = useState(SAMPLE_MARKDOWN);
    const [inputDialogOpen, setInputDialogOpen] = useState(false);
    const [outputDialogOpen, setOutputDialogOpen] = useState(false);
    const editorRef = useRef<TuiEditorContentRef>(null);

    // Use the HTML preview hook to test markdown -> HTML conversion
    const htmlPreviewState = useHtmlPreviewState({
        markdownContent: inputMarkdown,
        htmlContent: "",
        user: user || undefined,
        isOpen: true,
        publishedPageId: null,
        onPageIdChange: undefined,
        resetKey: undefined,
    });

    const handleOpenInputDialog = () => {
        // Reset staged content to current content when opening
        setStagedMarkdown(htmlPreviewState.currentMarkdown);
        setInputDialogOpen(true);
    };

    const handleLoadMarkdown = () => {
        // Apply the staged content
        setInputMarkdown(stagedMarkdown);
        htmlPreviewState.setCurrentMarkdown(stagedMarkdown);
        setInputDialogOpen(false);
    };

    return (
        <div className="flex h-screen w-full bg-gray-50 dark:bg-gray-950">
            {/* Left Panel - TUI Editor */}
            <div className="flex flex-col w-1/3 border-r border-gray-300 dark:border-gray-700">
                <div className="flex items-center justify-between px-4 py-2 bg-gray-200 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700">
                    <h2 className="font-semibold text-gray-900 dark:text-gray-100">TUI Editor (Markdown)</h2>
                    <div className="flex gap-2">
                        <Dialog open={inputDialogOpen} onOpenChange={setInputDialogOpen}>
                            <DialogTrigger asChild>
                                <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="gap-2"
                                    onClick={handleOpenInputDialog}
                                >
                                    <FileText className="w-4 h-4" />
                                    Load
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl max-h-[80vh]">
                                <DialogHeader>
                                    <DialogTitle>Load Markdown Content</DialogTitle>
                                </DialogHeader>
                                <div className="flex flex-col gap-4">
                                    <textarea
                                        value={stagedMarkdown}
                                        onChange={(e) => setStagedMarkdown(e.target.value)}
                                        className="w-full h-96 p-4 font-mono text-sm resize-none bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Paste your markdown here..."
                                    />
                                    <Button onClick={handleLoadMarkdown} className="w-full">
                                        Load to Editor
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                        
                        <Dialog open={outputDialogOpen} onOpenChange={setOutputDialogOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm" variant="outline" className="gap-2">
                                    <FileCode className="w-4 h-4" />
                                    View Output
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl max-h-[80vh]">
                                <DialogHeader>
                                    <DialogTitle>Markdown Output</DialogTitle>
                                </DialogHeader>
                                <div className="overflow-auto max-h-[60vh]">
                                    <pre className="p-4 font-mono text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap bg-gray-50 dark:bg-gray-800 rounded">
                                        {htmlPreviewState.currentMarkdown || "No content yet..."}
                                    </pre>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
                <div className="flex-1 overflow-hidden">
                    <TuiEditorContent
                        ref={editorRef}
                        content={htmlPreviewState.currentMarkdown}
                        onChange={(content) => htmlPreviewState.setCurrentMarkdown(content)}
                        editMode="markdown"
                        className="w-full h-full"
                    />
                </div>
            </div>

            {/* Middle Panel - HTML Code Files */}
            <div className="flex flex-col w-1/3 border-r border-gray-300 dark:border-gray-700">
                <div className="px-4 py-2 bg-gray-200 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700">
                    <h2 className="font-semibold text-gray-900 dark:text-gray-100">Generated HTML Files</h2>
                </div>
                <div className="flex-1 overflow-hidden">
                    <HtmlCodeFilesTab
                        state={htmlPreviewState}
                        actions={htmlPreviewState}
                        user={user}
                    />
                </div>
            </div>

            {/* Right Panel - Save/Preview Tab */}
            <div className="flex flex-col w-1/3">
                <div className="px-4 py-2 bg-gray-200 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700">
                    <h2 className="font-semibold text-gray-900 dark:text-gray-100">Publish & Preview</h2>
                </div>
                <div className="flex-1 overflow-hidden">
                    <SavePageTab
                        state={htmlPreviewState}
                        actions={htmlPreviewState}
                        user={user}
                    />
                </div>
            </div>
        </div>
    );
}