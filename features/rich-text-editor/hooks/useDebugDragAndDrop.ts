import { useCallback, useState, useEffect } from 'react';
import { getDropRange, isValidDropTarget, getEditorElement } from '../utils/editorUtils';

export const useDragAndDrop = (
    editorId: string,
    { normalizeContent, updatePlainTextContent }: {
        normalizeContent: () => void;
        updatePlainTextContent: () => void;
    }
) => {
    const [draggedChip, setDraggedChip] = useState<HTMLElement | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    // Debug helper to check editor state
    const validateEditor = useCallback(() => {
        const editor = getEditorElement(editorId);
        console.log('Editor validation:', {
            editorExists: !!editor,
            editorContentEditable: editor?.contentEditable,
            editorChildren: editor?.children.length,
            activeElement: document.activeElement?.tagName,
            editorHasFocus: editor?.contains(document.activeElement),
        });
    }, [editorId]);

    const handleNativeDragStart = useCallback((e: DragEvent) => {
        const chip = e.target as HTMLElement;
        console.log('Drag start:', {
            chip: chip.tagName,
            chipText: chip.textContent,
            dragEffect: e.dataTransfer?.effectAllowed,
        });
        
        setDraggedChip(chip);
        setIsDragging(true);
        
        if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', chip.textContent || '');
            // Add additional data types for debugging
            e.dataTransfer.setData('text/html', chip.outerHTML);
        }
        
        chip.classList.add('opacity-25');
        e.stopPropagation();
        
        validateEditor();
    }, [validateEditor]);

    const handleNativeDragEnd = useCallback((e: DragEvent) => {
        console.log('Drag end:', {
            dropEffect: e.dataTransfer?.dropEffect,
            isDragging,
            hasDraggedChip: !!draggedChip,
        });
        
        const chip = e.target as HTMLElement;
        chip.classList.remove('opacity-25');
        setDraggedChip(null);
        setIsDragging(false);
        
        validateEditor();
    }, [isDragging, draggedChip, validateEditor]);

    const handleDragOver = useCallback(
        (e: React.DragEvent<HTMLElement>) => {
            const editor = getEditorElement(editorId);
            if (!draggedChip || !editor) {
                console.log('DragOver rejected:', {
                    hasDraggedChip: !!draggedChip,
                    hasEditor: !!editor,
                    dataTypes: e.dataTransfer.types,
                });
                return;
            }
            
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';

            const range = getDropRange(e.clientX, e.clientY, editor);
            console.log('DragOver position:', {
                x: e.clientX,
                y: e.clientY,
                hasRange: !!range,
                isValidTarget: range ? isValidDropTarget(range.commonAncestorContainer, editor) : false,
            });

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
            console.log('Drop attempted:', {
                dataTypes: e.dataTransfer.types,
                data: {
                    text: e.dataTransfer.getData('text/plain'),
                    html: e.dataTransfer.getData('text/html'),
                },
            });

            const editor = getEditorElement(editorId);
            if (!draggedChip || !editor) {
                console.log('Drop rejected:', {
                    hasDraggedChip: !!draggedChip,
                    hasEditor: !!editor,
                });
                return;
            }

            const range = getDropRange(e.clientX, e.clientY, editor);
            if (!range || !isValidDropTarget(range.commonAncestorContainer, editor)) {
                console.log('Invalid drop target:', {
                    hasRange: !!range,
                    targetElement: range?.commonAncestorContainer?.nodeName,
                });
                return;
            }

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
            setIsDragging(false);
            
            console.log('Drop completed');
            validateEditor();
        },
        [draggedChip, editorId, normalizeContent, updatePlainTextContent, validateEditor]
    );

    // Monitor drag state changes
    useEffect(() => {
        console.log('Drag state changed:', {
            isDragging,
            hasDraggedChip: !!draggedChip,
        });
    }, [isDragging, draggedChip]);

    const dragConfig = {
        onDragStart: handleNativeDragStart,
        onDragEnd: handleNativeDragEnd
    };

    return {
        handleNativeDragStart,
        handleNativeDragEnd,
        handleDragOver,
        handleDrop,
        dragConfig,
        isDragging
    };
};