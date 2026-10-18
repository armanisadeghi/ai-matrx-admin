"use client";

// features/mandates/fix-with-ai/FixWithAiWindow.tsx
//
// FIX WITH AI — the window (Arman, 2026-10-18). Fix the AGENT first: the Agent Factory
// drafts a new version of the Holder agent that answers in the job's shape, the failed
// input re-runs on the draft (never live), and the person sees old vs new and the re-run
// before Approve makes it the agent's new version. A draggable WindowPanel (the canonical
// non-blocking panel), reached only through FixWithAiButton's dynamic() import.

import { useEffect, useState } from "react";
import { CheckCircle2, ChevronDown, TriangleAlert } from "lucide-react";
import { WindowPanel } from "@ai-matrx/summon/window";
import { Badge, RegionSkeleton } from "@ai-matrx/design-system/controls";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppDispatch } from "@/lib/redux/hooks";
import { toast } from "@/lib/toast";
import { approveFix, draftFix, latestRunOf, type FixApproved, type FixDraft } from "./service";

export interface FixWithAiTarget {
  mandateKey: string;
  agentId: string | null;
  /** The mismatched run, when the caller has it; else the viewer's newest run is used. */
  conversationId?: string | null;
}

type Phase =
  | { at: "drafting" }
  | { at: "ready"; draft: FixDraft }
  | { at: "approving"; draft: FixDraft }
  | { at: "approved"; draft: FixDraft; result: FixApproved }
  | { at: "failed"; error: string };

function Block({ label, before, after }: { label: string; before: string; after: string }) {
  const same = before === after;
  return (
    <section className="space-y-1.5">
      <div className="flex items-center gap-2">
        <h3 className="type-label text-foreground">{label}</h3>
        <Badge tone={same ? "neutral" : "info"}>{same ? "Unchanged" : "Changed"}</Badge>
      </div>
      {same ? null : (
        <div className="grid min-w-0 gap-2 md:grid-cols-2">
          <pre className="max-h-56 min-w-0 overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-muted/40 p-2 type-meta text-muted-foreground">
            {before || "None"}
          </pre>
          <pre className="max-h-56 min-w-0 overflow-auto whitespace-pre-wrap rounded-lg border border-primary/40 bg-card p-2 type-meta text-foreground">
            {after || "None"}
          </pre>
        </div>
      )}
    </section>
  );
}

const pretty = (v: unknown) => (v == null ? "" : JSON.stringify(v, null, 2));

export default function FixWithAiWindow({
  target,
  onClose,
  onUseOwn,
}: {
  target: FixWithAiTarget;
  onClose: () => void;
  /** The existing "Use my own" path, for a viewer who may not change the agent. */
  onUseOwn?: () => void;
}) {
  const dispatch = useAppDispatch();
  const [phase, setPhase] = useState<Phase>({ at: "drafting" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const conversationId =
          target.conversationId ?? (await latestRunOf(target.mandateKey, target.agentId).catch(() => null));
        const draft = await draftFix(dispatch, {
          mandateKey: target.mandateKey,
          agentId: target.agentId,
          conversationId,
        });
        if (live) setPhase({ at: "ready", draft });
      } catch (error) {
        if (live) setPhase({ at: "failed", error: error instanceof Error ? error.message : String(error) });
      }
    })();
    return () => {
      live = false;
    };
  }, [dispatch, target.mandateKey, target.agentId, target.conversationId, attempt]);

  const redraft = () => {
    setPhase({ at: "drafting" });
    setAttempt((n) => n + 1);
  };

  const approve = async (draft: FixDraft) => {
    if (!draft.agent_id || !draft.draft_agent_id) return;
    setPhase({ at: "approving", draft });
    try {
      const result = await approveFix(dispatch, { agentId: draft.agent_id, draftAgentId: draft.draft_agent_id });
      setPhase({ at: "approved", draft, result });
      toast.success(result.version_number ? `Version ${result.version_number} is live` : "The fix is live");
    } catch (error) {
      setPhase({ at: "failed", error: error instanceof Error ? error.message : String(error) });
    }
  };

  const agentHref = (id: string | null | undefined) => (id ? `/agents/${id}/build` : null);
  const draft = phase.at === "ready" || phase.at === "approving" || phase.at === "approved" ? phase.draft : null;

  return (
    <WindowPanel
      id={`fix-with-ai-${target.mandateKey}-${target.agentId ?? "run"}`}
      onClose={onClose}
      title={draft?.agent_name ? `Fix with AI · ${draft.agent_name}` : "Fix with AI"}
      width={760}
      height={640}
      minWidth={380}
      minHeight={360}
      bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden p-0"
    >
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3" data-testid="fix-with-ai-window">
        {phase.at === "drafting" ? (
          <div aria-live="polite" className="space-y-3">
            <p className="type-body text-muted-foreground">Drafting a fix and re-running the failed input</p>
            <RegionSkeleton shape="rows" count={6} twoLine aria-label="Drafting the fix" />
          </div>
        ) : null}

        {phase.at === "failed" ? (
          <p role="alert" className="flex items-center gap-2 type-body text-destructive-ink">
            <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden />
            {phase.error}
          </p>
        ) : null}

        {draft && !draft.can_apply ? (
          <p className="type-body text-foreground" data-testid="fix-with-ai-refusal">
            {draft.refusal ?? "You cannot change this agent."}
          </p>
        ) : null}

        {draft && draft.can_apply ? (
          <>
            {draft.rerun ? (
              <section className="space-y-1.5" data-testid="fix-with-ai-rerun">
                <div className="flex items-center gap-2">
                  <h3 className="type-label text-foreground">Re-run on the draft</h3>
                  <Badge tone={draft.rerun.fits ? "success" : "warning"}>
                    {draft.rerun.fits ? "Fits the job" : "Still does not fit"}
                  </Badge>
                  {draft.rerun.missing_keys.length ? (
                    <span className="type-meta text-muted-foreground">
                      Missing {draft.rerun.missing_keys.join(", ")}
                    </span>
                  ) : null}
                </div>
                <div className="grid min-w-0 gap-2 md:grid-cols-2">
                  <pre className="max-h-56 min-w-0 overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-muted/40 p-2 type-meta text-muted-foreground">
                    {draft.failed_output || "No output"}
                  </pre>
                  <pre className="max-h-56 min-w-0 overflow-auto whitespace-pre-wrap rounded-lg border border-primary/40 bg-card p-2 type-meta text-foreground">
                    {draft.rerun.output || draft.rerun.error || "No output"}
                  </pre>
                </div>
              </section>
            ) : null}
            <Block label="Output" before={pretty(draft.schema_before)} after={pretty(draft.schema_after)} />
            <Block label="Instructions" before={draft.system_before} after={draft.system_after} />
            <Block label="Message template" before={draft.user_before} after={draft.user_after} />
            {draft.notes.map((note) => (
              <p key={note} className="type-meta text-muted-foreground">
                {note}
              </p>
            ))}
          </>
        ) : null}

        {phase.at === "approved" ? (
          <p className="flex items-center gap-2 type-body text-foreground" data-testid="fix-with-ai-approved">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden />
            {phase.result.version_number ? `Version ${phase.result.version_number} is live` : "The fix is live"}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center justify-end gap-1.5 border-t border-border px-3 py-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="quiet" data-testid="fix-with-ai-way-out">
              Not quite
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={redraft} disabled={phase.at === "drafting" || phase.at === "approving"}>
              Draft again
            </DropdownMenuItem>
            {agentHref(draft?.agent_id) ? (
              <DropdownMenuItem onSelect={() => window.open(agentHref(draft?.agent_id) ?? "", "_blank", "noopener")}>
                Edit the agent myself
              </DropdownMenuItem>
            ) : null}
            {onUseOwn ? (
              <DropdownMenuItem
                onSelect={() => {
                  onClose();
                  onUseOwn();
                }}
              >
                Use my own
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem onSelect={onClose}>Leave it as it is</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {draft && !draft.can_apply && onUseOwn ? (
          <Button
            variant="primary"
            onClick={() => {
              onClose();
              onUseOwn();
            }}
          >
            Use my own
          </Button>
        ) : null}
        {draft && draft.can_apply && phase.at !== "approved" ? (
          <>
            <Button variant="outline" onClick={onClose} data-testid="fix-with-ai-discard">
              Discard
            </Button>
            <Button
              variant="primary"
              onClick={() => void approve(draft)}
              disabled={phase.at === "approving" || !draft.draft_agent_id}
              data-testid="fix-with-ai-approve"
            >
              {phase.at === "approving" ? "Approving" : "Approve"}
            </Button>
          </>
        ) : null}
        {phase.at === "approved" ? (
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        ) : null}
      </div>
    </WindowPanel>
  );
}
