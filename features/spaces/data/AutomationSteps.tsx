"use client";

/**
 * AT-AUTO3 — THE VISUAL STEP EDITOR. A person who never codes builds find / update / archive / if-else-if-else / repeat /
 * script / agent / Gmail / text steps by choosing, never by typing JSON or `{{…}}`.
 *
 * - A value that comes from an earlier step is a NAMED CHIP ("Step 2 · First record › Tier"), picked from the token
 *   picker, which lists exactly what the steps before it (and the thing that started the run) hand over. The stored text
 *   is still the engine's `{{step2.first.tier}}`; it is never drawn.
 * - `find` filters with the same condition builder the views use (`ConditionGroup`); a value taken from an earlier step
 *   is a second kind of row, because the shared builder types plain values.
 * - Steps number in the order the engine numbers them: depth-first, a group before its inner steps.
 */
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, Plus, X } from "lucide-react";
import { Button, Input, Select } from "@ai-matrx/design-system/controls";
import { Popover, PopoverContent, PopoverTrigger } from "@ai-matrx/design-system";
import { optionKey, optionLabel, type AutomationTrigger, type Field, type RuleExpression } from "@ai-matrx/records";
import { useOptionalRecordsClient, useTables } from "@ai-matrx/records/react";
import { ConditionGroup, type ConditionField } from "@ai-matrx/records-ui";

import { fetchMandateCatalogue, type MandateCatalogue } from "@/features/mandates/catalogue";
import { useMandateInputSurface } from "@/features/mandates/input-surface";
import { useAppDispatch } from "@/lib/redux/hooks";

/** One step as the editor holds it: the engine's own shape, read loosely because groups carry any kind inside. */
export type Step = { do: string } & Record<string, unknown>;

type Source = { token: string; label: string; group: string; list?: boolean };
type Scoped = { n: number; step: Step };

const str = (v: unknown): string => (typeof v === "string" ? v : "");
const rec = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const arr = (v: unknown): Step[] => (Array.isArray(v) ? (v as Step[]) : []);
const TOKEN = /\{\{\s*([^{}]+?)\s*\}\}/g;
const tok = (path: string) => `{{${path}}}`;

/** How many numbered steps a step is: itself and everything inside it, as the engine numbers them. */
export function stepCount(s: Step): number {
  if (s.do === "if") return 1 + arr(s.else).reduce((n, x) => n + stepCount(x), 0) + (Array.isArray(s.branches) ? (s.branches as Array<{ actions?: Step[] }>).reduce((n, b) => n + arr(b.actions).reduce((m, x) => m + stepCount(x), 0), 0) : 0);
  if (s.do === "for_each") return 1 + arr(s.actions).reduce((n, x) => n + stepCount(x), 0);
  return 1;
}

interface Env {
  tableId: string;
  fields: Field[];
  tables: Array<{ id: string; name: string }>;
  trigger: AutomationTrigger | null;
}
const EnvContext = createContext<Env | null>(null);
const useEnv = () => {
  const e = useContext(EnvContext);
  if (!e) throw new Error("AutomationSteps outside its provider");
  return e;
};

/** The fields of every table named, read once each (the automation's own table is already in hand). */
function useFieldsMap(ids: string[], own: { tableId: string; fields: Field[] }): Record<string, Field[]> {
  const client = useOptionalRecordsClient();
  const [read, setRead] = useState<Record<string, Field[]>>({});
  const want = Array.from(new Set(ids.filter((i) => i && i !== own.tableId))).sort().join(",");
  useEffect(() => {
    if (!client || !want) return;
    let live = true;
    for (const id of want.split(",")) {
      void client.fields({ table_id: id as never }).then((got) => {
        if (live) setRead((now) => ({ ...now, [id]: got.ok ? (got.data ?? []) : [] }));
      });
    }
    return () => {
      live = false;
    };
  }, [client, want]);
  return { ...read, [own.tableId]: own.fields };
}

/** What a step before this one hands over, by name. */
function sourcesOf(n: number, s: Step, fieldsOf: (tableId: string) => Field[], tableName: (id: string) => string): Source[] {
  const g = `Step ${n}`;
  if (s.do === "find") {
    const fs = fieldsOf(str(s.table_id));
    const noun = tableName(str(s.table_id));
    return [
      { token: tok(`step${n}.records`), label: `${g} · ${noun} found`, group: g, list: true },
      { token: tok(`step${n}.first.id`), label: `${g} · First record`, group: g },
      ...fs.map((f) => ({ token: tok(`step${n}.first.${f.key}`), label: `${g} · First record › ${f.label || f.key}`, group: g })),
      { token: tok(`step${n}.count`), label: `${g} · How many found`, group: g },
    ];
  }
  if (s.do === "add_row") return [{ token: tok(`step${n}.record_id`), label: `${g} · New record`, group: g }];
  if (s.do === "run_mandate") return [{ token: tok(`step${n}.output.text`), label: `${g} · Agent answer`, group: g }];
  if (s.do === "script") {
    const names = Array.from(new Set(Array.from(str(s.code).matchAll(/output\.set\(\s*["']([^"']+)["']/g)).map((m) => m[1] ?? "")));
    return names.filter(Boolean).map((k) => ({ token: tok(`step${n}.output.${k}`), label: `${g} · Script answer › ${k}`, group: g }));
  }
  return [];
}

function triggerSources(env: Env): Source[] {
  const on = env.trigger?.on;
  if (on === "webhook") return [];
  if (on === "schedule" || !on) return [];
  return env.fields.map((f) => ({ token: tok(`trigger.${f.key}`), label: `Starting record › ${f.label || f.key}`, group: "Starting record" }));
}

function labelOf(token: string, sources: Source[]): string {
  const hit = sources.find((x) => x.token === token);
  if (hit) return hit.label;
  const path = token.replace(/^\{\{\s*|\s*\}\}$/g, "");
  const m = /^step(\d+)\.(.+)$/.exec(path);
  if (m) return `Step ${m[1]} · ${m[2]?.replace(/^(first|output)\./, "").replace(/\./g, " › ")}`;
  if (path.startsWith("trigger.body.")) return `Webhook › ${path.slice(13)}`;
  if (path.startsWith("trigger.")) return `Starting record › ${path.slice(8)}`;
  if (path.startsWith("item.")) return `Item › ${path.slice(5)}`;
  if (path === "index") return "Position in the list";
  return path;
}

function Pick({ value, onChange, options, label }: { value: string; onChange: (v: string) => void; options: Array<{ value: string; label: string }>; label: string; className?: string }) {
  return <Select aria-label={label} value={value} onValueChange={onChange} options={options} />;
}

/** The token picker: groups of named values, plus a name box for a webhook's own data. */
function SourceMenu({ sources, onPick, webhook, label, listOnly }: { sources: Source[]; onPick: (token: string) => void; webhook: boolean; label: string; listOnly?: boolean }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const shown = listOnly ? sources.filter((s) => s.list) : sources;
  const groups = Array.from(new Set(shown.map((s) => s.group)));
  const pick = (t: string) => {
    onPick(t);
    setOpen(false);
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="quiet" aria-label={label} data-testid="automation-token-picker" icon={<Plus size={12} />}>
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent sizing="content" align="start" className="flex max-h-72 w-72 flex-col gap-1 overflow-auto p-2 text-xs">
        {groups.map((g) => (
          <div key={g} className="flex flex-col">
            <span className="text-muted-foreground">{g}</span>
            {shown
              .filter((s) => s.group === g)
              .map((s) => (
                <Button key={s.token} variant="quiet" data-token={s.token} onClick={() => pick(s.token)}>
                  {s.label.replace(`${g} · `, "")}
                </Button>
              ))}
          </div>
        ))}
        {webhook && !listOnly ? (
          <div className="flex items-center gap-1">
            <Input aria-label="Webhook data name" placeholder="Name of the webhook data" value={name} onChange={(e) => setName(e.target.value)} />
            <Button variant="quiet" disabled={!name.trim()} onClick={() => pick(tok(`trigger.body.${name.trim()}`))}>
              Use
            </Button>
          </div>
        ) : null}
        {webhook && listOnly ? (
          <div className="flex items-center gap-1">
            <Input aria-label="Webhook list name" placeholder="Name of the webhook list" value={name} onChange={(e) => setName(e.target.value)} />
            <Button variant="quiet" disabled={!name.trim()} onClick={() => pick(tok(`trigger.body.${name.trim()}`))}>
              Use
            </Button>
          </div>
        ) : null}
        {shown.length === 0 && !webhook ? <span className="text-muted-foreground">Nothing earlier to use</span> : null}
      </PopoverContent>
    </Popover>
  );
}

function Chip({ label, onRemove }: { label: string; onRemove?: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded border border-border bg-muted px-1 text-xs" data-testid="automation-chip">
      {label}
      {onRemove ? (
        <Button variant="quiet" aria-label={`Remove ${label}`} icon={<X size={10} />} onClick={onRemove} />
      ) : null}
    </span>
  );
}

/** Words with named chips in them. The stored text keeps the engine's tokens; the person only ever sees chips. */
function TokenText({ value, onChange, sources, placeholder, label, single }: { single?: boolean; value: string; onChange: (v: string) => void; sources: Source[]; placeholder?: string; label: string }) {
  const env = useEnv();
  const parts: Array<{ text: string } | { token: string }> = [];
  let last = 0;
  for (const m of value.matchAll(TOKEN)) {
    if ((m.index ?? 0) > last) parts.push({ text: value.slice(last, m.index) });
    parts.push({ token: m[0] });
    last = (m.index ?? 0) + m[0].length;
  }
  const tail = value.slice(last);
  const chips = parts.filter((p): p is { token: string } => "token" in p);
  const lead = parts.filter((p): p is { text: string } => "text" in p).map((p) => p.text).join("");
  // chips first, then the words around them kept as one box: simple, and what is stored is always lead-text + chips + tail
  const rebuild = (text: string, tokens: string[]) => text + tokens.join("");
  return (
    <span className="inline-flex min-w-0 flex-wrap items-center gap-1" data-testid="automation-token-text">
      {chips.map((c, i) => (
        <Chip key={`${c.token}${i}`} label={labelOf(c.token, sources)} onRemove={() => onChange(rebuild(lead + tail, chips.filter((_, j) => j !== i).map((x) => x.token)))} />
      ))}
      <Input aria-label={label} placeholder={chips.length ? "add words" : placeholder} value={lead + tail} onChange={(e) => onChange(rebuild(e.target.value, chips.map((x) => x.token)))} />
      <SourceMenu sources={sources} webhook={env.trigger?.on === "webhook"} label="Use a value" onPick={(t) => onChange(single ? t : rebuild(lead + tail, [...chips.map((x) => x.token), t]))} />
    </span>
  );
}

/** A single named thing: a list or a record taken from an earlier step. */
function TokenPick({ value, onChange, sources, label, listOnly }: { value: string; onChange: (v: string) => void; sources: Source[]; label: string; listOnly?: boolean }) {
  const env = useEnv();
  return (
    <span className="inline-flex flex-wrap items-center gap-1" data-testid="automation-token-pick">
      {value ? <Chip label={labelOf(value, sources)} onRemove={() => onChange("")} /> : <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">Nothing chosen</span>}
      <SourceMenu sources={sources} webhook={env.trigger?.on === "webhook"} label={label} onPick={onChange} listOnly={listOnly} />
    </span>
  );
}

const nameOfTable = (env: Env, id: string) => env.tables.find((t) => t.id === id)?.name ?? "Records";

/** A set of field = value rows (update, add record). */
function ValueRows({ tableFields, values, onChange, sources }: { tableFields: Field[]; values: Record<string, unknown>; onChange: (v: Record<string, unknown>) => void; sources: Source[] }) {
  const entries = Object.entries(values);
  const used = new Set(entries.map(([k]) => k));
  const free = tableFields.filter((f) => !used.has(f.id) && String(f.type) !== "formula" && !(String(f.type) === "text" && String((f as { format?: unknown }).format ?? "") === "button"));
  const setKey = (old: string, next: string) => onChange(Object.fromEntries(entries.map(([k, v]) => (k === old ? [next, v] : [k, v]))));
  const setVal = (k: string, v: unknown) => onChange({ ...values, [k]: v });
  return (
    <div className="flex flex-col gap-1" data-testid="automation-value-rows">
      {entries.map(([k, v]) => {
        const f = tableFields.find((x) => x.id === k);
        const mode = typeof v === "object" && v ? (rec(v).now ? "now" : rec(v).me ? "me" : rec(v).clear ? "clear" : "in_days" in rec(v) ? "days" : "value") : "value";
        return (
          <div key={k} className="flex flex-wrap items-center gap-1">
            <Pick label="Field" value={k} onChange={(n) => setKey(k, n)} options={tableFields.filter((x) => x.id === k || !used.has(x.id)).map((x) => ({ value: x.id, label: x.label || x.key }))} />
            <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">to</span>
            <Pick label="Kind of value" value={mode} onChange={(m) => setVal(k, m === "now" ? { now: true } : m === "me" ? { me: true } : m === "clear" ? { clear: true } : m === "days" ? { in_days: 0 } : "")} options={[{ value: "value", label: "A value" }, { value: "now", label: "Now" }, { value: "me", label: "Me" }, { value: "clear", label: "Empty" }, { value: "days", label: "In some days" }]} className="h-8 w-auto min-w-[6rem] text-xs" />
            {mode === "days" ? <Input aria-label="Days from now" type="number" value={String(rec(v).in_days ?? 0)} onChange={(e) => setVal(k, { in_days: Number(e.target.value) || 0 })} /> : null}
            {mode === "value" ? <ChoiceOrText field={f} value={str(v)} onChange={(t) => setVal(k, t)} sources={sources} /> : null}
            <Button variant="quiet" aria-label="Remove field" icon={<X size={12} />} onClick={() => onChange(Object.fromEntries(entries.filter(([x]) => x !== k)))} />
          </div>
        );
      })}
      {free.length ? (
        <Button variant="quiet" icon={<Plus size={12} />} onClick={() => onChange({ ...values, [free[0]!.id]: "" })}>
          Set a field
        </Button>
      ) : null}
    </div>
  );
}

/** A choice field offers its own choices, by label; anything else takes words and named values. */
function ChoiceOrText({ field, value, onChange, sources }: { field: Field | undefined; value: string; onChange: (v: string) => void; sources: Source[] }) {
  const client = useOptionalRecordsClient();
  const [choices, setChoices] = useState<string[] | null>(null);
  const isList = field && String(field.type) === "list";
  useEffect(() => {
    if (!client || !field || !isList) return;
    let live = true;
    void client.fieldOptions({ field_id: field.id }).then((got) => {
      if (live) setChoices(got.ok ? (got.data ?? []).map((o) => optionLabel(o) ?? optionKey(o)).filter(Boolean) : []);
    });
    return () => {
      live = false;
    };
  }, [client, field, isList]);
  if (choices && choices.length > 0 && !/\{\{/.test(value)) {
    return (
      <span className="inline-flex items-center gap-1">
        <Pick label={`Choice for ${field?.label ?? "field"}`} value={choices.includes(value) ? value : ""} onChange={onChange} options={choices.map((c) => ({ value: c, label: c }))} />
        <SourceMenu sources={sources} webhook={false} label="Use a value" onPick={onChange} />
      </span>
    );
  }
  return <TokenText label={`Value for ${field?.label ?? "field"}`} value={value} onChange={onChange} sources={sources} placeholder="Value" />;
}

const OPS: Array<{ value: string; label: string; needsTo: boolean }> = [
  { value: "equals", label: "is", needsTo: true },
  { value: "not_equals", label: "is not", needsTo: true },
  { value: "contains", label: "contains", needsTo: true },
  { value: "not_contains", label: "does not contain", needsTo: true },
  { value: "gt", label: "is more than", needsTo: true },
  { value: "gte", label: "is at least", needsTo: true },
  { value: "lt", label: "is less than", needsTo: true },
  { value: "lte", label: "is at most", needsTo: true },
  { value: "empty", label: "is empty", needsTo: false },
  { value: "not_empty", label: "is not empty", needsTo: false },
  { value: "is_true", label: "is yes", needsTo: false },
];

interface Cmp {
  value: string;
  is: string;
  to?: unknown;
}

/** "all of / any of" these comparisons — the condition of an if / else-if path. */
function WhenEditor({ when, onChange, sources }: { when: Record<string, unknown>; onChange: (w: Record<string, unknown>) => void; sources: Source[] }) {
  const joiner = Array.isArray(when.any) ? "any" : "all";
  const rows = (Array.isArray(when[joiner]) ? when[joiner] : []) as Cmp[];
  const write = (next: Cmp[], j = joiner) => onChange({ [j]: next });
  return (
    <div className="flex flex-col gap-1" data-testid="automation-when">
      <div className="flex items-center gap-1">
        <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">When</span>
        <Pick label="How these are joined" value={joiner} onChange={(j) => write(rows, j)} options={[{ value: "all", label: "all of these hold" }, { value: "any", label: "any of these holds" }]} />
      </div>
      {rows.map((r, i) => {
        const op = OPS.find((o) => o.value === r.is) ?? OPS[0]!;
        return (
          <div key={i} className="flex flex-wrap items-center gap-1" data-testid="automation-when-row">
            <TokenText single label="Compare" value={str(r.value)} onChange={(v) => write(rows.map((x, j) => (j === i ? { ...x, value: v } : x)))} sources={sources} placeholder="A value" />
            <Pick label="Is" value={op.value} onChange={(is) => write(rows.map((x, j) => (j === i ? { ...x, is } : x)))} options={OPS.map((o) => ({ value: o.value, label: o.label }))} />
            {op.needsTo ? <TokenText label="Compared with" value={str(r.to)} onChange={(to) => write(rows.map((x, j) => (j === i ? { ...x, to } : x)))} sources={sources} placeholder="Value" /> : null}
            <Button variant="quiet" aria-label="Remove condition" icon={<X size={12} />} onClick={() => write(rows.filter((_, j) => j !== i))} />
          </div>
        );
      })}
      <Button variant="quiet" icon={<Plus size={12} />} onClick={() => write([...rows, { value: "", is: "equals", to: "" }])}>
        Add a condition
      </Button>
    </div>
  );
}

/** find's filter: the views' own condition builder, plus rows that compare with a value from an earlier step. */
function FindWhere({ where, onChange, tableFields, sources }: { where: RuleExpression | null; onChange: (w: RuleExpression | null) => void; tableFields: Field[]; sources: Source[] }) {
  const parts: unknown[] = where && (where as { op?: string }).op === "and" ? ((where as unknown as { args: unknown[] }).args ?? []) : where ? [where] : [];
  const isTokenRow = (p: unknown) => {
    const c = rec(rec(p).args instanceof Array ? (rec(p).args as unknown[])[1] : null);
    return typeof c.const === "string" && TOKEN.test(c.const) && ((TOKEN.lastIndex = 0), true);
  };
  const tokenRows = parts.filter(isTokenRow);
  const rest = parts.filter((p) => !isTokenRow(p));
  const restExpr = rest.length === 0 ? null : rest.length === 1 ? (rest[0] as RuleExpression) : ({ op: "and", args: rest } as unknown as RuleExpression);
  const join = (r: unknown[], t: unknown[]) => {
    const all = [...r, ...t];
    onChange(all.length === 0 ? null : all.length === 1 ? (all[0] as RuleExpression) : ({ op: "and", args: all } as unknown as RuleExpression));
  };
  const cfields: ConditionField[] = tableFields.map((f) => ({ id: f.id, key: f.key, label: f.label || f.key, field: f }));
  const rowOf = (p: unknown) => {
    const a = (rec(p).args as unknown[]) ?? [];
    return { op: str(rec(p).op), field: str(rec(a[0]).field), to: str(rec(a[1]).const) };
  };
  const mk = (op: string, field: string, to: string) => ({ op, args: [{ field }, { const: to }] });
  return (
    <div className="flex flex-col gap-1" data-testid="automation-find-where">
      <ConditionGroup lead="Find records where" emptyLabel="every record" expr={restExpr} fields={cfields} onChange={(e) => join(e ? ((e as { op?: string }).op === "and" ? ((e as unknown as { args: unknown[] }).args ?? []) : [e]) : [], tokenRows)} />
      {tokenRows.map((p, i) => {
        const r = rowOf(p);
        return (
          <div key={i} className="flex flex-wrap items-center gap-1" data-testid="automation-find-token-row">
            <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">and</span>
            <Pick label="Field" value={r.field} onChange={(f) => join(rest, tokenRows.map((x, j) => (j === i ? mk(r.op, f, r.to) : x)))} options={tableFields.map((f) => ({ value: f.id, label: f.label || f.key }))} />
            <Pick label="Is" value={r.op} onChange={(op) => join(rest, tokenRows.map((x, j) => (j === i ? mk(op, r.field, r.to) : x)))} options={[{ value: "eq", label: "is" }, { value: "ne", label: "is not" }, { value: "contains", label: "contains" }]} className="h-8 w-auto min-w-[6rem] text-xs" />
            <TokenText label="Matches" value={r.to} onChange={(to) => join(rest, tokenRows.map((x, j) => (j === i ? mk(r.op, r.field, to) : x)))} sources={sources} />
            <Button variant="quiet" aria-label="Remove match" icon={<X size={12} />} onClick={() => join(rest, tokenRows.filter((_, j) => j !== i))} />
          </div>
        );
      })}
      <Button variant="quiet" icon={<Plus size={12} />} onClick={() => join(rest, [...tokenRows, mk("eq", tableFields[0]?.id ?? "", sources[0]?.token ?? "{{trigger.body.value}}")])}>
        Match a value from an earlier step
      </Button>
    </div>
  );
}

function MandateRows({ step, onChange, sources }: { step: Step; onChange: (s: Step) => void; sources: Source[] }) {
  const dispatch = useAppDispatch();
  const [catalogue, setCatalogue] = useState<MandateCatalogue | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    fetchMandateCatalogue(dispatch).then(
      (c) => live && setCatalogue(c),
      (e: unknown) => live && setProblem(e instanceof Error ? e.message : "The agents could not be read."),
    );
    return () => {
      live = false;
    };
  }, [dispatch]);
  const key = str(step.mandate_key);
  const surface = useMandateInputSurface((key || null) as never);
  const vars = rec(step.variables);
  const entries = Object.values(catalogue ?? {}).sort((a, b) => a.label.localeCompare(b.label));
  return (
    <div className="flex flex-col gap-1" data-testid="automation-agent-step">
      {problem ? <p className="text-xs text-destructive">{problem}</p> : null}
      <Pick label="Agent" value={key} onChange={(k) => onChange({ ...step, mandate_key: k, variables: {} })} options={entries.map((m) => ({ value: m.mandate_key, label: m.label }))} className="h-8 w-auto min-w-[14rem] text-xs" />
      {key && surface.status === "ready"
        ? surface.surface.inputs.map((inp) => (
            <div key={inp.name} className="flex flex-wrap items-center gap-1">
              <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">{inp.label || inp.name}</span>
              <TokenText label={inp.label || inp.name} value={str(vars[inp.name])} onChange={(v) => onChange({ ...step, variables: { ...vars, [inp.name]: v } })} sources={sources} placeholder={inp.placeholder ?? ""} />
            </div>
          ))
        : null}
      {key && surface.status === "ready" && surface.surface.acceptsUserInput ? (
        <div className="flex flex-wrap items-center gap-1">
          <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">Message to the agent</span>
          <TokenText label="Message to the agent" value={str(step.input)} onChange={(v) => onChange({ ...step, input: v })} sources={sources} />
        </div>
      ) : null}
      {key && surface.status === "error" ? <p className="text-xs text-destructive">{surface.message}</p> : null}
    </div>
  );
}

const KIND_TITLE: Record<string, string> = {
  find: "Find records",
  update: "Update records",
  archive: "Archive records",
  if: "If / else",
  for_each: "Repeat for each",
  script: "Run a script",
  run_mandate: "Ask an agent",
  gmail: "Send Gmail",
  sms: "Send a text",
  add_row: "Add a record",
  email: "Send email",
  slack: "Slack message",
  webhook: "Webhook",
  notify: "Send notification",
};

function newStep(kind: string, env: Env): Step {
  switch (kind) {
    case "find": return { do: "find", table_id: env.tableId, limit: 50 };
    case "update": return { do: "update", table_id: env.tableId, record: "", values: {} };
    case "archive": return { do: "archive", record: "" };
    case "if": return { do: "if", branches: [{ label: "", when: { all: [{ value: "", is: "equals", to: "" }] }, actions: [] }], else: [] };
    case "for_each": return { do: "for_each", list: "", actions: [] };
    case "script": return { do: "script", code: "", inputs: {} };
    case "run_mandate": return { do: "run_mandate", mandate_key: "", variables: {} };
    case "gmail": return { do: "gmail", to: "", subject: "", body: "" };
    case "sms": return { do: "sms", to: "", message: "" };
    case "add_row": return { do: "add_row", table_id: env.tableId, values: {} };
    case "email": return { do: "email", to: { address: "" }, subject: "", body: "" };
    case "slack": return { do: "slack", url: "", text: "" };
    case "webhook": return { do: "webhook", url: "" };
    default: return { do: "notify", to: { author: true }, text: "" };
  }
}

export const STEP_KINDS = ["find", "update", "archive", "if", "for_each", "add_row", "script", "run_mandate", "gmail", "sms", "email", "slack", "webhook"] as const;

function AddStep({ onAdd, kinds = STEP_KINDS }: { onAdd: (kind: string) => void; kinds?: readonly string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="quiet" icon={<Plus size={14} />} data-testid="automation-add-step">
          Add a step
        </Button>
      </PopoverTrigger>
      <PopoverContent sizing="content" align="start" className="flex w-56 flex-col p-1 text-xs">
        {kinds.map((k) => (
          <Button key={k} variant="quiet" data-step-kind={k} onClick={() => { onAdd(k); setOpen(false); }}>
            {KIND_TITLE[k] ?? k}
          </Button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

/** Everything a step in the list at this place may use: the earlier steps of every enclosing list, plus the item of a repeat. */
interface Scope {
  steps: Scoped[];
  itemFrom: Step | null;
  inLoop: boolean;
}

function StepCard({ n, step, onChange, onRemove, onMove, scope }: { n: number; step: Step; onChange: (s: Step) => void; onRemove: () => void; onMove: (d: -1 | 1) => void; scope: Scope }) {
  const env = useEnv();
  const own = { tableId: env.tableId, fields: env.fields };
  const targetId = str(step.table_id) || env.tableId;
  const scopeTables = scope.steps.map((x) => str(x.step.table_id)).concat(scope.itemFrom ? [str(scope.itemFrom.table_id)] : [], [targetId]);
  const fieldsMap = useFieldsMap(scopeTables, own);
  const tfields = fieldsMap[targetId] ?? [];
  const tableName = (id: string) => nameOfTable(env, id);
  const sources: Source[] = useMemo(() => {
    const out: Source[] = [...triggerSources(env)];
    for (const s of scope.steps) out.push(...sourcesOf(s.n, s.step, (tid) => fieldsMap[tid] ?? [], tableName));
    if (scope.inLoop) {
      const from = scope.itemFrom;
      const lf = from ? (fieldsMap[str(from.table_id)] ?? []) : [];
      out.push({ token: tok("item.id"), label: "Item › Record", group: "Item" }, { token: tok("index"), label: "Position in the list", group: "Item" });
      for (const f of lf) out.push({ token: tok(`item.${f.key}`), label: `Item › ${f.label || f.key}`, group: "Item" });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, env, fieldsMap, targetId]);
  const [open, setOpen] = useState(true);
  const group = step.do === "if" || step.do === "for_each";
  const tableOptions = env.tables.map((t) => ({ value: t.id, label: t.name }));
  const set = (patch: Record<string, unknown>) => onChange({ ...step, ...patch });
  const childScope = (inner: Scoped[], itemFrom: Step | null, inLoop: boolean): Scope => ({ steps: [...scope.steps, ...inner], itemFrom, inLoop: inLoop || scope.inLoop });
  const recordSources = sources.filter((s) => s.list || /\.first\.id$|record_id$|^\{\{item\.id\}\}$|trigger\./.test(s.token));
  return (
    <div className="flex flex-col gap-1 rounded border border-border p-2" data-testid="automation-step" data-step-kind={step.do} data-step-n={n}>
      <div className="flex items-center gap-1">
        {group ? (
          <Button variant="quiet" aria-label={open ? "Collapse" : "Expand"} icon={open ? <ChevronDown size={14} /> : <ChevronRight size={14} />} onClick={() => setOpen(!open)} />
        ) : null}
        <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">Step {n}</span>
        <span className="type-body">{KIND_TITLE[step.do] ?? step.do}</span>
        <span className="flex-1" />
        <Button variant="quiet" aria-label="Move up" icon={<ArrowUp size={12} />} onClick={() => onMove(-1)} />
        <Button variant="quiet" aria-label="Move down" icon={<ArrowDown size={12} />} onClick={() => onMove(1)} />
        <Button variant="quiet" aria-label="Remove step" icon={<X size={14} />} onClick={onRemove} />
      </div>
      {step.do === "find" ? (
        <>
          <div className="flex items-center gap-1">
            <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">In</span>
            <Pick label="Table" value={targetId} onChange={(t) => set({ table_id: t, where: undefined })} options={tableOptions} />
          </div>
          <FindWhere where={(step.where as RuleExpression | undefined) ?? null} onChange={(w) => set({ where: w ?? undefined })} tableFields={tfields} sources={sources} />
        </>
      ) : null}
      {step.do === "update" ? (
        <>
          <div className="flex flex-wrap items-center gap-1">
            <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">In</span>
            <Pick label="Table" value={targetId} onChange={(t) => set({ table_id: t, values: {} })} options={tableOptions} />
            <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">change</span>
            <TokenPick label="Choose records" value={str(step.record)} onChange={(v) => set({ record: v })} sources={recordSources} />
          </div>
          <ValueRows tableFields={tfields} values={rec(step.values)} onChange={(v) => set({ values: v })} sources={sources} />
        </>
      ) : null}
      {step.do === "add_row" ? (
        <>
          <div className="flex items-center gap-1">
            <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">In</span>
            <Pick label="Table" value={targetId} onChange={(t) => set({ table_id: t, values: {} })} options={tableOptions} />
          </div>
          <ValueRows tableFields={tfields} values={rec(step.values)} onChange={(v) => set({ values: v })} sources={sources} />
        </>
      ) : null}
      {step.do === "archive" ? (
        <div className="flex flex-wrap items-center gap-1">
          <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">Archive</span>
          <TokenPick label="Choose records" value={str(step.record)} onChange={(v) => set({ record: v })} sources={recordSources} />
        </div>
      ) : null}
      {step.do === "script" ? (
        <div className="flex flex-col gap-1" data-testid="spaces-automation-script">
          <textarea aria-label="Script" className="min-h-20 w-full rounded border border-border bg-background p-1 font-mono text-xs" placeholder={'output.set("discount", input.total > 500 ? 5 : 0);'} value={str(step.code)} onChange={(e) => set({ code: e.target.value })} />
          {Object.entries(rec(step.inputs)).map(([k, v]) => (
            <div key={k} className="flex flex-wrap items-center gap-1">
              <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">{k}</span>
              <TokenText label={`Input ${k}`} value={str(v)} onChange={(t) => set({ inputs: { ...rec(step.inputs), [k]: t } })} sources={sources} />
              <Button variant="quiet" aria-label={`Remove input ${k}`} icon={<X size={12} />} onClick={() => { const { [k]: _gone, ...keep } = rec(step.inputs); set({ inputs: keep }); }} />
            </div>
          ))}
          <ScriptInputAdd onAdd={(k) => set({ inputs: { ...rec(step.inputs), [k]: "" } })} />
        </div>
      ) : null}
      {step.do === "run_mandate" ? <MandateRows step={step} onChange={onChange} sources={sources} /> : null}
      {step.do === "gmail" ? (
        <div className="flex flex-col gap-1">
          <TokenText label="To" value={str(step.to)} onChange={(v) => set({ to: v })} sources={sources} placeholder="Email address" />
          <TokenText label="Subject" value={str(step.subject)} onChange={(v) => set({ subject: v })} sources={sources} placeholder="Subject" />
          <TokenText label="Message" value={str(step.body)} onChange={(v) => set({ body: v })} sources={sources} placeholder="Message" />
        </div>
      ) : null}
      {step.do === "sms" ? (
        <div className="flex flex-col gap-1">
          <TokenText label="Phone number" value={str(step.to)} onChange={(v) => set({ to: v })} sources={sources} placeholder="Phone number" />
          <TokenText label="Text" value={str(step.message)} onChange={(v) => set({ message: v })} sources={sources} placeholder="Message" />
        </div>
      ) : null}
      {step.do === "email" ? (
        <div className="flex flex-col gap-1">
          <TokenText label="To" value={str(rec(step.to).address)} onChange={(v) => set({ to: { address: v } })} sources={sources} placeholder="Email address" />
          <TokenText label="Subject" value={str(step.subject)} onChange={(v) => set({ subject: v })} sources={sources} placeholder="Subject" />
          <TokenText label="Message" value={str(step.body)} onChange={(v) => set({ body: v })} sources={sources} placeholder="Message" />
        </div>
      ) : null}
      {step.do === "slack" ? (
        <div className="flex flex-col gap-1">
          <Input aria-label="Slack webhook address" placeholder="https://hooks.slack.com/…" value={str(step.url)} onChange={(e) => set({ url: e.target.value })} />
          <TokenText label="Slack message" value={str(step.text)} onChange={(v) => set({ text: v })} sources={sources} placeholder="Message" />
        </div>
      ) : null}
      {step.do === "webhook" ? <Input aria-label="Webhook address" placeholder="https://…" value={str(step.url)} onChange={(e) => set({ url: e.target.value })} /> : null}
      {step.do === "for_each" ? (
        <>
          <div className="flex flex-wrap items-center gap-1">
            <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">For each item in</span>
            <TokenPick label="Choose a list" value={str(step.list)} onChange={(v) => set({ list: v })} sources={sources} listOnly />
          </div>
          {open ? (
            <div className="ml-3 flex flex-col gap-1 border-l border-border pl-2" data-testid="automation-for-each-inner">
              <StepList
                steps={arr(step.actions)}
                onChange={(a) => set({ actions: a })}
                startN={n + 1}
                scope={childScope([], scope.itemFrom, false) && { steps: scope.steps, itemFrom: sourceStep(str(step.list), scope.steps), inLoop: true }}
              />
            </div>
          ) : null}
        </>
      ) : null}
      {step.do === "if" ? (
        open ? (
          <IfEditor step={step} n={n} onChange={onChange} scope={scope} sources={sources} />
        ) : (
          <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">{(Array.isArray(step.branches) ? step.branches.length : 0)} paths</span>
        )
      ) : null}
      {void childScope}
    </div>
  );
}

/** The find step a list token names, so a repeat can offer that table's fields as its item. */
function sourceStep(list: string, steps: Scoped[]): Step | null {
  const m = /^\{\{\s*step(\d+)\.records\s*\}\}$/.exec(list);
  if (!m) return null;
  return steps.find((s) => s.n === Number(m[1]))?.step ?? null;
}

function ScriptInputAdd({ onAdd }: { onAdd: (k: string) => void }) {
  const [name, setName] = useState("");
  return (
    <div className="flex items-center gap-1">
      <Input aria-label="New script input name" placeholder="Name a value the script reads" value={name} onChange={(e) => setName(e.target.value)} />
      <Button variant="quiet" disabled={!/^[A-Za-z_]\w*$/.test(name)} onClick={() => { onAdd(name); setName(""); }}>
        Add input
      </Button>
    </div>
  );
}

function IfEditor({ step, n, onChange, scope, sources }: { step: Step; n: number; onChange: (s: Step) => void; scope: Scope; sources: Source[] }) {
  const branches = (Array.isArray(step.branches) ? step.branches : []) as Array<{ label?: string; when: Record<string, unknown>; actions: Step[] }>;
  const elseSteps = arr(step.else);
  const setBranch = (i: number, patch: Partial<{ label: string; when: Record<string, unknown>; actions: Step[] }>) =>
    onChange({ ...step, branches: branches.map((b, j) => (j === i ? { ...b, ...patch } : b)) });
  // numbers: the group is n; its paths' steps follow in order
  let next = n + 1;
  const starts = branches.map((b) => {
    const s = next;
    next += arr(b.actions).reduce((m, x) => m + stepCount(x), 0);
    return s;
  });
  const elseStart = next;
  const inner: Scope = scope;
  return (
    <div className="flex flex-col gap-2" data-testid="automation-if">
      {branches.map((b, i) => (
        <div key={i} className="ml-1 flex flex-col gap-1 border-l border-border pl-2" data-testid="automation-if-branch">
          <div className="flex items-center gap-1">
            <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">{i === 0 ? "If" : "Else if"}</span>
            <Input aria-label="Path name" placeholder="Name this path" value={str(b.label)} onChange={(e) => setBranch(i, { label: e.target.value })} />
            {branches.length > 1 ? <Button variant="quiet" aria-label="Remove path" icon={<X size={12} />} onClick={() => onChange({ ...step, branches: branches.filter((_, j) => j !== i) })} /> : null}
          </div>
          <WhenEditor when={b.when} onChange={(w) => setBranch(i, { when: w })} sources={sources} />
          <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">Then</span>
          <StepList steps={arr(b.actions)} onChange={(a) => setBranch(i, { actions: a })} startN={starts[i] ?? n + 1} scope={inner} />
        </div>
      ))}
      <Button variant="quiet" icon={<Plus size={12} />} onClick={() => onChange({ ...step, branches: [...branches, { label: "", when: { all: [{ value: "", is: "equals", to: "" }] }, actions: [] }] })}>
        Add an else-if path
      </Button>
      <div className="ml-1 flex flex-col gap-1 border-l border-border pl-2" data-testid="automation-else">
        <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">Otherwise</span>
        <StepList steps={elseSteps} onChange={(a) => onChange({ ...step, else: a })} startN={elseStart} scope={inner} />
      </div>
    </div>
  );
}

/** A list of steps, each numbered as the engine numbers it, each able to use what the steps before it hand over. */
export function StepList({ steps, onChange, startN, scope }: { steps: Step[]; onChange: (s: Step[]) => void; startN: number; scope: Scope }) {
  const env = useEnv();
  let n = startN;
  const cards = steps.map((s, i) => {
    const my = n;
    n += stepCount(s);
    const earlier: Scoped[] = [];
    let m = startN;
    for (let j = 0; j < i; j++) {
      const sj = steps[j]!;
      if (sj.do !== "if" && sj.do !== "for_each") earlier.push({ n: m, step: sj });
      m += stepCount(sj);
    }
    const move = (d: -1 | 1) => {
      const to = i + d;
      if (to < 0 || to >= steps.length) return;
      const copy = steps.slice();
      [copy[i], copy[to]] = [copy[to]!, copy[i]!];
      onChange(copy);
    };
    return (
      <StepCard
        key={i}
        n={my}
        step={s}
        scope={{ steps: [...scope.steps, ...earlier], itemFrom: scope.itemFrom, inLoop: scope.inLoop }}
        onChange={(x) => onChange(steps.map((y, j) => (j === i ? x : y)))}
        onRemove={() => onChange(steps.filter((_, j) => j !== i))}
        onMove={move}
      />
    );
  });
  return (
    <div className="flex flex-col gap-1" data-testid="automation-step-list">
      {cards}
      <AddStep onAdd={(k) => onChange([...steps, newStep(k, env)])} />
    </div>
  );
}

/** One top-level flow step as the panel edits it: the engine's own step, drawn visually. */
export function FlowStepEditor({
  step,
  onChange,
  number,
  before,
  tableId,
  fields,
  trigger,
}: {
  step: Step;
  onChange: (s: Step) => void;
  /** This step's number in the whole automation (the engine numbers depth-first). */
  number: number;
  /** The steps before it, numbered, outside any group (the engine's own order). */
  before: Array<{ n: number; step: Step }>;
  tableId: string;
  fields: Field[];
  trigger: AutomationTrigger | null;
}) {
  const tables = useTables();
  const env: Env = useMemo(() => ({ tableId, fields, trigger, tables: ((tables.data ?? []) as Array<{ id: string; name: string; label_plural?: string | null }>).map((t) => ({ id: t.id, name: t.label_plural || t.name })) }), [tableId, fields, trigger, tables.data]);
  return (
    <EnvContext.Provider value={env}>
      <StepCard n={number} step={step} onChange={onChange} onRemove={() => undefined} onMove={() => undefined} scope={{ steps: before.filter((b) => b.step.do !== "if" && b.step.do !== "for_each"), itemFrom: null, inLoop: false }} />
    </EnvContext.Provider>
  );
}
