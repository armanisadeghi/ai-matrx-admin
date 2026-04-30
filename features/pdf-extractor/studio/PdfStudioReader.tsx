"use client";

/**
 * PdfStudioReader — three synced reading panes.
 *
 *   ┌──────────────────┬──────────────────┬──────────────────┐
 *   │ Source PDF       │ Raw extraction   │ AI-cleaned       │
 *   │ (iframe + #page) │ per-page anchors │ per-page anchors │
 *   │                  │ + section chips  │ + section chips  │
 *   └──────────────────┴──────────────────┴──────────────────┘
 *
 * The caller passes:
 *   - `pages` (per-page rows from `processed_document_pages`).
 *   - `activePage` — currently most-visible page number.
 *   - `onActivePage(n)` — emitted when scrolling drives a new active page.
 *   - `pendingScrollPage` — when set, all panes scroll to that page once
 *     and clear the pending state via `onScrollHandled`.
 *
 * Scroll sync is one-directional from whichever text pane the user is
 * actively scrolling (the most-visible page-anchor wins). The PDF iframe
 * follows via `#page=N`. The other text pane follows by `scrollIntoView`
 * on the matching anchor — without re-emitting the page, so we don't
 * fight ourselves.
 *
 * Density / pane visibility is owned by the caller so power users can
 * collapse a pane via keyboard.
 */

import React, { useEffect, useRef, useCallback, useMemo } from "react";
import {
  FileText,
  Sparkles,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PdfDocument } from "../hooks/usePdfExtractor";
import type { PdfPageRow } from "../hooks/useProcessedDocumentPages";

export type PaneKey = "pdf" | "raw" | "clean";

export interface PdfStudioReaderProps {
  doc: PdfDocument;
  pages: PdfPageRow[];
  loading: boolean;
  error: string | null;
  activePage: number | null;
  onActivePage: (page: number | null) => void;
  pendingScrollPage: number | null;
  onScrollHandled: () => void;
  visiblePanes: Set<PaneKey>;
  onTogglePane: (pane: PaneKey) => void;
  /** Active find query — every match in the visible text panes is highlighted. */
  findQuery: string;
}

export function PdfStudioReader({
  doc,
  pages,
  loading,
  error,
  activePage,
  onActivePage,
  pendingScrollPage,
  onScrollHandled,
  visiblePanes,
  onTogglePane,
  findQuery,
}: PdfStudioReaderProps) {
  const hasPages = pages.length > 0;

  // Each text pane registers its own scroll container. Whichever one the
  // user touched most recently is allowed to drive sync — the other
  // follows via `scrollIntoView`. `lastScrolledPaneRef` is a non-state
  // ref because we don't want to re-render to track focus.
  const lastScrolledPaneRef = useRef<PaneKey | null>(null);

  // The PDF iframe is driven by `#page=N`. We own its src manually so the
  // user can also change pages via the toolbar's PageJumper.
  const pdfFrameRef = useRef<HTMLIFrameElement | null>(null);
  useEffect(() => {
    if (!doc.source || !pdfFrameRef.current || !activePage) return;
    try {
      pdfFrameRef.current.src = `${doc.source}#page=${activePage}`;
    } catch {
      // ignore cross-origin frame manipulation errors
    }
  }, [activePage, doc.source]);

  if (loading && !hasPages) {
    return <ReaderSkeleton visiblePanes={visiblePanes} />;
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (!hasPages) {
    return <LegacyReaderFallback doc={doc} />;
  }

  return (
    <div className="flex flex-1 min-h-0">
      {visiblePanes.has("pdf") && (
        <PdfPane
          doc={doc}
          activePage={activePage}
          frameRef={pdfFrameRef}
          onTogglePane={() => onTogglePane("pdf")}
        />
      )}
      {visiblePanes.has("raw") && (
        <TextPane
          paneKey="raw"
          title="Raw extraction"
          subtitle="System A · per-page"
          icon={<FileText className="w-3 h-3 text-muted-foreground" />}
          pages={pages}
          field="raw"
          activePage={activePage}
          onActivePage={onActivePage}
          pendingScrollPage={pendingScrollPage}
          onScrollHandled={onScrollHandled}
          lastScrolledPaneRef={lastScrolledPaneRef}
          findQuery={findQuery}
          onTogglePane={() => onTogglePane("raw")}
        />
      )}
      {visiblePanes.has("clean") && (
        <TextPane
          paneKey="clean"
          title="AI-cleaned"
          subtitle="System B · per-page"
          icon={<Sparkles className="w-3 h-3 text-primary" />}
          pages={pages}
          field="cleaned"
          activePage={activePage}
          onActivePage={onActivePage}
          pendingScrollPage={pendingScrollPage}
          onScrollHandled={onScrollHandled}
          lastScrolledPaneRef={lastScrolledPaneRef}
          findQuery={findQuery}
          onTogglePane={() => onTogglePane("clean")}
          highlightSection
        />
      )}
    </div>
  );
}

// ── PDF pane ──────────────────────────────────────────────────────────────

function PdfPane({
  doc,
  activePage,
  frameRef,
  onTogglePane,
}: {
  doc: PdfDocument;
  activePage: number | null;
  frameRef: React.RefObject<HTMLIFrameElement | null>;
  onTogglePane: () => void;
}) {
  return (
    <section className="flex-1 min-w-0 flex flex-col border-r border-border bg-muted/10">
      <PaneHeader
        title="Source PDF"
        subtitle={activePage != null ? `page ${activePage}` : ""}
        icon={<FileText className="w-3 h-3 text-muted-foreground" />}
        onTogglePane={onTogglePane}
      />
      <div className="flex-1 min-h-0 p-2">
        {doc.source ? (
          <iframe
            ref={frameRef}
            src={doc.source}
            title={doc.name}
            className="w-full h-full border border-border rounded bg-background"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-[11px] text-muted-foreground">
            No source URL — can't render the source PDF.
          </div>
        )}
      </div>
    </section>
  );
}

// ── Text pane (raw or cleaned) ────────────────────────────────────────────

function TextPane({
  paneKey,
  title,
  subtitle,
  icon,
  pages,
  field,
  activePage,
  onActivePage,
  pendingScrollPage,
  onScrollHandled,
  lastScrolledPaneRef,
  findQuery,
  onTogglePane,
  highlightSection,
}: {
  paneKey: PaneKey;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  pages: PdfPageRow[];
  field: "raw" | "cleaned";
  activePage: number | null;
  onActivePage: (page: number) => void;
  pendingScrollPage: number | null;
  onScrollHandled: () => void;
  lastScrolledPaneRef: React.MutableRefObject<PaneKey | null>;
  findQuery: string;
  onTogglePane: () => void;
  highlightSection?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const anchorMap = useRef<Map<number, HTMLElement>>(new Map());

  // Track when this pane is the active scroller — so the IntersectionObserver
  // only emits while the user is actually interacting with it.
  const onScrollStart = useCallback(() => {
    lastScrolledPaneRef.current = paneKey;
  }, [paneKey, lastScrolledPaneRef]);

  // IntersectionObserver — emit the most-visible page only when this pane
  // is the active scroller. The PDF + the sibling text pane will follow.
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (lastScrolledPaneRef.current !== paneKey) return;
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const page = Number(visible.target.getAttribute("data-page") ?? 0);
        if (page) onActivePage(page);
      },
      { root, threshold: [0.25, 0.5, 0.75] },
    );
    anchorMap.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [pages.length, paneKey, lastScrolledPaneRef, onActivePage]);

  // Programmatic scroll when an external action sets `pendingScrollPage`
  // (toolbar PageJumper, sibling pane click, sidebar nav).
  useEffect(() => {
    if (pendingScrollPage == null) return;
    const el = anchorMap.current.get(pendingScrollPage);
    if (el) {
      // Don't let the resulting scroll reclassify this as the active pane.
      const wasLast = lastScrolledPaneRef.current;
      el.scrollIntoView({ block: "start", behavior: "smooth" });
      lastScrolledPaneRef.current = wasLast;
    }
    // Clear the pending state — we let the toolbar know it can re-issue.
    onScrollHandled();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingScrollPage]);

  return (
    <section className="flex-1 min-w-0 flex flex-col border-r last:border-r-0 border-border">
      <PaneHeader
        title={title}
        subtitle={subtitle}
        icon={icon}
        onTogglePane={onTogglePane}
      />
      <div
        ref={containerRef}
        className="flex-1 min-h-0 overflow-y-auto px-2 py-2 space-y-2"
        onScroll={onScrollStart}
        onWheel={onScrollStart}
        onTouchMove={onScrollStart}
      >
        {pages.map((p) => {
          const text = field === "cleaned" ? p.cleanedText : p.rawText;
          const isActive = activePage === p.pageNumber;
          return (
            <PageBlock
              key={p.id}
              page={p}
              text={text}
              field={field}
              isActive={isActive}
              highlightSection={highlightSection}
              findQuery={findQuery}
              onClick={() => onActivePage(p.pageNumber)}
              registerAnchor={(el) => {
                if (el) anchorMap.current.set(p.pageNumber, el);
                else anchorMap.current.delete(p.pageNumber);
              }}
            />
          );
        })}
      </div>
    </section>
  );
}

// ── Page block — one row per page in a text pane ──────────────────────────

function PageBlock({
  page,
  text,
  field,
  isActive,
  highlightSection,
  findQuery,
  onClick,
  registerAnchor,
}: {
  page: PdfPageRow;
  text: string;
  field: "raw" | "cleaned";
  isActive: boolean;
  highlightSection?: boolean;
  findQuery: string;
  onClick: () => void;
  registerAnchor: (el: HTMLDivElement | null) => void;
}) {
  const charCount =
    field === "cleaned" ? page.cleanedCharCount : page.rawCharCount;

  return (
    <div
      data-page={page.pageNumber}
      ref={registerAnchor}
      onClick={onClick}
      className={cn(
        "border rounded-md p-2 text-[11px] leading-relaxed transition-colors cursor-pointer",
        isActive
          ? "border-primary/50 bg-primary/5 shadow-sm"
          : "border-border bg-card hover:bg-accent/30",
      )}
    >
      <div className="flex items-center gap-1.5 mb-1 text-[10px] text-muted-foreground">
        <span className="font-mono font-semibold text-foreground/80">
          page {page.pageNumber}
        </span>
        {page.usedOcr && (
          <span className="px-1 py-px rounded bg-amber-500/10 text-amber-700 dark:text-amber-400">
            OCR
          </span>
        )}
        {highlightSection && page.sectionKind && (
          <span className="px-1 py-px rounded bg-primary/10 text-primary truncate max-w-[160px]">
            {page.sectionKind}
            {page.sectionTitle && ` · ${page.sectionTitle}`}
          </span>
        )}
        <span className="ml-auto font-mono">
          {charCount.toLocaleString()}
        </span>
      </div>
      <pre className="whitespace-pre-wrap font-mono text-foreground/85 leading-relaxed">
        <Highlighted text={text} query={findQuery} />
      </pre>
    </div>
  );
}

// ── Inline find-highlight ─────────────────────────────────────────────────

function Highlighted({ text, query }: { text: string; query: string }) {
  const segments = useMemo(() => {
    if (!query.trim() || !text) return [{ text, match: false }];
    const q = query.trim();
    const lower = text.toLowerCase();
    const lq = q.toLowerCase();
    const out: { text: string; match: boolean }[] = [];
    let i = 0;
    while (i < text.length) {
      const at = lower.indexOf(lq, i);
      if (at < 0) {
        out.push({ text: text.slice(i), match: false });
        break;
      }
      if (at > i) out.push({ text: text.slice(i, at), match: false });
      out.push({ text: text.slice(at, at + q.length), match: true });
      i = at + q.length;
    }
    return out;
  }, [text, query]);

  if (segments.length === 1 && !segments[0].match) {
    return <>{segments[0].text || (
      <span className="italic text-muted-foreground">(no text on this page)</span>
    )}</>;
  }

  return (
    <>
      {segments.map((s, i) =>
        s.match ? (
          <mark
            key={i}
            className="rounded bg-amber-300/40 text-foreground px-0.5"
          >
            {s.text}
          </mark>
        ) : (
          <React.Fragment key={i}>{s.text}</React.Fragment>
        ),
      )}
    </>
  );
}

// ── Pane header (shared) ──────────────────────────────────────────────────

function PaneHeader({
  title,
  subtitle,
  icon,
  onTogglePane,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  onTogglePane?: () => void;
}) {
  return (
    <div className="shrink-0 px-2.5 py-1.5 border-b border-border flex items-center gap-1.5">
      {icon}
      <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground/80">
        {title}
      </span>
      {subtitle && (
        <span className="text-[10px] text-muted-foreground">· {subtitle}</span>
      )}
      {onTogglePane && (
        <button
          type="button"
          onClick={onTogglePane}
          className="ml-auto p-0.5 text-muted-foreground/60 hover:text-foreground rounded transition-colors"
          title="Hide pane"
        >
          <EyeOff className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

// ── Loading + legacy fallback ─────────────────────────────────────────────

function ReaderSkeleton({ visiblePanes }: { visiblePanes: Set<PaneKey> }) {
  return (
    <div className="flex flex-1 min-h-0">
      {Array.from(visiblePanes).map((pane) => (
        <div
          key={pane}
          className="flex-1 min-w-0 flex flex-col border-r last:border-r-0 border-border p-3 gap-2"
        >
          <div className="h-5 w-32 rounded bg-muted/50 animate-pulse" />
          <div className="h-32 w-full rounded bg-muted/40 animate-pulse" />
          <div className="h-32 w-full rounded bg-muted/40 animate-pulse" />
        </div>
      ))}
    </div>
  );
}

function LegacyReaderFallback({ doc }: { doc: PdfDocument }) {
  return (
    <div className="flex flex-1 min-h-0">
      <div className="flex-1 min-w-0 flex flex-col border-r border-border bg-muted/10 p-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-2">
          Source PDF
        </div>
        {doc.source ? (
          <iframe
            src={doc.source}
            title={doc.name}
            className="flex-1 min-h-0 border border-border rounded bg-background"
          />
        ) : (
          <p className="text-[11px] text-muted-foreground">No source URL.</p>
        )}
      </div>
      <div className="flex-1 min-w-0 flex flex-col p-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-2">
          Document content (legacy · no per-page rows)
        </div>
        <div className="border border-amber-500/30 bg-amber-500/5 rounded-md p-3 mb-3 text-[11px] text-amber-700 dark:text-amber-400">
          Run the pipeline from the toolbar above to populate
          <code className="mx-1 px-1 bg-card border border-border rounded text-[10px]">
            processed_document_pages
          </code>
          and unlock joined scrolling, find-in-doc, and bbox overlays.
        </div>
        <pre className="flex-1 min-h-0 overflow-y-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-foreground/85">
          {doc.cleanContent ?? doc.content ?? "(no extracted text)"}
        </pre>
      </div>
    </div>
  );
}
