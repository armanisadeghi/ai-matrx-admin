"use client";

import { ToolCallCard } from "./ToolCallCard";
import { useToolCallIdsInOrder } from "@/features/tool-call-visualization";

interface InlineToolCallsProps {
  requestId: string;
}

export function InlineToolCalls({ requestId }: InlineToolCallsProps) {
  const callIds = useToolCallIdsInOrder(requestId);
  if (callIds.length === 0) return null;
  return (
    <>
      {callIds.map((callId) => (
        <ToolCallCard key={callId} requestId={requestId} callId={callId} />
      ))}
    </>
  );
}
