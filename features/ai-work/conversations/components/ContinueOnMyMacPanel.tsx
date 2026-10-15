"use client";

// Continue on my Mac — the capability-gated NATIVE continuation door.
//
// Shown only for Claude Code bindings. The person's Matrx 2 computer is asked
// first (matrx2Coding: its own sessions, then its newest chats); a chat it
// cannot continue says why in one sentence, and is never passed over to Matrx
// Local. Only when no Matrx 2 computer answers is Matrx Local asked, announced.
// From Matrx Local, over the per-user bridge channel: native resume is offered
// when, and only when, Claude's own transcript for this session exists on that
// machine and its workspace folder is still present. Every other state is
// stated truthfully (app unreachable, transcript not on this machine,
// workspace missing) — never a generic "Resume" that would seed a new session
// while wearing resume's name. The labeled seeded-handoff path stays where it
// already lives (conversation tools); this panel never fakes it.

import { useEffect, useState } from "react";
import { AlertTriangle, Laptop, Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/lib/toast";
import { confirm } from "@/components/dialogs/confirm/ConfirmDialogHost";
import {
  continueCodingRun,
  fileMatrx2Run,
  readContinueVerdict,
  type ContinueVerdict,
} from "@/features/ai-work/lib/matrx2Coding";
import { browserCodingDoors } from "@/features/ai-work/lib/matrx2Computers";

type VerdictState = { state: "loading" } | { state: "known"; door: ContinueVerdict };

function reasonText(reason: string | undefined): string {
  switch (reason) {
    case "transcript_not_on_this_machine":
      return "Claude's own transcript for this session is not on your Mac, so a native resume is impossible there. You can still read everything here, or start a labeled seeded handoff from the conversation.";
    case "workspace_missing":
      return "The folder this session worked in no longer exists on your Mac.";
    case "workspace_unknown":
      return "The session's working folder could not be determined from Claude's local records.";
    case "not_a_claude_local_session_identity":
      return "This binding does not carry a local Claude session identity.";
    default:
      return reason ?? "Native resume is not available.";
  }
}

export function ContinueOnMyMacPanel({
  providerSessionId,
  conversationId,
}: {
  providerSessionId: string;
  /** The conversation this panel is shown on, to report where turns land. */
  conversationId: string;
}) {
  const [verdict, setVerdict] = useState<VerdictState>({ state: "loading" });
  const [prompt, setPrompt] = useState("");
  const [starting, setStarting] = useState(false);
  const [startedConversationId, setStartedConversationId] = useState<
    string | null
  >(null);

  useEffect(() => {
    let cancelled = false;
    void readContinueVerdict(browserCodingDoors, providerSessionId).then((door) => {
      if (!cancelled) setVerdict({ state: "known", door });
    });
    return () => {
      cancelled = true;
    };
  }, [providerSessionId]);

  const [runningNote, setRunningNote] = useState<string | null>(null);
  const door = verdict.state === "known" ? verdict.door : null;
  const canContinue =
    (door?.via === "matrx2" && door.target.state === "ready") ||
    (door?.via === "matrx-local" && door.verdict.resumable);

  const start = async () => {
    if (!door || !canContinue) return;
    if (!prompt.trim()) {
      toast.error("Write what Claude Code should do next.");
      return;
    }
    let confirmElsewhere = false;
    if (door.via === "matrx2" && door.target.state === "ready" && door.target.elsewhere) {
      confirmElsewhere = await confirm({
        title: "This chat is open somewhere else",
        description: `${door.target.elsewhere.message} Continuing puts a second Claude Code on it.`,
        confirmLabel: "Continue anyway",
      });
      if (!confirmElsewhere) return;
    }
    setStarting(true);
    try {
      const outcome = await continueCodingRun(browserCodingDoors, door, {
        providerSessionId,
        prompt: prompt.trim(),
        confirmElsewhere,
      });
      if (outcome.via === "matrx2") {
        setRunningNote(outcome.sentence);
        toast.success(outcome.sentence);
        void fileMatrx2Run(browserCodingDoors, outcome.computer, outcome.sessionId).then((filed) => {
          if ("conversationId" in filed) {
            setRunningNote(null);
            setStartedConversationId(filed.conversationId);
          } else setRunningNote(filed.pending);
        });
        return;
      }
      setStartedConversationId(outcome.run.conversation_id);
      toast.success(
        "Claude Code is continuing this session through Matrx Local, with its full history.",
      );
    } catch (error) {
      console.error("[ai-work] continue failed", error);
      toast.error(
        error instanceof Error
          ? `The session could not continue — ${error.message}`
          : "The session could not continue.",
      );
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-center gap-2">
        <Laptop className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">
          Continue on my Mac
        </span>
      </div>

      {verdict.state === "loading" && (
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Asking your computer whether this chat can continue…
        </div>
      )}

      {door && door.via !== "none" && door.notice && (
        <p className="mt-2 text-xs text-muted-foreground">{door.notice}</p>
      )}

      {door?.via === "none" && (
        <div className="mt-2 flex items-start gap-2 text-xs text-muted-foreground">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
          {door.sentence}
        </div>
      )}

      {door?.via === "matrx2" && door.target.state === "blocked" && (
        <div className="mt-2 flex items-start gap-2 text-xs text-muted-foreground">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
          {door.target.sentence}
        </div>
      )}

      {door?.via === "matrx-local" && !door.verdict.resumable && (
        <div className="mt-2 flex items-start gap-2 text-xs text-muted-foreground">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
          {reasonText(door.verdict.reason)}
        </div>
      )}

      {door && canContinue && (
        <div className="mt-2 flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">
            {door.via === "matrx2" && door.target.state === "ready"
              ? `On ${door.computer.name}, in ${door.target.cwd}: it continues with its full history.`
              : `Claude's own transcript is on your Mac${door.via === "matrx-local" && door.verdict.workspace ? ` (${door.verdict.workspace})` : ""}: it continues with its full history.`}
          </p>
          {door.via === "matrx2" && door.target.state === "ready" && door.target.elsewhere && (
            <p className="text-xs text-amber-600 dark:text-amber-400">{door.target.elsewhere.message}</p>
          )}
          <Textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            rows={3}
            placeholder="What should Claude Code do next in this session?"
          />
          <div className="flex items-center gap-2">
            <Button icon={starting ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Play />
              )} variant="primary" onClick={() => void start()} disabled={starting}>
              Continue on my Mac
            </Button>
            {runningNote && !startedConversationId && (
              <span className="text-xs text-muted-foreground">{runningNote}</span>
            )}
            {startedConversationId &&
              (startedConversationId === conversationId ? (
                <span className="text-xs text-muted-foreground">
                  Running — new turns and tool activity appear on this page as
                  they arrive.
                </span>
              ) : (
                <a
                  href={`/work/conversations/${startedConversationId}`}
                  className="text-xs text-primary hover:underline"
                >
                  Running — the native ledger lands in its own conversation.
                  Open it.
                </a>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
