'use client';

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
  // Gracefully handle missing Redux provider (e.g., in public app context)
  let dispatch: any;
  let isOpen = false;
  let content: CanvasContent | null = null;
  let hasProvider = true;

  try {
    dispatch = useAppDispatch();
    isOpen = useAppSelector(selectCanvasIsOpen);
    content = useAppSelector(selectCanvasContent);
  } catch (error) {
    // Expected in public context without Redux provider - not critical
    hasProvider = false;
    console.warn('[useCanvas] Redux provider not found, canvas features disabled');
  }

  const open = useCallback((canvasContent: CanvasContent) => {
    if (hasProvider && dispatch) {
      dispatch(openCanvas(canvasContent));
    }
  }, [dispatch, hasProvider]);

  const close = useCallback(() => {
    if (hasProvider && dispatch) {
      dispatch(closeCanvas());
    }
  }, [dispatch, hasProvider]);

  const clear = useCallback(() => {
    if (hasProvider && dispatch) {
      dispatch(clearCanvas());
    }
  }, [dispatch, hasProvider]);

  const update = useCallback((canvasContent: CanvasContent) => {
    if (hasProvider && dispatch) {
      dispatch(updateCanvasContent({ content: canvasContent }));
    }
  }, [dispatch, hasProvider]);

  return {
    open,
    close,
    clear,
    update,
    isOpen,
    content,
  };
}

