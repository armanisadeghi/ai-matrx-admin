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
import { EditorContextValue } from '../provider/provider';

export const useChipCreation = (
    editorId: string,
    chipHandlers: ChipHandlers,
    dragConfig: any,
    context: EditorContextValue,
    updatePlainTextContent: () => void
) => {
    const getEditor = useCallback(() => getEditorElement(editorId), [editorId]);

    const insertChip = useCallback(async () => {
        const editor = getEditor();
        const selection = window.getSelection();
    
        if (!editor || !selection) return;
    
        const beforeState = debugEditorState(editor);
        const currentRange = ensureValidContainer(editor, selection);
        
        try {
            const brokerMetadata = await context.chips.createNewChipData(editorId);
            
            const { insertionWrapper, anchorNode } = createCompleteChipStructure(brokerMetadata, dragConfig, DEBUG_MODE, chipHandlers);
    
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
    
            updatePlainTextContent();
            chipHandlers?.onNewChip?.(brokerMetadata);
        } catch (error) {
            console.error('Failed to insert chip:', error);
        }
    }, [editorId, context, dragConfig, updatePlainTextContent, getEditor]);

    const convertSelectionToChip = useCallback(async () => {
        const editor = getEditor();
        if (!editor) return false;

        try {
            const { text, range } = getSelectedText();
            if (!range) return insertChip();

            const brokerMetadata = await context.chips.createNewChipData(editorId, {
                defaultValue: text,
            });

            // Create and insert the chip structure
            const { insertionWrapper, anchorNode } = createCompleteChipStructure(brokerMetadata, dragConfig, DEBUG_MODE, chipHandlers);

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
            // You might want to show a user-facing error message here
            return false;
        }
    }, [editorId, context.chips, dragConfig, updatePlainTextContent, getEditor, chipHandlers, DEBUG_MODE, insertChip]);

    return {
        insertChip,
        convertSelectionToChip,
    };
};
