// File: useSetEditorContent.ts
import { useState, useCallback, useRef, useEffect } from 'react';
import { EditorHookResult } from './useEditor';
import { createChipLine, createEmptyLine, createTextOnlyLine, processContentLines } from '../utils/setEditorUtils';
import { useEditorContext } from '@/providers/rich-text-editor/Provider';
import { createEnhancedChipStructure } from '../utils/enhancedChipUtils';
import { getAllMatrxRecordIds } from '../utils/patternUtils';

export const useSetEditorContent = (editorId: string, useEditor: EditorHookResult) => {
    const context = useEditorContext();
    const [isProcessing, setIsProcessing] = useState(false);
    const editorRef = useRef<HTMLElement | null>(null);
    const lastModeRef = useRef<string | null>(null);
    const initialContentSetRef = useRef(false);

    useEffect(() => {
        const currentMode = context.getContentMode(editorId);

        if (!initialContentSetRef.current || lastModeRef.current === currentMode || isProcessing) {
            return;
        }

        const content = context.getEncodedText(editorId);

        if (content) {
            lastModeRef.current = currentMode;
            setContent(content);
        }
    }, [context.getEncodedText(editorId)]);

    const setContent = useCallback(
        async (content: string) => {
            if (isProcessing) {
                return false;
            }

            setIsProcessing(true);
            try {
                const editor = document.querySelector(`[data-editor-id="${editorId}"]`) as HTMLDivElement | null;
                if (!editor) {
                    throw new Error('Editor element not found');
                }
                editorRef.current = editor;

                if (!initialContentSetRef.current) {
                    initialContentSetRef.current = true;
                    lastModeRef.current = context.getEncodedText(editorId);
                }

                editor.innerHTML = '';

                const neededBrokers = getAllMatrxRecordIds(content);
                if (neededBrokers.length > 0) {
                    context.chips.getOrFetchAllBrokers(editorId, neededBrokers);
                }

                const processedLines = processContentLines(content);
                
                const lineElements = processedLines.map((line) => {
                    if (line.isEmpty) {
                        return createEmptyLine(line.isFirstLine);
                    }
                    if (line.segments.length === 1 && line.segments[0].type === 'text') {
                        return createTextOnlyLine(line.segments[0].content, line.isFirstLine);
                    }
                    return createChipLine(line.segments, line.isFirstLine, (metadata) =>
                        createEnhancedChipStructure(metadata, useEditor.setDraggedChip, useEditor.chipHandlers)
                    );
                });

                lineElements.forEach((element) => editor.appendChild(element));

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
        [editorId, useEditor, context]
    );

    return {
        isProcessing,
        setContent,
    };
};
