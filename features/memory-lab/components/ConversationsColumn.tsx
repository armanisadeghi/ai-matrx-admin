"use client";

/**
 * Memory Lab — the person's conversations, oldest first, each with its agent and its review state
 * in this trial. "Review" runs one; "Review next N" walks the not-yet-reviewed ones in order, one
 * run at a time, and can be stopped.
 */
import { useState } from "react";
import { ChevronDown, MessagesSquare, Play, ScanSearch, Square } from "lucide-react";

import { RecordId } from "@ai-matrx/design-system";
import {
  Badge,
  Button,
  ClampedNumberInput,
  EmptyState,
  RegionSkeleton,
  SegmentedControl,
} from "@ai-matrx/design-system/controls";
import { STATUS_LABEL, STATUS_TONE } from "./StepTimeline";
import type { CandidateConversation, MemoryTrialStep } from "../types";

export type ConversationFilter = "chat" | "all";

/** Rows drawn per page of the list; a person can hold thousands of chats. */
const PAGE_ROWS = 100;

/** The last review step of each conversation. */
export function reviewState(steps: MemoryTrialStep[]): Map<string, MemoryTrialStep> {
  const out = new Map<string, MemoryTrialStep>();
  for (const s of steps) if (s.role === "review" && s.subjectConversationId) out.set(s.subjectConversationId, s);
  return out;
}

export function ConversationsColumn({
  conversations,
  steps,
  busy,
  runningId,
  hasReviewer,
  archived,
  onReview,
  onReviewMany,
  onCapture,
  onStop,
}: {
  conversations: CandidateConversation[] | null;
  steps: MemoryTrialStep[];
  busy: boolean;
  runningId: string | null;
  hasReviewer: boolean;
  archived: boolean;
  onReview: (id: string) => void;
  onReviewMany: (ids: string[]) => void;
  onCapture: (id: string) => void;
  onStop: () => void;
}) {
  const [filter, setFilter] = useState<ConversationFilter>("chat");
  const [count, setCount] = useState(5);
  const [visible, setVisible] = useState(PAGE_ROWS);
  const reviewed = reviewState(steps);
  const all = conversations ?? [];
  const shown = filter === "chat" ? all.filter((c) => c.isChat) : all;
  // Why Review is off, in one short reason (archived wins over a missing reviewer).
  const blocked = archived ? "Archived: restore the trial to run reviews" : hasReviewer ? null : "Choose a reviewer agent first";
  const next = shown.filter((c) => !reviewed.has(c.id)).slice(0, count);

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <SegmentedControl
        value={filter}
        onValueChange={(f) => {
          setFilter(f);
          setVisible(PAGE_ROWS);
        }}
        aria-label="Which conversations"
        fill
        data={[
          { value: "chat", label: "Chat agents", count: all.filter((c) => c.isChat).length },
          { value: "all", label: "All", count: all.length },
        ]}
      />
      <div className="flex items-center gap-2">
        <ClampedNumberInput value={count} onChange={setCount} min={1} max={50} aria-label="How many" />
        {busy ? (
          <Button variant="outline" icon={<Square />} onClick={onStop}>
            Stop after this
          </Button>
        ) : (
          <Button
            variant="primary"
            icon={<Play />}
            disabled={Boolean(blocked) || next.length === 0}
            title={blocked ?? undefined}
            onClick={() => onReviewMany(next.map((c) => c.id))}
          >
            Review next {next.length}
          </Button>
        )}
      </div>
      {archived ? <span className="type-secondary text-muted-foreground">{blocked}</span> : null}
      {conversations === null ? <RegionSkeleton shape="rows" count={6} twoLine aria-label="Reading conversations" /> : null}
      {conversations !== null && shown.length === 0 ? (
        <EmptyState icon={<MessagesSquare />} title="No conversations" line="This person has no chats of this kind." />
      ) : null}
      <ul className="flex min-h-0 flex-1 flex-col divide-y divide-border overflow-y-auto rounded-md border border-border bg-card">
        {shown.slice(0, visible).map((c) => {
          const step = reviewed.get(c.id);
          const running = runningId === c.id;
          return (
            <li key={c.id} className="flex flex-col gap-1 px-2 py-1.5">
              <div className="flex items-center gap-2">
                <RecordId value={c.id} label={c.title || "Untitled chat"} token="conversation" labelled />
                <span className="flex-1" />
                {running ? (
                  <Badge tone="info">Running</Badge>
                ) : step ? (
                  <Badge tone={STATUS_TONE[step.status]}>{STATUS_LABEL[step.status]}</Badge>
                ) : (
                  <Badge>Not reviewed</Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="type-secondary min-w-0 flex-1 truncate text-muted-foreground">
                  {/* No message count: chat.conversation.message_count is stale on some rows (it reads 0 on chats that have messages). */}
                  {new Date(c.createdAt).toLocaleDateString()} ·{" "}
                  {c.agentId ? (c.agentName ?? "Agent") : "No agent"}
                  {c.agentId && !c.isChat ? " · not a chat agent" : ""}
                </span>
                <Button
                  variant="quiet"
                  icon={<ScanSearch />}
                  aria-label="Capture provision"
                  title="Capture provision"
                  disabled={busy}
                  onClick={() => onCapture(c.id)}
                />
                <Button
                  variant="quiet"
                  disabled={busy || Boolean(blocked)}
                  title={blocked ?? undefined}
                  onClick={() => onReview(c.id)}
                >
                  Review
                </Button>
              </div>
            </li>
          );
        })}
        {shown.length > visible ? (
          <li className="flex justify-center px-2 py-1.5">
            <Button variant="quiet" icon={<ChevronDown />} onClick={() => setVisible((v) => v + PAGE_ROWS)}>
              Show {Math.min(PAGE_ROWS, shown.length - visible)} more of {shown.length - visible}
            </Button>
          </li>
        ) : null}
      </ul>
    </div>
  );
}
