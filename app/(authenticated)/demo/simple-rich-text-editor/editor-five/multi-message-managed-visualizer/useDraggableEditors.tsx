import { useState, useRef, type DragEvent } from 'react';

interface Editor {
    id: string;
    content: string;
}

interface UseDraggableEditorsProps {
    initialEditors?: Editor[];
}

interface UseDraggableEditorsReturn {
    editors: Editor[];
    draggedId: string | null;
    dropZoneIndex: number | null;
    containerRef: React.RefObject<HTMLDivElement>;
    handleDragStart: (e: DragEvent, id: string) => void;
    handleDragEnd: () => void;
    handleDrop: (e: DragEvent, dropIndex: number) => void;
    addNewEditor: () => void;
    removeEditor: (idToRemove: string) => void;
    handleDropZoneDragOver: (index: number, e: DragEvent) => void;
    handleDropZoneDragLeave: () => void;
}

export function useDraggableEditors({ 
    initialEditors = [
        { id: 'editor-1', content: 'First editor' },
        { id: 'editor-2', content: 'Second editor' },
    ]
}: UseDraggableEditorsProps = {}): UseDraggableEditorsReturn {
    const [editors, setEditors] = useState<Editor[]>(initialEditors);
    const [draggedId, setDraggedId] = useState<string | null>(null);
    const [dropZoneIndex, setDropZoneIndex] = useState<number | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const addNewEditor = () => {
        const newId = `editor-${editors.length + 1}`;
        setEditors(prev => [...prev, { 
            id: newId, 
            content: `Editor ${editors.length + 1}` 
        }]);
    };

    const removeEditor = (idToRemove: string) => {
        setEditors(prev => prev.filter(editor => editor.id !== idToRemove));
    };

    const handleDragStart = (e: DragEvent, id: string) => {
        setDraggedId(id);
        
        // Create a constrained ghost image
        const editorElement = e.currentTarget.closest('.editor-container');
        if (editorElement && containerRef.current) {
            const dragPreview = editorElement.cloneNode(true) as HTMLElement;
            const containerWidth = containerRef.current.clientWidth;
            
            // Style the preview
            dragPreview.style.width = `${containerWidth}px`;
            dragPreview.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
            dragPreview.style.border = '2px solid rgb(59, 130, 246)';
            dragPreview.style.borderRadius = '8px';
            dragPreview.style.overflow = 'hidden';
            dragPreview.style.opacity = '0.8';
            
            // Hide unnecessary elements in the preview
            const removeBtn = dragPreview.querySelector('.remove-button');
            const dragHandle = dragPreview.querySelector('.drag-handle');
            if (removeBtn) removeBtn.remove();
            if (dragHandle) dragHandle.remove();
            
            document.body.appendChild(dragPreview);
            e.dataTransfer.setDragImage(dragPreview, 20, 20);
            
            // Clean up
            requestAnimationFrame(() => {
                dragPreview.remove();
            });
        }
    };

    const handleDragEnd = () => {
        setDraggedId(null);
        setDropZoneIndex(null);
    };

    const handleDrop = (e: DragEvent, dropIndex: number) => {
        e.preventDefault();
        if (!draggedId) return;

        const draggedIndex = editors.findIndex(e => e.id === draggedId);
        if (draggedIndex === -1) return;

        setEditors(prev => {
            const newEditors = [...prev];
            const [draggedEditor] = newEditors.splice(draggedIndex, 1);
            
            // Adjust insertion index if dragging from before drop position
            const adjustedDropIndex = draggedIndex < dropIndex ? dropIndex - 1 : dropIndex;
            newEditors.splice(adjustedDropIndex, 0, draggedEditor);
            
            return newEditors;
        });
        
        handleDragEnd();
    };

    const handleDropZoneDragOver = (index: number, e: DragEvent) => {
        e.preventDefault();
        setDropZoneIndex(index);
    };

    const handleDropZoneDragLeave = () => {
        setDropZoneIndex(null);
    };

    return {
        editors,
        draggedId,
        dropZoneIndex,
        containerRef,
        handleDragStart,
        handleDragEnd,
        handleDrop,
        addNewEditor,
        removeEditor,
        handleDropZoneDragOver,
        handleDropZoneDragLeave,
    };
}