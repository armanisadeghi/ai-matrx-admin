'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Database, ChevronRight, Copy, Check, Eye, Loader2, ChevronDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { extractSettingsAttachments, extractMessageMetadata } from '@/features/prompts/utils/resource-formatting';
import { buildFinalMessage } from '@/lib/redux/prompt-execution/utils/message-builder';
import { useAppSelector } from '@/lib/redux/hooks';
import {
  selectResources,
  selectCurrentInput,
  selectMergedVariables,
  selectConversationTemplate,
  selectMessages,
} from '@/lib/redux/prompt-execution/selectors';

interface ResourceDebugIndicatorProps {
  runId: string; // The ONLY prop needed - everything else comes from Redux
  onClose: () => void;
}

type IndicatorSize = 'small' | 'large' | 'preview';

interface Position {
  x: number;
  y: number;
}

export const ResourceDebugIndicator: React.FC<ResourceDebugIndicatorProps> = ({
  runId,
  onClose,
}) => {
  // ========== READ EVERYTHING FROM REDUX ==========
  // This ensures debug shows EXACTLY what Redux knows
  // Same selectors that executeMessageThunk uses
  const resources = useAppSelector(state => selectResources(state, runId));
  const chatInput = useAppSelector(state => selectCurrentInput(state, runId));
  const variables = useAppSelector(state => selectMergedVariables(state, runId));
  const conversationTemplate = useAppSelector(state => selectConversationTemplate(state, runId));
  const messages = useAppSelector(state => selectMessages(state, runId));
  
  // Derive context from Redux state (same logic as executeMessageThunk)
  const isFirstMessage = messages.length === 0;
  const lastTemplateMessage = conversationTemplate[conversationTemplate.length - 1];
  const isLastTemplateMessageUser = lastTemplateMessage?.role === 'user';
  const [size, setSize] = useState<IndicatorSize>('small');
  const [position, setPosition] = useState<Position>({ x: 50, y: 85 }); // Below debug indicator
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });
  const indicatorRef = useRef<HTMLDivElement>(null);

  const [expandedIndices, setExpandedIndices] = useState<Set<number>>(new Set());
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);

  // Drag handling
  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'BUTTON' || target.closest('button')) {
      return;
    }

    e.stopPropagation();
    if (indicatorRef.current) {
      const rect = indicatorRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      setIsDragging(true);
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedIndices);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedIndices(newExpanded);
  };

  const copyToClipboard = async (data: any, index: number) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(resources, null, 2));
      setCopiedIndex(-1);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const generateMessagePreview = async () => {
    setIsGeneratingPreview(true);
    try {
      // Use the EXACT SAME message building logic as executeMessageThunk
      // Reading from the SAME Redux state via selectors
      const messageResult = await buildFinalMessage({
        isFirstMessage,
        isLastTemplateMessageUser,
        lastTemplateMessage,
        userInput: chatInput,
        resources,
        variables,
      });
      
      // Extract settings attachments and metadata
      const settingsAttachments = extractSettingsAttachments(resources);
      const metadata = extractMessageMetadata(resources);

      setPreviewData({
        formattedXml: messageResult.resourcesXml,
        fullMessage: messageResult.finalContent,
        settingsAttachments,
        metadata,
      });
      setSize('preview');
    } catch (error) {
      console.error('Failed to generate preview:', error);
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  // Small indicator
  if (size === 'small') {
    return (
      <div
        ref={indicatorRef}
        style={{
          position: 'fixed',
          left: `${position.x}px`,
          top: `${position.y}px`,
          zIndex: 9999,
          userSelect: 'none',
          cursor: isDragging ? 'grabbing' : 'move',
          transition: isDragging ? 'none' : 'all 0.2s ease',
          filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.25))',
        }}
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-600 text-white shadow-lg">
          <Database size={14} />
          <span className="text-xs font-semibold">RESOURCES</span>
          <span className="text-[10px] bg-green-700 px-1 rounded">{resources.length}</span>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setSize('large');
            }}
            className="p-0 rounded hover:bg-green-700"
            title="Expand"
          >
            <ChevronRight size={12} />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="p-0 rounded hover:bg-green-700"
            title="Close"
          >
            <X size={12} />
          </button>
        </div>
      </div>
    );
  }

  // Preview mode - full message
  if (size === 'preview' && previewData) {
    return (
      <div
        ref={indicatorRef}
        style={{
          position: 'fixed',
          left: `${position.x}px`,
          top: `${position.y}px`,
          zIndex: 9999,
          userSelect: 'none',
          transition: isDragging ? 'none' : 'all 0.2s ease',
        }}
      >
        <Card className="w-[800px] max-h-[80vh] shadow-2xl">
          <div
            className="flex items-center justify-between p-3 border-b cursor-move bg-muted/50"
            onMouseDown={handleMouseDown}
          >
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-green-600" />
              <h3 className="font-semibold">Message Preview</h3>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSize('large')}
                className="p-1 rounded hover:bg-muted"
                title="Back to resources"
              >
                <ChevronRight size={16} className="rotate-180" />
              </button>
              <button
                onClick={onClose}
                className="p-1 rounded hover:bg-destructive/20"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <ScrollArea className="max-h-[calc(80vh-60px)]">
            <div className="p-4 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold">Complete Message</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigator.clipboard.writeText(previewData.fullMessage)}
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Copy
                  </Button>
                </div>
                <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto max-h-64 overflow-y-auto">
                  {previewData.fullMessage}
                </pre>
              </div>
            </div>
          </ScrollArea>
        </Card>
      </div>
    );
  }

  // Large mode - resource list
  return (
    <div
      ref={indicatorRef}
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 9999,
        userSelect: 'none',
        transition: isDragging ? 'none' : 'all 0.2s ease',
      }}
    >
      <Card className="w-96 max-h-[80vh] shadow-2xl">
        <div
          className="flex items-center justify-between p-3 border-b cursor-move bg-muted/50"
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-green-600" />
            <h3 className="font-semibold">Resources ({resources.length})</h3>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSize('small')}
              className="p-1 rounded hover:bg-muted"
              title="Minimize"
            >
              <ChevronRight size={16} className="rotate-180" />
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-destructive/20"
              title="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <ScrollArea className="max-h-[calc(60vh-60px)]">
          <div className="p-2 space-y-1">
            {resources.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No resources attached
              </div>
            ) : (
              resources.map((resource, index) => {
                const isExpanded = expandedIndices.has(index);
                const isCopied = copiedIndex === index;

                return (
                  <div key={index} className="border rounded overflow-hidden">
                    <div
                      className="flex items-center justify-between px-2 py-1.5 cursor-pointer hover:bg-muted/50"
                      onClick={() => toggleExpanded(index)}
                    >
                      <div className="flex items-center gap-2 flex-1">
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        <span className="text-xs font-medium">{resource.type}</span>
                        <span className="text-[10px] text-muted-foreground">#{index + 1}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(resource.data, index);
                        }}
                      >
                        {isCopied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                      </Button>
                    </div>
                    {isExpanded && (
                      <div className="px-2 pb-2">
                        <pre className="text-[10px] bg-muted p-2 rounded overflow-x-auto max-h-32 overflow-y-auto">
                          {JSON.stringify(resource.data, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        {resources.length > 0 && (
          <div className="p-2 border-t bg-muted/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">
                {resources.length} resource{resources.length !== 1 ? 's' : ''}
              </span>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={copyAll}>
                {copiedIndex === -1 ? (
                  <>
                    <Check size={12} className="mr-1 text-green-500" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy size={12} className="mr-1" />
                    Copy All
                  </>
                )}
              </Button>
            </div>
            <Button
              size="sm"
              className="w-full h-7 text-xs"
              onClick={generateMessagePreview}
              disabled={isGeneratingPreview}
            >
              {isGeneratingPreview ? (
                <>
                  <Loader2 size={12} className="mr-1.5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Eye size={12} className="mr-1.5" />
                  Preview Message
                </>
              )}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};

