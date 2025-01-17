// File: useSetEditorContent.ts
import { useState, useEffect, useCallback, useRef } from 'react';

import { findChipPatterns, findMatchingBrokers, createStructuredContent } from './set-editor-utils';
import { EditorHookResult } from '../useEditor';
import { useAppSelector, useEntity, useEntityTools } from '@/lib/redux';

export const useSetEditorContent = (
    initialContent: string,
    editorHook: EditorHookResult
) => {
    const [isProcessing, setIsProcessing] = useState(true);
    const editorRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        const initializeContent = async () => {
            setIsProcessing(true);
            try {
                const editor = editorHook.getEditor();
                if (!editor) return;
                editorRef.current = editor;

                const processedLines = processContentLines(initialContent);

                // Clear existing content
                editor.innerHTML = '';

                for (const line of processedLines) {
                    let lineElement: HTMLElement;

                    if (line.isEmpty) {
                        lineElement = createEmptyLine(line.isFirstLine);
                    } else if (line.segments.length === 1 && line.segments[0].type === 'text') {
                        lineElement = createTextOnlyLine(line.segments[0].content, line.isFirstLine);
                    } else {
                        lineElement = createChipLine(
                            line.segments,
                            line.isFirstLine,
                            (chipData) => createCompleteChipStructure(
                                chipData,
                                editorHook.dragConfig,
                                false,
                                editorHook.chipHandlers
                            )
                        );
                    }

                    editor.appendChild(lineElement);
                }

                // Position cursor at end
                const selection = window.getSelection();
                if (selection && editor.lastChild) {
                    const range = document.createRange();
                    range.selectNodeContents(editor.lastChild);
                    range.collapse(false);
                    selection.removeAllRanges();
                    selection.addRange(range);
                }

            } catch (error) {
                console.error('Error initializing editor content:', error);
            } finally {
                setIsProcessing(false);
            }
        };

        if (initialContent) {
            initializeContent();
        }
    }, [initialContent, editorHook]);

    return {
        isProcessing
    };
};
