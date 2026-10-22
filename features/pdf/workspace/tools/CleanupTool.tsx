"use client";

/**
 * features/pdf/workspace/tools/CleanupTool.tsx — the workspace's "Regions, images and OCR" tool.
 *
 * Server operations the old demo pages were the only UI for, now real tools on the open file: redact drawn
 * regions, render every page to images (ZIP), and OCR as text. (Scrub, strip metadata, flatten, compress and
 * split already live in the Analysis tool's Doc Ops tab.) Redaction saves a NEW FILE with lineage (the
 * original is never touched) and offers "Open"; the image ZIP downloads; OCR text shows in the panel.
 */
import { useCallback, useState } from "react";
import { Button, Field, Select } from "@ai-matrx/design-system/controls";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@host/lib/toast";
import { streamPdfExtractTextRemote } from "@/features/pdf-extractor/service/streamPdf";
import { usePdfClient } from "../../api/client";
import { cleanupCallFor, fileIdOf, type CleanupOp, type RedactRegion } from "../pdfOps";

export const CLEANUP_OPS = ["redact-regions", "render-all", "ocr-text"] as const;
export type CleanupOpId = (typeof CLEANUP_OPS)[number];

const LABELS: Record<CleanupOpId, string> = {
  "redact-regions": "Redact regions",
  "render-all": "Pages to images (ZIP)",
  "ocr-text": "Recognize text (OCR)",
};

const FORMATS = ["png", "jpg", "jpeg", "webp", "tiff"] as const;
const EMPTY_REGION: RedactRegion = { page_number: 1, x0: 50, y0: 50, x1: 562, y1: 100, replacement: "BLOCK", preserve_text: false };

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}
function Check({ label, value, onChange }: { label: string; value: boolean; onChange(v: boolean): void }) {
  return (
    <label className="flex items-center gap-2 text-xs">
      <Checkbox checked={value} onCheckedChange={(v) => onChange(v === true)} />
      {label}
    </label>
  );
}

export function CleanupTool({ fileId, fileName, onOpenFile }: { fileId: string; fileName: string; onOpenFile(id: string): void }) {
  const client = usePdfClient();
  const [op, setOp] = useState<CleanupOpId>("redact-regions");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [madeFile, setMadeFile] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [reason, setReason] = useState("Manual region redaction");
  const [scrubMeta, setScrubMeta] = useState(true);
  const [regions, setRegions] = useState<RedactRegion[]>([{ ...EMPTY_REGION }]);
  const [dpi, setDpi] = useState("150");
  const [fmt, setFmt] = useState<(typeof FORMATS)[number]>("png");
  const [pagesText, setPagesText] = useState("");
  const [threshold, setThreshold] = useState("100");

  const request = useCallback((): CleanupOp => {
    switch (op) {
      case "redact-regions": return { op, regions, reason, scrubMetadata: scrubMeta };
      case "render-all": {
        const pages = pagesText.trim() ? pagesText.split(/[,\s]+/).flatMap((t) => (/^\d+$/.test(t) ? [Number(t)] : [])) : null;
        return { op, dpi: Math.min(600, Math.max(36, Number(dpi) || 150)), fmt, jpegQuality: 85, pages };
      }
      case "ocr-text": return { op, threshold: Number(threshold) || 100 };
    }
  }, [op, reason, regions, scrubMeta, dpi, fmt, pagesText, threshold]);

  const run = async () => {
    setBusy(true);
    setError(null);
    setMadeFile(null);
    setText(null);
    try {
      const call = cleanupCallFor(fileId, request());
      if (call.kind === "file") {
        const response = await client.postJson<unknown>(call.endpoint, call.body);
        const id = fileIdOf(response);
        if (!id) throw new Error("The server finished but did not say where it saved the new file.");
        setMadeFile(id);
      } else if (call.kind === "zip") {
        const out = await client.postPdfBlob(call.endpoint, call.body);
        const url = URL.createObjectURL(out.blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = out.filename.endsWith(".zip") ? out.filename : `${fileName.replace(/\.pdf$/i, "")}-pages.zip`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
        toast.success("The page images are downloading.");
      } else {
        const done = await streamPdfExtractTextRemote({ body: call.body as never });
        setText(String((done as { text_content?: string }).text_content ?? ""));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "That did not work.");
    } finally {
      setBusy(false);
    }
  };

  const patchRegion = (i: number, patch: Partial<RedactRegion>) => setRegions((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const num = (v: string) => (Number.isFinite(Number(v)) ? Number(v) : 0);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto p-3" data-pdf-cleanup="">
      <Row label="Operation">
        <Select<CleanupOpId>
          value={op}
          onValueChange={(v) => { setOp(v); setMadeFile(null); setText(null); setError(null); }}
          aria-label="Clean-up operation"
          className="w-full"
          options={CLEANUP_OPS.map((id) => ({ value: id, label: LABELS[id] }))}
        />
      </Row>
      {op === "redact-regions" ? (
        <Row label="Reason (kept in the audit trail)">
          <Field value={reason} onChange={(e) => setReason(e.target.value)} aria-label="Reason" />
        </Row>
      ) : null}
      {op === "redact-regions" ? (
        <div className="flex flex-col gap-3">
          {regions.map((r, i) => (
            <div key={i} className="flex flex-col gap-2 rounded-md border border-border p-2">
              <div className="grid grid-cols-5 gap-1">
                {(["page_number", "x0", "y0", "x1", "y1"] as const).map((k) => (
                  <Field key={k} type="number" value={String(r[k])} aria-label={`Region ${i + 1} ${k === "page_number" ? "page" : k}`} onChange={(e) => patchRegion(i, { [k]: num(e.target.value) } as Partial<RedactRegion>)} />
                ))}
              </div>
              <div className="flex items-center justify-between gap-2">
                <Select<"BLOCK" | "REMOVE">
                  value={r.replacement}
                  onValueChange={(v) => patchRegion(i, { replacement: v })}
                  aria-label={`Region ${i + 1} replacement`}
                  options={[{ value: "BLOCK", label: "Black box" }, { value: "REMOVE", label: "Remove" }]}
                />
                <Button variant="quiet" onClick={() => setRegions((rs) => rs.filter((_, idx) => idx !== i))} disabled={regions.length < 2}>Remove region</Button>
              </div>
            </div>
          ))}
          <Button variant="outline" onClick={() => setRegions((rs) => [...rs, { ...EMPTY_REGION }])}>Add region</Button>
          <Check label="Strip metadata too" value={scrubMeta} onChange={setScrubMeta} />
        </div>
      ) : null}
      {op === "render-all" ? (
        <div className="flex flex-col gap-2">
          <Row label="Resolution (dpi)"><Field type="number" min={36} max={600} value={dpi} onChange={(e) => setDpi(e.target.value)} aria-label="Resolution" /></Row>
          <Row label="Format">
            <Select<(typeof FORMATS)[number]> value={fmt} onValueChange={setFmt} aria-label="Image format" className="w-full" options={FORMATS.map((f) => ({ value: f, label: f }))} />
          </Row>
          <Row label="Pages (blank = all)"><Field value={pagesText} onChange={(e) => setPagesText(e.target.value)} aria-label="Pages" placeholder="1, 3, 5" /></Row>
        </div>
      ) : null}
      {op === "ocr-text" ? (
        <Row label="Use OCR on pages with fewer characters than">
          <Field type="number" min={0} value={threshold} onChange={(e) => setThreshold(e.target.value)} aria-label="OCR threshold" />
        </Row>
      ) : null}
      <Button variant="primary" disabled={busy} onClick={() => void run()}>{busy ? "Working" : op === "ocr-text" ? "Recognize text" : op === "render-all" ? "Download images" : "Make a clean copy"}</Button>
      {error ? <div role="alert" className="text-xs text-destructive">{error}</div> : null}
      {madeFile ? <Button variant="outline" onClick={() => onOpenFile(madeFile)}>Open the new file</Button> : null}
      {text !== null ? (
        <textarea readOnly aria-label="Recognized text" value={text || "No text was found."} className="min-h-40 w-full flex-1 resize-none rounded-md border border-border bg-background p-2 text-xs" />
      ) : null}
    </div>
  );
}
