// DraggableNode.tsx
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface DraggableNodeProps {
  id: string;
  children: React.ReactNode;
  isSelected: boolean;
}

export function DraggableNode({ id, children, isSelected }: DraggableNodeProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    data: {
      isMultiDrag: isSelected,
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Remove onContextMenu from listeners to allow right-click menu to work
  const { onContextMenu, ...dragListeners } = listeners || {};

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`relative ${isDragging ? 'opacity-50' : ''}`}
      {...attributes}
      {...dragListeners}
    >
      {children}
    </div>
  );
}

