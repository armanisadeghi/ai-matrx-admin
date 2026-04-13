"use client";

import { useAppSelector } from "@/lib/redux/hooks";
import { selectToolCallIdsInOrder } from "@/features/agents/redux/execution-system/active-requests/active-requests.selectors";
import { ToolCallCard } from "./ToolCallCard";

interface InlineToolCallsProps {
  requestId: string;
}

export function InlineToolCalls({ requestId }: InlineToolCallsProps) {
  const callIds = useAppSelector(selectToolCallIdsInOrder(requestId));

  if (callIds.length === 0) return null;

  return (
    <>
      {callIds.map((callId) => (
        <ToolCallCard key={callId} requestId={requestId} callId={callId} />
      ))}
    </>
  );
}
