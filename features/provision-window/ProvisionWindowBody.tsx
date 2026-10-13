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
  return (
    <div className="border-b border-border/60 py-1.5" data-testid={`provision-value-${v.name}`}>
      {/* Line 1: the label (help on its info icon), the code name faint on the right. */}
      <div className="flex items-center gap-1.5 text-xs">
        <button
          type="button"
          className="flex min-w-0 items-center gap-1.5 text-left disabled:cursor-default"
          disabled={!v.present}
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
        >
          {v.present ? (
            open ? <ChevronDown className="size-3.5 shrink-0" /> : <ChevronRight className="size-3.5 shrink-0" />
          ) : (
            <span className="size-3.5 shrink-0" />
          )}
          <span className="truncate font-medium text-muted-foreground">{v.label}</span>
        </button>
        <span title={help} aria-label={help} className="shrink-0 cursor-help text-muted-foreground/60 hover:text-muted-foreground">
          <Info className="size-3" />
        </span>
        <code className="ml-auto truncate text-[10px] text-muted-foreground/60">{v.name}</code>
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
      {/* Line 2: the value — the strongest thing on the row, styled as data. */}
      {!v.present ? (
        <div className="ml-5 mt-0.5 text-xs italic text-muted-foreground">Missing</div>
      ) : open ? (
        <JsonInspector data={v.value} />
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="ml-5 mt-0.5 block w-[calc(100%-1.25rem)] truncate rounded bg-muted/60 px-1.5 py-0.5 text-left font-mono text-xs text-foreground hover:bg-muted"
        >
          {text.slice(0, 300)}
        </button>
      )}
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
      {expected.note ? <div className="pl-5 text-[11px] text-muted-foreground">{expected.note}</div> : null}
      {open && example ? (
        // The expected output IS a kind's source, shown on purpose (kind-leak sentinel exemption).
        <div data-kind-source="explicit">
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
