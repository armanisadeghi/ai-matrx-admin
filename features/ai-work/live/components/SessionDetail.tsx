"use client";

import { formatRelativeTime } from "@ai-matrx/kit/format";
import { useRef, useState } from "react";
import { TranscriptScrollNav } from "@ai-matrx/design-system/transcript-scroll-nav";
import Link from "next/link";
import {
  ChevronLeftTapButton,
  ExternalLinkTapButton,
} from "@ai-matrx/design-system/tap-target/buttons";
import { cn } from "@/lib/utils";
import { AGENT_ICON } from "@/components/icons/domain-icons";
import { Button } from "@/components/ui/button";
import { Tabs } from "@ai-matrx/design-system/controls";
import { AiWorkHeader } from "../../components/AiWorkHeader";
import { providerMeta } from "@/features/agent-connections/coding-sessions/catalog";
import { deliveryLag, needsClaudeAccount } from "../presence";
import type { LiveSession } from "../useLiveHub";
import type { SessionMemberRow } from "../service";
import { LagMarker, PresenceDot, lagText, presenceLabel, worstLag } from "./LiveBits";
import { SessionTranscriptPane } from "./SessionTranscriptPane";
import { DirectLine } from "./DirectLine";
import type { LiveLayout } from "./LiveHub";

type Tab = "messages" | "transcript";

export function SessionDetail({
  session,
  members,
  directRoomId,
  directMembers,
  nowMs,
  layout,
  onBack,
  onDirectRoomCreated,
}: {
  layout: LiveLayout;
  session: LiveSession;
  members: readonly SessionMemberRow[];
  directRoomId: string | null;
  directMembers: readonly SessionMemberRow[];
  nowMs: number;
  onBack: () => void;
  onDirectRoomCreated: (roomId: string) => void;
}) {
  const [tab, setTab] = useState<Tab>("messages");
  const transcriptRef = useRef<HTMLElement>(null);
  const Icon = providerMeta(session.provider)?.icon ?? AGENT_ICON;
  const lag = worstLag(members.map((m) => deliveryLag(m, nowMs)));
  const lagLine = lagText(lag);
  const seen = session.lastSeenAt
    ? `seen ${formatRelativeTime(session.lastSeenAt, { now: nowMs })}`
    : "never seen";
  const meta = [
    presenceLabel(session.presence),
    session.providerLabel,
    session.workspace,
    session.account,
    seen,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* The title lives in the shell header beside its icon — no second
          title row here (Arman, 2026-10-12). */}
      <AiWorkHeader
        left={
          <>
            {!layout.listBeside && (
              <ChevronLeftTapButton variant="transparent" ariaLabel="Back to Live" onClick={onBack} />
            )}
            <span
              className="flex min-w-0 md:max-w-[min(26vw,26rem)] items-center gap-1.5 pl-1.5 text-sm"
              title={meta}
            >
              <PresenceDot presence={session.presence} />
              <span className="min-w-0 truncate font-medium text-foreground">{session.title}</span>
              <Icon className="size-3 shrink-0 text-muted-foreground" />
              {layout.roomy && (
                <span className="min-w-0 shrink-[4] truncate text-xs text-muted-foreground">{meta}</span>
              )}
              {lagLine && (
                <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                  <LagMarker lag={lag} />
                  {layout.roomy && <span>{lagLine}</span>}
                </span>
              )}
            </span>
          </>
        }
        right={
          <>
            {needsClaudeAccount(lag) && (
              <Button asChild variant="outline" className="shrink-0">
                <Link href="/work/connections#claude-accounts">Connect Claude account</Link>
              </Button>
            )}
            {/* Opens the full conversation page in a NEW tab: an "open
                elsewhere" icon never replaces the page you are on. */}
            <ExternalLinkTapButton
              variant="transparent"
              href={`/work/conversations/${session.address}`}
              target="_blank"
              ariaLabel="Open full conversation in a new tab"
              tooltip="Open in new tab"
            />
          </>
        }
      />

      <div className="@4xl/live:hidden">
        <Tabs
          aria-label="Session view"
          value={tab}
          onValueChange={setTab}
          fill
          data={[
            { value: "messages", label: "Messages" },
            { value: "transcript", label: "Transcript" },
          ]}
        />
      </div>

      <div className="flex min-h-0 flex-1">
        <div
          className={cn(
            "relative min-h-0 min-w-0 flex-1 @4xl/live:block",
            tab === "transcript" ? "block" : "hidden",
          )}
        >
          <section
            ref={transcriptRef}
            aria-label="Transcript"
            className="h-full overflow-y-auto scrollbar-thin"
          >
            <SessionTranscriptPane address={session.address} />
          </section>
          {/* Up: the previous message I sent, top-aligned. Down: the end. */}
          <TranscriptScrollNav scrollRef={transcriptRef} />
        </div>
        <section
          aria-label="Messages"
          className={cn(
            "min-h-0 w-full flex-col @4xl/live:flex @4xl/live:w-[24rem] @6xl/live:w-[28rem] @4xl/live:shrink-0 @4xl/live:border-l @4xl/live:border-border",
            tab === "messages" ? "flex" : "hidden",
          )}
        >
          <DirectLine
            session={session}
            roomId={directRoomId}
            members={directMembers}
            onCreated={onDirectRoomCreated}
          />
        </section>
      </div>
    </div>
  );
}
