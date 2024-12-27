// DroppableFolder.tsx
import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';

interface DroppableFolderProps {
  id: string;
  children: React.ReactNode;
}

export function DroppableFolder({ id, children }: DroppableFolderProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `folder-${id}`,
  });

  return (
    <div 
      ref={setNodeRef}
      className={cn(
        'relative',
        isOver && 'ring-2 ring-primary ring-inset rounded-sm'
      )}
    >
      {children}
      {isOver && (
        <div className="absolute inset-0 bg-primary/10 pointer-events-none rounded-sm" />
      )}
    </div>
  );
}
