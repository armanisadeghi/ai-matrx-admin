import React, { useState, useEffect, useCallback } from "react";
import { useDomCapturePrint } from "@/features/chat/hooks/useDomCapturePrint";
import MarkdownStream from "@/components/MarkdownStream";
import { ClassifiedMetadata } from "@/components/mardown-display/chat-markdown/analyzer/types";
import { localMessage } from "@/features/chat/components/response/MessageItem";
import { AssistantActionBar } from "@/features/cx-conversation/AssistantActionBar";

interface AssistantMessageProps {
  message: localMessage;
  taskId: string;
  isStreamActive?: boolean;
  onScrollToBottom?: () => void;
  onContentUpdate?: (newContent: string) => void;
  metadata?: ClassifiedMetadata;
  isOverlay?: boolean;
}

const AssistantMessage: React.FC<AssistantMessageProps> = ({
  message,
  taskId,
  isStreamActive = false,
  onScrollToBottom,
  onContentUpdate,
  metadata,
  isOverlay = false,
}) => {
  const [isAppearing, setIsAppearing] = useState(true);
  const content = message.content;

  const { captureRef, isCapturing, captureAsPDF } = useDomCapturePrint();
  const handleFullPrint = useCallback(() => {
    captureAsPDF({ filename: `ai-response-${message.id ?? "export"}` });
  }, [captureAsPDF, message.id]);

  useEffect(() => {
    const timer = setTimeout(() => setIsAppearing(false), 50);
    return () => clearTimeout(timer);
  }, []);

  const handleMarkdownContentChange = (newContent: string) => {
    if (onContentUpdate) onContentUpdate(newContent);
  };

  return (
    <div
      className={`flex min-w-0 overflow-x-hidden ${isAppearing ? "opacity-0" : "opacity-100"} transition-opacity duration-300`}
    >
      <div
        ref={captureRef}
        className="max-w-full min-w-0 w-full relative overflow-x-hidden"
      >
        <MarkdownStream
          content={content}
          taskId={taskId}
          type="message"
          role="assistant"
          className="bg-textured"
          isStreamActive={isStreamActive}
          analysisData={metadata}
          messageId={message.id}
          onContentChange={handleMarkdownContentChange}
          hideCopyButton={true}
        />
        {!isStreamActive && !isOverlay && (
          <AssistantActionBar
            content={content}
            messageId={message.id}
            onFullPrint={handleFullPrint}
            isCapturing={isCapturing}
          />
        )}
      </div>
    </div>
  );
};

export default AssistantMessage;
