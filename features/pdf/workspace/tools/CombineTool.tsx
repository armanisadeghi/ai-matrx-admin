"use client";

/**
 * features/pdf/workspace/tools/CombineTool.tsx — the workspace's "Combine and insert" tool (PDF-PLAN U9).
 *
 *  - Merge: this file, then the PDFs you add (picked from Files or uploaded, in the cloud-files picker; reorder,
 *    page ranges per file), saved as a NEW file;
 *  - Insert: pages of another PDF placed after a page of this one, saved as a NEW file.
 *
 * Files are always picked, never typed. The original is never touched; "Open the new file" goes to it.
 */
import { useState } from "react";
import dynamic from "next/dynamic";
import { Button, Field, SegmentedControl } from "@ai-matrx/design-system/controls";
import { usePdfClient } from "../../api/client";
import { parsePagesInput } from "@/features/pdf/utils/pages";
import { combineCallFor, fileIdOf, type CombineOp } from "../pdfOps";

const FilePickerWindow = dynamic(
  () => import("@/features/resource-manager/resource-picker/FilePickerWindow").then((m) => ({ default: m.FilePickerWindow })),
  { ssr: false },
);

interface Entry {
  fileId: string;
  name: string;
  pagesText: string;
}

function pagesOf(text: string): number[] | null {
  if (!text.trim()) return null;
  const pages = parsePagesInput(text);
  if (!pages.length) throw new Error("Those pages are not a valid list. Try 1-3, 5.");
  return pages;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

export function CombineTool({ fileId, fileName, currentPage, onOpenFile }: { fileId: string; fileName: string; currentPage: number; onOpenFile(id: string): void }) {
  const client = usePdfClient();
  const [mode, setMode] = useState<"merge" | "insert">("merge");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [filename, setFilename] = useState("");
  const [after, setAfter] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [madeFile, setMadeFile] = useState<string | null>(null);

  const move = (i: number, by: -1 | 1) =>
    setEntries((list) => {
      const j = i + by;
      if (j < 0 || j >= list.length) return list;
      const next = [...list];
      [next[i], next[j]] = [next[j]!, next[i]!];
      return next;
    });

  const run = async () => {
    setBusy(true);
    setError(null);
    setMadeFile(null);
    try {
      let request: CombineOp;
      if (mode === "merge") {
        if (!entries.length) throw new Error("Add at least one PDF to combine with this one.");
        request = { op: "merge", sources: entries.map((e) => ({ fileId: e.fileId, pages: pagesOf(e.pagesText) })), filename: filename.trim() || null };
      } else {
        const source = entries[0];
        if (!source) throw new Error("Choose the PDF to take pages from.");
        const afterPage = Math.max(0, Number(after ?? currentPage) || 0);
        request = { op: "insert", source: { fileId: source.fileId, pages: pagesOf(source.pagesText) }, afterPage };
      }
      const call = combineCallFor(fileId, request);
      const id = fileIdOf(await client.postJson<unknown>(call.endpoint, call.body));
      if (!id) throw new Error("The server finished but did not say where it saved the new file.");
      setMadeFile(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "That did not work.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto p-3" data-pdf-combine="">
      <SegmentedControl
        fill
        value={mode}
        onValueChange={(v) => { setMode(v); setEntries((e) => e.slice(0, v === "insert" ? 1 : e.length)); setMadeFile(null); setError(null); }}
        aria-label="Combine mode"
        data={[{ value: "merge", label: "Merge PDFs" }, { value: "insert", label: "Insert pages" }]}
      />
      <Row label={mode === "merge" ? "Order: this file first, then" : "Take pages from"}>
        <ul className="flex flex-col gap-1">
          {mode === "merge" ? <li className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground">{fileName} (this file)</li> : null}
          {entries.map((e, i) => (
            <li key={`${e.fileId}-${i}`} className="flex flex-col gap-1 rounded-md border border-border p-2">
              <span className="truncate text-xs font-medium">{e.name}</span>
              <Field value={e.pagesText} onChange={(ev) => setEntries((l) => l.map((x, idx) => (idx === i ? { ...x, pagesText: ev.target.value } : x)))} aria-label={`Pages of ${e.name}`} placeholder="All pages, or 1-3, 5" />
              <div className="flex gap-1">
                {mode === "merge" ? <Button variant="quiet" onClick={() => move(i, -1)} disabled={i === 0}>Up</Button> : null}
                {mode === "merge" ? <Button variant="quiet" onClick={() => move(i, 1)} disabled={i === entries.length - 1}>Down</Button> : null}
                <Button variant="quiet" onClick={() => setEntries((l) => l.filter((_, idx) => idx !== i))}>Remove</Button>
              </div>
            </li>
          ))}
        </ul>
      </Row>
      {mode === "merge" || entries.length === 0 ? (
        <Button variant="outline" onClick={() => setPicking(true)}>{entries.length ? "Add another PDF" : "Choose a PDF"}</Button>
      ) : null}
      {mode === "insert" ? (
        <Row label="After page of this file (0 puts them first)">
          <Field type="number" min={0} value={after ?? String(currentPage)} onChange={(e) => setAfter(e.target.value)} aria-label="After page" />
        </Row>
      ) : (
        <Row label="Name of the new file (optional)">
          <Field value={filename} onChange={(e) => setFilename(e.target.value)} aria-label="New file name" placeholder="combined.pdf" />
        </Row>
      )}
      <Button variant="primary" disabled={busy} onClick={() => void run()}>{busy ? "Working" : mode === "merge" ? "Merge into a new file" : "Insert into a new file"}</Button>
      {error ? <div role="alert" className="text-xs text-destructive">{error}</div> : null}
      {madeFile ? <Button variant="outline" onClick={() => onOpenFile(madeFile)}>Open the new file</Button> : null}
      <FilePickerWindow
        open={picking}
        onClose={() => setPicking(false)}
        scopeId="pdf-workspace-combine"
        title="Choose a PDF"
        initialFilter="pdfs"
        onPick={(selection) => {
          setEntries((l) => [...l, { fileId: selection.fileId, name: selection.details.filename || "PDF", pagesText: "" }]);
          return "close";
        }}
      />
    </div>
  );
}
