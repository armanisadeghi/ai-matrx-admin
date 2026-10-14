"use client";

/**
 * "From agent runs" — every real emission of this kind the viewer can read,
 * one click from becoming an example. Saving keeps where it came from
 * (`source = 'captured'`, `source_ref` = message/conversation/agent), so a
 * component author sees varied real data instead of one placeholder sample.
 *
 * A run that does not match the schema can still be opened in the editor,
 * fixed, and saved — it is never hidden.
 */

import { useState } from "react";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";
import { CircleAlert, ExternalLink, Loader2, PencilLine, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { toast } from "@/lib/toast";
import { supabase } from "@/utils/supabase/client";
import { conversationHref } from "@/features/hindsight/subject-doors";
import {
  candidateSourceRef,
  useKindExampleCandidates,
  type KindExampleCandidate,
} from "@/features/content-ir/studio/kind-example-candidates";
import {
  createOwnedShapeExample,
  type ShapeAuthMode,
} from "@/features/content-ir/studio/shape-authoring-service";

interface KindExampleCandidatesProps {
  kindDefinitionId: string;
  authMode: ShapeAuthMode;
  /** Bumped by the parent whenever the saved examples change. */
  examplesRevision: number;
  onSaved: () => void;
  onOpenInEditor: (candidate: KindExampleCandidate) => void;
}

export function candidateLabel(candidate: KindExampleCandidate): string {
  return candidate.conversationTitle?.trim() || "Agent run";
}

export function candidateDescription(candidate: KindExampleCandidate): string {
  return `From an agent run on ${new Date(candidate.emittedAt).toLocaleDateString()}`;
}

function fieldCount(data: unknown): number {
  return data && typeof data === "object" && !Array.isArray(data)
    ? Object.keys(data).length
    : 0;
}

export default function KindExampleCandidates({
  kindDefinitionId,
  authMode,
  examplesRevision,
  onSaved,
  onOpenInEditor,
}: KindExampleCandidatesProps) {
  const candidates = useKindExampleCandidates(kindDefinitionId, examplesRevision);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function save(candidate: KindExampleCandidate): Promise<void> {
    setSavingId(candidate.messageId);
    try {
      const result = await createOwnedShapeExample(
        supabase,
        {
          definitionId: kindDefinitionId,
          data: candidate.data,
          label: candidateLabel(candidate),
          description: candidateDescription(candidate),
          source: "captured",
          sourceRef: candidateSourceRef(candidate),
        },
        authMode,
      );
      if (result.validationStatus !== "passed") {
        throw new Error(`The database marked it "${result.validationStatus}".`);
      }
      toast.success("Saved as an example");
      onSaved();
    } catch (error) {
      toast.error("Failed to save the example", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-medium text-muted-foreground">From agent runs</h4>

      {candidates.status === "loading" && (
        <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Reading agent runs
        </div>
      )}
      {candidates.status === "error" && (
        <div className="flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-700 dark:text-red-300">
          <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {candidates.message}
          <ErrorAlchemyMenu error={candidates.message} />
        </div>
      )}
      {candidates.status === "ready" && candidates.rows.length === 0 && (
        <p className="rounded-md border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
          No agent run has produced this shape yet.
        </p>
      )}
      {candidates.status === "ready" && candidates.rows.length > 0 && (
        <div className="divide-y divide-border rounded-md border border-border">
          {candidates.rows.map((candidate) => {
            const matches = candidate.validation === "passed";
            const key = `${candidate.messageId}:${JSON.stringify(candidate.data).length}:${candidate.emittedAt}`;
            return (
              <div key={key} className="flex items-center gap-3 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <OutboundLink
                      href={conversationHref(candidate.conversationId, "product")}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-w-0 items-center gap-1 truncate text-sm font-medium text-foreground hover:underline"
                    >
                      <span className="truncate">{candidateLabel(candidate)}</span>
                      <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                    </OutboundLink>
                    {candidate.alreadyExample ? (
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                        saved
                      </span>
                    ) : matches ? (
                      <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                        matches schema
                      </span>
                    ) : (
                      <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                        does not match
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {new Date(candidate.emittedAt).toLocaleString()} ·{" "}
                    {fieldCount(candidate.data)} fields
                  </p>
                </div>
                <Button
                  icon={<PencilLine />}
                  type="button"
                  variant="quiet"
                  onClick={() => onOpenInEditor(candidate)}
                >
                  {matches ? "Open" : "Open to fix"}
                </Button>
                {matches && !candidate.alreadyExample && (
                  <Button
                    icon={
                      savingId === candidate.messageId ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <Plus />
                      )
                    }
                    type="button"
                    variant="outline"
                    disabled={savingId !== null}
                    onClick={() => void save(candidate)}
                  >
                    Save as example
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
