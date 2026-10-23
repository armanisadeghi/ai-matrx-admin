"use client";

/**
 * features/pdf/workspace/extractor/AutoCleanOnOpen.tsx — the studio's "AI clean on open", back in the workspace.
 *
 * Mount `<AutoCleanOnOpen fileId />` once per open workspace. It renders nothing and costs nothing while the Feature
 * Knob `pdf.workspace.auto_clean_on_open` is off (the default): the heavy inner part only mounts when the knob
 * answers `true`. When on, a file whose processed document has extracted text but no clean text is cleaned once
 * (`force: false`, so the server never runs a second clean), under the same guards the studio had: at most 200
 * pages, the run record has answered, nothing already running (`useAutoCleanOnOpen` / `needsAutoClean`).
 */
import { useEffect, useRef, useState } from "react";
import Link from "@/components/navigation/AppLink";
import { CostDoor } from "@/components/cost/CostDoor";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectUserId } from "@/lib/redux/slices/userSlice";
import { selectOrganizationId } from "@/lib/redux/slices/appContextSlice";
import { useEffectiveKnob } from "@/lib/scoped-config/effectiveKnobs.client";
import { useToastManager } from "@/hooks/useToastManager";
import { usePdfExtractor, invalidateProcessedDocumentCache, type PdfDocument } from "@/features/pdf-extractor/hooks/usePdfExtractor";
import { usePdfDocRun } from "@/features/pdf-extractor/hooks/usePdfDocRun";
import { useProcessedDocumentPages } from "@/features/pdf-extractor/hooks/useProcessedDocumentPages";
import { useAutoCleanOnOpen } from "@/features/pdf-extractor/hooks/useAutoCleanOnOpen";
import { resolvePdfSurfaceIds } from "@/features/pdf/hooks/usePdfSurfaceLinks";
import { PDF_AUTO_CLEAN_KNOB, autoCleanIsOn } from "./autoClean";

/** Reads the knob; mounts the working part only when it is on. */
export function AutoCleanOnOpen({ fileId }: { fileId: string }) {
  const orgId = useAppSelector(selectOrganizationId);
  const userId = useAppSelector(selectUserId);
  const knob = useEffectiveKnob(orgId, userId, PDF_AUTO_CLEAN_KNOB);
  return autoCleanIsOn(knob) ? <AutoCleanRunner fileId={fileId} /> : null;
}

function AutoCleanRunner({ fileId }: { fileId: string }) {
  const toast = useToastManager("pdf-extractor");
  const extractor = usePdfExtractor({ loadHistory: false });
  const { fetchDocument } = extractor;
  const [doc, setDoc] = useState<PdfDocument | null>(null);
  const [running, setRunning] = useState(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  // Find the file's processed document; never make one (extracting is a click).
  useEffect(() => {
    let live = true;
    setDoc(null);
    resolvePdfSurfaceIds({ fileId }).then(
      async (ids) => {
        if (!live || !ids.processedDocumentId) return;
        const d = await fetchDocument(ids.processedDocumentId);
        if (live && d) setDoc(d);
      },
      () => undefined,
    );
    return () => {
      live = false;
    };
  }, [fileId, fetchDocument]);

  const { pages, loading, error, refresh } = useProcessedDocumentPages({ processedDocumentId: doc?.id ?? "", enabled: !!doc });
  const docRun = usePdfDocRun({
    docId: doc?.id ?? null,
    localStreaming: running || extractor.batchStatus !== "idle",
    onSettled: async () => {
      if (!doc) return;
      invalidateProcessedDocumentCache(doc.id);
      const fresh = await fetchDocument(doc.id);
      if (fresh && alive.current) setDoc(fresh);
      refresh();
    },
  });

  useAutoCleanOnOpen({
    doc,
    busy: running || docRun.phase === "running" || docRun.phase === "failed" || extractor.batchStatus !== "idle",
    pagesSettled: !loading && !error,
    pages,
    pageCount: pages.length,
    runAnswered: docRun.answered,
    run: () => {
      if (!doc) return;
      setRunning(true);
      if (!extractor.tabs.find((t) => t.id === doc.id)) extractor.openDocument(doc);
      extractor
        .cleanContent(doc.id, { force: false, onProgress: () => undefined, onTextDelta: () => undefined })
        .then(async () => {
          const fresh = await fetchDocument(doc.id);
          if (fresh && alive.current) setDoc(fresh);
          refresh();
          toast.success("AI cleanup complete");
        })
        .catch((e: unknown) => toast.error(e instanceof Error ? e.message : "AI cleanup failed"))
        .finally(() => {
          if (alive.current) setRunning(false);
        });
    },
  });
  return null;
}

/**
 * The knob as the Document tool shows it: whether the clean runs by itself on open, a door to Settings where the
 * person turns it on or off, and the cost behind the quiet Cost door (the confirm-step pattern: the cost is never
 * printed in the line itself).
 */
export function AutoCleanSetting() {
  const orgId = useAppSelector(selectOrganizationId);
  const userId = useAppSelector(selectUserId);
  const knob = useEffectiveKnob(orgId, userId, PDF_AUTO_CLEAN_KNOB);
  if (typeof knob !== "boolean") return null;
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground" data-pdf-auto-clean={knob ? "on" : "off"}>
      <span>Clean with AI when a PDF opens: {knob ? "on" : "off"}</span>
      <Link href="/settings/config" className="underline underline-offset-2">Change in Settings</Link>
      <CostDoor
        label="Cost"
        rows={[{ label: "Each PDF it cleans", text: "The same as pressing Clean with AI once. Larger documents cost more." }]}
      />
    </div>
  );
}
