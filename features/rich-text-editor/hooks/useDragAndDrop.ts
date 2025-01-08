// useDragAndDrop.ts
import { useCallback, RefObject } from 'react';
import { getDropRange, isValidDropTarget } from '../utils/editorUtils';
import { useEditorContext } from '../provider/EditorProvider';

export const useDragAndDrop = (
    editorRef: RefObject<HTMLDivElement>,
    editorId: string,
    { normalizeContent, updatePlainTextContent }: {
        normalizeContent: () => void;
        updatePlainTextContent: () => void;
    }
) => {
    const context = useEditorContext();
    const editorState = context.getEditorState(editorId);
    const { draggedChip } = editorState;

    const handleNativeDragStart = useCallback((e: DragEvent) => {
        const chip = e.target as HTMLElement;
        context.setDraggedChip(editorId, chip);
        e.dataTransfer?.setData('text/plain', chip.textContent || '');
        chip.classList.add('opacity-25');
        e.stopPropagation();
    }, [editorId]);

    const handleNativeDragEnd = useCallback((e: DragEvent) => {
        const chip = e.target as HTMLElement;
        chip.classList.remove('opacity-25');
        context.setDraggedChip(editorId, null);
    }, [editorId]);

    const handleDragOver = useCallback(
        (e: React.DragEvent<HTMLElement>) => {
            if (!draggedChip || !editorRef.current) return;
            e.preventDefault();

            const range = getDropRange(e.clientX, e.clientY, editorRef.current);

            const oldIndicator = editorRef.current.querySelector('.drop-indicator');
            oldIndicator?.remove();

            if (range && isValidDropTarget(range.commonAncestorContainer, editorRef.current)) {
                const indicator = document.createElement('span');
                indicator.className = 'drop-indicator inline-block w-2 h-4 bg-blue-500 mx-0.5';
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
            context.setDraggedChip(editorId, null);
        },
        [draggedChip, editorRef, normalizeContent, updatePlainTextContent, editorId]
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