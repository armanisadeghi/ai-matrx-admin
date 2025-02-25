"use client";

import MonacoEditor, { EditorProps as MonacoEditorProps } from "@monaco-editor/react";
import React, { useEffect, useRef, useState } from "react";
import { findParentStructure, getLanguageFromExtension, getPlaceholderText, IParentStructure } from "../../utils";
import * as monaco from "monaco-editor";
import { editor as coreEditor } from "monaco-editor-core";
import { useEditorSave } from "@/app/dashboard/code-editor/hooks";
import { createChatStart, sendAiMessage } from "@/app/dashboard/code-editor/supabase/aiChat";
import { useRecoilValue } from "recoil";
import { activeUserAtom } from "@/state/userAtoms";
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

const containerClass = "bg-neutral-800 p-2.5 rounded-md border border-neutral-600 shadow";

const textareaClass =
    "mb-2 px-3 py-1.5 text-base border border-transparent bg-neutral-700 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-700 outline-none transition duration-150 ease-in-out placeholder:text-sm";

const buttonClass =
    "px-3 py-1.5 flex items-center gap-2 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 text-sm";

const buttonVariantClass = {
    primary: "text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-700 focus:ring-blue-500",
    secondary: "text-gray-700 bg-gray-200 hover:bg-gray-300 active:bg-gray-400 focus:ring-gray-500",
    light: "text-neutral-700 bg-white border border-neutral-300 hover:bg-neutral-100 active:bg-neutral-200 focus:ring-neutral-500",
    subtle: "text-white bg-neutral-700 border border-transparent hover:bg-neutral-600 active:bg-neutral-200 focus:ring-neutral-500",
    danger: "text-rose-600 border border-transparent hover:bg-rose-700 hover:text-white active:bg-rose-200 focus:ring-rose-500",
};

const suggestionsContainerClass = "";

const responseContainerClass = "mt-4";

const responseContentClass = "p-2 border border-neutral-700 rounded-md";

const createWidgetContent = (parentStructure: IParentStructure): string => {
    const placeholder = getPlaceholderText(parentStructure);
    const structureType =
        parentStructure.type === "htmlTag"
            ? `${parentStructure.name} tag`
            : parentStructure.name || parentStructure.type;

    return `
        <div class="ai-suggestions-widget ${containerClass}">
            <div class="widget-header flex justify-between items-center mb-4">
                <span>AI Suggestions for ${structureType}</span>
                <button id="closeSuggestions" class="close-button ${buttonClass} ${buttonVariantClass.danger}" title="close widget">
                    Close
                </button>
            </div>
            <textarea id="aiInstructions" class="ai-input ${textareaClass}" placeholder="${placeholder}"></textarea>
            <button id="submitAiInstructions" class="submit-button ${buttonClass} ${buttonVariantClass.subtle}">Generate Content</button>
            <div id="aiSuggestions" class="suggestions-container ${suggestionsContainerClass}"></div>
            <div id="aiResponse" class="response-container ${responseContainerClass}"></div>
        </div>
    `;
};

const formatMessage = (structure: IParentStructure, instructions: string, language: string): string => {
    return `
        Context: I have a ${structure.type} ${structure.name ? `named ${structure.name}` : ""} in ${language}.
        Current content:
        \`\`\`${language}
        ${structure.innerContent}
        \`\`\`
        
        Instructions: ${instructions}
        
        Please provide the complete implementation in ${language}. Keep the existing structure and naming, but modify or add to the content as requested.
    `;
};

const addWidgetStyles = () => {
    const styleId = "ai-widget-styles";
    if (document.getElementById(styleId)) return;

    const styleElement = document.createElement("style");
    styleElement.id = styleId;
    styleElement.innerHTML = `
        .ai-suggestions-widget {
            width: 700px;
        }
        .widget-header {

        }
        .close-button {
            cursor: pointer;
            font-size: 16px;
        }
        .ai-input {
            width: 100%;
        }
        .submit-button, .apply-button {
            width: auto;
        }
        .submit-button:disabled {
            background: #1e1e1e;
            cursor: not-allowed;
        }
        .response-container {

        }
        .response-content pre {

        }
        .error-message {

        }
    `;
    document.head.appendChild(styleElement);
};

type CodeEditorProps = MonacoEditorProps & {
    repoName: string;
    value: string;
    filename: string;
    onChange: (newContent: string) => void;
    height?: number | string;
};

export const CodeEditor: React.FC<CodeEditorProps> = ({ repoName, value, onChange, filename, height }) => {
    const [content, setContent] = useState<string>(value);
    const [isLoading, setIsLoading] = useState(false);
    const language = getLanguageFromExtension(filename);
    const editorRef = useRef<any>(null);
    const { saveFileContent } = useEditorSave(editorRef, repoName, filename, setIsLoading);
    const userId = useRecoilValue(activeUserAtom).matrixId;
    const suggestionsWidgetRef = useRef<monaco.editor.IContentWidget | null>(null);

    const handleEditorDidMount = (editor, monacoInstance) => {
        editorRef.current = editor;

        // Add keybinding for Ctrl + S
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
            void handleSaveContent();
        });

        editor.addAction({
            id: "triggerAiSuggestions",
            label: "Trigger AI Suggestions",
            contextMenuGroupId: "0_customGroup",
            contextMenuOrder: 1,
            keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyI], // Ctrl+I or Cmd+I
            run: (_editor) => {
                showAiSuggestionsWidget(editor, userId, language);
            },
        });

        // Save on blur
        editor.onDidBlurEditorWidget(() => {
            void handleSaveContent();
        });
    };

    const handleEditorChange = (value, _event) => {
        setContent(value);
        onChange(value);
    };

    const handleSaveContent = async () => {
        if (editorRef.current) {
            setIsLoading(true);
            try {
                await saveFileContent();
                console.log(`File ${filename} saved to IndexedDB`);
                setIsLoading(false);
            } catch (error) {
                console.error(`Error saving file ${filename}:`, error);
                setIsLoading(false);
            }
        }
    };

    const showAiSuggestionsWidget = async (
        editor: monaco.editor.IStandaloneCodeEditor,
        userId: string,
        language: string,
    ) => {
        // 1. Get current cursor position
        const currentPosition = editor.getPosition();
        if (!currentPosition) return;

        // 2. Find parent structure with error handling
        let parentStructure: IParentStructure;
        try {
            const found = findParentStructure(editor, currentPosition);
            if (!found) {
                throw new Error("No parent structure found");
            }
            parentStructure = found;
        } catch (error) {
            console.error("Error finding parent structure:", error);
            const model = editor.getModel();
            if (!model) return;

            parentStructure = {
                type: "unknown",
                name: "",
                startLine: currentPosition.lineNumber,
                endLine: currentPosition.lineNumber,
                startColumn: 1,
                endColumn: model.getLineMaxColumn(currentPosition.lineNumber),
                innerContent: model.getLineContent(currentPosition.lineNumber),
                language,
            };
        }

        // 3. Create widget content
        const domNode = document.createElement("div");
        const widgetContent = createWidgetContent(parentStructure);
        domNode.innerHTML = widgetContent;

        // 4. Widget management
        if (suggestionsWidgetRef.current) {
            editor.removeContentWidget(suggestionsWidgetRef.current);
            suggestionsWidgetRef.current = null;
            domNode.remove();
        }

        // 5. Setup event handlers
        await setupEventHandlers(domNode, editor, parentStructure, userId, language);

        // 6. Add widget to editor
        const newWidget = {
            getDomNode: () => domNode,
            getId: () => "ai-suggestions-widget",
            getPosition: () => ({
                position: {
                    lineNumber: parentStructure.startLine,
                    column: parentStructure.startColumn,
                },
                preference: [monaco.editor.ContentWidgetPositionPreference.BELOW],
            }),
        };

        editor.addContentWidget(newWidget);
        suggestionsWidgetRef.current = newWidget;

        // 7. Add CSS styles
        addWidgetStyles();
    };

    const setupEventHandlers = async (
        domNode: HTMLElement,
        editor: monaco.editor.IStandaloneCodeEditor,
        parentStructure: IParentStructure,
        userId: string,
        language: string,
    ) => {
        const closeButton = domNode.querySelector("#closeSuggestions");
        const submitButton = domNode.querySelector("#submitAiInstructions") as HTMLButtonElement;
        const inputElement = domNode.querySelector("#aiInstructions") as HTMLInputElement;
        const suggestionsElement = domNode.querySelector("#aiSuggestions") as HTMLDivElement;
        const responseElement = domNode.querySelector("#aiResponse") as HTMLDivElement;

        closeButton?.addEventListener("click", () => {
            console.log("Closing widget");
            if (suggestionsWidgetRef.current) {
                editor.removeContentWidget(suggestionsWidgetRef.current);
                suggestionsWidgetRef.current = null;
                domNode.remove();
            } else {
                console.log("Widget reference is null");
            }
        });

        submitButton?.addEventListener("click", async () => {
            const instructions = inputElement?.value || "";
            if (!instructions.trim()) return;

            submitButton.disabled = true;
            submitButton.textContent = "Generating...";
            responseElement.innerHTML = "";

            try {
                const prompt = formatMessage(parentStructure, instructions, language);
                console.log({ prompt });
                const newChat = await createChatStart(prompt, userId);

                const response = await sendAiMessage({
                    chatId: newChat.chatId,
                    messagesEntry: [
                        {
                            role: "user",
                            content: prompt,
                        },
                    ],
                });

                const aiResponse = response.data;
                responseElement.innerHTML = `
                <div class="response-content">
                    <pre class="${responseContentClass} overflow-x-auto" style="max-height: 150px;">
                        <code>${aiResponse}</code>
                    </pre>
                    <button id="applyResponse" class="apply-button mt-2 ${buttonClass} ${buttonVariantClass.primary}">Apply Response</button>
                </div>
            `;

                const applyButton = responseElement.querySelector("#applyResponse");
                applyButton?.addEventListener("click", () => {
                    const edits = [
                        {
                            range: new monaco.Range(parentStructure.startLine + 1, 1, parentStructure.endLine - 1, 1),
                            text: aiResponse,
                        },
                    ];

                    editor.executeEdits("ai-suggestion", edits);

                    if (suggestionsWidgetRef.current) {
                        editor.removeContentWidget(suggestionsWidgetRef.current);
                        suggestionsWidgetRef.current = null;
                        domNode.remove();
                    }
                });
            } catch (error) {
                console.error("Error getting AI suggestions:", error);
                responseElement.innerHTML = `
                <div class="error-message">
                    Error generating suggestions. Please try again.
                </div>
            `;
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = "Generate Content";
            }
        });
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
                <MonacoEditor
                    height={height || "100%"}
                    theme="vs-dark"
                    value={content}
                    language={language}
                    onChange={handleEditorChange}
                    onMount={handleEditorDidMount}
                    options={OPTIONS}
                    loading={<div className="h-full flex items-center justify-center">Loading...</div>}
                />
            </div>
        </>
    );
};
