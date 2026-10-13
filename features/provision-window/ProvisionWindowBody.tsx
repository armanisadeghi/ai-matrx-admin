"use client";

/**
 * The Provision window's body: every value available at one call point, for one subject —
 * full value (expand), size, source, missing reason, one-click copy (each value, all as JSON,
 * all as Markdown), and earlier captures of the same point for the same subject.
 */
import { copyText } from "@ai-matrx/kit/clipboard";
import { useEffect, useState } from "react";
import { Check, ChevronDown, ChevronRight, Copy, Info } from "lucide-react";
import { Button, Select, type SelectOption } from "@ai-matrx/design-system/controls";
import { formatCount } from "@ai-matrx/kit/format";
import { extractErrorMessage } from "@/utils/errors";
import { JsonInspector } from "@/components/official-candidate/json-inspector/JsonInspector";
import {
  TRIGGER_LABEL,
  listProvisionSnapshots,
  loadProvisionSnapshot,
  snapshotJson,
  snapshotMarkdown,
  valueText,
  valueSummary,
  type ExpectedOutput,
  type ProvisionSnapshot,
  type ProvisionValue,
} from "./data";

function useCopy(): [string | null, (key: string, text: string) => void] {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = (key: string, text: string) => {
    void copyText(text).then((ok) => {
      if (!ok) return;
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
    });
  };
  return [copied, copy];
}

function ValueRow({ v, copied, copy }: { v: ProvisionValue; copied: string | null; copy: (k: string, t: string) => void }) {
  const [open, setOpen] = useState(false);
  const text = valueText(v.value);
  const help = v.present ? v.source : `${v.missing_reason ?? "Not available here"} · ${v.source}`;
  const structured = v.present && v.value !== null && typeof v.value === "object";
  return (
    // Two columns: the expand arrow in its own 16px margin, then label and value on ONE left edge.
    <div className="grid grid-cols-[1rem_minmax(0,1fr)] gap-x-1 border-b border-border/60 py-2" data-testid={`provision-value-${v.name}`}>
      <div className="flex h-4 items-center">
        {v.present ? (
          <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={open ? `Collapse ${v.label}` : `Expand ${v.label}`} className="rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
            {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
          </button>
        ) : null}
      </div>
      <div className="flex h-4 min-w-0 items-center gap-1.5 text-[11px]">
        <span className="truncate font-medium text-muted-foreground">{v.label}</span>
        <span title={help} aria-label={help} className="shrink-0 cursor-help text-muted-foreground/60 hover:text-muted-foreground">
          <Info className="size-3" />
        </span>
        <code className="ml-auto truncate text-[10px] text-muted-foreground/70">{v.name}</code>
        {v.present ? (
          <>
            <span className="shrink-0 tabular-nums text-[11px] text-muted-foreground/70">
              {v.items !== null ? `${v.items} · ` : ""}
              {formatCount(v.chars)} chars
            </span>
            <button
              type="button"
              className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label={`Copy ${v.label}`}
              onClick={() => copy(v.name, text)}
            >
              {copied === v.name ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            </button>
          </>
        ) : null}
      </div>
      <div className={open ? "col-start-2 mt-1 min-w-0" : "col-start-2 mt-0.5 flex h-5 min-w-0 items-center"}>
        {!v.present ? (
          <span className="inline-flex items-center rounded border border-border px-1.5 text-[10px] font-medium leading-4 text-muted-foreground">
            Not provided
          </span>
        ) : open ? (
          <JsonInspector data={v.value} />
        ) : (
          <button type="button" onClick={() => setOpen(true)} className="block max-w-full truncate rounded-sm text-left text-sm leading-5 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {structured ? valueSummary(v.value) : text}
          </button>
        )}
      </div>
    </div>
  );
}

function ExpectedOutputSection({
  expected,
  copied,
  copy,
}: {
  expected: ExpectedOutput;
  copied: string | null;
  copy: (k: string, t: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const example = expected.example === null ? "" : JSON.stringify(expected.example, null, 2);
  const schema = expected.jsonSchema === null ? "" : JSON.stringify(expected.jsonSchema, null, 2);
  return (
    <section className="border-t-2 border-border py-2" data-testid="provision-expected-output" aria-label="Expected output">
      <div className="flex items-center gap-2 text-xs">
        <button type="button" className="flex items-center gap-1.5 font-semibold" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
          Expected output
        </button>
        {expected.kind ? <code className="text-[11px] text-muted-foreground">{expected.kind}</code> : null}
        <div className="ml-auto flex gap-1">
          {example ? (
            <Button variant="outline" onClick={() => copy("__example", example)}>
              {copied === "__example" ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              Example
            </Button>
          ) : null}
          {schema ? (
            <Button variant="outline" onClick={() => copy("__schema", schema)}>
              {copied === "__schema" ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              Schema
            </Button>
          ) : null}
        </div>
      </div>
      {expected.note ? <div className="mb-2 pl-5 text-[11px] text-muted-foreground">{expected.note}</div> : null}
      {open && example ? (
        // The expected output IS a kind's source, shown on purpose (kind-leak sentinel exemption).
        <div data-kind-source="explicit" className="pl-5">
          <JsonInspector data={expected.example} />
        </div>
      ) : null}
      {!example ? <div className="pl-5 text-[11px] text-muted-foreground">No example yet</div> : null}
    </section>
  );
}

export function ProvisionWindowBody({ snapshotId }: { snapshotId: string }) {
  const [currentId, setCurrentId] = useState(snapshotId);
  const [snapshot, setSnapshot] = useState<ProvisionSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<SelectOption[]>([]);
  const [copied, copy] = useCopy();

  useEffect(() => setCurrentId(snapshotId), [snapshotId]);

  useEffect(() => {
    let live = true;
    setError(null);
    loadProvisionSnapshot(currentId).then(
      (s) => {
        if (!live) return;
        setSnapshot(s);
        if (s.subjectId)
          void listProvisionSnapshots(s.pointKey, s.subjectId).then((rows) => {
            if (live)
              setHistory(
                rows.map((r) => ({
                  value: r.id,
                  label: `${TRIGGER_LABEL[r.trigger] ?? r.trigger} · ${new Date(r.createdAt).toLocaleString()} · ${formatCount(r.totalChars)} chars`,
                })),
              );
          });
      },
      (e: unknown) => live && setError(extractErrorMessage(e)),
    );
    return () => {
      live = false;
    };
  }, [currentId]);

  if (error) return <div className="p-3 text-xs text-destructive">{error}</div>;
  if (!snapshot) return <div className="p-3 text-xs text-muted-foreground">Loading</div>;

  const present = snapshot.values.filter((v) => v.present).length;
  return (
    <div className="flex min-h-0 flex-1 flex-col" data-testid="provision-window">
      <div className="flex flex-col gap-1 border-b border-border p-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-medium">{snapshot.subjectLabel}</span>
          <span className="rounded bg-muted px-1.5 py-0.5 text-[11px]">{TRIGGER_LABEL[snapshot.trigger] ?? snapshot.trigger}</span>
          <span className="text-muted-foreground">
            {present} of {snapshot.values.length} values · {formatCount(snapshot.totalChars)} chars
          </span>
          <div className="ml-auto flex gap-1">
            <Button variant="outline" onClick={() => copy("__json", snapshotJson(snapshot))}>
              {copied === "__json" ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              JSON
            </Button>
            <Button variant="outline" onClick={() => copy("__md", snapshotMarkdown(snapshot))}>
              {copied === "__md" ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              Markdown
            </Button>
          </div>
        </div>
        {snapshot.codeLocation ? (
          <code className="truncate text-[11px] text-muted-foreground" title={snapshot.codeLocation}>
            {snapshot.codeLocation}
          </code>
        ) : null}
        {history.length > 1 ? (
          <Select aria-label="Capture" value={currentId} options={history} onValueChange={(v) => v && setCurrentId(v)} />
        ) : null}
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-2">
        {snapshot.values.map((v) => (
          <ValueRow key={v.name} v={v} copied={copied} copy={copy} />
        ))}
        <ExpectedOutputSection expected={snapshot.expectedOutput} copied={copied} copy={copy} />
      </div>
    </div>
  );
}
