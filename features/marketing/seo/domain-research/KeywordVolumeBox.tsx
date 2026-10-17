"use client";

// features/marketing/seo/domain-research/KeywordVolumeBox.tsx — "How often do people search these?" on the
// Keywords tab: the catalog's keyword Tool as ONE box and a button, generated from the Tool's own
// declaration (`SimpleBoxForm`), with the price before the press and the cost after, and the rows saving
// to a table through the same result bar as every other Tool. The site's own top keywords are one press away.

import { useState } from "react";
import { ListPlus } from "lucide-react";
import { SimpleBoxForm } from "@ai-matrx/chat/mandates/invoke/SimpleBoxForm";
import { ToolActionApprovalDialog } from "@ai-matrx/chat/action-requests/hooks/useToolAction";
import type { ScreenRunApproval } from "@ai-matrx/chat/action-requests/screen-run";
import { Button } from "@ai-matrx/design-system/controls";
import { ReadFailure } from "@ai-matrx/design-system";
import { formatPoints } from "@ai-matrx/kit/format";
import { isCallRunning, type CatalogToolHit } from "@ai-matrx/agents/tools";

import { ToolResult } from "@/features/data-sources/library/tools/ToolResult";
import { useToolCall } from "@/features/data-sources/library/tools/useToolCall";
import { useToolRunForm } from "@/features/data-sources/library/tools/useToolRunForm";

import { withLists } from "./seoTools";

export function KeywordVolumeBox({ hit, seeds }: { hit: CatalogToolHit; seeds: readonly string[] }) {
  const form = useToolRunForm(hit.tool_id);
  const call = useToolCall(hit.tool_id);
  const [values, setValues] = useState<Record<string, unknown>>({});

  const declared = form.data?.schema.inputs ?? [];
  const merged: Record<string, unknown> = {};
  for (const input of declared) merged[input.name] = values[input.name] ?? input.default ?? "";
  const listName = declared.find((i) => i.jsonSchema.type === "array")?.name ?? "keywords";
  const running = call.view != null && isCallRunning(call.view.status);
  const approval = call.view?.status === "needs_approval" ? (call.view.approval as ScreenRunApproval | null) : null;

  const send = (overrides: Record<string, unknown> = {}) => void call.run(withLists(declared, { ...merged, ...overrides }));

  return (
    <section aria-label="Check search volume" className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4" data-keyword-volume="">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-semibold text-foreground">How often people search</h2>
        {hit.price_hint_points != null ? (
          <span className="text-xs text-muted-foreground">About {formatPoints(hit.price_hint_points)}</span>
        ) : null}
        {seeds.length > 0 ? (
          <Button
            variant="quiet"
            className="ml-auto"
            icon={<ListPlus className="h-4 w-4" />}
            onClick={() => setValues((prev) => ({ ...prev, [listName]: seeds.join("\n") }))}
            title="Fill the box with this site's top keywords"
          >
            Use this site's top {seeds.length}
          </Button>
        ) : null}
      </div>
      {form.isLoading ? (
        <div className="h-24 animate-pulse rounded-xl bg-muted" />
      ) : form.error || !form.data ? (
        <ReadFailure error={form.error} what="the keyword form" onRetry={() => void form.refetch()} />
      ) : (
        <SimpleBoxForm
          inputs={declared}
          values={merged}
          onChange={(name, value) => setValues((prev) => ({ ...prev, [name]: value }))}
          onSubmit={send}
          submitting={running}
          hints={form.data.schema.hints}
          size="standard"
        />
      )}
      {call.view || call.clientError ? (
        <ToolResult view={call.view} clientError={call.clientError} onRunAgain={() => send()} onCancel={call.stop} />
      ) : null}
      {approval ? (
        <ToolActionApprovalDialog
          approval={approval}
          onSettled={(answer) => {
            if (answer.spendApprovalId) void call.run(withLists(declared, merged), {}, answer.spendApprovalId);
            else call.clear();
          }}
        />
      ) : null}
    </section>
  );
}
