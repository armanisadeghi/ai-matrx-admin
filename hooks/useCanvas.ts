import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/redux';
import {
  openCanvas,
  closeCanvas,
  clearCanvas,
  updateCanvasContent,
  selectCanvasIsOpen,
  selectCanvasContent,
  CanvasContent,
} from '@/lib/redux/slices/canvasSlice';

/**
 * useCanvas - Simple hook for canvas interactions
 * 
 * Provides clean API for opening/closing canvas and accessing canvas state.
 * 
 * @example
 * ```tsx
 * const { open, close, isOpen } = useCanvas();
 * 
 * const handleExpandQuiz = () => {
 *   open({
 *     type: 'quiz',
 *     data: quizData,
 *     metadata: { title: 'My Quiz' }
 *   });
 * };
 * ```
 */
export function useCanvas() {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector(selectCanvasIsOpen);
  const content = useAppSelector(selectCanvasContent);

  const open = useCallback((canvasContent: CanvasContent) => {
    dispatch(openCanvas(canvasContent));
  }, [dispatch]);

  const close = useCallback(() => {
    dispatch(closeCanvas());
  }, [dispatch]);

  const clear = useCallback(() => {
    dispatch(clearCanvas());
  }, [dispatch]);

  const update = useCallback((canvasContent: CanvasContent) => {
    dispatch(updateCanvasContent(canvasContent));
  }, [dispatch]);

  return {
    open,
    close,
    clear,
    update,
    isOpen,
    content,
  };
}

