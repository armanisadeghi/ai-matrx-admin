import { useState, useCallback, RefObject } from 'react';
import { EditorRef, EditorHookResult } from './types';
import { ensureValidContainer, createChipElement, getDropRange, isValidDropTarget, extractTextContent } from './utils';

export const useEditor = (editorRef: RefObject<HTMLDivElement>): EditorHookResult => {
    const [chipCounter, setChipCounter] = useState(1);
    const [draggedChip, setDraggedChip] = useState<HTMLElement | null>(null);
    const [plainTextContent, setPlainTextContent] = useState('');

    const insertChip = useCallback(() => {
        const chipId = `new-chip-${chipCounter}`;
        const editor = editorRef.current;
        const selection = window.getSelection();

        if (!editor || !selection) return;

        const currentRange = ensureValidContainer(editor, selection);

        const chipWrapper = document.createElement('span');
        chipWrapper.className = 'chip-wrapper';

        const chip = createChipElement(chipId);
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

        setChipCounter((prev) => prev + 1);
        updatePlainTextContent();
    }, [chipCounter, editorRef]);

    const handleNativeDragStart = useCallback((e: DragEvent) => {
        const chip = e.target as HTMLElement;
        setDraggedChip(chip);
        e.dataTransfer?.setData('text/plain', chip.textContent || '');
        chip.classList.add('opacity-50');
        e.stopPropagation();
    }, []);

    const handleNativeDragEnd = useCallback((e: DragEvent) => {
        const chip = e.target as HTMLElement;
        chip.classList.remove('opacity-50');
        setDraggedChip(null);
    }, []);

    const handleDragOver = useCallback(
        (e: React.DragEvent<HTMLElement>) => {
            if (!draggedChip || !editorRef.current) return;
            e.preventDefault();

            const range = getDropRange(e.clientX, e.clientY, editorRef.current);

            const oldIndicator = editorRef.current.querySelector('.drop-indicator');
            oldIndicator?.remove();

            if (range && isValidDropTarget(range.commonAncestorContainer, editorRef.current)) {
                const indicator = document.createElement('span');
                indicator.className = 'drop-indicator inline-block w-0.5 h-4 bg-blue-500 mx-0.5';
                range.insertNode(indicator);
            }
        },
        [draggedChip, editorRef]
    );

    const handleDrop = useCallback(
        (e: React.DragEvent<HTMLElement>) => {
            e.preventDefault();
            if (!draggedChip || !editorRef.current) return;

            const range = getDropRange(e.clientX, e.clientY, editorRef.current);
            if (!range || !isValidDropTarget(range.commonAncestorContainer, editorRef.current)) return;

            const indicator = editorRef.current.querySelector('.drop-indicator');
            indicator?.remove();

            const chipWrapper = draggedChip.parentNode as HTMLElement;
            range.insertNode(chipWrapper);

            const newRange = document.createRange();
            newRange.setStartAfter(chipWrapper);
            newRange.collapse(true);

            const selection = window.getSelection();
            selection?.removeAllRanges();
            selection?.addRange(newRange);

            normalizeContent();
            updatePlainTextContent();
        },
        [draggedChip, editorRef]
    );

    const updatePlainTextContent = useCallback(() => {
        if (!editorRef.current) return;
        const text = extractTextContent(editorRef.current);
        setPlainTextContent(text);
    }, [editorRef]);

    const normalizeContent = useCallback(() => {
        if (!editorRef.current) return;
        console.log('Normalizing content');
        const walker = document.createTreeWalker(editorRef.current, NodeFilter.SHOW_TEXT, null);

        let node;
        while ((node = walker.nextNode())) {
            if (node.parentNode === editorRef.current) {
                const span = document.createElement('span');
                node.parentNode.insertBefore(span, node);
                span.appendChild(node);
            }
        }
    }, [editorRef]);

    return {
        chipCounter,
        draggedChip,
        plainTextContent,
        insertChip,
        handleNativeDragStart,
        handleNativeDragEnd,
        handleDragOver,
        handleDrop,
        updatePlainTextContent,
        normalizeContent,
    };
};
