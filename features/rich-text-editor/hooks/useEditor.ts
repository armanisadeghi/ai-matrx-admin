import { useCallback, useEffect } from 'react';
import {
    DEBUG_MODE,
    ensureValidContainer,
    extractTextContent,
    getEditorElement,
    getSelectedText,
    insertWithRangeMethod,
    insertWithStructurePreservation,
    positionCursorAfterChip,
} from '../utils/editorUtils';
import { debugEditorState } from '../utils/debugUtils';
import { createCompleteChipStructure } from '../utils/chipService';
import { useEditorContext } from '../provider/EditorProvider';
import { useEditorStyles } from './useEditorStyles';
import { useDragAndDrop } from './useDragAndDrop';
import { ChipRequestOptions } from '../types/editor.types';
import { useChipMenu } from '../components/ChipContextMenu';

export const useEditor = (editorId: string) => {
    const context = useEditorContext();
    const { showMenu } = useChipMenu();
    const editorState = context.getEditorState(editorId);
    const getEditor = useCallback(() => getEditorElement(editorId), [editorId]);

    useEffect(() => {
        context.registerEditor(editorId);
        return () => context.unregisterEditor(editorId);
    }, [editorId]);

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
    }, [editorId, context, dragConfig, updatePlainTextContent, getEditor]);

    const chipHandlers = {
        onDragStart: (event) => console.log('Drag started:', event),
        onDragEnd: (event) => console.log('Drag ended:', event),
        onClick: (event) => console.log('Chip clicked:', event),
        onDoubleClick: (event) => {
            const chip = (event.target as HTMLElement).closest('[data-chip]');
            if (!chip) return;
            
            const chipId = chip.getAttribute('data-chip-id');
            if (!chipId) return;
    
            showMenu(editorId, chipId, event.clientX, event.clientY);
            console.log('Chip double-clicked:', event);
        },
        onMouseEnter: (event) => console.log('Mouse entered:', event),
        onMouseLeave: (event) => console.log('Mouse left:', event),
        onContextMenu: (event: MouseEvent) => {
            event.preventDefault();
            event.stopPropagation();
            
            const chip = (event.target as HTMLElement).closest('[data-chip]');
            if (!chip) return;
            
            const chipId = chip.getAttribute('data-chip-id');
            if (!chipId) return;
    
            showMenu(editorId, chipId, event.clientX, event.clientY);
            console.log('Right-clicked:', event);
        },
    };


    
    const convertSelectionToChip = useCallback(() => {
        const editor = getEditor();
        const { text, range } = getSelectedText();
        const chipData = context.createNewChipData(editorId, { stringValue: text });

        if (!editor) return;

        // Pass chipHandlers to createCompleteChipStructure
        const { insertionWrapper, anchorNode } = createCompleteChipStructure(chipData, dragConfig, DEBUG_MODE, chipHandlers);

        insertWithRangeMethod(insertionWrapper, range);

        positionCursorAfterChip(anchorNode, window.getSelection()!);

        context.incrementChipCounter(editorId);
        context.addChipData(editorId, chipData);
        updatePlainTextContent();
        return true;
    }, [editorId, context, dragConfig, updatePlainTextContent, getEditor]);

    return {
        // State from editorState
        chipCounter: editorState.chipCounter,
        draggedChip: editorState.draggedChip,
        plainTextContent: editorState.plainTextContent,
        chipData: editorState.chipData,
        colorAssignments: editorState.colorAssignments,

        // Ref Manager methods
        insertChip,
        convertSelectionToChip,
        applyStyle: handleStyleChange,
        getText,
        normalize: normalizeContent,
        updateContent: updatePlainTextContent,
        focus,

        // Event handlers
        handleNativeDragStart,
        handleNativeDragEnd,
        handleDragOver,
        handleDrop,
        handleStyleChange,
        updatePlainTextContent,
        normalizeContent,
        removeChipData: (chipId: string) => context.removeChipData(editorId, chipId),
        createNewChipData: (options: ChipRequestOptions) => context.createNewChipData(editorId, options),
    };
};

export type EditorHookResult = ReturnType<typeof useEditor>;
