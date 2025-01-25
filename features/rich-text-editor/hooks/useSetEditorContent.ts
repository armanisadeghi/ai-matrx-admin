// File: useSetEditorContent.ts
import { useState, useCallback, useRef, useEffect } from 'react';
import { EditorHookResult } from './useEditor';
import { getEditorElement } from '../utils/editorUtils';
import { createChipLine, createEmptyLine, createTextOnlyLine, processContentLines } from '../utils/setEditorUtils';
import { useEditorContext } from '../provider/provider';
import { createChipStructure } from '../utils/createChipUtil';
import { createEnhancedChipStructure } from '../utils/enhancedChipUtils';

export const useSetEditorContent = (editorId: string, useEditor: EditorHookResult) => {
    const context = useEditorContext();
    const getEditor = useCallback(() => getEditorElement(editorId), [editorId]);
    const [isProcessing, setIsProcessing] = useState(false);
    const editorRef = useRef<HTMLElement | null>(null);
    const lastModeRef = useRef<string | null>(null);
    const initialContentSetRef = useRef(false);

    useEffect(() => {
        // const currentMode = context.getContentMode(editorId);
        const currentMode = context.getContentMode(editorId);

        if (!initialContentSetRef.current || lastModeRef.current === currentMode || isProcessing) {
            return;
        }

        // const content = context.getContentByCurrentMode(editorId);
        const content = context.getTextWithChipsReplaced(editorId);
        
        if (content) {
            lastModeRef.current = currentMode;
            setContent(content);
        }
    }, 
    // [context.getContentMode(editorId)]);
    [context.getTextWithChipsReplaced(editorId)]);

    const setContent = useCallback(
        async (content: string) => {
            if (isProcessing) {
                return false;
            }

            setIsProcessing(true);
            try {
                const editor = getEditor();
                if (!editor) {
                    throw new Error('Editor element not found');
                }
                editorRef.current = editor;

                if (!initialContentSetRef.current) {
                    initialContentSetRef.current = true;
                    // lastModeRef.current = context.getContentMode(editorId);
                    lastModeRef.current = context.getTextWithChipsReplaced(editorId);
                }

                // const currentMode = context.getContentMode(editorId);
                const currentMode = context.getContentMode(editorId);
                const currentContent = context.getContentByCurrentMode(editorId);

                console.log('Setting editor content for current mode and content', currentMode, content);

                editor.innerHTML = '';

                if (currentMode === 'encodeChips') {
                    const processedLines = processContentLines(content);
                    const lineElements = processedLines.map((line) => {
                        if (line.isEmpty) {
                            return createEmptyLine(line.isFirstLine);
                        }
                        if (line.segments.length === 1 && line.segments[0].type === 'text') {
                            return createTextOnlyLine(line.segments[0].content, line.isFirstLine);
                        }
                        return createChipLine(line.segments, line.isFirstLine, (metadata) =>
                            createChipStructure(metadata, useEditor.setDraggedChip, useEditor.chipHandlers)
                        );
                    });

                    lineElements.forEach((element) => editor.appendChild(element));
                } else {

                    const processedLines = processContentLines(content);
                    const lineElements = processedLines.map((line) => {
                        if (line.isEmpty) {
                            return createEmptyLine(line.isFirstLine);
                        }
                        if (line.segments.length === 1 && line.segments[0].type === 'text') {
                            return createTextOnlyLine(line.segments[0].content, line.isFirstLine);
                        }
                        return createChipLine(line.segments, line.isFirstLine, (metadata) =>
                            createEnhancedChipStructure(metadata, useEditor.setDraggedChip, useEditor.chipHandlers, currentMode)
                        );
                    });

                    lineElements.forEach((element) => editor.appendChild(element));







                    // const lines = currentContent.split('\n');
                    // lines.forEach((line, index) => {
                    //     const element = createTextOnlyLine(line, index === 0);
                    //     editor.appendChild(element);
                    // });
                }

                const selection = window.getSelection();
                if (selection && editor.lastChild) {
                    const range = document.createRange();
                    range.selectNodeContents(editor.lastChild);
                    range.collapse(false);
                    selection.removeAllRanges();
                    selection.addRange(range);
                }

                context.setContent(editorId, content);
                return true;
            } catch (error) {
                console.error('Error setting editor content:', error);
                return false;
            } finally {
                setIsProcessing(false);
            }
        },
        [editorId, getEditor, useEditor, context]
    );

    return {
        isProcessing,
        setContent,
    };
};
