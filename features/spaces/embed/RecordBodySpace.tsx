"use client";

// features/spaces/embed/RecordBodySpace.tsx — a custom-table row's body page, drawn in the Spaces editor.
//
// For records-ui's `renderRecordBody` port (@ai-matrx/records-ui ≥ 0.101.15): a row's body is the Space
// linked to it by the association `record → document`, label `row_body` (BLOCK-SCHEMA § Row body). When
// the row has one, this draws it with full Notion editing and autosave (compare-and-swap on the Space's
// version, exactly like a Space page); when it has none — while the lookup is loading, when it fails, or
// when the reader cannot open it — it draws `fallback` (the record page's own body), so the record page
// always shows a body. A failed lookup is also reported to the error capture. The database decides
// access; this reads, never gates. It mounts no QuickFind: Cmd+K stays the host page's.
//
// `renderRecordBody` is called synchronously, so a host that must return `null` for a row with no body
// before the lookup lands uses `useRowBodySpace(recordId)` itself and mounts <RecordBodySpace> only for
// `state === "found"`.
//
// BUILD GRAPH (code-splitting Method B): this shell stays cheap — the lookup, the props type and ONE
// next/dynamic edge to RecordBodySpaceImpl (editor + SpacesProvider), which loads only once a body Space
// is found. Add no other import of the editor here, and no second dynamic edge.

import { ErrorNotice } from "@ai-matrx/design-system";
import { RegionSkeleton } from "@ai-matrx/design-system/controls";
import dynamic from "next/dynamic";
import { Component, useCallback, useEffect, useState, type ErrorInfo, type ReactNode } from "react";

import { bodyFieldOf, recordNameIn } from "@ai-matrx/records-ui";
import { useFields, useRecordsClient, useTable } from "@ai-matrx/records/react";

import { captureReactRenderError } from "@/lib/diagnostics/captureReactError";
import { captureError } from "@/lib/diagnostics/errorCaptureStore";
import { createClient } from "@/utils/supabase/client";

import { primeOwningRow } from "../data/owning-row";
import { ReleaseProvider, reservedHeight } from "./row-page-slot";
import { ensureRowPage, findRowPageId, saveRowPageAsTemplate, type RowPageDb } from "./row-page";

const RecordBodySpaceImpl = dynamic(() => import("./RecordBodySpaceImpl"), {
  ssr: false,
  loading: () => <RegionSkeleton shape="rows" count={4} aria-label="Loading the page" />,
});

export const ROW_BODY_LABEL = "row_body";

export type RowBodyState = { state: "loading" } | { state: "none" } | { state: "found"; spaceId: string } | { state: "failed"; message: string };

const LOADING: RowBodyState = { state: "loading" };

/** The Space that is this row's body (one live body per row), as the reader may see it (door: content.row_page_for). */
export function useRowBodySpace(recordId: string): RowBodyState {
  // The answer is kept with the row it answers: a new recordId reads as loading until its own answer
  // lands, with no reset written from the effect.
  const [answer, setAnswer] = useState<{ recordId: string; state: RowBodyState } | null>(null);
  useEffect(() => {
    let live = true;
    const setFound = (state: RowBodyState) => setAnswer({ recordId, state });
    void (async () => {
      let pageId: string | null = null;
      let failure: { code?: string; message: string } | null = null;
      try {
        pageId = await findRowPageId(createClient() as unknown as RowPageDb, recordId);
      } catch (err) {
        failure = { message: err instanceof Error ? err.message : String(err) };
      }
      if (!live) return;
      if (failure) {
        captureError({
          source: "supabase-postgrest",
          operation: "rpc",
          schema: "content",
          relation: "row_page_for",
          message: `Row body Space lookup failed: ${failure.message}`,
          callSite: "features/spaces/embed/RecordBodySpace.tsx useRowBodySpace",
        });
        setFound({ state: "failed", message: failure.message });
      } else setFound(pageId ? { state: "found", spaceId: pageId } : { state: "none" });
    })();
    return () => {
      live = false;
    };
  }, [recordId]);
  return answer?.recordId === recordId ? answer.state : LOADING;
}

export interface RecordBodySpaceProps {
  tableId: string;
  recordId: string;
  /** The record as the record page read it (unused today; the body is found by the record's id). */
  record?: unknown;
  readOnly: boolean;
  /** The row's own organization (the table's), for starting its page — never the active one. */
  organizationId?: string | null;
  /** The record page's own body: drawn while the lookup loads, when it fails, and when there is no body Space. */
  fallback?: ReactNode;
}

type Ensured = { state: "idle" } | { state: "found"; spaceId: string } | { state: "failed"; message: string };

/** One start per row per load, however often the record page re-renders while it runs. */
const starting = new Map<string, Promise<string>>();
function startRowPage(args: Parameters<typeof ensureRowPage>[1]): Promise<string> {
  const kept = starting.get(args.recordId);
  if (kept) return kept;
  const run = ensureRowPage(createClient() as unknown as RowPageDb, args).then(
    ({ spaceId }) => {
      primeOwningRow(spaceId, { recordId: args.recordId, tableId: args.tableId, organizationId: args.organizationId });
      return spaceId;
    },
    (err: unknown) => {
      starting.delete(args.recordId);
      const message = err instanceof Error ? err.message : String(err);
      captureError({
        source: "supabase-postgrest",
        operation: "rpc",
        schema: "content",
        relation: "row_page_ensure",
        message: `A row's page could not be started: ${message}`,
        callSite: "features/spaces/embed/RecordBodySpace.tsx startRowPage",
      });
      throw err;
    },
  );
  starting.set(args.recordId, run);
  return run;
}

/**
 * EVERY ROW IS A PAGE (lane ROW-PAGE-VIEWS): a row with no page yet, opened by someone who may edit it, gets
 * one now — its notes, then its table's default template (embed/row-page.ts). A reader who may not edit
 * keeps the record page's own body; nothing is written on their read.
 */
function useEnsuredRowPage(args: { body: RowBodyState; readOnly: boolean; organizationId: string | null | undefined; tableId: string; recordId: string; record: unknown }): Ensured {
  const fields = useFields(args.tableId);
  const table = useTable(args.tableId);
  const client = useRecordsClient();
  const [answer, setAnswer] = useState<{ recordId: string; state: Ensured } | null>(null);
  const document = (args.record as { document?: Record<string, unknown> } | null | undefined)?.document ?? null;
  const ready = args.body.state === "none" && !args.readOnly && !!args.organizationId && !!fields.data && !!table.data && !!document;
  const notesKey = fields.data ? bodyFieldOf(fields.data)?.key : undefined;
  const notes = notesKey && document ? document[notesKey] : null;
  const title = table.data && document ? recordNameIn(table.data, document) : "";
  const { recordId, tableId, organizationId } = args;
  const notesText = typeof notes === "string" ? notes : null;
  useEffect(() => {
    if (!ready || !organizationId) return;
    let live = true;
    const applyValues = async (patch: Record<string, unknown>) => {
      const written = await client.recordUpdate({ record_id: recordId as never, patch });
      // The page exists by now: a refused preset is reported, never a reason to say the page could not start.
      if (!written.ok)
        captureError({
          source: "supabase-postgrest",
          operation: "rpc",
          schema: "custom",
          relation: "record_update",
          message: `A row template's values could not be applied to the new row: ${written.error.message}`,
          callSite: "features/spaces/embed/RecordBodySpace.tsx useEnsuredRowPage",
        });
    };
    startRowPage({ organizationId, tableId, recordId, title, notes: notesText, document, applyValues }).then(
      (spaceId) => live && setAnswer({ recordId, state: { state: "found", spaceId } }),
      (err: unknown) => live && setAnswer({ recordId, state: { state: "failed", message: err instanceof Error ? err.message : String(err) } }),
    );
    return () => {
      live = false;
    };
  }, [ready, recordId, tableId, organizationId, title, notesText, client]);
  return answer?.recordId === args.recordId ? answer.state : { state: "idle" };
}

/**
 * The space a row's page holds, reserved before it arrives: the loading frames and the settled page sit in
 * one box of a fixed minimum height (`row-page-slot.ts`), so the page's arrival moves nothing under it.
 */
function PageSlot({ recordId, children }: { recordId: string; children: ReactNode }) {
  // Everything UNDER the page on the record page (links, history, comments) is held out of sight until the
  // page has settled: a hidden element is never a layout shift when the page takes its height. Released by
  // the page, or after a cap so a page that cannot settle never hides them.
  const [holding, setHolding] = useState(true);
  const release = useCallback(() => setHolding(false), []);
  useEffect(() => {
    const cap = window.setTimeout(release, HOLD_CAP_MS);
    return () => window.clearTimeout(cap);
  }, [release]);
  return (
    <ReleaseProvider value={release}>
      <div data-row-page-slot="" {...(holding ? { "data-holding": "" } : {})} className="relative min-w-0" style={{ minHeight: reservedHeight(recordId) }}>
        {holding ? <style>{HOLD_CSS}</style> : null}
        {children}
      </div>
    </ReleaseProvider>
  );
}

/** What follows the page's section while the slot holds: laid out in place, not painted. */
const HOLD_CSS = '[data-record-body="host"]:has([data-row-page-slot][data-holding]) ~ * { visibility: hidden; }';
const HOLD_CAP_MS = 8000;

/** The row's body Space in the Spaces editor, or `fallback` (default nothing) when the row has no body Space. */
export function RecordBodySpace({ tableId, recordId, record, readOnly, organizationId, fallback = null }: RecordBodySpaceProps) {
  const body = useRowBodySpace(recordId);
  const ensured = useEnsuredRowPage({ body, readOnly, organizationId, tableId, recordId, record });
  const spaceId = body.state === "found" ? body.spaceId : ensured.state === "found" ? ensured.spaceId : null;
  if (spaceId) {
    return (
      <PageSlot recordId={recordId}>
        <ImplBoundary fallback={fallback}>
          <RecordBodySpaceImpl spaceId={spaceId} recordId={recordId} readOnly={readOnly} fallback={fallback} />
        </ImplBoundary>
      </PageSlot>
    );
  }
  // Someone who may edit: the page is on its way (looked up, then started) — its frame, not the old body.
  if (!readOnly && organizationId && (body.state === "loading" || (body.state === "none" && ensured.state === "idle"))) {
    return (
      <PageSlot recordId={recordId}>
        <RegionSkeleton shape="rows" count={4} aria-label="Loading the page" />
      </PageSlot>
    );
  }
  if (ensured.state === "failed") {
    return (
      <>
        <ErrorNotice title="This row’s page couldn’t be started" message={ensured.message} size="inline" />
        {fallback}
      </>
    );
  }
  // A reader with no page yet, or a failed lookup (reported above): the record page's own body.
  return <>{fallback}</>;
}

/** The editor chunk failed to load or threw: report it, and draw the record page's own body. */
class ImplBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override componentDidCatch(error: unknown, info: ErrorInfo) {
    captureReactRenderError(error, {
      boundary: "RecordBodySpace",
      componentStack: info.componentStack,
      modulePath: "features/spaces/embed/RecordBodySpaceImpl",
    });
  }
  override render() {
    return this.state.failed ? <>{this.props.fallback}</> : this.props.children;
  }
}

/**
 * "Use this page as the template" (the record page's menu): this row's page becomes its table's default row
 * template. The Spaces store loads only when chosen.
 */
export async function saveRowPageAsTableTemplate(args: { organizationId: string; tableId: string; recordId: string; name: string }): Promise<void> {
  const { createDatabaseSpacesStore } = await import("../store-db/create-store");
  const db = createClient();
  await saveRowPageAsTemplate(
    db as unknown as RowPageDb,
    { findPageId: (id) => findRowPageId(db as unknown as RowPageDb, id), readPage: (id) => createDatabaseSpacesStore(args.organizationId).get(id) },
    args,
  );
}
