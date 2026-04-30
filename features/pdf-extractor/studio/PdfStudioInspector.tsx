"use client";

/**
 * PdfStudioInspector — right rail of the desktop studio.
 *
 * Composes the existing per-document panels (lineage, AI actions, data
 * stores, manipulation, AI clean) into a vertically scrolling inspector
 * with a sticky section nav. Designed for the "manage one doc deeply"
 * mode — left rail handles "switch between docs", center handles "read
 * a doc", inspector handles "do something with a doc".
 */

import React, { useState } from "react";
import {
  Sparkles,
  GitBranch,
  Wand2,
  Database,
  Wrench,
  Bot,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PdfDocument } from "../hooks/usePdfExtractor";
import { LineageTreeView } from "../components/LineageTreeView";
import { ManipulationPanel } from "../components/ManipulationPanel";
import { DataStoreBindPanel } from "@/features/data-stores/components/DataStoreBindPanel";

type SectionKey = "ai" | "stores" | "manipulate" | "lineage";

const SECTIONS: {
  key: SectionKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { key: "ai", label: "AI Actions", icon: Wand2 },
  { key: "stores", label: "Data Stores", icon: Database },
  { key: "manipulate", label: "Manipulate", icon: Wrench },
  { key: "lineage", label: "Lineage", icon: GitBranch },
];

interface PdfStudioInspectorProps {
  doc: PdfDocument;
  onRunShortcut: (shortcutId: string) => void | Promise<void>;
  onRunPipeline: () => void | Promise<unknown>;
  pipelineRunning: boolean;
}

export function PdfStudioInspector({
  doc,
  onRunShortcut,
  onRunPipeline,
  pipelineRunning,
}: PdfStudioInspectorProps) {
  const [section, setSection] = useState<SectionKey>("ai");

  return (
    <aside className="flex flex-col h-full min-h-0 border-l border-border bg-card/30">
      {/* Sticky section nav */}
      <div className="shrink-0 border-b border-border">
        <div className="flex items-center gap-0.5 px-2 py-1.5">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            const active = section === s.key;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setSection(s.key)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1 h-7 rounded-md px-1.5 text-[10px] font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
                title={s.label}
              >
                <Icon className="w-3 h-3" />
                <span className="hidden xl:inline">{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {section === "ai" && <AiActionsPanel doc={doc} onRunShortcut={onRunShortcut} />}
        {section === "stores" && (
          <DataStoreBindPanel
            processedDocumentId={doc.id}
            documentName={doc.name}
          />
        )}
        {section === "manipulate" && (
          <ManipulationPanel
            doc={doc}
            onRunPipeline={onRunPipeline}
            running={pipelineRunning}
          />
        )}
        {section === "lineage" && <LineageTreeView doc={doc} />}
      </div>
    </aside>
  );
}

// ── AI Actions panel (inspector-flavoured, shortcut registry) ─────────────

import { useShortcutTrigger } from "@/features/agents/hooks/useShortcutTrigger";
import { useToastManager } from "@/hooks/useToastManager";
import { Button } from "@/components/ui/button";

interface PdfShortcutEntry {
  id: string;
  label: string;
  description: string;
}

const PDF_SHORTCUTS: PdfShortcutEntry[] = [
  {
    id: "dba439a3-a495-4e57-893a-2176cf14ab8d",
    label: "Analyze Document",
    description:
      "Floating-window agent — uses cleaned content when available, otherwise raw.",
  },
];

function AiActionsPanel({
  doc,
  onRunShortcut,
}: {
  doc: PdfDocument;
  onRunShortcut: (shortcutId: string) => void | Promise<void>;
}) {
  const trigger = useShortcutTrigger();
  const toast = useToastManager("pdf-extractor");
  const docText = doc.cleanContent ?? doc.content ?? "";
  const usingClean = !!doc.cleanContent;
  const hasContent = !!docText;

  const handleRun = async (shortcutId: string) => {
    if (!hasContent) {
      toast.error("Nothing to send to the agent yet");
      return;
    }
    try {
      await trigger(shortcutId, {
        scope: { selection: docText },
        sourceFeature: "programmatic",
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not run agent");
    }
  };

  return (
    <div className="p-3 space-y-2">
      <div className="flex items-center gap-1.5 mb-1">
        <Sparkles className="w-3.5 h-3.5 text-primary" />
        <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">
          Run an Agent
        </span>
        <span className="ml-auto text-[10px] text-muted-foreground">
          {usingClean ? "AI-cleaned" : "Raw"} · {docText.length.toLocaleString()} chars
        </span>
      </div>

      {!hasContent && (
        <p className="text-xs text-muted-foreground py-4 text-center">
          No extracted content available yet — run the pipeline first.
        </p>
      )}

      {hasContent && (
        <div className="space-y-1.5">
          {PDF_SHORTCUTS.map((s) => (
            <div
              key={s.id}
              className="flex items-start gap-2 px-2.5 py-2 bg-card border border-border rounded-md"
            >
              <div className="shrink-0 w-6 h-6 rounded bg-primary/10 flex items-center justify-center mt-0.5">
                <Bot className="w-3 h-3 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium leading-tight">{s.label}</p>
                <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">
                  {s.description}
                </p>
              </div>
              <Button
                size="sm"
                className="h-7 text-[10px] px-2 shrink-0"
                onClick={() => void handleRun(s.id)}
              >
                Run
              </Button>
            </div>
          ))}
        </div>
      )}

      <p className="text-[10px] text-muted-foreground/70 pt-1 leading-snug">
        Each agent receives the document text as <code>selection</code>. Bind
        the document to a Data Store in the next tab to scope retrieval.
      </p>
    </div>
  );
}
