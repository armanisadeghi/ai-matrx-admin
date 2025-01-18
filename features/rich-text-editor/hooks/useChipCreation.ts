import { useCallback } from 'react';
import {
    DEBUG_MODE,
    ensureValidContainer,
    getEditorElement,
    getSelectedText,
    insertWithRangeMethod,
    insertWithStructurePreservation,
    positionCursorAfterChip,
} from '../utils/editorUtils';
import { debugEditorState } from '../utils/debugUtils';
import { ChipHandlers, createCompleteChipStructure } from '../utils/chipService';

export const useChipCreation = (editorId: string, chipHandlers: ChipHandlers, dragConfig: any, context: any, updatePlainTextContent: () => void) => {
    const getEditor = useCallback(() => getEditorElement(editorId), [editorId]);

    const insertChip = useCallback(() => {
        const editor = getEditor();
        const chipData = context.createNewChipData(editorId);
        const beforeState = debugEditorState(editor);
        const selection = window.getSelection();

        if (!editor || !selection) return;

        const currentRange = ensureValidContainer(editor, selection);

        const { insertionWrapper, anchorNode } = createCompleteChipStructure(chipData, dragConfig, DEBUG_MODE, chipHandlers);

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

        const afterState = debugEditorState(editor);
        if (afterState.diffSummary.nestedSpans > beforeState.diffSummary.nestedSpans) {
            console.warn('Nested spans increased during chip insertion');
        }

        context.incrementChipCounter(editorId);
        context.addChipData(editorId, chipData);
        updatePlainTextContent();
        chipHandlers?.onNewChip?.(chipData);
    }, [editorId, context, dragConfig, updatePlainTextContent, getEditor]);

    const convertSelectionToChip = useCallback(() => {
        const editor = getEditor();
        
        const { text, range } = getSelectedText();
        if (!range) return insertChip();

        const chipData = context.createNewChipData(editorId, { stringValue: text });

        if (!editor) return;

        // Pass chipHandlers to createCompleteChipStructure
        const { insertionWrapper, anchorNode } = createCompleteChipStructure(chipData, dragConfig, DEBUG_MODE, chipHandlers);

        insertWithRangeMethod(insertionWrapper, range);

        positionCursorAfterChip(anchorNode, window.getSelection()!);

        context.incrementChipCounter(editorId);
        context.addChipData(editorId, chipData);
        updatePlainTextContent();
        chipHandlers?.onNewChip?.(chipData);
        return true;
    }, [editorId, context, dragConfig, updatePlainTextContent, getEditor]);

    return {
        insertChip,
        convertSelectionToChip,
    };
};
