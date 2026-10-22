"use client";

/**
 * The Provision window's body: every value available at one call point, for one subject —
 * full value (expand), size, source, missing reason, one-click copy (each value, all as JSON,
 * all as Markdown), and earlier captures of the same point for the same subject.
 */
import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { CopyButtons } from "@/components/agent-copy/CopyButtons";
import { PropertyRow, Select, type SelectOption } from "@ai-matrx/design-system/controls";
import { formatCount } from "@ai-matrx/kit/format";
import { extractErrorMessage } from "@/utils/errors";
import { JsonInspector } from "@/components/official-candidate/json-inspector/JsonInspector";
import { KindValueFrontDoor } from "@/components/official/structured-value/KindValueFrontDoor";
import { valueCarriesKind } from "@/features/content-ir/surfaces/json-kind-signal";
import { kindTextLabel } from "@/features/content-ir/surfaces/kind-text-label";
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

export function ValueRow({ v }: { v: ProvisionValue }) {
  if (v.withheld) {
    // The value stayed on the server (AI Watch off): name and size, never a blank that reads as empty.
    return (
      <PropertyRow
        data-testid={`provision-value-${v.name}`}
        gutter
        label={v.label}
        help={v.source}
        value="Withheld"
        meta={
          <>
            <code className="truncate text-[10px]">{v.name}</code>
            <span className="shrink-0 tabular-nums">{formatCount(v.chars)} chars</span>
          </>
        }
      />
    );
  }
  const text = valueText(v.value);
  const help = v.present ? v.source : `${v.missing_reason ?? "Not available here"} · ${v.source}`;
  const structured = v.present && v.value !== null && typeof v.value === "object";
  // The closed row's one-line summary is the design system's key-by-key glance, which prints
  // `__kind: <slug>` for a kind. A kind-carrying value is summarised by its kind's own label
  // instead (the expanded body below already draws it through the kind door).
  const kindSummary = structured && valueCarriesKind(v.value) ? kindTextLabel(JSON.stringify(v.value)) : null;
  return (
    <PropertyRow
      data-testid={`provision-value-${v.name}`}
      gutter
      label={v.label}
      help={help}
      missing={!v.present}
      value={v.present && !structured ? text : (kindSummary ?? undefined)}
      data={structured && kindSummary === null ? v.value : undefined}
      // A value that carries a kind is drawn as that kind; the raw inspector is for plain data
      // (handing it a kind makes it file the caller as a raw-renderer leak).
      expanded={
        v.present ? valueCarriesKind(v.value) ? <KindValueFrontDoor value={v.value} /> : <JsonInspector data={v.value} /> : undefined
      }
      meta={
        <>
          <code className="truncate text-[10px]">{v.name}</code>
          {v.present ? (
            <>
              <span className="shrink-0 tabular-nums">
                {v.items !== null ? `${v.items} · ` : ""}
                {formatCount(v.chars)} chars
              </span>
              <CopyButtons label={v.label} size="xs" {...({ triggerVariant: "icon" } as Record<string, unknown>)} human={() => text} json={() => v.value} />
            </>
          ) : null}
        </>
      }
    />
  );
}

function ExpectedOutputSection({ expected }: { expected: ExpectedOutput }) {
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
        {example ? (
          <div className="ml-auto">
            <CopyButtons
              label="Expected output"
              size="xs"
              {...({ triggerVariant: "icon" } as Record<string, unknown>)}
              contentFlavor="markdown"
              human={() =>
                ["## Example", "```json", example, "```", ...(schema ? ["", "## Schema", "```json", schema, "```"] : [])].join("\n")
              }
              json={() => expected.example}
            />
          </div>
        ) : null}
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
          <div className="ml-auto">
            <CopyButtons
              label="Provision"
              size="xs"
              {...({ triggerVariant: "icon" } as Record<string, unknown>)}
              contentFlavor="markdown"
              human={() => snapshotMarkdown(snapshot)}
              json={() => JSON.parse(snapshotJson(snapshot)) as unknown}
            />
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
        {snapshot.values.map((v, i) => (
          // A stored snapshot can list one name twice (older captures merged two sources): the index keeps keys unique.
          <ValueRow key={`${v.name}:${i}`} v={v} />
        ))}
        <ExpectedOutputSection expected={snapshot.expectedOutput} />
      </div>
    </div>
  );
}
