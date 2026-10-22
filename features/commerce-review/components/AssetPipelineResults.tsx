"use client";

/**
 * AssetPipelineResults — what the pipeline currently holds for ONE asset,
 * one block per step in run order. A succeeded step renders its output
 * through the kind registry (the same component triage and drafts land on —
 * never a second renderer); a failed or still-running step says so instead
 * of vanishing. Rows are read-only here forever (THE LEARNING-TAP LAW): a
 * human corrects an asset on its own editable fields, never on an AI row.
 */

import React, { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ReadFailure } from "@ai-matrx/design-system";
import KindInstanceRender, {
  kindIsRoutable,
} from "@/features/content-ir/studio/components/KindInstanceRender";
import { PanelSection } from "@/features/product-capture/components/pipeline/panel-primitives";
import { humanizeIdentifier } from "@ai-matrx/kit/text-case";
import { readObjectKind } from "@ai-matrx/content-ir";

import { listAssetPipelineResults, type AssetPipelineResult } from "../service";
import { ConfidenceChip } from "./ConfidenceChip";

export function AssetPipelineResults({ assetId }: { assetId: string }) {
  const [results, setResults] = useState<AssetPipelineResult[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const rows = await listAssetPipelineResults(assetId);
        if (cancelled) return;
        setResults(rows);
        setError(null);
      } catch (err) {
        console.error("[commerce-review] pipeline results read failed", err);
        if (!cancelled) setError(err ?? new Error("The results read failed"));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [assetId, nonce]);

  return (
    <PanelSection title="AI pipeline">
      {error ? (
        <ReadFailure
          error={error}
          what="pipeline results"
          onRetry={() => setNonce((n) => n + 1)}
        />
      ) : results === null ? (
        <p className="text-sm text-muted-foreground">Reading…</p>
      ) : results.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No pipeline runs yet — they start when the item leaves capture.
        </p>
      ) : (
        <div className="space-y-3">
          {results.map((r) => (
            <StepResult key={r.id} result={r} />
          ))}
        </div>
      )}
    </PanelSection>
  );
}

function StepResult({ result }: { result: AssetPipelineResult }) {
  const [showReasoning, setShowReasoning] = useState(false);
  const succeeded = result.runStatus === "succeeded";
  const output =
    result.output && typeof result.output === "object" && !Array.isArray(result.output)
      ? (result.output as Record<string, unknown>)
      : null;
  const kind = (output ? readObjectKind(output) : null) ?? result.outputKind;

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">{humanizeIdentifier(result.step)}</span>
        <Badge variant={succeeded ? "outline" : "secondary"}>
          {humanizeIdentifier(result.runStatus)}
        </Badge>
        {succeeded && <ConfidenceChip confidence={result.confidence} />}
        {result.finishedAt && (
          <span className="ml-auto text-xs text-muted-foreground">
            {new Date(result.finishedAt).toLocaleString()}
          </span>
        )}
      </div>

      {succeeded && output && kind && kindIsRoutable(kind) ? (
        <div className="mt-2">
          <KindInstanceRender kind={kind} value={output} variant="bare" />
        </div>
      ) : succeeded && output ? (
        <pre className="mt-2 max-h-72 overflow-auto rounded bg-muted p-2 text-xs">
          {JSON.stringify(output, null, 2)}
        </pre>
      ) : !succeeded ? (
        <p className="mt-2 text-sm text-muted-foreground">
          This step did not finish. Reprocess the item to run it again.
        </p>
      ) : null}

      {result.reasoning && (
        <div className="mt-2">
          <Button
            variant="quiet"
            icon={<ChevronDown className={showReasoning ? "rotate-180" : undefined} />}
            onClick={() => setShowReasoning((v) => !v)}
            aria-expanded={showReasoning}
          >
            Reasoning
          </Button>
          {showReasoning && (
            <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
              {result.reasoning}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
