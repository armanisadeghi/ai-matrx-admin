// File: useSetEditorContent.ts
import { useState, useCallback, useRef } from 'react';
import { EditorHookResult } from './useEditor';
import { getEditorElement } from '../utils/editorUtils';
import { createChipLine, createEmptyLine, createTextOnlyLine, processContentLines } from '../utils/setEditorUtils';
import { MatrxStatus } from '../types/editor.types';
import { useEditorContext } from '../provider/provider';
import { createChipStructure } from '../utils/createChipUtil';


interface BrokerMetaData {
    matrxRecordId?: string;
    name?: string;
    defaultValue?: string;
    color?: string;
    status?: MatrxStatus;
    defaultComponent?: string;
    dataType?: string;
    id?: string;
    [key: string]: string | undefined;
}

export const useSetEditorContent = (editorId: string, useEditor: EditorHookResult) => {
    const context = useEditorContext();
    const getEditor = useCallback(() => getEditorElement(editorId), [editorId]);
    const [isProcessing, setIsProcessing] = useState(false);
    const editorRef = useRef<HTMLElement | null>(null);
    
    // Main content setting callback
    const setContent = useCallback(
        async (content: string) => {
            setIsProcessing(true);
            try {
                const editor = getEditor();
                if (!editor) {
                    throw new Error('Editor element not found');
                }
                editorRef.current = editor;
    
                // Process content into lines with embedded metadata
                const processedLines = processContentLines(content);
    
                // Clear existing content
                editor.innerHTML = '';
    
                // Create and append line elements
                const lineElements = processedLines.map(line => {
                    if (line.isEmpty) {
                        return createEmptyLine(line.isFirstLine);
                    }
                    if (line.segments.length === 1 && line.segments[0].type === 'text') {
                        return createTextOnlyLine(line.segments[0].content, line.isFirstLine);
                    }
                    return createChipLine(
                        line.segments,
                        line.isFirstLine,
                        (metadata) => createChipStructure(metadata, useEditor.setDraggedChip, useEditor.chipHandlers)
                    );
                });
    
                lineElements.forEach(element => editor.appendChild(element));
    
                // Position cursor at end
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
