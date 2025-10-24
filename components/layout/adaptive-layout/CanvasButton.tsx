import React from 'react';
import { ExternalLink } from 'lucide-react';
import { useCanvas } from '@/hooks/useCanvas';
import { CanvasContent } from '@/lib/redux/slices/canvasSlice';

interface CanvasButtonProps {
  content: CanvasContent;
  className?: string;
  title?: string;
}

/**
 * CanvasButton - Reusable button to open content in canvas
 * 
 * @example
 * <CanvasButton
 *   content={{
 *     type: 'quiz',
 *     data: quizData,
 *     metadata: { title: 'My Quiz' }
 *   }}
 * />
 */
export function CanvasButton({ content, className, title = "Open in side panel" }: CanvasButtonProps) {
  const { open } = useCanvas();

  return (
    <button
      onClick={() => open(content)}
      className={className || "p-2 rounded-md bg-purple-500 dark:bg-purple-600 text-white hover:bg-purple-600 dark:hover:bg-purple-700 transition-all shadow-sm"}
      title={title}
    >
      <ExternalLink className="h-4 w-4" />
    </button>
  );
}

