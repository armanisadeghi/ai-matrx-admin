import { useCallback } from 'react';
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

export const useChipCreation = (
    editorId: string,
    chipHandlers: ChipHandlers,
    setDraggedChip: (chip: HTMLElement | null) => void,
    context: EditorContextValue,
    updatePlainTextContent: () => void
) => {
    const getEditor = useCallback(() => getEditorElement(editorId), [editorId]);

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

            insertWithRangeMethod(insertionWrapper, range);

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

    return {
        insertChip,
        convertSelectionToChip,
    };
};
