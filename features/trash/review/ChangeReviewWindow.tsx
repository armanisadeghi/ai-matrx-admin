"use client";

/**
 * ChangeReviewWindow — THE review window for archiving, restoring or moving a record with everything related
 * to it (move-and-archive plan § 9). The database computes the review (`platform.change_records` through
 * `@ai-matrx/data/db`), `ReviewChanges` from the design system renders it, and every named item is an
 * `EntityRef` (open, new tab, peek). A move with no target yet asks for the organization first.
 *
 * Outcomes: `changed` re-shows the review ("This changed while you were looking"), `needs_answers` shows the
 * new questions, `cancelled` closes with nothing changed, `done` hands the plan (the undo key) to the host.
 */

import { useEffect, useState } from "react";
import { ReviewChanges, type ChangeAnswers, type ChangeItemRef } from "@ai-matrx/design-system";
import { Select } from "@ai-matrx/design-system/controls";
import {
  commitChange,
  runChangeToEnd,
  previewChange,
  type ChangeDone,
  type ChangePreviewWire,
  type ChangeTarget,
} from "@ai-matrx/data/db";
import { WindowPanel } from "@/features/window-panels/WindowPanel";
import { EntityRef } from "@/components/official/entity-ref/EntityRef";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { OrganizationChooser } from "@/features/organizations/components/OrganizationChooser";
import { supabase } from "@/utils/supabase/client";
import { toast } from "@/lib/toast";

export interface ChangeReviewWindowProps {
  /** What to change. A move without `organizationId` asks for the organization first. */
  target: ChangeTarget;
  /** The record's own organization (a move never offers it as the destination). */
  currentOrganizationId?: string | null;
  /** Window title, e.g. "Archive Acme" or "Move Acme". */
  title: string;
  onClose: () => void;
  onDone: (result: ChangeDone) => void;
}

function itemDoor(item: ChangeItemRef) {
  if (!item.type) return null;
  return <EntityRef token={item.type} id={item.id} name={item.title ?? null} />;
}

export function ChangeReviewWindow({ target, currentOrganizationId, title, onClose, onDone }: ChangeReviewWindowProps) {
  const [organizationId, setOrganizationId] = useState<string | null>(target.organizationId ?? null);
  const [busy, setBusy] = useState(false);
  const needsTarget = target.verb === "move" && !organizationId;
  const fullTarget: ChangeTarget = { ...target, ...(organizationId ? { organizationId } : {}) };
  const ids = (target.ids ?? []).join(",");
  const { verb, entityType, planId } = target;
  // Everything the window shows belongs to ONE request: what is being changed and where to. A state written
  // for another key is simply not shown, so a new destination never needs a reset inside an effect.
  const requestKey = needsTarget ? null : [verb, entityType ?? "", ids, planId ?? "", organizationId ?? ""].join("|");
  const [loaded, setLoaded] = useState<{ key: string; preview: ChangePreviewWire | null; error: Error | null } | null>(null);
  const [answerState, setAnswerState] = useState<{ key: string | null; answers: ChangeAnswers }>({ key: null, answers: {} });
  const preview = loaded && loaded.key === requestKey ? loaded.preview : null;
  const error = loaded && loaded.key === requestKey ? loaded.error : null;
  const answers = answerState.key === requestKey ? answerState.answers : {};
  const setPreview = (p: ChangePreviewWire) => requestKey && setLoaded({ key: requestKey, preview: p, error: null });
  const setError = (e: Error) => requestKey && setLoaded((prev) => ({ key: requestKey, preview: prev?.key === requestKey ? prev.preview : null, error: e }));
  const setAnswers = (update: (prev: ChangeAnswers) => ChangeAnswers) =>
    setAnswerState((prev) => ({ key: requestKey, answers: update(prev.key === requestKey ? prev.answers : {}) }));

  // The preview is keyed by what is being changed and where to (primitives, so a re-render never re-asks).
  useEffect(() => {
    if (!requestKey) return;
    let live = true;
    const keyed: ChangeTarget = {
      verb,
      ids: ids ? ids.split(",") : [],
      ...(entityType ? { entityType } : {}),
      ...(planId ? { planId } : {}),
      ...(organizationId ? { organizationId } : {}),
    };
    previewChange(supabase, keyed)
      .then((p) => {
        if (live) setLoaded({ key: requestKey, preview: p, error: null });
      })
      .catch((e: unknown) => {
        if (live) setLoaded({ key: requestKey, preview: null, error: e instanceof Error ? e : new Error(String(e)) });
      });
    return () => {
      live = false;
    };
  }, [requestKey, verb, entityType, ids, planId, organizationId]);

  const commit = async () => {
    if (!preview) return;
    setBusy(true);
    try {
      const result = await commitChange(supabase, fullTarget, answers, preview.fingerprint);
      if (result.status === "done") {
        onDone(result);
        return;
      }
      if (result.status === "cancelled") {
        toast.info(result.message);
        onClose();
        return;
      }
      if (result.status === "running") {
        // a large move: step 1 is done; the rest moves in batches from this tab (held = the reason, shown)
        const progress = await runChangeToEnd(supabase, result.plan_id);
        if (progress.state === "done") {
          onDone({ status: "done", verb: result.verb, plan_id: result.plan_id, rows: result.rows + progress.rows_done,
                   ...(result.organization ? { organization: result.organization } : {}) });
        } else {
          setError(new Error(progress.last_error ?? "The move stopped part way. Retry it from its review."));
        }
        return;
      }
      setPreview(result);
      toast.info(result.status === "changed" ? "This changed while you were looking. Review it again." : (result.message ?? "Answer the new questions."));
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setBusy(false);
    }
  };


  return (
    <WindowPanel
      id={`change-review-${target.verb}-${ids || target.planId}`}
      title={title}
      onClose={onClose}
      width={520}
      height={560}
      minWidth={360}
      minHeight={300}
      bodyClassName="flex min-h-0 flex-1 flex-col overflow-y-auto p-3"
    >
      {target.verb === "move" ? (
        <div className="mb-3 flex items-center gap-2">
          <span className="shrink-0 text-sm text-muted-foreground">Move to</span>
          <OrganizationChooser
            value={organizationId}
            excludeId={currentOrganizationId}
            placeholder="Choose an organization"
            onChange={(org) => setOrganizationId(org.id)}
          />
        </div>
      ) : null}
      {error ? (
        <div role="alert" className="flex items-start gap-2 text-sm text-destructive">
          <span className="min-w-0 flex-1">{error.message}</span>
          <ErrorAlchemyMenu error={error} />
        </div>
      ) : null}
      {needsTarget ? null : !preview && !error ? (
        <div className="flex flex-col gap-2" aria-busy="true">
          <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
          <div className="h-16 animate-pulse rounded bg-muted" />
          <div className="h-16 animate-pulse rounded bg-muted" />
        </div>
      ) : preview ? (
        <ReviewChanges
          preview={preview}
          answers={answers}
          onAnswer={(id, value) =>
            setAnswers((prev) => {
              const next = { ...prev };
              if (value === null) delete next[id];
              else next[id] = value;
              return next;
            })
          }
          renderItem={itemDoor}
          onOpenItem={() => toast.info("This record has no page yet.")}
          onCommit={() => void commit()}
          onCancel={onClose}
          busy={busy}
        />
      ) : null}
    </WindowPanel>
  );
}

