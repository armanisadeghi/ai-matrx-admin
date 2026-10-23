"use client";

/**
 * features/pdf/workspace/usePdfWorkspaceHost.tsx — the app's side of `@ai-matrx/office/pdf`.
 *
 * Builds the ONE `PdfWorkspaceHost` object for a cloud PDF: the windowed viewer
 * (`PdfPreview`, continuous, no toolbar of its own), thumbnails (one batching queue), every tool
 * call (through `callsFor` and `usePdfClient`), rename, download, print, share, and the two tools
 * that are other pages (Scan, Sign). It is a hook in a client component, never a start-up
 * `configure*Host` call, so it can never run on the server only (check:host-config-browser).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "@host/lib/toast";
import { useRouter } from "next/navigation";
import type { PdfRunRequest, PdfRunResult, PdfWorkspaceHost } from "@ai-matrx/office/pdf-model";
import { ENDPOINTS } from "@ai-matrx/api";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { selectFileById } from "@/features/files/redux/selectors";
import { renameFile, saveFileNewVersion } from "@/features/files/redux/thunks";
import { readPdfAnnotations } from "@ai-matrx/media/viewers/pdf";
import { SignaturePad } from "@/features/data-tables/records-ui-host/recordsUiLazy";
import { invalidate } from "@/features/files/hooks/blob-cache";
import { useEnsureCloudFile } from "@/features/files/hooks/useEnsureCloudFile";
import { useCloudPdfBytes } from "@/features/pdf/hooks/useCloudPdfBytes";
import { streamPdfExtractTextRemote } from "@/features/pdf-extractor/service/streamPdf";
import type { PdfTablesReport } from "@/features/pdf-extractor/types";
import { drainPdfStream } from "../api/streamDrain";
import { buildPdfSourceFromFileId } from "../utils/source";
import { usePdfClient } from "../api/client";
import PdfPreview from "../components/viewer/PdfPreview";
import { callsFor, fileIdOf, type PdfCall } from "./pdfOps";
import { createThumbnailQueue, type ThumbnailQueue } from "./pdfThumbnails";
import { PdfThumbnail } from "./PdfThumbnail";
import { useWorkspaceTools, type StudioBridge } from "./useWorkspaceTools";
import type { ExtractorBridge } from "./extractor/extractorBridge";

async function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function usePdfWorkspaceHost(fileId: string): { host: PdfWorkspaceHost; ready: boolean; studio: StudioBridge; extractorBridge: ExtractorBridge; getPage(): number } {
  const router = useRouter();
  const dispatch = useAppDispatch();
  useEnsureCloudFile(fileId);
  const file = useAppSelector((s) => selectFileById(s, fileId));
  const client = usePdfClient();
  const { remoteUrl, headers, withCredentials, fetchBytes } = useCloudPdfBytes(fileId);
  const [online, setOnline] = useState(true);
  const [queueVersion, setQueueVersion] = useState(0);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  // One thumbnail queue per document bytes; a new version of the file starts a fresh one.
  const headersKey = JSON.stringify(headers);
  const queue = useMemo<ThumbnailQueue | null>(() => {
    void queueVersion;
    if (!remoteUrl) return null;
    return createThumbnailQueue({ url: remoteUrl, httpHeaders: JSON.parse(headersKey) as Record<string, string>, withCredentials });
  }, [remoteUrl, headersKey, withCredentials, queueVersion]);
  useEffect(() => () => queue?.dispose(), [queue]);

  const executeCall = useCallback(
    async (call: PdfCall): Promise<PdfRunResult> => {
      if (call.kind === "json") {
        const response = await client.postJson<unknown>(call.endpoint, call.body);
        if (call.result === "replaced") {
          const v = (response as { version_number?: number }).version_number;
          return v === undefined ? { kind: "replaced" } : { kind: "replaced", version: v };
        }
        const id = fileIdOf(response);
        if (!id) throw new Error("The server finished but did not say where it saved the new file.");
        return { kind: "file", fileId: id };
      }
      if (call.kind === "stream-text") {
        const out = await streamPdfExtractTextRemote({ body: call.body as never });
        return { kind: "text", text: String((out as { text_content?: string }).text_content ?? "") };
      }
      if (call.kind === "stream-tables") {
        const report = await drainPdfStream<PdfTablesReport>(ENDPOINTS.pdf.extractTables, call.body, "pdf_tables_complete");
        const tables = (report.tables ?? []).map((t) => ({
          page: t.page_number,
          rows: [...(t.header ? [t.header] : []), ...(t.rows ?? [])].map((r) => r.map((c) => c ?? "")),
        }));
        return { kind: "tables", tables };
      }
      // compress: the server takes the bytes as multipart and saves the result as a new file next to this one.
      const bytes = await fetchBytes();
      const form = new FormData();
      form.append("file", new File([bytes], file?.fileName ?? "document.pdf", { type: "application/pdf" }));
      const url = `${client.buildUrl("compress")}?level=${call.level}&output_mode=derivative&parent_file_id=${encodeURIComponent(fileId)}`;
      const res = await fetch(url, { method: "POST", headers: await client.authHeaders(), body: form });
      if (!res.ok) throw new Error(`Compress failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
      const id = fileIdOf(await res.json());
      if (!id) throw new Error("The server compressed the file but did not say where it saved it.");
      return { kind: "file", fileId: id, name: "Compressed copy" };
    },
    [client, fetchBytes, file?.fileName, fileId],
  );

  const run = useCallback(
    async (request: PdfRunRequest): Promise<PdfRunResult> => {
      let last: PdfRunResult | null = null;
      for (const call of callsFor(fileId, request)) last = await executeCall(call);
      if (!last) throw new Error("There was nothing to do.");
      if (last.kind === "replaced") {
        // The bytes changed under the same id: drop warm copies and draw thumbnails again.
        invalidate(fileId);
        setQueueVersion((v) => v + 1);
      }
      return last;
    },
    [executeCall, fileId],
  );

  const openFile = useCallback((id: string) => router.push(`/pdf/${id}`), [router]);
  const { tools, viewerOverride, studio, annotationCounts, extractorBridge, getPage } = useWorkspaceTools({ fileId, fileName: file?.fileName ?? "document.pdf", openFile });

  const host = useMemo<PdfWorkspaceHost>(
    () => ({
      file: { id: fileId, name: file?.fileName ?? "PDF" },
      online,
      tools,
      renderViewer: (state) =>
        viewerOverride(state) ?? (
        <PdfPreview
          fileId={fileId}
          layout="continuous"
          toolbar="none"
          pageNav={false}
          continuousZoom={state.zoom}
          spread={state.spread}
          rotations={state.rotations}
          onMarkupEngine={state.onMarkupEngine}
          onDocumentLoad={state.onDocumentLoad}
          renderOverlay={({ pageNumber, pageWidthPt, pageHeightPt }) => {
            state.onPageSize(pageNumber, pageWidthPt, pageHeightPt);
            return null;
          }}
          className="w-full"
        />
        ),
      renderThumbnail: (page) => <PdfThumbnail page={page} queue={queue} />,
      renderPageBadge: (page) => {
        const n = annotationCounts[page];
        return n ? (
          <span className="rounded-full bg-primary px-1.5 text-[10px] font-medium leading-4 text-primary-foreground" title={`${n} annotation${n === 1 ? "" : "s"}`}>{n}</span>
        ) : null;
      },
      run,
      openTool: (tool) => router.push(tool === "scan" ? "/tools/scanner" : "/esign/new"),
      openFile,
      download: () => {
        fetchBytes().then((b) => saveBlob(b, file?.fileName ?? "document.pdf"), (e) => toast.error(e instanceof Error ? e.message : "Download failed."));
      },
      share: () => router.push(`/files/f/${fileId}?tab=share`),
      rename: async (name) => {
        await dispatch(renameFile({ fileId, newName: name })).unwrap();
      },
      print: async (pages) => {
        const blob = pages
          ? (await client.postPdfBlob("extractPages", { ...buildPdfSourceFromFileId(fileId), pages, output_mode: "binary" })).blob
          : await fetchBytes();
        const url = URL.createObjectURL(blob);
        const frame = document.createElement("iframe");
        frame.style.cssText = "position:fixed;width:0;height:0;border:0;visibility:hidden";
        frame.src = url;
        frame.onload = () => {
          frame.contentWindow?.focus();
          frame.contentWindow?.print();
          setTimeout(() => {
            frame.remove();
            URL.revokeObjectURL(url);
          }, 60_000);
        };
        document.body.appendChild(frame);
      },
      // Markup (PDF-PLAN U10): the editors' saveDocument bytes become the next version of THIS file. The
      // versions endpoint never runs extraction, so a markup-only save keeps the text (rule R1).
      saveMarkup: async (bytes, summary) => {
        const out = await dispatch(
          saveFileNewVersion({ fileId, content: new Blob([bytes as BlobPart], { type: "application/pdf" }), changeSummary: `Markup: ${summary}` }),
        ).unwrap();
        invalidate(fileId);
        setQueueVersion((v) => v + 1);
        return { kind: "replaced", version: out.versionNumber };
      },
      // Read through the range-capable URL (pages are read on demand), never a second full download.
      existingAnnotations: async () =>
        remoteUrl ? readPdfAnnotations({ url: remoteUrl, httpHeaders: headers, withCredentials }) : readPdfAnnotations({ data: new Uint8Array(await (await fetchBytes()).arrayBuffer()) }),
      signaturePad: SignaturePad,
      redactPatterns: async () => {
        const catalog = await client.getJson<unknown>("redactPatterns");
        const list = Array.isArray(catalog) ? catalog : ((catalog as { patterns?: unknown[] }).patterns ?? []);
        return (list as Array<{ id?: string; name?: string; label?: string }>)
          .flatMap((p) => (typeof p.id === "string" ? [{ id: p.id, label: p.label ?? p.name ?? p.id }] : []));
      },
    }),
    [fileId, file?.fileName, online, queue, run, router, fetchBytes, dispatch, client, tools, viewerOverride, openFile, annotationCounts, remoteUrl, headers, withCredentials],
  );

  return { host, ready: !!file, studio, extractorBridge, getPage };
}
