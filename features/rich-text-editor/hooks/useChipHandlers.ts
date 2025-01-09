'use client';

import { useCallback } from 'react';

interface UseChipHandlersProps {
  chipId: string;
  editorId: string;
  onEdit?: () => void;
}

export const useChipHandlers = ({ 
  chipId, 
  editorId, 
  onEdit 
}: UseChipHandlersProps) => {
  const handleDragStart = useCallback((event: React.DragEvent) => {
    event.dataTransfer.setData('text/plain', chipId);
    // Additional drag start logic
  }, [chipId]);

  const handleDragEnd = useCallback((event: React.DragEvent) => {
    // Handle drag end logic
  }, []);

  const handleClick = useCallback((event: React.MouseEvent) => {
    // Handle click logic
  }, []);

  const handleDoubleClick = useCallback((event: React.MouseEvent) => {
    if (onEdit) {
      onEdit();
    }
  }, [onEdit]);

  const handleMouseEnter = useCallback((event: React.MouseEvent) => {
    // Handle mouse enter logic
  }, []);

  const handleMouseLeave = useCallback((event: React.MouseEvent) => {
    // Handle mouse leave logic
  }, []);

  return {
    dragHandlers: {
      draggable: true,
      onDragStart: handleDragStart,
      onDragEnd: handleDragEnd,
    },
    mouseHandlers: {
      onClick: handleClick,
      onDoubleClick: handleDoubleClick,
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
    }
  };
};

export type ChipHandlers = ReturnType<typeof useChipHandlers>;