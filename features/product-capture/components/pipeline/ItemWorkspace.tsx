"use client";

/**
 * ItemWorkspace — the right-hand detail workspace of the pipeline: item
 * header (featured strip, code, notes, stage actions) + the stage panels.
 * Panels are cumulative — the current stage's panel leads, earlier artifacts
 * stay reviewable below — so the shared page structure holds while each
 * stage gets its tailored view.
 */

import React from "react";
import Link from "next/link";
import { Camera, ExternalLink, Loader2 } from "lucide-react";

import { AccessGate } from "@ai-matrx/sharing/access/react";
import { Button } from "@/components/ui/button";
import KindInstanceRender from "@/features/content-ir/studio/components/KindInstanceRender";

import type {
  AnalysisResult,
  GradingResult,
  ListingDraft,
  PipelineStage,
  ResearchResult,
} from "../../pipeline-types";
import {
  INSTANT_ANALYSIS_KIND,
  PIPELINE_STAGES,
  STAGE_LABELS,
} from "../../pipeline-types";
import { usePipelineItem } from "./usePipelineItem";
import { AnalysisPanel } from "./AnalysisPanel";
import { ResearchPanel } from "./ResearchPanel";
import { QuestionsPanel } from "./QuestionsPanel";
import { GradingPanel } from "./GradingPanel";
import { ListingPanel } from "./ListingPanel";
import { ProductsPanel } from "./ProductsPanel";
import { FeaturedImageStrip } from "./FeaturedImageStrip";
import {
  CommitField,
  CommitTextArea,
  PanelSection,
  SelectField,
} from "./panel-primitives";

/** The one primary forward action per stage (agents own the rest). */
const PRIMARY_ACTION: Partial<
  Record<PipelineStage, { label: string; to: PipelineStage }>
> = {
  analysis: { label: "Send to research", to: "research" },
  review: { label: "Skip to finalize", to: "finalize" },
  finalize: { label: "Generate listing", to: "listing" },
};

export function ItemWorkspace({
  itemId,
  onItemChanged,
  onMovedToStage,
}: {
  itemId: string;
  /** Stage/data changed — the host refreshes its stage lists/counts. */
  onItemChanged: () => void;
  /**
   * The item moved to another stage — the host follows it there instead of
   * leaving the pane open over an empty "No items at this stage" list.
   */
  onMovedToStage?: (stage: PipelineStage) => void;
}) {
  const ws = usePipelineItem(itemId);
  const { item } = ws;

  if (ws.notFound) {
    // A zero-row read is denied / deleted / never-existed / signed-out, and
    // this pane cannot tell them apart — it used to assert the second one.
    // The gate asks the platform and says the true one, with a way forward.
    return (
      <AccessGate
        token="product_capture_item"
        id={itemId}
        onRetry={() => void ws.reload()}
        fallbackHref="/tools/product-capture/all"
        fallbackLabel="All capture items"
      />
    );
  }
  if (!item) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const stageIdx = PIPELINE_STAGES.indexOf(item.stage);
  const analysis = (ws.payloads.analysis?.data ?? {}) as Partial<AnalysisResult>;
  const research = (ws.payloads.research?.data ?? {}) as Partial<ResearchResult>;
  const grading = (ws.payloads.grading?.data ?? {}) as Partial<GradingResult>;
  const listing = (ws.payloads.listing?.data ?? {}) as Partial<ListingDraft>;
  // The INSTANT lane's record. It is the raw registered kind object, so it
  // renders through the kind registry exactly as it did while it streamed on
  // the capture surface — never re-shaped into the pipeline's AnalysisResult.
  const instantRecord = ws.payloads.instant_analysis?.data as
    | Record<string, unknown>
    | undefined;
  const instantAnalysis =
    instantRecord && Object.keys(instantRecord).length > 0
      ? instantRecord
      : null;

  const primary = PRIMARY_ACTION[item.stage];

  const move = async (to: PipelineStage) => {
    await ws.moveToStage(to);
    onItemChanged();
    onMovedToStage?.(to);
  };

  const approveListing = async () => {
    ws.editPayload("listing", {
      approved: true,
      approvedAt: new Date().toISOString(),
    });
    await move("listed");
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <PanelSection
        title={item.code ?? "No product number"}
        badge={
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            {STAGE_LABELS[item.stage]}
          </span>
        }
        actions={
          <div className="flex flex-wrap items-center gap-1.5">
            <Button asChild variant="outline">
              <Link href={`/tools/product-capture?item=${item.id}`}>
                <Camera className="mr-1 h-3.5 w-3.5" />
                Capture
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/tools/product-capture/item/${item.id}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1 h-3.5 w-3.5" />
                Images &amp; files
              </Link>
            </Button>
            {primary && (
              <Button
                variant="primary"
                onClick={() => void move(primary.to)}
              >
                {primary.label}
              </Button>
            )}
            <SelectField
              ariaLabel="Move to stage"
              value={item.stage}
              options={PIPELINE_STAGES.map((s) => ({
                value: s,
                label: `Move to ${STAGE_LABELS[s]}`,
              }))}
              onChange={(v) => void move(v as PipelineStage)}
              className="w-44"
            />
          </div>
        }
      >
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-3">
            <CommitField
              label="Product # / SKU"
              value={item.code ?? ""}
              placeholder="Not set"
              onCommit={(v) => void ws.saveCode(v)}
            />
            <CommitTextArea
              label="Notes"
              value={item.notes}
              onCommit={(v) => void ws.saveNotes(v)}
              rows={3}
            />
          </div>
          <FeaturedImageStrip
            item={item}
            files={ws.files}
            onSetFeatured={ws.setFeatured}
            onFileAdded={() => void ws.reload()}
          />
        </div>
        {ws.saving && (
          <p className="text-[11px] text-muted-foreground">Saving…</p>
        )}
      </PanelSection>

      {/* Stage panels — current stage first, earlier artifacts below. */}
      {/* The instant lane analyzed this item from the capture surface — its
          record is the item's intake truth, and without this panel it had no
          home outside the sheet it streamed into. */}
      {instantAnalysis && (
        <PanelSection title="Instant analysis">
          <KindInstanceRender
            kind={
              typeof instantAnalysis.__kind === "string"
                ? instantAnalysis.__kind
                : INSTANT_ANALYSIS_KIND
            }
            value={instantAnalysis}
            variant="bare"
          />
        </PanelSection>
      )}

      {/* The SERVER lane's products — one per product the analyzer declared,
          each with its own research run. Leads the stage panels: it is what
          the pipeline actually found. */}
      <ProductsPanel products={ws.products} />

      {item.stage === "intake" && !instantAnalysis && ws.products.length === 0 && (
        <PanelSection title="Awaiting analysis">
          <p className="text-sm text-muted-foreground">
            Analysis lands here when capture closes.
          </p>
        </PanelSection>
      )}

      {(item.stage === "listing" || item.stage === "listed") && (
        <ListingPanel
          item={item}
          listing={listing}
          onEdit={(patch) => ws.editPayload("listing", patch)}
          onApprove={approveListing}
        />
      )}

      {stageIdx >= PIPELINE_STAGES.indexOf("finalize") && (
        <GradingPanel
          grading={grading}
          onEdit={(patch) => ws.editPayload("grading", patch)}
          onGenerateListing={() => move("listing")}
        />
      )}

      {stageIdx >= PIPELINE_STAGES.indexOf("analysis") && (
        <QuestionsPanel
          questions={ws.questions}
          onAnswer={ws.answer}
          onDefer={ws.defer}
          onReopen={ws.reopen}
          onAdd={(prompt) => ws.addQuestion(prompt)}
          onResubmit={() => move("research")}
          canResubmit={item.stage === "review"}
        />
      )}

      {stageIdx >= PIPELINE_STAGES.indexOf("research") && (
        <ResearchPanel
          research={research}
          onEdit={(patch) => ws.editPayload("research", patch)}
          onMakeQuestion={(prompt, context) => ws.addQuestion(prompt, context)}
        />
      )}

      {stageIdx >= PIPELINE_STAGES.indexOf("analysis") && (
        <AnalysisPanel
          analysis={analysis}
          files={ws.files}
          onEdit={(patch) => ws.editPayload("analysis", patch)}
          onSplit={async (groups) => {
            await ws.split(groups);
            onItemChanged();
          }}
        />
      )}
    </div>
  );
}
