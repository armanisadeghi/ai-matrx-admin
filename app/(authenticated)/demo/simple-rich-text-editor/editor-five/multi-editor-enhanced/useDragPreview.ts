// hooks/useDragPreview.ts
import { useCallback } from 'react';
import { createDragPreview } from './dragPreviewUtils';

export const useDragPreview = (containerRef: React.RefObject<HTMLDivElement>) => {
  const handleDragStart = useCallback((
    e: React.DragEvent,
    id: string,
    setDraggedId: (id: string) => void
  ) => {
    setDraggedId(id);
    
    const editorElement = e.currentTarget.closest('.editor-container');
    if (editorElement && containerRef.current) {
      const containerWidth = containerRef.current.clientWidth - 32;
      
      const dragPreview = createDragPreview(editorElement as HTMLElement, {
        containerWidth,
      });
      
      document.body.appendChild(dragPreview);
      e.dataTransfer.setDragImage(dragPreview, 20, 20);
      
      requestAnimationFrame(() => {
        dragPreview.remove();
      });
    }
  }, [containerRef]);

  return { handleDragStart };
};