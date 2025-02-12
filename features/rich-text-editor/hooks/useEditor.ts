import { useCallback } from 'react';
import { extractEncodedTextFromDom } from '../utils/editorUtils';
import { useEditorContext } from '../../../providers/rich-text-editor/Provider';
import { useEditorStyles } from './useEditorStyles';
import { useDragAndDrop } from './useDragAndDrop';
import { useChipCreation } from './useChipCreation';
import { ChipHandlers } from '../utils/enhancedChipUtils';

export const useEditor = (editorId: string, chipHandlers: ChipHandlers, onChange?: (text: string) => void) => {
    const context = useEditorContext();

    const getEditorElement = useCallback((): HTMLDivElement | null => {
        return document.querySelector(`[data-editor-id="${editorId}"]`) as HTMLDivElement | null;
    }, []);

    const getText = useCallback(() => {
        return context.getContent(editorId);
    }, [context, editorId]);

    const focus = useCallback(() => {
        const editor = getEditorElement();
        if (editor) {
            editor.focus();
        }
    }, [getEditorElement]);

    const updateContentAndMetadata = useCallback(() => {
        const editor = getEditorElement();
        if (!editor) return;
        const text = extractEncodedTextFromDom(editor);
        context.setContent(editorId, text);
        onChange?.(text);
    }, [getEditorElement, editorId]);

    const { handleDragOver, handleDrop, setDraggedChip } = useDragAndDrop(editorId, {
        updateContentAndMetadata,
    });

    const { handleStyleChange } = useEditorStyles(editorId, {
        updateContentAndMetadata,
    });

    const { createEnhancedChip } = useChipCreation(editorId, chipHandlers, setDraggedChip, context, updateContentAndMetadata);

    return {
        createEnhancedChip,
        applyStyle: handleStyleChange,
        getText,
        updateContentAndMetadata,
        getEditorElement,
        focus,
        setDraggedChip,
        chipHandlers,
        handleDragOver,
        handleDrop,
        handleStyleChange,
    };
};

export type EditorHookResult = ReturnType<typeof useEditor>;
