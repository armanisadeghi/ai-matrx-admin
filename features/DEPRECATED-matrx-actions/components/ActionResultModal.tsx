/**
 * Action Result Modal
 * 
 * Displays the result of an executed action with live streaming
 */

"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Copy, Check, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import MarkdownStream from '@/components/Markdown';
import { useAppSelector } from '@/lib/redux';
import { selectPrimaryResponseTextByTaskId, selectPrimaryResponseEndedByTaskId } from '@/lib/redux/socket-io/selectors/socket-response-selectors';

interface ActionResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  actionName?: string;
  taskId?: string;
}

export function ActionResultModal({
  isOpen,
  onClose,
  title,
  actionName,
  taskId
}: ActionResultModalProps) {
  const [copied, setCopied] = React.useState(false);
  
  // Get streaming text directly from Redux using taskId
  const streamingText = useAppSelector(state => 
    taskId ? selectPrimaryResponseTextByTaskId(taskId)(state) : ''
  );
  
  const isResponseEnded = useAppSelector(state =>
    taskId ? selectPrimaryResponseEndedByTaskId(taskId)(state) : false
  );
  
  // Use streaming text if available, otherwise empty
  const content = streamingText;
  const isStreaming = taskId ? !isResponseEnded : false;

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenInCanvas = () => {
    // TODO: Integrate with canvas system
    toast.info('Opening in canvas...', {
      description: 'Canvas integration coming soon'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {actionName && (
            <DialogDescription>
              Result from: {actionName}
            </DialogDescription>
          )}
        </DialogHeader>

        <ScrollArea className="flex-1 w-full rounded-md border bg-textured">
          <div className="p-4">
            <MarkdownStream
              content={content}
              taskId={taskId}
              isStreamActive={isStreaming}
              role="assistant"
              type="message"
              hideCopyButton={true}
              allowFullScreenEditor={false}
            />
          </div>
        </ScrollArea>

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="gap-2"
              disabled={isStreaming}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenInCanvas}
              className="gap-2"
              disabled={isStreaming}
            >
              <ExternalLink className="h-4 w-4" />
              Open in Canvas
            </Button>
          </div>
          <Button onClick={onClose} disabled={isStreaming}>
            {isStreaming ? 'Streaming...' : 'Close'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

