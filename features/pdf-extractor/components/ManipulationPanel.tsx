"use client";

/**
 * ManipulationPanel — placeholder for PDF manipulation operations.
 *
 * Each entry below maps to an endpoint that the Python team has already
 * shipped under `/utilities/pdf/*`. The frontend wiring is intentionally
 * deferred to a follow-up because each operation needs:
 *
 *   - A `MediaRefPicker` to choose the source (current doc by default).
 *   - A page picker UI (thumbnails + ranges) for extract / crop / rotate / delete.
 *   - A draggable bbox overlay for crop.
 *   - A multi-source picker for merge.
 *   - A boundary picker for split.
 *   - A quality slider + "in-place vs derivative" radio for compress.
 *   - A `cld_files` upload step for the result blob.
 *   - A `cld_file_lineage` row insert.
 *
 * Today this panel just lists the operations + the matching endpoint, so
 * users can see what's coming and we have the right cards / disabled-state
 * UI ready to wire up.
 */

import React from "react";
import { ENDPOINTS } from "@/lib/api/endpoints";
import {
  Crop,
  RotateCcw,
  Trash2,
  Combine,
  Scissors,
  FileText,
  ArrowDownToLine,
  Wand2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PdfDocument } from "../hooks/usePdfExtractor";

interface ManipulationPanelProps {
  doc: PdfDocument;
  /** Wired today — fires `/utilities/pdf/full-pipeline`. */
  onRunPipeline?: () => void | Promise<unknown>;
  /** True while the pipeline is running for this doc. */
  running?: boolean;
}

interface OperationSpec {
  key: string;
  label: string;
  description: string;
  endpoint: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Marked false until the modal + lineage write are wired up. */
  ready: boolean;
}

const OPERATIONS: OperationSpec[] = [
  {
    key: "extract-pages",
    label: "Extract pages",
    description:
      "Pull selected pages into a new PDF. Original stays untouched; result becomes a derivative.",
    endpoint: ENDPOINTS.pdf.extractPages,
    icon: ArrowDownToLine,
    ready: false,
  },
  {
    key: "crop-pages",
    label: "Crop pages",
    description:
      "Trim margins. Apply to all pages or a selection. Configurable per-page bounding box.",
    endpoint: ENDPOINTS.pdf.cropPages,
    icon: Crop,
    ready: false,
  },
  {
    key: "rotate-pages",
    label: "Rotate pages",
    description: "90 / 180 / 270 degrees. Per-page or global.",
    endpoint: ENDPOINTS.pdf.rotatePages,
    icon: RotateCcw,
    ready: false,
  },
  {
    key: "delete-pages",
    label: "Delete pages",
    description: "Drop selected pages from the document (creates a derivative).",
    endpoint: ENDPOINTS.pdf.deletePages,
    icon: Trash2,
    ready: false,
  },
  {
    key: "merge",
    label: "Merge PDFs",
    description: "Combine this document with one or more others into a new PDF.",
    endpoint: ENDPOINTS.pdf.merge,
    icon: Combine,
    ready: false,
  },
  {
    key: "split",
    label: "Split PDF",
    description: "Break into multiple PDFs by part count or pages-per-part.",
    endpoint: ENDPOINTS.pdf.split,
    icon: Scissors,
    ready: false,
  },
  {
    key: "compress",
    label: "Compress",
    description:
      "Reduce file size. In-place (writes a version row) or derivative (new file).",
    endpoint: ENDPOINTS.pdf.compress,
    icon: FileText,
    ready: false,
  },
  {
    key: "process-with-ai",
    label: "Run full pipeline",
    description:
      "Extract → per-page persist → cleanup → chunk → AI. Writes a new processed_documents row with parent_processed_id pointing to this one.",
    endpoint: ENDPOINTS.pdf.fullPipeline,
    icon: Wand2,
    ready: true, // wired below via onRunPipeline
  },
];

export function ManipulationPanel({
  doc,
  onRunPipeline,
  running,
}: ManipulationPanelProps) {
  return (
    <div className="p-3 space-y-2">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">
          Manipulate · {doc.name}
        </span>
        <span className="ml-auto text-[10px] text-muted-foreground">
          Pipeline wired · derivative ops next
        </span>
      </div>

      <div className="space-y-1.5">
        {OPERATIONS.map((op) => {
          const Icon = op.icon;
          const isPipeline = op.key === "process-with-ai";
          const wired = op.ready && (!isPipeline || !!onRunPipeline);
          const onClick = isPipeline ? onRunPipeline : undefined;
          return (
            <div
              key={op.key}
              className="flex items-start gap-2 px-2.5 py-2 bg-card border border-border rounded-md"
            >
              <div className="shrink-0 w-6 h-6 rounded bg-primary/10 flex items-center justify-center mt-0.5">
                <Icon className="w-3 h-3 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium leading-tight">{op.label}</p>
                <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">
                  {op.description}
                </p>
                <p className="text-[9px] text-muted-foreground/70 mt-0.5 font-mono">
                  POST <code>{op.endpoint}</code>
                </p>
              </div>
              <Button
                size="sm"
                variant={wired ? "default" : "outline"}
                className="h-7 text-[10px] px-2 shrink-0"
                disabled={!wired || running}
                title={
                  wired
                    ? `Run ${op.label}`
                    : "Backend ready — UI wiring pending. Tracked in the rebuild plan, Phase 5."
                }
                onClick={onClick ? () => void onClick() : undefined}
              >
                {running && isPipeline ? (
                  <span className="inline-flex items-center gap-1">
                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                    Running…
                  </span>
                ) : wired ? (
                  "Run"
                ) : (
                  "Soon"
                )}
              </Button>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-muted-foreground/70 pt-1 leading-snug">
        Each operation will open a modal that picks a source via the unified
        <code className="mx-1 px-1 bg-card border border-border rounded text-[10px]">
          MediaRef
        </code>
        contract, sends to the matching Python endpoint, uploads the resulting
        blob to Cloud Files, and writes a <code>cld_file_lineage</code> row so
        the derivative shows up under the parent in the lineage tree.
      </p>
    </div>
  );
}
