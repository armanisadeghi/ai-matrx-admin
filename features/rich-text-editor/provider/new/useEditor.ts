import { useCallback } from 'react';
import {
    extractTextContent,
    getEditorElement,
} from '../utils/editorUtils';
import { ChipHandlers } from '../utils/chipService';
import { useEditorContext } from '../provider/EditorProvider';
import { useEditorStyles } from './useEditorStyles';
import { useDragAndDrop } from './useDragAndDrop';
import { useChipCreation } from './useChipCreation';

export const useEditor = (editorId: string, chipHandlers: ChipHandlers) => {
    const context = useEditorContext();
    const editorState = context.getEditorState(editorId);
    const getEditor = useCallback(() => getEditorElement(editorId), [editorId]);

    const getText = useCallback(() => {
        return editorState.plainTextContent;
    }, [editorState.plainTextContent]);

    const focus = useCallback(() => {
        const editor = getEditor();
        if (editor) {
            editor.focus();
        }
    }, [getEditor]);

    const updatePlainTextContent = useCallback(() => {
        const editor = getEditor();
        if (!editor) return;
        const text = extractTextContent(editor);
        context.setPlainTextContent(editorId, text);
    }, [getEditor, editorId]);

    const normalizeContent = useCallback(() => {
        const editor = getEditor();
        if (!editor) return;
        console.log('Normalizing content');
        const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, null);

        let node;
        while ((node = walker.nextNode())) {
            if (node.parentNode === editor) {
                const span = document.createElement('span');
                node.parentNode.insertBefore(span, node);
                span.appendChild(node);
            }
        }
    }, [getEditor]);

    // Update hook calls to use editorId instead of ref
    const { handleNativeDragStart, handleNativeDragEnd, handleDragOver, handleDrop, dragConfig } = useDragAndDrop(editorId, {
        normalizeContent,
        updatePlainTextContent,
    });

    const { handleStyleChange } = useEditorStyles(editorId, {
        updatePlainTextContent,
    });

    const { insertChip, convertSelectionToChip } = useChipCreation(editorId, chipHandlers, dragConfig, context, updatePlainTextContent);

    return {
        // Ref Manager methods
        insertChip,
        convertSelectionToChip,
        applyStyle: handleStyleChange,
        getText,
        normalize: normalizeContent,
        updateContent: updatePlainTextContent,
        focus,

        dragConfig,
        chipHandlers,
        // Event handlers
        handleNativeDragStart,
        handleNativeDragEnd,
        handleDragOver,
        handleDrop,
        handleStyleChange,
        updatePlainTextContent,
        normalizeContent,
    };
};

export type EditorHookResult = ReturnType<typeof useEditor>;
