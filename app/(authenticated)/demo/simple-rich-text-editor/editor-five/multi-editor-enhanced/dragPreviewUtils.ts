// utils/dragPreviewUtils.ts

interface CreateDragPreviewOptions {
    containerWidth: number;
  }
  
  export const createDragPreview = (
    element: HTMLElement,
    options: CreateDragPreviewOptions
  ): HTMLElement => {
    const dragPreview = element.cloneNode(true) as HTMLElement;
    
    // Style the preview
    dragPreview.style.width = `${options.containerWidth}px`;
    dragPreview.style.backgroundColor = 'rgba(59, 130, 246, 0.05)';
    dragPreview.style.border = '2px solid rgb(96, 165, 250)';
    dragPreview.style.borderRadius = '12px';
    dragPreview.style.overflow = 'hidden';
    dragPreview.style.opacity = '0.9';
    dragPreview.style.padding = '16px';
    dragPreview.style.margin = '8px';
    dragPreview.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
    
    // Hide unnecessary elements in the preview
    const removeBtn = dragPreview.querySelector('.remove-button');
    const dragHandle = dragPreview.querySelector('.drag-handle');
    if (removeBtn) removeBtn.remove();
    if (dragHandle) dragHandle.remove();
    
    return dragPreview;
  };