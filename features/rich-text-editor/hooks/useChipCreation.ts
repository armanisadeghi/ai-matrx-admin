import { useCallback, useEffect, useRef } from 'react';
import {
    getEditorElement,
    getSelectedTextOrRange,
    positionCursorAfterChip,
} from '../utils/editorUtils';
import { EditorContextValue } from '../provider/provider';
import { ChipHandlers } from '../utils/createChipUtil';
import { createEnhancedChipStructure, updateChipMode } from '../utils/enhancedChipUtils';

export const useChipCreation = (
    editorId: string,
    chipHandlers: ChipHandlers,
    setDraggedChip: (chip: HTMLElement | null) => void,
    context: EditorContextValue,
    updatePlainTextContent: () => void
) => {
    const cleanupFunctions = useRef(new Map<string, () => void>());
    const getEditor = useCallback(() => getEditorElement(editorId), [editorId]);
    const mode = context.getContentMode(editorId);

    // Cleanup effect
    useEffect(() => {
        return () => {
            cleanupFunctions.current.forEach((cleanup) => cleanup());
            cleanupFunctions.current.clear();
        };
    }, []);

    // Mode change effect
    useEffect(() => {
        const editor = getEditor();
        if (!editor) return;

        const chips = editor.querySelectorAll('[data-chip="true"]');
        chips.forEach((chip) => {
            if (chip instanceof HTMLElement) {
                updateChipMode(chip, mode);
            }
        });
    }, [mode, getEditor]);


    const createEnhancedChip = useCallback(async () => {
        const editor = getEditor();
        if (!editor) return false;

        try {
            const { text, range } = getSelectedTextOrRange(editorId);
            if (!range) console.error('No range found and Armani deleted the other method!');

            const { matrxRecordId, brokerMetadata } = await context.chips.createNewChipData(editorId, {
                defaultValue: text,
            });

            const { insertionWrapper, anchorNode } = createEnhancedChipStructure(brokerMetadata, setDraggedChip, chipHandlers, mode);
            range.deleteContents();
            range.insertNode(insertionWrapper);

            const selection = window.getSelection();
            if (selection) {
                positionCursorAfterChip(anchorNode, selection);
            }

            updatePlainTextContent();
            chipHandlers?.onNewChip?.(brokerMetadata);
            return true;
        } catch (error) {
            console.error('Failed to convert selection to chip:', error);
            return false;
        }
    }, [editorId, mode, context.chips, setDraggedChip, updatePlainTextContent, getEditor, chipHandlers]);

    return {
        createEnhancedChip,
    };
};
