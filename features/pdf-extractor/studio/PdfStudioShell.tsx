"use client";

/**
 * PdfStudioShell — desktop layout root.
 *
 *   ┌──────┬──────────────────────────────────────────────┬──────────────┐
 *   │      │ Toolbar (sticky)                             │              │
 *   │ Side ├──────────────┬──────────────┬────────────────┤  Inspector   │
 *   │ bar  │ Source PDF   │ Raw text     │ AI-cleaned     │              │
 *   │      │              │              │                │              │
 *   │      │              │ synced       │ synced         │              │
 *   └──────┴──────────────┴──────────────┴────────────────┴──────────────┘
 *
 * Built for project managers handling tens of thousands of pages:
 *   - Persistent doc list with search / filter / sort.
 *   - Three reading panes that scroll together.
 *   - Find-in-document with highlighting.
 *   - Keyboard shortcuts: j/k page nav, [/] toggle panes, / focus search,
 *     Cmd+F find, Esc to close find.
 *   - Inspector tabs for AI Actions, Data Stores, Manipulate, Lineage.
 *
 * State that lives here (and only here):
 *   - active doc (resolved from id; lazy-fetches via the existing hook)
 *   - active page (for sync) + pendingScrollPage (for programmatic jumps)
 *   - find query
 *   - visible-panes set (each pane togglable)
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { usePdfExtractor, type PdfDocument } from "../hooks/usePdfExtractor";
import { useProcessedDocumentPages } from "../hooks/useProcessedDocumentPages";
import { usePdfStudioDocs } from "./hooks/usePdfStudioDocs";
import { PdfStudioSidebar } from "./PdfStudioSidebar";
import { PdfStudioToolbar } from "./PdfStudioToolbar";
import { PdfStudioReader, type PaneKey } from "./PdfStudioReader";
import { PdfStudioInspector } from "./PdfStudioInspector";
import { PdfStudioUpload } from "./PdfStudioUpload";
import { PdfStudioUploadDrawer } from "./PdfStudioUploadDrawer";
import { useShortcutTrigger } from "@/features/agents/hooks/useShortcutTrigger";
import { useToastManager } from "@/hooks/useToastManager";
import { useRouter } from "next/navigation";

interface PdfStudioShellProps {
  initialDocumentId?: string;
}

const PANE_ORDER: PaneKey[] = ["pdf", "raw", "clean"];

export function PdfStudioShell({ initialDocumentId }: PdfStudioShellProps) {
  const router = useRouter();
  const docsState = usePdfStudioDocs();
  const extractor = usePdfExtractor();
  const triggerShortcut = useShortcutTrigger();
  const toast = useToastManager("pdf-extractor");

  const [activeDoc, setActiveDoc] = useState<PdfDocument | null>(null);
  const [activePage, setActivePage] = useState<number | null>(null);
  const [pendingScrollPage, setPendingScrollPage] = useState<number | null>(
    null,
  );
  const [findQuery, setFindQuery] = useState("");
  const [findOpen, setFindOpen] = useState(false);
  const [visiblePanes, setVisiblePanes] = useState<Set<PaneKey>>(
    () => new Set<PaneKey>(["pdf", "raw", "clean"]),
  );
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  // Per-page rows for the active doc.
  const {
    pages,
    loading: pagesLoading,
    error: pagesError,
  } = useProcessedDocumentPages({
    processedDocumentId: activeDoc?.id ?? "",
    enabled: !!activeDoc,
  });

  // Auto-pick first page once pages land.
  useEffect(() => {
    if (!activeDoc) {
      setActivePage(null);
      return;
    }
    if (pages.length > 0 && activePage == null) {
      setActivePage(pages[0].pageNumber);
    }
  }, [activeDoc, pages, activePage]);

  // ── Doc selection ─────────────────────────────────────────────────────

  const selectDocById = useCallback(
    async (id: string) => {
      const full = await extractor.fetchDocument(id);
      if (full) {
        setActiveDoc(full);
        setActivePage(null);
      } else {
        toast.error("Could not load that document");
      }
    },
    [extractor, toast],
  );

  // Initial load if a doc id is in the URL.
  const didInitRef = useRef(false);
  useEffect(() => {
    if (didInitRef.current || !initialDocumentId) return;
    didInitRef.current = true;
    void selectDocById(initialDocumentId);
  }, [initialDocumentId, selectDocById]);

  const handleSelectDoc = useCallback(
    (summary: { id: string }) => {
      router.push(`/tools/pdf-extractor/${summary.id}`);
      void selectDocById(summary.id);
    },
    [router, selectDocById],
  );

  // ── Page nav ──────────────────────────────────────────────────────────

  const jumpToPage = useCallback((n: number) => {
    setActivePage(n);
    setPendingScrollPage(n);
  }, []);

  const handleActivePage = useCallback((n: number | null) => {
    setActivePage(n);
  }, []);

  const handleScrollHandled = useCallback(() => {
    setPendingScrollPage(null);
  }, []);

  // ── Pane toggles ──────────────────────────────────────────────────────

  const togglePane = useCallback((p: PaneKey) => {
    setVisiblePanes((prev) => {
      const next = new Set(prev);
      if (next.has(p)) {
        // Don't allow zero panes — keep at least one visible.
        if (next.size <= 1) return prev;
        next.delete(p);
      } else next.add(p);
      return next;
    });
  }, []);

  // ── Pipeline run ──────────────────────────────────────────────────────

  const handleRunPipeline = useCallback(async () => {
    if (!activeDoc) return;
    setPipelineRunning(true);
    try {
      // The extractor's `runFullPipeline` updates the *tab* in its internal
      // state. The shell doesn't use those tabs — but we can trigger the
      // same backend call directly. Reuse `extractor.runFullPipeline` to
      // keep the flow identical with the floating window: it requires a
      // live tab so we open one via `openDocument` first if needed.
      let openTab = extractor.tabs.find((t) => t.id === activeDoc.id);
      if (!openTab) {
        extractor.openDocument(activeDoc);
      }
      await extractor.runFullPipeline(activeDoc.id, {
        persist_output: true,
      });
      // Refresh list so the new derivative appears.
      docsState.refresh();
      toast.success("Pipeline run complete");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Pipeline failed");
    } finally {
      setPipelineRunning(false);
    }
  }, [activeDoc, extractor, docsState, toast]);

  // ── Upload hand-off ───────────────────────────────────────────────────
  //
  // `PdfStudioUpload` notifies us as soon as the FIRST file in a session
  // finishes streaming. We refresh the sidebar list and (if the studio is
  // empty) auto-select the new doc so the user "instantly sees" their
  // upload in the reader. When the whole session finishes we refresh
  // again to pick up any stragglers.

  const handleFirstUpload = useCallback(
    (docId: string) => {
      docsState.refresh();
      if (!activeDoc) {
        router.push(`/tools/pdf-extractor/${docId}`);
        void selectDocById(docId);
      }
    },
    [docsState, activeDoc, router, selectDocById],
  );

  const handleUploadComplete = useCallback(
    (newDocIds: string[]) => {
      docsState.refresh();
      if (!activeDoc && newDocIds[0]) {
        router.push(`/tools/pdf-extractor/${newDocIds[0]}`);
        void selectDocById(newDocIds[0]);
      }
    },
    [docsState, activeDoc, router, selectDocById],
  );

  const handleRunShortcut = useCallback(
    async (shortcutId: string) => {
      if (!activeDoc) return;
      const docText = activeDoc.cleanContent ?? activeDoc.content ?? "";
      if (!docText) {
        toast.error("No extracted content yet");
        return;
      }
      try {
        await triggerShortcut(shortcutId, {
          scope: { selection: docText },
          sourceFeature: "programmatic",
        });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Run failed");
      }
    },
    [activeDoc, triggerShortcut, toast],
  );

  // ── Keyboard shortcuts ────────────────────────────────────────────────

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inField =
        !!target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      // Cmd/Ctrl+F → open find
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setFindOpen(true);
        return;
      }
      if (inField) return;

      if (e.key === "/") {
        e.preventDefault();
        setFindOpen(true);
        return;
      }
      if (e.key === "Escape" && findOpen) {
        setFindOpen(false);
        setFindQuery("");
        return;
      }
      // j / k for page nav
      if (e.key === "j" && activePage) jumpToPage(activePage + 1);
      else if (e.key === "k" && activePage && activePage > 1)
        jumpToPage(activePage - 1);
      // [ / ] to toggle panes — left-most / right-most
      else if (e.key === "[") togglePane("pdf");
      else if (e.key === "]") togglePane("clean");
      else if (e.key === "\\") togglePane("raw");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activePage, jumpToPage, togglePane, findOpen]);

  return (
    <div className="flex h-full min-h-0 bg-background">
      {/* LEFT — sidebar */}
      <div className="w-72 lg:w-80 xl:w-96 shrink-0 hidden md:flex">
        <PdfStudioSidebar
          docsState={docsState}
          activeDocId={activeDoc?.id ?? null}
          onSelectDoc={handleSelectDoc}
          onAddDocs={() => setUploadOpen(true)}
        />
      </div>

      {/* Upload drawer — opened from sidebar `+ Add` */}
      <PdfStudioUploadDrawer
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        extractor={extractor}
        onFirstDocReady={handleFirstUpload}
        onUploadComplete={handleUploadComplete}
      />

      {/* CENTER */}
      <div className="flex-1 min-w-0 flex flex-col min-h-0">
        <PdfStudioToolbar
          doc={activeDoc}
          pageRowCount={pages.length}
          hasPageRows={pages.length > 0}
          activePage={activePage}
          onJumpToPage={jumpToPage}
          onOpenFind={() => setFindOpen(true)}
          onRunPipeline={handleRunPipeline}
          pipelineRunning={pipelineRunning}
          onOpenSource={() => {
            if (activeDoc?.source && typeof window !== "undefined") {
              window.open(activeDoc.source, "_blank", "noopener,noreferrer");
            }
          }}
        />

        {/* Hidden-panes restore strip */}
        <PaneVisibilityStrip
          visiblePanes={visiblePanes}
          onTogglePane={togglePane}
        />

        {/* Find bar */}
        {findOpen && (
          <div className="shrink-0 px-4 py-1.5 border-b border-border bg-card/40 flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-muted-foreground" />
            <Input
              autoFocus
              value={findQuery}
              onChange={(e) => setFindQuery(e.target.value)}
              placeholder="Find in document…"
              className="h-7 text-xs flex-1"
              style={{ fontSize: "16px" }}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setFindOpen(false);
                  setFindQuery("");
                }
              }}
            />
            <span className="text-[10px] text-muted-foreground">
              {findQuery
                ? "highlighted in raw + cleaned"
                : "press Esc to close"}
            </span>
            <button
              type="button"
              onClick={() => {
                setFindOpen(false);
                setFindQuery("");
              }}
              className="h-7 w-7 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
              title="Close find (Esc)"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Reader */}
        {activeDoc ? (
          <PdfStudioReader
            doc={activeDoc}
            pages={pages}
            loading={pagesLoading}
            error={pagesError}
            activePage={activePage}
            onActivePage={handleActivePage}
            pendingScrollPage={pendingScrollPage}
            onScrollHandled={handleScrollHandled}
            visiblePanes={visiblePanes}
            onTogglePane={togglePane}
            findQuery={findQuery}
            onRunPipeline={handleRunPipeline}
            pipelineRunning={pipelineRunning}
            onOpenUpload={() => setUploadOpen(true)}
          />
        ) : (
          <EmptyShell
            extractor={extractor}
            onFirstDocReady={handleFirstUpload}
            onUploadComplete={handleUploadComplete}
          />
        )}
      </div>

      {/* RIGHT — inspector (when a doc is open) */}
      <div className="w-80 xl:w-96 shrink-0 hidden lg:flex">
        {activeDoc ? (
          <PdfStudioInspector
            doc={activeDoc}
            onRunShortcut={handleRunShortcut}
            onRunPipeline={handleRunPipeline}
            pipelineRunning={pipelineRunning}
          />
        ) : (
          <div className="h-full w-full border-l border-border bg-card/30" />
        )}
      </div>
    </div>
  );
}

function EmptyShell({
  extractor,
  onFirstDocReady,
  onUploadComplete,
}: {
  extractor: ReturnType<typeof usePdfExtractor>;
  onFirstDocReady: (docId: string) => void;
  onUploadComplete: (ids: string[]) => void;
}) {
  return (
    <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
      <div className="w-full max-w-2xl space-y-6">
        <PdfStudioUpload
          extractor={extractor}
          variant="hero"
          headline="Add documents to start reading"
          subhead="Drop in PDFs or images. Each file streams through extraction and lands in your sidebar the moment it's ready — the first one auto-opens here so you can start triaging immediately."
          onFirstDocReady={onFirstDocReady}
          onUploadComplete={onUploadComplete}
        />
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground/70">
            <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px]">/</kbd>{" "}
            search ·{" "}
            <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px]">j / k</kbd>{" "}
            pages ·{" "}
            <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px]">[ ] \\</kbd>{" "}
            toggle panes ·{" "}
            <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px]">⌘ F</kbd>{" "}
            find
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Pane visibility strip ─────────────────────────────────────────────────

function PaneVisibilityStrip({
  visiblePanes,
  onTogglePane,
}: {
  visiblePanes: Set<PaneKey>;
  onTogglePane: (p: PaneKey) => void;
}) {
  // Show only when a pane is hidden — restore-affordance only.
  const hidden = PANE_ORDER.filter((p) => !visiblePanes.has(p));
  if (hidden.length === 0) return null;
  const labels: Record<PaneKey, string> = {
    pdf: "Source PDF",
    raw: "Raw text",
    clean: "AI-cleaned",
  };
  return (
    <div className="shrink-0 px-4 py-1 border-b border-border bg-amber-500/5 flex items-center gap-2 text-[10px]">
      <span className="text-muted-foreground">Hidden panes:</span>
      {hidden.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onTogglePane(p)}
          className={cn(
            "px-1.5 h-5 rounded border border-border bg-background hover:bg-accent",
          )}
        >
          + {labels[p]}
        </button>
      ))}
    </div>
  );
}
