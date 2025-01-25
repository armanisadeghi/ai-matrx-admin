import { useCallback, useEffect, useRef } from 'react';
import {
    ensureValidContainer,
    getEditorElement,
    getSelectedText,
    insertWithRangeMethod,
    insertWithStructurePreservation,
    positionCursorAfterChip,
} from '../utils/editorUtils';
import { EditorContextValue } from '../provider/provider';
import { createChipStructure, ChipHandlers } from '../utils/createChipUtil';
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

    const insertChip = useCallback(async () => {
        const editor = getEditor();
        const selection = window.getSelection();

        if (!editor || !selection) return;

        const currentRange = ensureValidContainer(editor, selection);

        try {
            const { matrxRecordId, brokerMetadata, messageBrokerRecord } = await context.chips.createNewChipData(editorId);

            const { insertionWrapper, anchorNode } = createChipStructure(brokerMetadata, setDraggedChip, chipHandlers);

            // Handle container setup
            let container = currentRange.commonAncestorContainer;
            if (container.nodeType === Node.TEXT_NODE) {
                container = container.parentNode;
            }

            if (container === editor) {
                const span = document.createElement('span');
                span.appendChild(document.createTextNode('\u200B'));

                if (currentRange.startContainer === editor) {
                    editor.insertBefore(span, editor.firstChild);
                } else {
                    editor.appendChild(span);
                }

                container = span;
                currentRange.selectNode(span);
            }

            const parent = currentRange.endContainer.parentNode;

            // Try structure-preserving insertion first, fall back to range method if needed
            const structurePreserved = insertWithStructurePreservation(insertionWrapper, currentRange, parent, container);

            if (!structurePreserved) {
                insertWithRangeMethod(insertionWrapper, currentRange);
            }

            // Position cursor and handle post-insertion tasks
            positionCursorAfterChip(anchorNode, selection);

            updatePlainTextContent();
            chipHandlers?.onNewChip?.(brokerMetadata);
        } catch (error) {
            console.error('Failed to insert chip:', error);
        }
    }, [editorId, context, setDraggedChip, updatePlainTextContent, getEditor]);

    const convertSelectionToChip = useCallback(async () => {
        const editor = getEditor();
        if (!editor) return false;

        try {
            const { text, range } = getSelectedText();
            if (!range) return insertChip();

            const { matrxRecordId, brokerMetadata, messageBrokerRecord } = await context.chips.createNewChipData(editorId, {
                defaultValue: text,
            });

            // Create and insert the chip structure
            const { insertionWrapper, anchorNode } = createChipStructure(brokerMetadata, setDraggedChip, chipHandlers);

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
    }, [editorId, context.chips, setDraggedChip, updatePlainTextContent, getEditor, chipHandlers, insertChip]);

    const convertToEnhancedChip = useCallback(async () => {
        const editor = getEditor();
        if (!editor) return false;

        try {
            const { text, range } = getSelectedText();
            if (!range) return insertChip();

            const { matrxRecordId, brokerMetadata } = await context.chips.createNewChipData(editorId, {
                defaultValue: text,
            });

            const { insertionWrapper, anchorNode } = createEnhancedChipStructure(brokerMetadata, setDraggedChip, chipHandlers, mode);
            // const { insertionWrapper, anchorNode, chipCleanup } = createEnhancedChipStructure(brokerMetadata, setDraggedChip, chipHandlers, mode);

            // if (chipCleanup) {
            //     cleanupFunctions.current.set(matrxRecordId, chipCleanup);
            // }

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
        insertChip,
        convertSelectionToChip,
        convertToEnhancedChip,
    };
};
