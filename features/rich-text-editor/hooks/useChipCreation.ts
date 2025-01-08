import { useCallback, useEffect } from 'react';
import { ensureValidContainer, getSelectedText } from '../utils/editorUtils';
import { debugEditorState } from '../utils/debugUtils';
import { createChipElement } from '../utils/chipService';
import { useEditorContext } from '@/features/rich-text-editor/provider/EditorProvider';
import { useDragAndDrop } from './useDragAndDrop';
import { useEditorChips } from './useEditorChips';

const DEBUG_MODE = false;

export const useChipCreation = (editorId: string) => {
    const context = useEditorContext();
    const editorState = context.getEditorState(editorId);


    const editor = editorState?.ref?.current;
    const chipCounter = editorState?.state?.chipCounter ?? 0;

    const { handleNativeDragStart, handleNativeDragEnd } = useDragAndDrop(editorId);
    const { createNewChipData, addChipData } = useEditorChips(editorId);

    const insertChip = useCallback(() => {
        console.log('Inserting chip');
        const chipData = createNewChipData();

        const beforeState = debugEditorState(editor);

        const selection = window.getSelection();
        const debbugWrapperClass = `chip-wrapper border border-${chipData.color}-500`;

        if (!editor || !selection) return;

        const currentRange = ensureValidContainer(editor, selection);

        const chipWrapper = document.createElement('span');
        chipWrapper.className = DEBUG_MODE ? debbugWrapperClass : 'chip-wrapper';

        const chip = createChipElement(chipData);
        chip.addEventListener('dragstart', handleNativeDragStart);
        chip.addEventListener('dragend', handleNativeDragEnd);

        const leadingSpace = document.createTextNode('\u00A0');
        const trailingSpace = document.createTextNode('\u00A0');
        const anchorNode = document.createTextNode('\u200B');

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
        const insertionWrapper = document.createElement('span');
        insertionWrapper.appendChild(leadingSpace);
        insertionWrapper.appendChild(chipWrapper);
        chipWrapper.appendChild(chip);
        insertionWrapper.appendChild(trailingSpace);
        insertionWrapper.appendChild(anchorNode);

        if (currentRange.collapsed) {
            const insertPosition = currentRange.startContainer;
            if (insertPosition.nodeType === Node.TEXT_NODE) {
                const textNode = insertPosition as Text;
                const afterText = textNode.splitText(currentRange.startOffset);
                parent?.insertBefore(insertionWrapper, afterText.parentNode?.nextSibling || null);
            } else {
                parent?.insertBefore(insertionWrapper, container.nextSibling);
            }
        } else {
            currentRange.deleteContents();
            currentRange.insertNode(insertionWrapper);
        }

        const finalRange = document.createRange();
        finalRange.setStart(anchorNode, 0);
        finalRange.setEnd(anchorNode, 0);
        selection.removeAllRanges();
        selection.addRange(finalRange);

        const afterState = debugEditorState(editor);

        if (afterState.diffSummary.nestedSpans > beforeState.diffSummary.nestedSpans) {
            console.warn('Nested spans increased during chip insertion');
        }

        // Update state through provider
        context.updateEditorState(editorId, {
            type: 'incrementChipCounter',
        });

        addChipData(chipData);

        // Update content through provider
        context.updateEditorState(editorId, {
            type: 'updateContent',
            content: editor.textContent || '',
        });
    }, [chipCounter, editor, context, editorId, handleNativeDragStart, handleNativeDragEnd, createNewChipData, addChipData]);

    const convertSelectionToChip = useCallback(() => {
        console.log('Converting selection to chip');
        const { text, range } = getSelectedText();
        const chipData = createNewChipData({ stringValue: text });
        const debbugWrapperClass = `chip-wrapper border border-${chipData.color}-500`;

        if (!editor) return false;

        const chipWrapper = document.createElement('span');
        chipWrapper.className = DEBUG_MODE ? debbugWrapperClass : 'chip-wrapper';

        const chip = createChipElement(chipData);
        chip.addEventListener('dragstart', handleNativeDragStart);
        chip.addEventListener('dragend', handleNativeDragEnd);

        const leadingSpace = document.createTextNode('\u00A0');
        const trailingSpace = document.createTextNode('\u00A0');
        const anchorNode = document.createTextNode('\u200B');

        chipWrapper.appendChild(chip);

        const insertionWrapper = document.createElement('span');
        insertionWrapper.appendChild(leadingSpace);
        insertionWrapper.appendChild(chipWrapper);
        insertionWrapper.appendChild(trailingSpace);
        insertionWrapper.appendChild(anchorNode);

        range.deleteContents();
        range.insertNode(insertionWrapper);

        // Move cursor after chip
        const finalRange = document.createRange();
        finalRange.setStart(anchorNode, 0);
        finalRange.setEnd(anchorNode, 0);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(finalRange);

        // Update state through provider
        context.updateEditorState(editorId, {
            type: 'incrementChipCounter',
        });

        addChipData(chipData);

        // Update content through provider
        context.updateEditorState(editorId, {
            type: 'updateContent',
            content: editor.textContent || '',
        });

        return true;
    }, [chipCounter, editor, context, editorId, handleNativeDragStart, handleNativeDragEnd, createNewChipData, addChipData]);

    const focus = useCallback(() => {
        editor?.focus();
    }, [editor]);

    return {
        // State
        chipCounter,

        // Methods
        insertChip,
        convertSelectionToChip,
        focus,
    };
};

export type ChipCreationHookResult = ReturnType<typeof useChipCreation>;
