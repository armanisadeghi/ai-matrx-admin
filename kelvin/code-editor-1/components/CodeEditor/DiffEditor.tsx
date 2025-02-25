"use client";

import { DiffEditor, EditorProps as MonacoEditorProps } from "@monaco-editor/react";
import React, { useEffect, useRef, useState } from "react";
import { getLanguageFromExtension } from "../../utils";
import { editor as coreEditor } from "monaco-editor-core";
import { useEditorSave } from "@/app/dashboard/code-editor/hooks";
import IStandaloneEditorConstructionOptions = coreEditor.IStandaloneEditorConstructionOptions;

const OPTIONS: IStandaloneEditorConstructionOptions = {
    acceptSuggestionOnCommitCharacter: true,
    acceptSuggestionOnEnter: "on",
    accessibilitySupport: "auto",
    autoIndent: "keep",
    automaticLayout: true,
    codeLens: true,
    colorDecorators: true,
    contextmenu: true,
    cursorBlinking: "blink",
    cursorSmoothCaretAnimation: "off",
    cursorStyle: "line",
    disableLayerHinting: false,
    disableMonospaceOptimizations: false,
    dragAndDrop: false,
    fixedOverflowWidgets: false,
    folding: true,
    foldingStrategy: "auto",
    fontLigatures: false,
    formatOnPaste: false,
    formatOnType: false,
    hideCursorInOverviewRuler: false,
    links: true,
    mouseWheelZoom: false,
    multiCursorMergeOverlapping: true,
    multiCursorModifier: "alt",
    overviewRulerBorder: true,
    overviewRulerLanes: 2,
    quickSuggestions: true,
    quickSuggestionsDelay: 100,
    readOnly: false,
    renderControlCharacters: false,
    renderFinalNewline: "on",
    renderLineHighlight: "all",
    renderWhitespace: "none",
    revealHorizontalRightPadding: 30,
    roundedSelection: true,
    rulers: [],
    scrollBeyondLastColumn: 5,
    scrollBeyondLastLine: true,
    selectOnLineNumbers: true,
    selectionClipboard: true,
    selectionHighlight: true,
    showFoldingControls: "mouseover",
    smoothScrolling: false,
    suggestOnTriggerCharacters: true,
    wordBasedSuggestions: "currentDocument",
    wordSeparators: "~!@#$%^&*()-=+[{]}|;:'\",.<>/?",
    wordWrap: "off",
    wordWrapBreakAfterCharacters: "\t})]?|&,;",
    wordWrapBreakBeforeCharacters: "{([+",
    wordWrapColumn: 80,
    wrappingIndent: "none",
};

type CodeDiffEditorProps = MonacoEditorProps & {
    repoName: string;
    value: string;
    newValue: string;
    filename: string;
    onChange?: (newContent: string) => void;
    height?: number | string;
};

export const CodeDiffEditor: React.FC<CodeDiffEditorProps> = ({
    repoName,
    value,
    onChange,
    filename,
    height,
    newValue,
}) => {
    const [content, setContent] = useState<string>(value);
    const [isLoading, setIsLoading] = useState(false);
    const language = getLanguageFromExtension(filename);
    const editorRef = useRef<any>(null);
    const { saveFileContent } = useEditorSave(editorRef, repoName, filename, setIsLoading);

    const diffEditorRef = useRef(null);

    const handleEditorMount = (editor) => {
        diffEditorRef.current = editor;
    };

    const showOriginalValue = () => {
        alert(diffEditorRef.current.getOriginalEditor().getValue());
    };

    const showModifiedValue = () => {
        alert(diffEditorRef.current.getModifiedEditor().getValue());
    };

    useEffect(() => {
        setContent(value);
    }, [value]);

    if (isLoading) {
        return <div className="h-full flex items-center justify-center">Loading...</div>;
    }

    return (
        <>
            <div className="h-full">
                <DiffEditor
                    height={height || "100%"}
                    theme="vs-dark"
                    original={content}
                    modified={content}
                    language={language}
                    onMount={handleEditorMount}
                    options={OPTIONS}
                    loading={<div className="h-full flex items-center justify-center">Loading...</div>}
                />
            </div>
        </>
    );
};
