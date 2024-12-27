// DraggableNode.tsx
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

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

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`group relative ${isDragging ? 'opacity-50' : ''}`}
    >
      {children}
      <button
        className="opacity-0 group-hover:opacity-100 absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-accent rounded-sm"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
    </div>
  );
}

