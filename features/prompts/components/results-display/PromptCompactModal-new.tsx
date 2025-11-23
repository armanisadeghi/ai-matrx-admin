"use client";

import React, { useState, useEffect } from 'react';
import { Copy, Check, GripVertical, X, PanelRightOpen, PanelRightClose } from 'lucide-react';
import { PromptRunner } from './PromptRunner';
import type { PromptData } from '../../types/modal';
import type { PromptExecutionConfig } from '@/features/prompt-builtins/types/execution-modes';
import { useCanvas } from '@/hooks/useCanvas';

interface PromptCompactModalProps {
  isOpen: boolean;
  onClose: () => void;
  promptId?: string;
  promptData?: PromptData;
  executionConfig?: Omit<PromptExecutionConfig, 'result_display'>;
  variables?: Record<string, string>;
  title?: string;
  onExecutionComplete?: (result: any) => void;
  customMessage?: string;
  countdownSeconds?: number;
}

/**
 * PromptCompactModal - iOS-style minimal draggable modal for quick AI responses
 * NOW with canvas support! Wraps PromptRunner just like PromptRunnerModal.
 * 
 * Features:
 * - Draggable positioning
 * - Compact, minimal design
 * - Full canvas support (shows side-by-side)
 * - All PromptRunner features (streaming, conversation, etc.)
 * - Perfect for code editing while viewing the source!
 */
export default function PromptCompactModal({
  isOpen,
  onClose,
  promptId,
  promptData,
  executionConfig,
  variables = {},
  title,
  onExecutionComplete,
  customMessage,
  countdownSeconds,
}: PromptCompactModalProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const { isOpen: isCanvasOpen } = useCanvas();

  const handleMouseDown = (e: React.MouseEvent) => {
    // Don't start drag if clicking on buttons or interactive elements
    if ((e.target as HTMLElement).closest('button')) return;
    
    setIsDragging(true);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    setPosition({
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  // Reset position when closed
  useEffect(() => {
    if (!isOpen) {
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // When canvas is open, show side-by-side layout
  const showSideBySide = isCanvasOpen;

  return (
    <>
      {/* Z-index override for Radix portaled components */}
      {isOpen && (
        <style dangerouslySetInnerHTML={{
          __html: `
            [data-radix-popper-content-wrapper],
            [data-radix-portal] {
              z-index: 10001 !important;
            }
          `
        }} />
      )}
      
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[9998]"
        onClick={onClose}
      />
      
      {/* Compact Modal Container */}
      <div
        className={`fixed z-[9999] transition-all duration-300 ${
          position.x 
            ? '' // User has dragged it, use inline styles
            : 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2' // Centered
        }`}
        style={
          position.x
            ? {
                left: position.x,
                top: position.y,
                transform: 'none',
                width: showSideBySide ? 'min(85vw, 1400px)' : 'min(90vw, 768px)',
              }
            : {
                width: showSideBySide ? 'min(85vw, 1400px)' : 'min(90vw, 768px)',
              }
        }
      >
        <div className="bg-[#1e1e1e] dark:bg-[#1e1e1e] text-[#d4d4d4] dark:text-[#d4d4d4] rounded-3xl shadow-2xl border border-[#3e3e42] dark:border-[#3e3e42] overflow-hidden h-[85vh] flex flex-col">
          {/* Draggable Header */}
          {title && (
            <div 
              className="relative px-5 py-3.5 border-b border-[#3e3e42] dark:border-[#3e3e42] flex items-center gap-2 flex-shrink-0"
              style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
              onMouseDown={handleMouseDown}
            >
              <GripVertical className="w-3.5 h-3.5 text-[#888888] flex-shrink-0" />
              <div className="text-xs font-medium text-[#cccccc] dark:text-[#cccccc] flex-1 truncate">{title}</div>
              <button
                onClick={onClose}
                className="p-1 text-[#888888] hover:text-[#cccccc] hover:bg-[#2a2d2e] rounded transition-colors"
                title="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          
          {/* PromptRunner Content */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <PromptRunner
              promptId={promptId}
              promptData={promptData}
              executionConfig={executionConfig}
              variables={variables}
              onExecutionComplete={onExecutionComplete}
              title="" // No title, we have our own header
              onClose={onClose}
              isActive={isOpen}
              customMessage={customMessage}
              countdownSeconds={countdownSeconds}
            />
          </div>
        </div>
      </div>
    </>
  );
}

