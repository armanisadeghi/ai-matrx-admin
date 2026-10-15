"use client";

// features/ai-work/conversations/components/CloudSyncTruthPanel.tsx
//
// IS THIS CONVERSATION ACTUALLY IN AI MATRX? — the cloud half of the answer,
// on the page that shows the conversation.
//
// Arman, 2026-09-17: "I have a chat in Claude Code that simply doesn't match
// what I see in AI Matrx. I cannot figure out what is wrong. A normal DB system
// would show me that it can't sync, or when it was synced — this thing is a
// dead fish." The screen it replaces said "AI Matrx holds this conversation
// (fidelity: event_mirror)" and showed no numbers at all, so a 3,526-entry
// transcript rendered identically to a session the cloud had 55 entries and 2
// messages of — and identically again to the 741 sessions whose cloud
// conversation row has never had a single delivered entry.
//
// THE FOUR COUNTS ARE THE POINT (contract §3) and two of them are NOT KNOWN
// HERE. A browser cannot read Claude's `.jsonl` transcript and cannot read this
// Mac's local mirror; only the desktop app can. So those two cells say exactly
// that. They are never 0 and never blank — a zero in a count column is a claim
// about the session, and a blank is the dead fish. Same four labels, same
// order, as the desktop app's own view.
//
// THE SENTENCE IS THE SERVER'S. `cloud_sentence` is rendered verbatim
// (`cloudSyncTruth.ts` holds the reasoning); this component composes no verdict
// English of its own.
//
// THE DOOR TO THE MAC. "Ask Matrx Local to reconcile" reaches the owning Mac
// over the existing per-user bridge channel. There is NO presence table — the
// timeout IS the offline signal — so reachability is probed first at the
// bridge's own 8s default and an unanswered Mac renders the ONE offline
// sentence. It never renders as "in sync", and the button is never a dead
// control with no explanation.

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CloudOff,
  HelpCircle,
  Laptop,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EntityRef } from "@/components/official/entity-ref/EntityRef";
import { cn } from "@/utils/cn";
import { confirm } from "@/components/dialogs/confirm/ConfirmDialogHost";
import { formatSessionTimestamp } from "@/features/agent-connections/coding-sessions/verdict";
import {
  MATRX_LOCAL_UNREACHABLE_SENTENCE,
  type LocalReconcileAction,
} from "@/features/ai-work/lib/matrxLocalRuntime";
import {
  pickChatHolder,
  readChatHolding,
  type ChatHolding,
  reconcileCodingSession,
  reconcileScopeSentence,
} from "@/features/ai-work/lib/matrx2Coding";
import { browserCodingDoors } from "@/features/ai-work/lib/matrx2Computers";
import {
  readCloudSyncTruth,
  type CloudSyncTruth,
  type SyncVerdictCode,
} from "../cloudSyncTruth";

/**
 * What a layer this surface cannot read says. ONE wording, used by both cells
 * that the browser genuinely cannot answer, so the two are visibly the same
 * kind of gap rather than looking like two different findings.
 */
export const ONLY_MATRX_LOCAL_CAN_SEE_THIS = "Only Matrx Local can see this";

/** The §3 four, in the §3 order. `known: false` cells render the sentence above. */
const COUNT_LABELS = [
  "Transcript",
  "Delivered",
  "In AI Matrx",
  "On this Mac",
] as const;

const VERDICT_TONE: Record<SyncVerdictCode, string> = {
  in_sync: "border-emerald-500/60 bg-emerald-500/5",
  partial_by_design: "border-sky-500/60 bg-sky-500/5",
  behind_local: "border-amber-500/60 bg-amber-500/10",
  behind_cloud: "border-amber-500/60 bg-amber-500/10",
  mirror_stale: "border-amber-500/60 bg-amber-500/10",
  diverged: "border-violet-500/60 bg-violet-500/5",
  quarantined: "border-destructive/60 bg-destructive/10",
  not_in_cloud: "border-destructive/60 bg-destructive/10",
  unknown: "border-border bg-muted/40",
};

function VerdictIcon({ code }: { code: SyncVerdictCode }) {
  if (code === "unknown")
    return (
      <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
    );
  if (code === "in_sync")
    return (
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
    );
  if (code === "not_in_cloud")
    return <CloudOff className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />;
  return (
    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-500" />
  );
}

/** One of the four counts. An unknown cell states WHO can answer it. */
function Count({ label, value, unknown = ONLY_MATRX_LOCAL_CAN_SEE_THIS }: { label: string; value: number | null; unknown?: string }) {
  return (
    <div className="min-w-0 border-b border-r border-border px-3 py-2.5 last:border-r-0">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-words">
        {value === null ? (
          <span className="text-xs leading-snug text-muted-foreground">
            {unknown}
          </span>
        ) : (
          <span className="text-lg font-semibold tabular-nums text-foreground">
            {value}
          </span>
        )}
      </dd>
    </div>
  );
}

function Detail({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 border-b border-border px-3 py-2 text-xs">
      <dt className="font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-words text-foreground">{children}</dd>
    </div>
  );
}

type ReconcileState =
  | { phase: "idle" }
  | { phase: "reaching" }
  | { phase: "unreachable"; sentence: string }
  | { phase: "running"; where: string }
  | {
      phase: "done";
      sentence: string;
      remedy: string | null;
      actions: LocalReconcileAction[];
      /** Which computer answered, or the announced Matrx Local fallback. */
      source: string | null;
    }
  | { phase: "failed"; sentence: string };

export function CloudSyncTruthPanel({
  providerSessionId,
  provider = "claude_code",
}: {
  providerSessionId: string;
  provider?: string;
}) {
  const [truth, setTruth] = useState<CloudSyncTruth | null>(null);
  const [reading, setReading] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);
  const [reconcile, setReconcile] = useState<ReconcileState>({ phase: "idle" });
  /** Read both halves again (Check again, or after a reconcile moved them). */
  const reread = () => {
    setReading(true);
    setReloadToken((token) => token + 1);
  };

  useEffect(() => {
    let cancelled = false;
    void readCloudSyncTruth(providerSessionId, provider).then((next) => {
      if (cancelled) return;
      setTruth(next);
      setReading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [providerSessionId, provider, reloadToken]);

  // ── The computer side: which Matrx 2 computer holds this chat (asked through the
  //    shared reach). Matrx 2 cannot count transcript entries, so it says where the
  //    chat is and when it changed; the counts it cannot give stay unknown, by name.
  const [holding, setHolding] = useState<ChatHolding | null>(null);
  useEffect(() => {
    let cancelled = false;
    void readChatHolding(browserCodingDoors, providerSessionId).then((next) => {
      if (!cancelled) setHolding(next);
    });
    return () => {
      cancelled = true;
    };
  }, [providerSessionId, reloadToken]);
  const onMatrx2 = holding?.via === "matrx2" ? holding : null;

  const diagnosis = truth?.diagnosis ?? null;

  const askToReconcile = async () => {
    // Which computer answers is known BEFORE the confirm, so the confirm can
    // name the true scope: Matrx 2 delivers every chat on that computer that
    // AI Matrx lacks, not only this one (matrx2Coding).
    setReconcile({ phase: "reaching" });
    const chosen = await pickChatHolder(browserCodingDoors, providerSessionId);
    setReconcile({ phase: "idle" });
    // A destructive/expensive click names its consequence first: a first
    // reconcile can import thousands of entries and add messages, and it
    // spends server projection work.
    const ok = await confirm({
      title: chosen.computer
        ? `Deliver ${chosen.computer.name}'s chats to AI Matrx?`
        : "Ask Matrx Local to reconcile this conversation?",
      description: chosen.computer
        ? reconcileScopeSentence(chosen)
        : `${reconcileScopeSentence(chosen)} A first reconcile on a long session can add thousands of entries and many messages to this conversation, and it spends server projection work. Entries held back because AI Matrx already has this session under a different Claude account are never re-sent. Running it again on an already-reconciled session changes nothing.`,
      confirmLabel: "Reconcile",
    });
    if (!ok) return;

    setReconcile({ phase: "running", where: chosen.computer ? `${chosen.computer.name} (Matrx 2)` : "Matrx Local" });
    try {
      const outcome = await reconcileCodingSession(browserCodingDoors, chosen, {
        providerSessionId,
        provider,
      });
      if (outcome.via === "none") {
        setReconcile({
          phase: "unreachable",
          sentence: outcome.sentence || MATRX_LOCAL_UNREACHABLE_SENTENCE,
        });
        return;
      }
      setReconcile(
        outcome.via === "matrx2"
          ? {
              phase: "done",
              sentence: outcome.summary,
              remedy: null,
              actions: [],
              source: `From ${outcome.computer.name} (Matrx 2).`,
            }
          : {
              phase: "done",
              sentence: outcome.result.truth.verdict.sentence,
              remedy: outcome.result.truth.verdict.remedy,
              actions: outcome.result.actions ?? [],
              source: outcome.notice,
            },
      );
      // The cloud half moved, so re-read it rather than leaving the old numbers
      // on screen next to a fresh verdict.
      reread();
    } catch (error) {
      setReconcile({
        phase: "failed",
        sentence:
          error instanceof Error
            ? error.message
            : MATRX_LOCAL_UNREACHABLE_SENTENCE,
      });
    }
  };

  const busy = reconcile.phase === "reaching" || reconcile.phase === "running";

  return (
    <section className="rounded-lg border border-border p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">
            Is this conversation in sync?
          </h3>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            What AI Matrx itself holds for this session, and which of your
            computers holds the chat.
          </p>
        </div>
        <Button
          icon={<RefreshCw className={cn("h-3.5 w-3.5", reading && "animate-spin")} />}
          variant="quiet"
          onClick={() => reread()}
          disabled={reading}
          className="shrink-0"
        >
          {reading ? "Checking…" : "Check again"}
        </Button>
      </div>

      {/* ── The verdict sentence, in the server's own words ─────────────── */}
      {reading && truth === null ? (
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Asking AI Matrx what it holds for this session…
        </div>
      ) : truth && !(onMatrx2 && truth.verdict.code === "unknown") ? (
        // A computer holding the chat answers below; the server's "cannot tell" is shown only
        // when no Matrx 2 computer answered.
        <div
          className={cn(
            "mt-3 border-l-2 px-3 py-2",
            VERDICT_TONE[truth.verdict.code],
          )}
        >
          <div className="flex items-start gap-2">
            <VerdictIcon code={truth.verdict.code} />
            <div className="min-w-0">
              <p className="text-sm leading-relaxed text-foreground">
                {truth.verdict.sentence}
              </p>
              {truth.verdict.remedy ? (
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {truth.verdict.remedy}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {/* ── The four counts, side by side ───────────────────────────────── */}
      <dl className="mt-3 grid grid-cols-2 border-t border-border sm:grid-cols-4">
        <Count label={COUNT_LABELS[0]} value={null} unknown={onMatrx2 ? `On ${onMatrx2.computer.name}; Matrx 2 does not count entries` : undefined} />
        <Count label={COUNT_LABELS[1]} value={diagnosis?.entries ?? null} />
        <Count label={COUNT_LABELS[2]} value={diagnosis?.messages ?? null} />
        <Count label={COUNT_LABELS[3]} value={null} unknown={onMatrx2 ? "Matrx 2 keeps no local copy" : undefined} />
      </dl>

      {/* ── Where the chat itself is ─────────────────────────────────────── */}
      <p className="mt-2 text-xs text-muted-foreground">
        {holding === null
          ? "Asking your computers which one holds this chat…"
          : onMatrx2
            ? `${onMatrx2.computer.name} (Matrx 2) holds this chat${onMatrx2.updatedAt ? `; it last changed ${formatSessionTimestamp(onMatrx2.updatedAt)}` : ""}. Reconcile delivers anything AI Matrx lacks.`
            : `No Matrx 2 computer holds it: ${holding.via === "none" ? holding.sentence : ""} Only Matrx Local could still read it.`}
      </p>

      {/* ── What only the cloud can answer ──────────────────────────────── */}
      {diagnosis ? (
        <dl className="mt-3 grid border-t border-border sm:grid-cols-2 sm:[&>*:nth-child(odd)]:border-r">
          <Detail label="Entries received">{diagnosis.entries}</Detail>
          <Detail label="Entries projected into messages">
            {diagnosis.projected_entries}
            {diagnosis.skipped_entries > 0
              ? ` · ${diagnosis.skipped_entries} deliberately skipped`
              : ""}
            {diagnosis.pending_entries > 0
              ? ` · ${diagnosis.pending_entries} still waiting`
              : ""}
          </Detail>
          <Detail label="Last entry received">
            {diagnosis.last_entry_at ? (
              formatSessionTimestamp(diagnosis.last_entry_at)
            ) : (
              <span className="text-muted-foreground">
                AI Matrx has never received an entry for this session
              </span>
            )}
          </Detail>
          <Detail label="Capture mode">
            {diagnosis.fidelity ?? (
              <span className="text-muted-foreground">Not recorded</span>
            )}
          </Detail>
          <Detail label="Projection errors">
            {diagnosis.error_entries === 0 ? (
              <span className="text-muted-foreground">None</span>
            ) : (
              <span>
                {diagnosis.error_entries} entr
                {diagnosis.error_entries === 1 ? "y" : "ies"}
                {diagnosis.projection_errors.length > 0 ? ": " : ""}
                {diagnosis.projection_errors
                  .map(
                    (group) =>
                      `${group.code} (${group.count}${group.detail ? ` — ${group.detail}` : ""})`,
                  )
                  .join(", ")}
              </span>
            )}
          </Detail>
          <Detail label="Conversation in AI Matrx">
            {diagnosis.conversation_id ? (
              <EntityRef
                token="conversation"
                id={diagnosis.conversation_id}
                name={diagnosis.conversation_id}
                showIcon={false}
                wrap
                labelClassName="font-mono text-[11px]"
              />
            ) : (
              <span className="text-muted-foreground">
                No conversation row — nothing was ever created for this session
              </span>
            )}
          </Detail>
        </dl>
      ) : null}

      {/* ── The door to the owning Mac ──────────────────────────────────── */}
      <div className="mt-3 border-t border-border pt-3">
        <div className="flex flex-wrap items-center gap-2">
          <Laptop className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">
            Ask your computer to reconcile
          </span>
          <Button
            icon={busy ? (
              <Loader2 className="animate-spin" />
            ) : (
              <RefreshCw />
            )}
            variant="outline"
            onClick={() => void askToReconcile()}
            disabled={busy}
            className="ml-auto shrink-0"
          >
            {reconcile.phase === "reaching"
              ? "Reaching your computer…"
              : reconcile.phase === "running"
                ? `Delivering on ${reconcile.where}…`
                : "Reconcile"}
          </Button>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Your computer reads what this page cannot: Claude&apos;s own
          transcript. It delivers what never reached AI Matrx and answers in
          its own words.
        </p>

        {reconcile.phase === "reaching" ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Finding which of your computers holds this chat…
          </p>
        ) : null}
        {reconcile.phase === "running" ? (
          <p className="mt-2 text-xs text-muted-foreground">
            {reconcile.where} is delivering what AI Matrx lacks. A long transcript
            takes a while; its answer shows here when it is done.
          </p>
        ) : null}
        {reconcile.phase === "unreachable" || reconcile.phase === "failed" ? (
          <div className="mt-2 flex items-start gap-2 text-xs text-foreground">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-500" />
            <span>{reconcile.sentence}</span>
          </div>
        ) : null}
        {reconcile.phase === "done" ? (
          <div className="mt-2 border-l-2 border-border bg-muted/40 px-3 py-2">
            {reconcile.source ? (
              <p className="text-xs text-muted-foreground">{reconcile.source}</p>
            ) : null}
            <p className="text-sm leading-relaxed text-foreground">
              {reconcile.sentence}
            </p>
            {reconcile.remedy ? (
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {reconcile.remedy}
              </p>
            ) : null}
            {reconcile.actions.length > 0 ? (
              <ul className="mt-2 space-y-1">
                {reconcile.actions.map((action, index) => (
                  <li
                    key={`${action.step}-${index}`}
                    className="text-xs text-muted-foreground"
                  >
                    <span className="font-medium text-foreground">
                      {action.step}
                    </span>
                    {": "}
                    {action.outcome}
                    {action.detail ? ` — ${action.detail}` : ""}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
