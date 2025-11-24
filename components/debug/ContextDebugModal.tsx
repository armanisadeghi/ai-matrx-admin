'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface ContextDebugModalProps {
  isOpen: boolean;
  onClose: () => void;
  contextData: {
    selection: string;
    content: string;
    context: string;
    [key: string]: any; // Custom variables
  };
}

export function ContextDebugModal({ isOpen, onClose, contextData }: ContextDebugModalProps) {
  // Separate standard scopes from custom variables
  const standardScopes = {
    selection: contextData.selection || '',
    content: contextData.content || '',
    context: contextData.context || '',
  };

  const customVariables = Object.entries(contextData)
    .filter(([key]) => !['selection', 'content', 'context', 'contextFilter'].includes(key))
    .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

  const hasCustomVariables = Object.keys(customVariables).length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-lg">Context Debug</span>
            <Badge variant="outline" className="text-xs">
              Admin Debug Mode
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Standard Scopes */}
            <div>
              <h3 className="text-sm font-semibold mb-3 text-foreground">Standard Scopes</h3>
              <div className="space-y-4">
                {Object.entries(standardScopes).map(([key, value]) => (
                  <div key={key} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                        {key}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {typeof value === 'string' ? `${value.length} chars` : 'empty'}
                      </Badge>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      {value ? (
                        <pre className="text-xs font-mono whitespace-pre-wrap break-words max-h-32 overflow-y-auto">
                          {value}
                        </pre>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Empty</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom Variables */}
            {hasCustomVariables && (
              <div>
                <h3 className="text-sm font-semibold mb-3 text-foreground">Custom Variables</h3>
                <div className="space-y-4">
                  {Object.entries(customVariables).map(([key, value]) => (
                    <div key={key} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-primary">
                          {key}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {typeof value}
                        </Badge>
                      </div>
                      <div className="p-3 bg-muted rounded-lg">
                        <pre className="text-xs font-mono whitespace-pre-wrap break-words max-h-32 overflow-y-auto">
                          {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                        </pre>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!hasCustomVariables && (
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">
                  No custom variables provided
                </p>
              </div>
            )}

            {/* Summary */}
            <div className="pt-4 border-t border-border">
              <h3 className="text-sm font-semibold mb-2 text-foreground">Summary</h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 bg-muted rounded">
                  <span className="text-muted-foreground">Standard Scopes:</span>
                  <span className="ml-2 font-semibold">3</span>
                </div>
                <div className="p-2 bg-muted rounded">
                  <span className="text-muted-foreground">Custom Variables:</span>
                  <span className="ml-2 font-semibold">{Object.keys(customVariables).length}</span>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

