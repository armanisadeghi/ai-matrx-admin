import { useCallback, useState } from 'react';
import { getDropRange, isValidDropTarget, getEditorElement } from '../utils/editorUtils';

export const useDragAndDrop = (
    editorId: string,
    { normalizeContent, updatePlainTextContent }: {
        normalizeContent: () => void;
        updatePlainTextContent: () => void;
    }
) => {
    const [draggedChip, setDraggedChip] = useState<HTMLElement | null>(null);

    const handleNativeDragStart = useCallback((e: DragEvent) => {
        const chip = e.target as HTMLElement;
        setDraggedChip(chip);
        e.dataTransfer?.setData('text/plain', chip.textContent || '');
        chip.classList.add('opacity-25');
        e.stopPropagation();
    }, []);

    const handleNativeDragEnd = useCallback((e: DragEvent) => {
        const chip = e.target as HTMLElement;
        chip.classList.remove('opacity-25');
        setDraggedChip(null);
    }, []);

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

            normalizeContent();
            updatePlainTextContent();
            setDraggedChip(null);
        },
        [draggedChip, editorId, normalizeContent, updatePlainTextContent]
    );

    const dragConfig = {
        onDragStart: handleNativeDragStart,
        onDragEnd: handleNativeDragEnd
    };

    return {
        handleNativeDragStart,
        handleNativeDragEnd,
        handleDragOver,
        handleDrop,
        dragConfig
    };
};