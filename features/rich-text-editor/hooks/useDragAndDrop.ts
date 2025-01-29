import { useCallback, useState } from 'react';
import { getEditorElement } from '../utils/editorUtils';

export const getDropRange = (x: number, y: number, editor: HTMLDivElement): Range | null => {
    if (!editor) return null;

    // Try caretPositionFromPoint first (newer standard)
    if (document.caretPositionFromPoint) {
        try {
            const position = document.caretPositionFromPoint(x, y);
            if (position) {
                const range = document.createRange();
                range.setStart(position.offsetNode, position.offset);
                range.collapse(true);

                if (editor.contains(range.commonAncestorContainer)) {
                    // Adjust range if we're over a chip
                    const chipElement = findNearestChip(range.commonAncestorContainer);
                    if (chipElement) {
                        // Determine if we should insert before or after the chip
                        const chipRect = chipElement.getBoundingClientRect();
                        const isBeforeChip = x < (chipRect.left + chipRect.right) / 2;

                        range.collapse(true);
                        if (isBeforeChip) {
                            range.setStartBefore(chipElement);
                        } else {
                            range.setStartAfter(chipElement);
                        }
                    }
                    return range;
                }
            }
        } catch (e) {
            // Fall through to caretRangeFromPoint if this fails
        }
    }

    // Fallback to caretRangeFromPoint
    const range = document.caretRangeFromPoint?.(x, y);
    if (range && editor.contains(range.commonAncestorContainer)) {
        // Apply the same chip-aware logic to the fallback method
        const chipElement = findNearestChip(range.commonAncestorContainer);
        if (chipElement) {
            const chipRect = chipElement.getBoundingClientRect();
            const isBeforeChip = x < (chipRect.left + chipRect.right) / 2;

            range.collapse(true);
            if (isBeforeChip) {
                range.setStartBefore(chipElement);
            } else {
                range.setStartAfter(chipElement);
            }
        }
        return range;
    }

    return null;
};

const findNearestChip = (node: Node): Element | null => {
    let current: Node | null = node;
    while (current && current instanceof Element) {
        if (current.hasAttribute('data-chip-id')) {
            return current;
        }
        current = current.parentElement;
    }
    return null;
};

export const isValidDropTarget = (node: Node, editorRef: HTMLDivElement): boolean => {
    // We now always return true since we handle chip proximity in getDropRange
    return editorRef.contains(node);
};

export const useDragAndDrop = (
    editorId: string,
    {
        updateContentAndMetadata,
    }: {
        updateContentAndMetadata: () => void;
    }
) => {
    const [draggedChip, setDraggedChip] = useState<HTMLElement | null>(null);

    const handleDragOver = useCallback(
        (e: React.DragEvent<HTMLElement>) => {
            const editor = getEditorElement(editorId);
            if (!draggedChip || !editor) return;
            e.preventDefault();

            const range = getDropRange(e.clientX, e.clientY, editor);

            const oldIndicator = editor.querySelector('.drop-indicator');
            oldIndicator?.remove();

            if (range && isValidDropTarget(range.commonAncestorContainer, editor)) {
                const indicator = document.createElement('span');
                indicator.className = 'drop-indicator inline-block w-2 h-4 bg-blue-500 mx-0.5';
                range.insertNode(indicator);
            }
        },
        [draggedChip, editorId]
    );

    const handleDrop = useCallback(
        (e: React.DragEvent<HTMLElement>) => {
            e.preventDefault();
            const editor = getEditorElement(editorId);
            if (!draggedChip || !editor) return;

            const range = getDropRange(e.clientX, e.clientY, editor);
            if (!range || !isValidDropTarget(range.commonAncestorContainer, editor)) return;

            const indicator = editor.querySelector('.drop-indicator');
            indicator?.remove();

            const chipWrapper = draggedChip.parentNode as HTMLElement;
            range.insertNode(chipWrapper);

            const newRange = document.createRange();
            newRange.setStartAfter(chipWrapper);
            newRange.collapse(true);

            const selection = window.getSelection();
            selection?.removeAllRanges();
            selection?.addRange(newRange);

            updateContentAndMetadata();
            setDraggedChip(null);
        },
        [draggedChip, editorId, updateContentAndMetadata]
    );

    return {
        handleDragOver,
        handleDrop,
        setDraggedChip,
    };
};
