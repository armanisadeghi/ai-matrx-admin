"use client";

import { CostDoor } from "@/components/cost/CostDoor";
import { AppCheckText, type AppCheckResult } from "./app-check-line";
import { ProInput } from "@/components/official/ProInput";

/**
 * AUTOMATIONS-AIRTABLE (records 0.99.0): also "record updated" (a set of properties), "matches conditions" / "enters
 * a view" (fires when a row comes to match), "button pressed"; Send email and Slack steps with {Property} tokens; a
 * Test button that runs one automation now on a picked row; each run says its trigger and why a step failed.
 *
 * N9 — Notion's database Automations, on the store's automation door (`@ai-matrx/records` 0.77.1
 * `automation.ts`; records FEATURE.md § "Automations on a table"). A trigger (page added, property edited
 * [to a value], form answered; a date arriving at a time of day, N days before or after; every day, week or month), an optional
 * condition, actions (set, add page, edit pages, notify, webhook, agent), an on/off switch, archive and
 * restore, and each automation's runs with every step's status and words. Properties are named by Field id.
 * Nothing here decides access: every call runs as the person and the store refuses in its own words.
 */
import { createContext, useContext, useEffect, useState } from "react";
import { copyText } from "@ai-matrx/kit/clipboard";
import { Copy, FlaskConical, History, Plus, RotateCcw, Trash2, Undo2, X } from "lucide-react";
import { Button, Input, Switch, TimeField } from "@ai-matrx/design-system/controls";
import { automationWebhookUrl, isAutomationAppTrigger, isButtonField } from "@ai-matrx/records";
import { getJson, postJson, resolveBaseUrl } from "@/lib/python-client";
import type { AutomationAction, AutomationAppTriggerTerms, AutomationItem, AutomationRun, AutomationSpec, AutomationTrigger, AutomationValue, AutomationWeekday, ReadRow, SavedViewRow } from "@ai-matrx/records";
import { useMyLevel, useRecordsClient, type Field } from "@ai-matrx/records/react";
import { whatYouMayDo } from "@ai-matrx/records-ui/helpers";

import { FlowStepEditor, stepCount, type Step } from "./AutomationSteps";
import { useEffectiveKnob } from "@/lib/scoped-config/effectiveKnobs.client";

import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { ReconnectAction } from "./reconnect-action";
import { NEEDS_EDIT_ACCESS } from "@/features/unified-data/needsEditAccess";
/** How many runs the history shows: the `spaces.automation_runs_shown` knob (admin → org → person). */
const RUNS_KNOB = { feature: "spaces", key: "automation_runs_shown" } as const;

type TriggerOn = AutomationTrigger["on"];
type Every = "day" | "week" | "month" | "hour" | "minutes";
type DateWhen = "before" | "on" | "after";
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
type ValueKind = "text" | "now" | "me" | "clear" | "from";
/** One action as the panel edits it; `toAction` turns it into the store's spec. */
type Draft =
  | { kind: "set"; field: string; value: ValueKind; text: string; from: string }
  | { kind: "edit"; whereField: string; whereIs: string; field: string; value: ValueKind; text: string; from: string }
  | { kind: "notify"; to: "author" | string; text: string }
  | { kind: "webhook"; url: string }
  | { kind: "email"; to: "author" | "address" | string; address: string; subject: string; body: string }
  | { kind: "slack"; url: string; text: string }
  | { kind: "agent"; prompt: string }
  /** AT-AUTO2: a script step — JavaScript run by the server in the owner's sandbox; inputs are `name = {{token}}` lines. */
  | { kind: "script"; code: string; inputs: string }
  /** AT-AUTO3: find / update / archive / if-else / repeat / agent / Gmail / text, edited visually (AutomationSteps.tsx). */
  | { kind: "flow"; step: Step };

/** The step kinds the visual flow editor owns. */
const FLOW_DO = new Set(["add_row", "find", "update", "archive", "if", "for_each", "run_mandate", "gmail", "sms", "google_calendar_event", "github_issue", "outlook_mail", "outlook_calendar_event", "teams_message", "slack_post", "app_tool", "document"]);

/** AT-AUTO3: the starting shape of each flow step (the editor fills the rest by choosing). */
const FLOW_BUTTONS: Array<[string, (tableId: string) => Step]> = [
  ["Add page", (t) => ({ do: "add_row", table_id: t, values: {} })],
  ["Find records", (t) => ({ do: "find", table_id: t, limit: 50 })],
  ["Update records", (t) => ({ do: "update", table_id: t, record: "", values: {} })],
  ["Archive records", () => ({ do: "archive", record: "" })],
  ["If / else", () => ({ do: "if", branches: [{ label: "", when: { all: [{ value: "", is: "equals", to: "" }] }, actions: [] }], else: [] })],
  ["Repeat for each", () => ({ do: "for_each", list: "", actions: [] })],
  ["Ask an agent", () => ({ do: "run_mandate", mandate_key: "", variables: {} })],
  ["Send Gmail", () => ({ do: "gmail", to: "", subject: "", body: "" })],
  ["Send a text", () => ({ do: "sms", to: "", message: "" })],
  ["Google Calendar event", () => ({ do: "google_calendar_event", action: "create", title: "", starts_at: "", ends_at: "", attendees: "", description: "" })],
  ["GitHub issue", () => ({ do: "github_issue", repo: "", title: "", body: "", labels: "" })],
  ["Send Outlook email", () => ({ do: "outlook_mail", to: "", subject: "", body: "" })],
  ["Outlook calendar event", () => ({ do: "outlook_calendar_event", action: "create", title: "", starts_at: "", ends_at: "", attendees: "", description: "" })],
  ["Teams message", () => ({ do: "teams_message", channel_link: "", message: "" })],
  ["Post in Slack", () => ({ do: "slack_post", channel: "", message: "" })],
  ["Use a connected app", () => ({ do: "app_tool", connection: "", tool: "", arguments: {} })],
  ["Make a document", () => ({ do: "document", template_id: "", record: "" })],
];

/**
 * A property reference in a script input is `{{<property id or name>}}`. `{{record.x}}` / `{{trigger.record.x}}` are not
 * references the run resolves (the script would get the literal text), so a person who types one is written the working
 * form (AT-FIX-F).
 */
export function workingToken(value: string): string {
  return value.replace(/\{\{\s*(?:trigger\.)?record\.([^{}]+?)\s*\}\}/g, "{{$1}}");
}

export function scriptInputs(lines: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of lines.split("\n")) {
    const at = line.indexOf("=");
    if (at > 0) out[line.slice(0, at).trim()] = workingToken(line.slice(at + 1).trim());
  }
  return out;
}

function valueOf(kind: ValueKind, text: string, from: string): AutomationValue {
  if (kind === "now") return { now: true };
  if (kind === "me") return { me: true };
  if (kind === "clear") return { clear: true };
  if (kind === "from") return { from };
  return text;
}

function toAction(d: Draft, tableId: string, titleField: string): AutomationAction {
  switch (d.kind) {
    case "set":
      return { do: "set", values: { [d.field]: valueOf(d.value, d.text, d.from) } };
    case "edit":
      return { do: "edit_rows", table_id: tableId, where: { op: "eq", args: [{ field: d.whereField }, { const: d.whereIs }] }, values: { [d.field]: valueOf(d.value, d.text, d.from) } };
    case "notify":
      return { do: "notify", to: d.to === "author" ? { author: true } : { field: d.to }, text: d.text };
    case "webhook":
      return { do: "webhook", url: d.url };
    case "email":
      return {
        do: "email",
        to: d.to === "author" ? { author: true } : d.to === "address" ? { address: d.address.trim() } : { field: d.to },
        subject: d.subject,
        body: d.body,
      };
    case "slack":
      return { do: "slack", url: d.url.trim(), text: d.text };
    case "agent":
      return { do: "agent", prompt: d.prompt };
    case "script":
      return { do: "script", code: d.code, inputs: scriptInputs(d.inputs) };
    case "flow":
      return d.step as unknown as AutomationAction;
  }
}

/** Back from the store's spec to the panel's drafts (editing an automation that exists). */
function toDraft(a: AutomationAction, firstField: string): Draft {
  if (FLOW_DO.has(a.do)) return { kind: "flow", step: a as unknown as Step };
  const one = (values: Record<string, AutomationValue>) => {
    const [field, v] = Object.entries(values)[0] ?? [firstField, ""];
    const o = v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
    const value: ValueKind = o?.now ? "now" : o?.me ? "me" : o?.clear ? "clear" : o && "from" in o ? "from" : "text";
    return { field, value, text: o ? "" : String(v ?? ""), from: o && "from" in o ? String(o.from) : firstField };
  };
  switch (a.do) {
    case "set":
      return { kind: "set", ...one(a.values) };
    case "edit_rows": {
      const args = (a.where as { args?: Array<{ field?: string; const?: unknown }> }).args ?? [];
      return { kind: "edit", whereField: args[0]?.field ?? firstField, whereIs: String(args[1]?.const ?? ""), ...one(a.values) };
    }
    case "notify":
      return { kind: "notify", to: "author" in a.to ? "author" : "field" in a.to ? a.to.field : "author", text: a.text };
    case "webhook":
      return { kind: "webhook", url: a.url };
    case "email":
      return {
        kind: "email",
        to: "author" in a.to ? "author" : "address" in a.to ? "address" : "field" in a.to ? a.to.field : "author",
        address: "address" in a.to ? a.to.address : "",
        subject: a.subject,
        body: a.body,
      };
    case "slack":
      return { kind: "slack", url: a.url, text: a.text };
    case "agent":
      return { kind: "agent", prompt: a.prompt };
    case "script":
      return { kind: "script", code: a.code, inputs: Object.entries(a.inputs ?? {}).map(([k, v]) => `${k} = ${String(v)}`).join("\n") };
    default:
      return { kind: "flow", step: a as unknown as Step };
  }
}

/**
 * "Only if <property> is <words>", case-blind and whole, the way a person means it: a choice is stored as its own
 * word ("approved") while she types "Approved". Read back by `condWords`.
 */
const condOf = (field: string, words: string) => ({
  op: "matches",
  args: [{ field }, { const: `(?i)^${words.trim().replace(/[.^$*+?()[\]{}|\\-]/g, "\\$&")}$` }],
});
const condWords = (c: unknown): { field: string | null; words: string } => {
  const top = c as { op?: string; args?: Array<{ op?: string; field?: string; const?: unknown }> } | null | undefined;
  // The store keeps "present AND match" for words (an empty property is "no"); the match is the second part.
  const x = (top?.op === "and" && top.args?.[0]?.op === "present" ? top.args[1] : top) as
    | { op?: string; args?: Array<{ field?: string; const?: unknown }> }
    | null
    | undefined;
  const raw = String(x?.args?.[1]?.const ?? "");
  const words = x?.op === "matches" && raw.startsWith("(?i)^") && raw.endsWith("$") ? raw.slice(5, -1).replace(/\\(.)/g, "$1") : raw;
  return { field: x?.args?.[0]?.field ?? null, words };
};

/**
 * The panel's nouns. Spaces says "page" and "property"; a table says the canonical "record" and "field"
 * (common-docs vocabulary). Only this panel's own literals pass through `say`; a person's names never do.
 */
export type Say = (text: string) => string;
export const spacesSay: Say = (t) => t;
export const tableSay: Say = (t) =>
  t
    .replace(/\bPages\b/g, "Records").replace(/\bpages\b/g, "records")
    .replace(/\bPage\b/g, "Record").replace(/\bpage\b/g, "record")
    .replace(/\bProperty\b/g, "Field").replace(/\bproperty\b/g, "field")
    .replace(/\bProperties\b/g, "Fields").replace(/\bproperties\b/g, "fields");
const SayContext = createContext<Say>(spacesSay);
const useSay = () => useContext(SayContext);

const nameOf = (fields: Field[], id: string | undefined) => fields.find((f) => f.id === id)?.label ?? "a property";

/** A date or date-time property: what "when a date arrives" can wait for. */
const isDateField = (f: Field) => {
  const kind = String((f.config as Record<string, unknown> | undefined)?.["kind"] ?? "");
  return String(f.type) === "range" && (kind === "date" || kind === "datetime");
};

const clock = (at: string | undefined) => at || "09:00";

function describeTrigger(t: AutomationTrigger, fields: Field[], say: Say = spacesSay): string {
  switch (t.on) {
    case "row_added":
      return say("Page added");
    case "form_answered":
      return "Form answered";
    case "property_edited":
      return `${nameOf(fields, t.field)} edited${t.to !== undefined && t.to !== null && t.to !== "" ? ` to ${String(t.to)}` : ""}`;
    case "record_updated":
      return t.fields && t.fields.length > 0 ? `${t.fields.map((id) => nameOf(fields, id)).join(" or ")} updated` : say("Page updated");
    case "record_matches":
      return t.view_id ? "Enters a view" : "Matches conditions";
    case "button_pressed":
      return `${nameOf(fields, t.field)} pressed`;
    case "date_arrives": {
      const n = t.offset_days ?? 0;
      const rel = n === 0 ? "on" : n < 0 ? `${-n}d before` : `${n}d after`;
      return `${nameOf(fields, t.field)} ${rel}, ${clock(t.at)}`;
    }
    case "webhook":
      return "Webhook received";
    case "gmail_received":
      return t.query ? `New Gmail: ${t.query}` : "New Gmail email";
    case "calendar_event":
      return t.when === "created" ? "Calendar event created" : `Calendar event starts${t.minutes_before ? `, ${t.minutes_before} min before` : ""}`;
    case "slack_message":
      return `Slack message in ${t.channel}${t.contains ? ` with "${t.contains}"` : ""}`;
    case "outlook_received":
      return t.query ? `New Outlook email: ${t.query}` : "New Outlook email";
    case "schedule":
      if (t.every === "minutes") return `Every ${t.minutes} minutes`;
      if (t.every === "hour") return `Every ${(t.hours ?? 1) === 1 ? "hour" : `${t.hours} hours`} at :${String(t.minute ?? 0).padStart(2, "0")}`;
      return t.every === "day"
        ? `Every day, ${clock(t.at)}`
        : t.every === "week"
          ? `Every ${WEEKDAYS[(t.weekday ?? 1) - 1]}, ${clock(t.at)}`
          : `Monthly on day ${t.day ?? 1}, ${clock(t.at)}`;
  }
}

export function describeSpec(spec: AutomationSpec, fields: Field[], say: Say = spacesSay): string {
  const when = describeTrigger(spec.trigger, fields, say);
  const does = spec.actions.map((a) => (a.do === "set" ? `set ${Object.keys(a.values).map((id) => nameOf(fields, id)).join(", ")}` : a.do === "add_row" ? say("add page") : a.do === "edit_rows" ? say("edit pages") : a.do === "notify" ? "notify" : a.do === "email" ? "email" : a.do === "slack" ? "Slack" : a.do));
  return `${when} → ${does.join(", ")}`;
}

function Pill({ on, children, onClick, disabledReason }: { on: boolean; children: React.ReactNode; onClick?: () => void; disabledReason?: string }) {
  return (
    <Button variant={on ? "outline" : "quiet"} data-active={on ? "true" : undefined} disabled={Boolean(disabledReason)} title={disabledReason} onClick={onClick}>
      {children}
    </Button>
  );
}

function FieldPills({ fields, value, onPick }: { fields: Field[]; value: string; onPick: (id: string) => void }) {
  return (
    <>
      {fields.map((f) => (
        <Pill key={f.id} on={value === f.id} onClick={() => onPick(f.id)}>
          {f.label || f.key}
        </Pill>
      ))}
    </>
  );
}

function ValueEditor({ fields, d, put, noCopy }: { fields: Field[]; d: { value: ValueKind; text: string; from: string }; put: (p: Partial<{ value: ValueKind; text: string; from: string }>) => void; noCopy?: boolean }) {
  const kinds: Array<[ValueKind, string]> = [["text", "Value"], ["now", "Now"], ["me", "Me"], ["clear", "Empty"], ...(noCopy ? [] : ([["from", "Copy from"]] as Array<[ValueKind, string]>))];
  return (
    <>
      {kinds.map(([k, label]) => (
        <Pill key={k} on={d.value === k} onClick={() => put({ value: k })}>
          {label}
        </Pill>
      ))}
      {d.value === "text" ? <>{/* ui-exception: action value is machine-significant record data */}<Input aria-label="Value" placeholder="Value" value={d.text} onChange={(e) => put({ text: e.target.value })} /></> : null}
      {d.value === "from" ? <FieldPills fields={fields} value={d.from} onPick={(from) => put({ from })} /> : null}
    </>
  );
}

/** What started a run, in the panel's words. */
const RUN_TRIGGER: Record<string, string> = {
  row_added: "Page added",
  property_edited: "Edited",
  form_answered: "Form",
  record_updated: "Updated",
  record_matches: "Matched",
  button_pressed: "Button",
  date_arrives: "Date",
  schedule: "Schedule",
  webhook: "Webhook",
  gmail_received: "Gmail",
  calendar_event: "Calendar",
  slack_message: "Slack",
  outlook_received: "Outlook",
  test: "Test",
};

/** The page's name: its first property, as the row holds it. */
const rowName = (row: ReadRow, key: string | undefined) => {
  const v = key ? (row.document as unknown as Record<string, unknown>)[key] : undefined;
  return typeof v === "string" && v.trim() ? v : "Untitled";
};

/** TEST — Airtable's "Run test": pick a page, run the automation once now on it, show what each step did. */
function TestRun({ automation, tableId, fields, onRan }: { automation: AutomationItem; tableId: string; fields: Field[]; onRan: () => void }) {
  const say = useSay();
  const client = useRecordsClient();
  const scheduled = automation.spec.trigger.on === "schedule";
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<ReadRow[] | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [result, setResult] = useState<{ status: string; says: string | null; steps: Array<{ n: number; do: string; status: string; says: string }> } | null>(null);
  const [busy, setBusy] = useState(false);
  const titleKey = fields[0]?.key;
  useEffect(() => {
    if (scheduled) return;
    let live = true;
    void client.listPage({ table_id: tableId as never, search: search.trim() || null, limit: 8 }).then((got) => {
      if (!live) return;
      if (got.ok) {
        setRows(got.data.rows);
        setProblem(null);
      } else setProblem(got.error.message || say("The pages could not be read."));
    });
    return () => {
      live = false;
    };
  }, [client, tableId, search, scheduled]);
  const run = async (recordId: string | null) => {
    setBusy(true);
    const got = await client.automationTest({ automation_id: automation.id, record_id: recordId as never });
    setBusy(false);
    if (!got.ok) return setProblem(got.error.message || "The test did not run.");
    setResult({ status: got.data.status, says: got.data.says, steps: got.data.steps });
    onRan();
  };
  return (
    <div className="flex flex-col gap-1" data-testid="spaces-automation-test">
      {scheduled ? (
        <Button variant="outline" disabled={busy} onClick={() => void run(null)}>Run once now</Button>
      ) : (
        <>
          <ProInput enableVoice={false} enableCleanup={false} aria-label={say("Find a page")} placeholder={say("Test on a page…")} value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="flex flex-wrap gap-1">
            {(rows ?? []).map((r) => (
              <Button key={r.id} variant="quiet" disabled={busy} onClick={() => void run(r.id)}>
                {rowName(r, titleKey)}
              </Button>
            ))}
          </div>
        </>
      )}
      {problem ? <p className="type-secondary text-destructive">{problem}<ErrorAlchemyMenu error={problem} /></p> : null}
      {result ? (
        <div className="flex flex-col" data-run-status={result.status}>
          <span className="type-secondary"><strong className="capitalize">{result.status}</strong>{result.says ? ` · ${result.says}` : ""}</span>
          {result.steps.map((s) => (
            <span key={s.n} className="type-secondary text-muted-foreground" data-step-status={s.status}>
              {s.n}. {s.do} — {s.status}: {s.says}
              <ReconnectAction says={s.says} />
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function RunHistory({ automationId, limit }: { automationId: string; limit: number }) {
  const say = useSay();
  const client = useRecordsClient();
  const [runs, setRuns] = useState<AutomationRun[] | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    void client.automationRuns({ automation_id: automationId as never, limit }).then((got) => {
      if (!live) return;
      if (got.ok) setRuns(got.data.runs);
      else setProblem(got.error.message || "The runs could not be read.");
    });
    return () => {
      live = false;
    };
  }, [client, automationId, limit]);
  if (problem) return <p className="type-secondary text-destructive">{problem}<ErrorAlchemyMenu error={problem} /></p>;
  if (!runs) return <div aria-busy="true" className="h-6" />;
  // read-gate-exempt: problem returned above; runs stays null when the read fails
  if (runs.length === 0) return <p className="type-secondary text-muted-foreground">No runs yet</p>;
  return (
    <ol className="flex flex-col gap-1" data-testid="spaces-automation-runs">
      {runs.map((r) => (
        <li key={r.run_id} className="flex flex-col" data-run-status={r.status}>
          <span className="type-secondary">
            <strong className="capitalize">{r.status}</strong> · {say(RUN_TRIGGER[r.trigger?.on ?? ""] ?? r.trigger?.on ?? "Run")} · {new Date(r.at).toLocaleString()}
            {r.says ? ` · ${r.says}` : ""}
          </span>
          {r.steps.map((s) => (
            <span key={s.n} className="type-secondary text-muted-foreground" data-step-status={s.status}>
              {s.n}. {s.do} — {s.status}: {s.says}
              <ReconnectAction says={s.says} />
            </span>
          ))}
        </li>
      ))}
    </ol>
  );
}

/** The Automations popover body: the list (on/off, runs, archive / restore), then the editor. */
/** AT-AUTO2: a webhook automation's URL, with a copy button (the secret is part of it). */
function WebhookUrl({ item }: { item: AutomationItem | null }) {
  const url = item ? automationWebhookUrl(resolveBaseUrl(), item) : null;
  if (!url) return <span className="type-secondary text-muted-foreground" data-testid="spaces-automation-webhook-url">URL after saving</span>;
  return (
    <div className="flex min-w-0 items-center gap-1" data-testid="spaces-automation-webhook-url">
      <code className="min-w-0 flex-1 truncate font-mono text-xs">{url}</code>
      <Button variant="quiet" icon={<Copy size={14} />} aria-label="Copy webhook URL" onClick={() => void copyText(url)} />
    </div>
  );
}

/** AT-AUTO2: every save of an automation, newest first; Restore saves that version again. */
function Versions({ automationId, onRestored }: { automationId: string; onRestored: () => void }) {
  const client = useRecordsClient();
  const [revs, setRevs] = useState<{ revision_id: string; at: string; note: string; spec: AutomationSpec }[] | null>(null);
  const [said, setSaid] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    void client.automationRevisions({ automation_id: automationId as never }).then((got) => {
      if (!live) return;
      if (got.ok) setRevs(got.data.revisions as never);
      else setSaid(got.error.message || "The versions could not be read.");
    });
    return () => {
      live = false;
    };
  }, [client, automationId]);
  if (said) return <p className="type-secondary text-destructive">{said}</p>;
  if (!revs) return <div className="h-6" aria-busy="true" />;
  return (
    <div className="flex flex-col gap-0.5" data-testid="spaces-automation-versions">
      {revs.map((r, i) => (
        <div key={r.revision_id} className="flex items-center gap-2 type-secondary">
          <span className="w-36 shrink-0 tabular-nums">{new Date(r.at).toLocaleString()}</span>
          <span className="min-w-0 flex-1 truncate">{r.spec.name}</span>
          {i === 0 ? (
            <span className="text-muted-foreground">Current</span>
          ) : (
            <Button variant="quiet" onClick={() => void client.automationRevisionRestore({ automation_id: automationId as never, revision_id: r.revision_id as never }).then((got) => (got.ok && got.data.ok ? onRestored() : setSaid(got.ok ? "Not restored." : got.error.message || "Not restored.")))}>
              Restore
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * AT-AUTO2: the table's Scripting panel — JavaScript run by hand in the person's own sandbox (the same runner as a
 * script step), with this table's rows as `input.rows`. `output.set("writes", [{ id, values: { <field key>: v } }])`
 * asks for edits; they are applied through the store's own record door, as the person. The script also has
 * `await table.select({ filter, fields, limit })`, `table.create(fields)` and `table.update(id, fields)` on this table,
 * answered by the server as the person.
 */
function TableScripting({ tableId, organizationId }: { tableId: string; organizationId: string | null }) {
  const client = useRecordsClient();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; output: Record<string, unknown>; logs: string[]; error: string | null; wrote?: number; table?: { created: string[]; updated: string[] } | null } | null>(null);
  const run = async () => {
    setBusy(true);
    setResult(null);
    try {
      const page = await client.listPage({ table_id: tableId as never, search: null, limit: 200 });
      const rows = page.ok ? (page.data as unknown as { rows?: unknown[] }).rows ?? page.data : [];
      const { data } = await postJson<{ ok: boolean; output: Record<string, unknown>; logs: string[]; error: string | null; table?: { created: string[]; updated: string[] } | null }>(
        "/automations/script/run",
        { code, table_id: tableId, input: { table_id: tableId, rows } },
        { organizationId: organizationId ?? undefined },
      );
      let wrote = 0;
      const writes = Array.isArray(data.output?.["writes"]) ? (data.output["writes"] as { id: string; values: Record<string, unknown> }[]) : [];
      for (const w of writes.slice(0, 200)) {
        const got = await client.recordUpdate({ record_id: w.id as never, patch: w.values as never });
        if (got.ok) wrote += 1;
      }
      setResult({ ...data, wrote });
    } catch (e) {
      setResult({ ok: false, output: {}, logs: [], error: e instanceof Error ? e.message : "The script did not run." });
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex flex-col gap-1" data-testid="spaces-table-scripting">
      <span className="type-secondary text-muted-foreground">Scripting</span>
      <textarea aria-label="Table script" className="min-h-24 w-full rounded border border-border bg-background p-1 font-mono text-xs" placeholder={'const open = await table.select({ filter: { status: "open" } }); await table.create({ name: "Open", count: open.length });'} value={code} onChange={(e) => setCode(e.target.value)} />
      <div className="flex items-center gap-2">
        <Button variant="quiet" disabled={busy || !code.trim()} onClick={() => void run()}>
          {busy ? "Running" : "Run script"}
        </Button>
        {result ? <span className={result.ok ? "type-secondary" : "type-secondary text-destructive"}>{result.ok ? `Ran${result.wrote ? ` · ${result.wrote} edited` : ""}${result.table?.created.length ? ` · ${result.table.created.length} added` : ""}${result.table?.updated.length ? ` · ${result.table.updated.length} changed` : ""}` : result.error}</span> : null}
      </div>
      {result && (result.logs.length > 0 || Object.keys(result.output).length > 0) ? (
        <pre className="max-h-48 overflow-auto rounded bg-muted p-1 font-mono text-xs" data-testid="spaces-table-scripting-result">
          {[...result.logs, ...(Object.keys(result.output).length ? [JSON.stringify(result.output, null, 2)] : [])].join("\n")}
        </pre>
      ) : null}
    </div>
  );
}

export function AutomationsPanel({ words = "spaces", ...rest }: { tableId: string; organizationId: string | null; fields: Field[]; words?: "spaces" | "table" }) {
  return (
    <SayContext.Provider value={words === "table" ? tableSay : spacesSay}>
      <AutomationsPanelBody {...rest} />
    </SayContext.Provider>
  );
}

/**
 * WHY THE ON/OFF SWITCH (and archive / restore) IS CLOSED, in one short line, or null when it is open. The store's
 * doors (`automation_set_enabled` / `_archive` / `_restore`) ask Edit, so the panel asks Edit, no more (lane
 * AT-UIFIX item 4). A viewer pressing the switch used to get nothing at all. The ladder's own word is said.
 */
export function automationSwitchReason(rights: { known: boolean; level: unknown; organise: boolean }): string | null {
  if (!rights.known) return "Checking your access…";
  if (rights.organise) return null;
  return rights.level === null ? "You don't have access" : NEEDS_EDIT_ACCESS;
}

/**
 * CD-AUTO-11: the closed switch's reason, SAID on the panel — a disabled switch fires no click and its hover title is
 * invisible to a person who just pressed it. Nothing while the access is still being read.
 */
export function SwitchClosedNote({ reason }: { reason: string | null }) {
  if (!reason || reason === "Checking your access…") return null;
  return <p className="type-secondary text-muted-foreground" data-testid="spaces-automation-switch-why">On/off: {reason}</p>;
}

function AutomationsPanelBody({ tableId, organizationId, fields }: { tableId: string; organizationId: string | null; fields: Field[] }) {
  const say = useSay();
  const client = useRecordsClient();
  // The person's level on THIS table (the door's own question); a refusal is an answer: nothing held.
  const mine = useMyLevel(tableId as never);
  const switchReason = automationSwitchReason(whatYouMayDo(mine.error ? null : (mine.data ?? null), !mine.loading));
  const runsShown = Number(useEffectiveKnob(organizationId, null, RUNS_KNOB) ?? 20) || 20;
  const [list, setList] = useState<AutomationItem[] | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [runsOf, setRunsOf] = useState<string | null>(null);
  const [testOf, setTestOf] = useState<string | null>(null);
  const [watch, setWatch] = useState<string[]>([]);
  const [viewId, setViewId] = useState<string | null>(null);
  const [views, setViews] = useState<SavedViewRow[]>([]);
  const [editing, setEditing] = useState<{ id: string | null } | null>(null);
  const [name, setName] = useState("");
  const [on, setOn] = useState<TriggerOn>("row_added");
  const [trigField, setTrigField] = useState("");
  const [trigTo, setTrigTo] = useState("");
  const [dateWhen, setDateWhen] = useState<DateWhen>("before");
  const [dateDays, setDateDays] = useState("2");
  const [at, setAt] = useState("09:00");
  const [every, setEvery] = useState<Every>("week");
  const [weekday, setWeekday] = useState<AutomationWeekday>(1);
  const [monthDay, setMonthDay] = useState("1");
  const [minutesN, setMinutesN] = useState<5 | 10 | 15 | 30>(15);
  const [hoursN, setHoursN] = useState("1");
  const [minuteN, setMinuteN] = useState("0");
  const [gmailQuery, setGmailQuery] = useState("");
  const [calWhen, setCalWhen] = useState<"starts" | "created">("starts");
  const [calLead, setCalLead] = useState("0");
  const [slackChannel, setSlackChannel] = useState("");
  const [slackContains, setSlackContains] = useState("");
  const [appTerms, setAppTerms] = useState<AutomationAppTriggerTerms | null>(null);
  const [checking, setChecking] = useState<string | null>(null);
  // AT-FIX-H 3: what each "Check now" really answered, so the line moves the moment the server answers.
  const [checked, setChecked] = useState<Record<string, AppCheckResult>>({});
  const [versionsOf, setVersionsOf] = useState<string | null>(null);
  const [condField, setCondField] = useState<string | null>(null);
  const [condIs, setCondIs] = useState("");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [said, setSaid] = useState<string | null>(null);
  const firstField = fields[0]?.id ?? "";
  const dateFields = fields.filter(isDateField);
  const buttonFields = fields.filter((f) => isButtonField(f as never));
  // A schedule or a webhook has no triggering row (AT-AUTO2).
  const timed = on === "schedule" || on === "webhook" || isAutomationAppTrigger(on);
  const [epoch, setEpoch] = useState(0);
  // W2-E: what a connected-app check costs, shown before it is switched on.
  useEffect(() => {
    let live = true;
    getJson<AutomationAppTriggerTerms>("/automations/app-triggers/terms", { organizationId: organizationId ?? undefined })
      .then(({ data }) => { if (live) setAppTerms(data); })
      .catch(() => undefined);
    return () => { live = false; };
  }, [organizationId]);
  const syncApp = (a: AutomationItem) => {
    if (isAutomationAppTrigger(a.spec.trigger.on)) {
      void postJson(`/automations/app-triggers/${a.id}/sync`, {}, { organizationId: organizationId ?? undefined }).catch((e: unknown) => setSaid(e instanceof Error ? e.message : "The check schedule did not change."));
    }
  };
  const checkNow = async (a: AutomationItem) => {
    setChecking(a.id);
    try {
      const { data } = await postJson<{ ok?: boolean; says?: string }>(`/automations/app-triggers/${a.id}/check`, {}, { organizationId: organizationId ?? undefined });
      setSaid(data.says ?? null);
      setChecked((was) => ({ ...was, [a.id]: { at: new Date().toISOString(), ok: data.ok !== false, says: data.says ?? null } }));
    } catch (e) {
      setSaid(e instanceof Error ? e.message : "The check did not run.");
    } finally {
      setChecking(null);
      reread();
    }
  };
  const reread = () => setEpoch((n) => n + 1);

  useEffect(() => {
    let live = true;
    void client.automations({ table_id: tableId as never, include_archived: showArchived }).then((got) => {
      if (!live) return;
      if (got.ok) {
        setList(got.data.automations);
        setProblem(null);
      } else setProblem(got.error.message || "The automations could not be read.");
    });
    return () => {
      live = false;
    };
  }, [client, tableId, showArchived, epoch]);

  // A failed-run notice opens /data/<table>?automation=<id>&run=<run>: show that automation's runs.
  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get("automation");
    if (wanted) setRunsOf(wanted);
  }, []);

  useEffect(() => {
    let live = true;
    void client.views({ table_id: tableId as never }).then((got) => {
      if (live && got.ok) setViews(got.data);
    });
    return () => {
      live = false;
    };
  }, [client, tableId]);

  const put = (i: number, patch: Partial<Draft>) => setDrafts(drafts.map((x, j) => (j === i ? ({ ...x, ...patch } as Draft) : x)));
  const startNew = () => {
    setEditing({ id: null });
    setName("");
    setOn("row_added");
    setTrigField(firstField);
    setTrigTo("");
    setDateWhen("before");
    setDateDays("2");
    setAt("09:00");
    setEvery("week");
    setWeekday(1);
    setMonthDay("1");
    setCondField(null);
    setCondIs("");
    setWatch([]);
    setViewId(null);
    setDrafts([]);
    setSaid(null);
  };
  const startEdit = (a: AutomationItem) => {
    const t = a.spec.trigger;
    setEditing({ id: a.id });
    setName(a.spec.name);
    setOn(t.on);
    setTrigField(t.on === "property_edited" || t.on === "date_arrives" || t.on === "button_pressed" ? t.field : firstField);
    setWatch(t.on === "record_updated" ? (t.fields ?? []) : []);
    setViewId(t.on === "record_matches" ? (t.view_id ?? null) : null);
    setTrigTo(t.on === "property_edited" && t.to !== undefined && t.to !== null ? String(t.to) : "");
    const n = t.on === "date_arrives" ? (t.offset_days ?? 0) : 2;
    setDateWhen(n < 0 ? "before" : n > 0 ? "after" : "on");
    setDateDays(String(Math.abs(n)));
    setAt(t.on === "date_arrives" || (t.on === "schedule" && "at" in t) ? clock(t.at) : "09:00");
    setEvery(t.on === "schedule" ? t.every : "week");
    setGmailQuery(t.on === "gmail_received" || t.on === "outlook_received" ? (t.query ?? "") : "");
    setCalWhen(t.on === "calendar_event" ? (t.when ?? "starts") : "starts");
    setCalLead(t.on === "calendar_event" ? String(t.minutes_before ?? 0) : "0");
    setSlackChannel(t.on === "slack_message" ? t.channel : "");
    setSlackContains(t.on === "slack_message" ? (t.contains ?? "") : "");
    setWeekday(t.on === "schedule" && "weekday" in t ? (t.weekday ?? 1) : 1);
    setMonthDay(t.on === "schedule" && "day" in t ? String(t.day ?? 1) : "1");
    if (t.on === "schedule" && t.every === "minutes") setMinutesN(t.minutes);
    if (t.on === "schedule" && t.every === "hour") {
      setHoursN(String(t.hours ?? 1));
      setMinuteN(String(t.minute ?? 0));
    }
    const c = condWords(a.spec.condition);
    setCondField(c.field);
    setCondIs(c.words);
    setDrafts(a.spec.actions.map((x) => toDraft(x, firstField)));
    setSaid(null);
  };
  const flip = async (call: Promise<{ ok: boolean; error?: { message?: string } }>) => {
    const got = await call;
    setSaid(got.ok ? null : got.error?.message || "That did not change.");
    reread();
  };
  const triggerSpec = (): AutomationTrigger => {
    if (on === "property_edited") return { on, field: trigField, ...(trigTo ? { to: trigTo } : {}) };
    if (on === "record_updated") return { on, fields: watch };
    if (on === "record_matches") return viewId ? { on, view_id: viewId } : { on };
    if (on === "button_pressed") return { on, field: trigField };
    if (on === "date_arrives") {
      const n = Math.abs(Math.trunc(Number(dateDays) || 0));
      return { on, field: trigField, offset_days: dateWhen === "before" ? -n : dateWhen === "after" ? n : 0, at };
    }
    if (on === "webhook") return { on };
    if (on === "gmail_received" || on === "outlook_received") return gmailQuery.trim() ? { on, query: gmailQuery.trim() } : { on };
    if (on === "calendar_event") return calWhen === "created" ? { on, when: "created" } : { on, when: "starts", minutes_before: Math.max(0, Math.trunc(Number(calLead) || 0)) };
    if (on === "slack_message") return { on, channel: slackChannel.trim(), ...(slackContains.trim() ? { contains: slackContains.trim() } : {}) };
    if (on === "schedule" && every === "minutes") return { on, every, minutes: minutesN };
    if (on === "schedule" && every === "hour") return { on, every, hours: Math.trunc(Number(hoursN) || 1), minute: Math.trunc(Number(minuteN) || 0) };
    if (on === "schedule") {
      return { on, every: every as "day" | "week" | "month", at, ...(every === "week" ? { weekday } : {}), ...(every === "month" ? { day: Math.trunc(Number(monthDay) || 1) } : {}) };
    }
    return { on };
  };
  const pickTrigger = (next: TriggerOn) => {
    setOn(next);
    if (next === "date_arrives") setTrigField(dateFields[0]?.id ?? "");
    if (next === "button_pressed") setTrigField(buttonFields[0]?.id ?? "");
    if (next === "schedule" || next === "webhook" || isAutomationAppTrigger(next)) setDrafts(drafts.filter((d) => d.kind !== "set"));
  };
  const save = async () => {
    const spec: AutomationSpec = {
      name: name.trim(),
      trigger: triggerSpec(),
      condition: condField && !timed ? condOf(condField, condIs) : null,
      actions: drafts.map((d) => toAction(d, tableId, firstField)),
    };
    const got = await client.automationDeclare({ table_id: tableId as never, spec, automation_id: (editing?.id ?? null) as never });
    if (!got.ok) return setSaid(got.error.message || "The automation was not saved.");
    if (!got.data.ok) return setSaid(Object.values(got.data._errors)[0] ?? "The automation was not saved.");
    setEditing(null);
    // AI on a schedule is saved switched off: the store says so, and the switch on its row turns it on.
    setSaid(got.data.ai_on_schedule ? (got.data.says ?? "Saved switched off.") : null);
    reread();
  };

  if (problem) return <div className="spaces-db-automations" data-testid="spaces-automations" data-state="failed"><p className="type-secondary text-destructive">{problem}<ErrorAlchemyMenu error={problem} /></p></div>;
  if (!list) return <div className="spaces-db-automations h-8" data-testid="spaces-automations" aria-busy="true" />;

  return (
    <div className="spaces-db-automations flex flex-col gap-2" data-testid="spaces-automations" data-state="on">
      {editing ? (
        <div className="flex flex-col gap-2" data-testid="spaces-automation-editor">
          <ProInput aria-label="Automation name" placeholder="Automation name" value={name} onChange={(e) => setName(e.target.value)} />
          <span className="type-secondary text-muted-foreground">When</span>
          <div className="flex flex-wrap gap-1">
            <Pill on={on === "row_added"} onClick={() => pickTrigger("row_added")}>{say("Page added")}</Pill>
            <Pill on={on === "property_edited"} onClick={() => pickTrigger("property_edited")}>{say("Property edited")}</Pill>
            <Pill on={on === "form_answered"} onClick={() => pickTrigger("form_answered")}>Form answered</Pill>
            <Pill on={on === "record_updated"} onClick={() => pickTrigger("record_updated")}>{say("Page updated")}</Pill>
            <Pill on={on === "record_matches"} onClick={() => pickTrigger("record_matches")}>Matches conditions</Pill>
            <Pill on={on === "button_pressed"} onClick={() => pickTrigger("button_pressed")} disabledReason={buttonFields.length === 0 ? say("Add a button property first") : undefined}>Button pressed</Pill>
            <Pill on={on === "date_arrives"} onClick={() => pickTrigger("date_arrives")} disabledReason={dateFields.length === 0 ? say("Add a date property first") : undefined}>Date arrives</Pill>
            <Pill on={on === "schedule"} onClick={() => pickTrigger("schedule")}>Every…</Pill>
            <Pill on={on === "webhook"} onClick={() => pickTrigger("webhook")}>Webhook received</Pill>
            <Pill on={on === "gmail_received"} onClick={() => pickTrigger("gmail_received")}>New Gmail email</Pill>
            <Pill on={on === "calendar_event"} onClick={() => pickTrigger("calendar_event")}>Calendar event</Pill>
            <Pill on={on === "slack_message"} onClick={() => pickTrigger("slack_message")}>Slack message</Pill>
            <Pill on={on === "outlook_received"} onClick={() => pickTrigger("outlook_received")}>New Outlook email</Pill>
          </div>
          {on === "gmail_received" ? (
            <Input aria-label="Gmail search" placeholder="Gmail search, e.g. from:orders@shop.com" value={gmailQuery} onChange={(e) => setGmailQuery(e.target.value)} />
          ) : null}
          {on === "outlook_received" ? (
            <Input aria-label="Outlook search" placeholder="from:orders@shop.com subject:invoice" value={gmailQuery} onChange={(e) => setGmailQuery(e.target.value)} />
          ) : null}
          {on === "calendar_event" ? (
            <div className="flex flex-wrap items-center gap-1" data-testid="spaces-automation-calendar-trigger">
              <Pill on={calWhen === "starts"} onClick={() => setCalWhen("starts")}>Starts</Pill>
              <Pill on={calWhen === "created"} onClick={() => setCalWhen("created")}>Created</Pill>
              {calWhen === "starts" ? <Input aria-label="Minutes before" type="number" min={0} max={1440} className="w-20" value={calLead} onChange={(e) => setCalLead(e.target.value)} /> : null}
              {calWhen === "starts" ? <span className="type-secondary text-muted-foreground">min before</span> : null}
            </div>
          ) : null}
          {on === "slack_message" ? (
            <div className="flex flex-wrap items-center gap-1">
              <Input aria-label="Slack channel" placeholder="Channel" className="w-40" value={slackChannel} onChange={(e) => setSlackChannel(e.target.value)} />
              <Input aria-label="Message contains" placeholder="Contains (optional)" className="w-48" value={slackContains} onChange={(e) => setSlackContains(e.target.value)} />
            </div>
          ) : null}
          {isAutomationAppTrigger(on) ? (
            <span className="type-secondary text-muted-foreground" data-testid="spaces-automation-app-terms">
              {appTerms ? (
                <>
                  {`Saved off · checks every ${appTerms.every_minutes} min `}
                  <CostDoor
                    rows={[
                      { label: "Per check", points: appTerms.points_per_check },
                      { label: "Per month", points: appTerms.points_per_month, prefix: "~" },
                    ]}
                  />
                </>
              ) : "Saved off · checks on a schedule"}
            </span>
          ) : null}
          {on === "date_arrives" ? (
            <div className="flex flex-wrap items-center gap-1" data-testid="spaces-automation-date-trigger">
              <FieldPills fields={dateFields} value={trigField} onPick={setTrigField} />
              <Pill on={dateWhen === "before"} onClick={() => setDateWhen("before")}>Before</Pill>
              <Pill on={dateWhen === "on"} onClick={() => setDateWhen("on")}>On the day</Pill>
              <Pill on={dateWhen === "after"} onClick={() => setDateWhen("after")}>After</Pill>
              {dateWhen !== "on" ? <Input aria-label="Days" type="number" min={0} max={365} className="w-16" value={dateDays} onChange={(e) => setDateDays(e.target.value)} /> : null}
              {dateWhen !== "on" ? <span className="type-secondary">days at</span> : <span className="type-secondary">at</span>}
              <TimeField aria-label="Time" className="w-28" value={at} onValueChange={(v) => setAt(v ?? "")} />
            </div>
          ) : null}
          {on === "schedule" ? (
            <div className="flex flex-wrap items-center gap-1" data-testid="spaces-automation-schedule-trigger">
              <Pill on={every === "day"} onClick={() => setEvery("day")}>Day</Pill>
              <Pill on={every === "week"} onClick={() => setEvery("week")}>Week</Pill>
              <Pill on={every === "month"} onClick={() => setEvery("month")}>Month</Pill>
              <Pill on={every === "hour"} onClick={() => setEvery("hour")}>Hours</Pill>
              <Pill on={every === "minutes"} onClick={() => setEvery("minutes")}>Minutes</Pill>
              {every === "minutes"
                ? ([5, 10, 15, 30] as const).map((m) => (
                    <Pill key={m} on={minutesN === m} onClick={() => setMinutesN(m)}>
                      {m} min
                    </Pill>
                  ))
                : null}
              {every === "hour" ? (
                <>
                  <Input aria-label="Every how many hours" type="number" min={1} max={12} className="w-16" value={hoursN} onChange={(e) => setHoursN(e.target.value)} />
                  <span className="type-secondary">h at minute</span>
                  <Input aria-label="Minute past the hour" type="number" min={0} max={59} className="w-16" value={minuteN} onChange={(e) => setMinuteN(e.target.value)} />
                </>
              ) : null}
              {every === "week"
                ? WEEKDAYS.map((w, i) => (
                    <Pill key={w} on={weekday === i + 1} onClick={() => setWeekday((i + 1) as AutomationWeekday)}>
                      {w}
                    </Pill>
                  ))
                : null}
              {every === "month" ? <Input aria-label="Day of month" type="number" min={1} max={31} className="w-16" value={monthDay} onChange={(e) => setMonthDay(e.target.value)} /> : null}
              {every === "minutes" || every === "hour" ? (
                <span className="type-secondary text-muted-foreground" data-testid="spaces-automation-born-off">Saved off</span>
              ) : (
                <>
                  <span className="type-secondary">at</span>
                  <TimeField aria-label="Time" className="w-28" value={at} onValueChange={(v) => setAt(v ?? "")} />
                </>
              )}
            </div>
          ) : null}
          {on === "webhook" ? <WebhookUrl item={list.find((x) => x.id === editing.id) ?? null} /> : null}
          {on === "record_updated" ? (
            <div className="flex flex-wrap items-center gap-1" data-testid="spaces-automation-watch">
              <Pill on={watch.length === 0} onClick={() => setWatch([])}>{say("Any property")}</Pill>
              {fields.map((f) => (
                <Pill key={f.id} on={watch.includes(f.id)} onClick={() => setWatch(watch.includes(f.id) ? watch.filter((x) => x !== f.id) : [...watch, f.id])}>
                  {f.label || f.key}
                </Pill>
              ))}
            </div>
          ) : null}
          {on === "record_matches" ? (
            <div className="flex flex-wrap items-center gap-1" data-testid="spaces-automation-match">
              <Pill on={viewId === null} onClick={() => setViewId(null)}>Conditions below</Pill>
              {views.map((v) => (
                <Pill key={v.view_id} on={viewId === v.view_id} onClick={() => setViewId(v.view_id)}>
                  Enters {v.name}
                </Pill>
              ))}
            </div>
          ) : null}
          {on === "button_pressed" ? (
            <div className="flex flex-wrap items-center gap-1">
              <FieldPills fields={buttonFields} value={trigField} onPick={setTrigField} />
            </div>
          ) : null}
          {on === "property_edited" ? (
            <div className="flex flex-wrap items-center gap-1">
              <FieldPills fields={fields} value={trigField} onPick={setTrigField} />
              <>{/* ui-exception: trigger value is machine-significant record data */}<Input aria-label="Edited to" placeholder="to any value" value={trigTo} onChange={(e) => setTrigTo(e.target.value)} /></>
            </div>
          ) : null}
          {timed ? null : (
            <>
              <span className="type-secondary text-muted-foreground">Only if</span>
              <div className="flex flex-wrap items-center gap-1">
                {on === "record_matches" && viewId === null ? null : <Pill on={condField === null} onClick={() => setCondField(null)}>Always</Pill>}
                <FieldPills fields={fields} value={condField ?? ""} onPick={setCondField} />
                {condField ? <>{/* ui-exception: comparator value is machine-significant record data */}<Input aria-label="Condition value" placeholder="is" value={condIs} onChange={(e) => setCondIs(e.target.value)} /></> : null}
              </div>
            </>
          )}
          <span className="type-secondary text-muted-foreground">Do</span>
          {drafts.map((d, i) => (
            <div key={i} className="flex flex-wrap items-center gap-1" data-testid="spaces-automation-action">
              <span className="type-secondary text-muted-foreground">{i + 1}.</span>
              {d.kind === "set" ? (
                <>
                  <span className="type-secondary">Set</span>
                  <FieldPills fields={fields} value={d.field} onPick={(field) => put(i, { field })} />
                  <ValueEditor fields={fields} d={d} put={(p) => put(i, p)} />
                </>
              ) : d.kind === "edit" ? (
                <>
                  <span className="type-secondary">{say("Edit pages where")}</span>
                  <FieldPills fields={fields} value={d.whereField} onPick={(whereField) => put(i, { whereField })} />
                  <Input aria-label="Where value" placeholder="is" value={d.whereIs} onChange={(e) => put(i, { whereIs: e.target.value })} />
                  <span className="type-secondary">set</span>
                  <FieldPills fields={fields} value={d.field} onPick={(field) => put(i, { field })} />
                  <ValueEditor fields={fields} d={d} put={(p) => put(i, p)} noCopy={timed} />
                </>
              ) : d.kind === "notify" ? (
                <>
                  <span className="type-secondary">Notify</span>
                  <Pill on={d.to === "author"} onClick={() => put(i, { to: "author" })}>The author</Pill>
                  {(timed ? [] : fields)
                    .filter((f) => /person|member|user/i.test(String(f.type)) || /person|member/i.test(String((f.config as Record<string, unknown> | undefined)?.["kind"] ?? "")))
                    .map((f) => (
                      <Pill key={f.id} on={d.to === f.id} onClick={() => put(i, { to: f.id })}>
                        {f.label}
                      </Pill>
                    ))}
                  <Input aria-label="Notification text" placeholder={say("Message, {{Name}} for a property")} value={d.text} onChange={(e) => put(i, { text: e.target.value })} />
                </>
              ) : d.kind === "webhook" ? (
                <Input aria-label="Webhook address" placeholder="https://" value={d.url} onChange={(e) => put(i, { url: e.target.value })} />
              ) : d.kind === "email" ? (
                <>
                  <span className="type-secondary">Email</span>
                  <Pill on={d.to === "author" } onClick={() => put(i, { to: "author" })}>The author</Pill>
                  <Pill on={d.to === "address"} onClick={() => put(i, { to: "address" })}>An address</Pill>
                  {(timed ? [] : fields)
                    .filter((f) => !isButtonField(f as never))
                    .map((f) => (
                      <Pill key={f.id} on={d.to === f.id} onClick={() => put(i, { to: f.id })}>
                        {f.label}
                      </Pill>
                    ))}
                  {d.to === "address" ? <Input aria-label="Email address" type="email" placeholder="name@company.com" value={d.address} onChange={(e) => put(i, { address: e.target.value })} /> : null}
                  <Input aria-label="Email subject" placeholder={say("Subject, {Name} for a property")} value={d.subject} onChange={(e) => put(i, { subject: e.target.value })} />
                  <Input aria-label="Email message" placeholder={say("Message, {Name} for a property")} value={d.body} onChange={(e) => put(i, { body: e.target.value })} />
                </>
              ) : d.kind === "slack" ? (
                <>
                  <span className="type-secondary">Slack</span>
                  <Input aria-label="Slack webhook address" placeholder="https://hooks.slack.com/…" value={d.url} onChange={(e) => put(i, { url: e.target.value })} />
                  <Input aria-label="Slack message" placeholder={say("Message, {Name} for a property")} value={d.text} onChange={(e) => put(i, { text: e.target.value })} />
                </>
              ) : d.kind === "script" ? (
                <div className="flex w-full flex-col gap-1" data-testid="spaces-automation-script">
                  <span className="type-secondary">Run a script</span>
                  <textarea aria-label="Script" className="min-h-24 w-full rounded border border-border bg-background p-1 font-mono text-xs" placeholder={'output.set("discount", input.total > 500 ? 5 : 0);'} value={d.code} onChange={(e) => put(i, { code: e.target.value })} />
                  <textarea aria-label="Script inputs" className="min-h-10 w-full rounded border border-border bg-background p-1 font-mono text-xs" placeholder="total = {{Total}}" value={d.inputs} onChange={(e) => put(i, { inputs: e.target.value })} />
                </div>
              ) : d.kind === "flow" ? (
                <div className="w-full">
                  <FlowStepEditor
                    step={d.step}
                    onChange={(step) => put(i, { step })}
                    number={1 + drafts.slice(0, i).reduce((n, x) => n + stepCount(toAction(x, tableId, firstField) as unknown as Step), 0)}
                    before={drafts.slice(0, i).map((x, j) => ({ n: 1 + drafts.slice(0, j).reduce((m, y) => m + stepCount(toAction(y, tableId, firstField) as unknown as Step), 0), step: toAction(x, tableId, firstField) as unknown as Step }))}
                    tableId={tableId}
                    fields={fields}
                    trigger={triggerSpec()}
                  />
                </div>
              ) : (
                <>
                  <Input aria-label="Agent prompt" placeholder="Ask an agent" value={d.prompt} onChange={(e) => put(i, { prompt: e.target.value })} />
                  {/* The agent step records the question for a person to run; it spends nothing by itself. */}
                  <span className="type-secondary text-muted-foreground" data-testid="spaces-automation-agent-cost">Waits for a person · runs no AI</span>
                </>
              )}
              <Button variant="quiet" icon={<X size={14} />} aria-label="Remove action" onClick={() => setDrafts(drafts.filter((_, j) => j !== i))} />
            </div>
          ))}
          <div className="flex flex-wrap gap-1">
            {timed ? null : <Button variant="quiet" icon={<Plus size={14} />} onClick={() => setDrafts([...drafts, { kind: "set", field: firstField, value: "text", text: "", from: firstField }])}>{say("Set property")}</Button>}
            <Button variant="quiet" icon={<Plus size={14} />} onClick={() => setDrafts([...drafts, { kind: "edit", whereField: firstField, whereIs: "", field: firstField, value: "text", text: "", from: firstField }])}>{say("Edit pages")}</Button>
            <Button variant="quiet" icon={<Plus size={14} />} onClick={() => setDrafts([...drafts, { kind: "notify", to: "author", text: "" }])}>Send notification</Button>
            <Button variant="quiet" icon={<Plus size={14} />} onClick={() => setDrafts([...drafts, { kind: "email", to: "author", address: "", subject: "", body: "" }])}>Send email</Button>
            <Button variant="quiet" icon={<Plus size={14} />} onClick={() => setDrafts([...drafts, { kind: "slack", url: "", text: "" }])}>Slack message</Button>
            <Button variant="quiet" icon={<Plus size={14} />} onClick={() => setDrafts([...drafts, { kind: "webhook", url: "" }])}>Webhook</Button>
            <Button variant="quiet" icon={<Plus size={14} />} onClick={() => setDrafts([...drafts, { kind: "script", code: "", inputs: "" }])}>Run a script</Button>
            {FLOW_BUTTONS.map(([label, make]) => (
              <Button key={label} variant="quiet" icon={<Plus size={14} />} onClick={() => setDrafts([...drafts, { kind: "flow", step: make(tableId) }])}>
                {say(label)}
              </Button>
            ))}
          </div>
          {said ? <p className="type-secondary text-destructive">{said}</p> : null}
          <div className="flex justify-end gap-1">
            <Button variant="quiet" onClick={() => setEditing(null)}>Cancel</Button>
            <Button variant="primary" disabled={drafts.length === 0 || !name.trim()} onClick={() => void save()}>
              {editing.id ? "Save" : "Create"}
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* read-gate-exempt: problem returns above; the list only exists after the read answered */}
          {list.length === 0 ? <p className="type-secondary text-muted-foreground">No automations</p> : null}
          {list.length > 0 ? <SwitchClosedNote reason={switchReason} /> : null}
          {list.map((a) => (
            <div key={a.id} className="flex flex-col gap-1" data-testid="spaces-automation-row" data-archived={a.archived_at ? "true" : undefined}>
              <div className="flex items-center gap-2">
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => (a.archived_at ? undefined : startEdit(a))}>
                  <div className="type-body truncate">{a.spec.name || a.name}</div>
                  <div className="type-secondary truncate text-muted-foreground">
                    {describeSpec(a.spec, fields, say)}
                    {a.last_run ? ` · last run ${a.last_run.status}` : ""}
                  </div>
                  {a.disabled_reason || a.last_run?.status === "failed" ? (
                    <div className="type-secondary truncate text-destructive" data-testid="spaces-automation-problem">
                      {a.disabled_reason ?? a.last_run?.says}
                      <ErrorAlchemyMenu error={a.disabled_reason ?? a.last_run?.says ?? ""} />
                      <ReconnectAction says={a.disabled_reason ?? a.last_run?.says} />
                    </div>
                  ) : null}
                </button>
                {a.archived_at ? (
                  <Button variant="quiet" icon={<RotateCcw size={14} />} aria-label="Restore automation" disabled={switchReason !== null} title={switchReason ?? undefined} onClick={() => void flip(client.automationRestore({ automation_id: a.id }))} />
                ) : (
                  <>
                    <Switch aria-label="Automation on" checked={a.enabled} disabled={switchReason !== null} title={switchReason ?? undefined} onCheckedChange={(v: boolean) => void flip(client.automationSetEnabled({ automation_id: a.id, enabled: v })).then(() => syncApp(a))} />
                    <Button variant="quiet" icon={<FlaskConical size={14} />} aria-label="Test automation" onClick={() => setTestOf(testOf === a.id ? null : a.id)} />
                    <Button variant="quiet" icon={<History size={14} />} aria-label="Runs" onClick={() => setRunsOf(runsOf === a.id ? null : a.id)} />
                    <Button variant="quiet" icon={<Undo2 size={14} />} aria-label="Versions" onClick={() => setVersionsOf(versionsOf === a.id ? null : a.id)} />
                    <Button variant="quiet" icon={<Trash2 size={14} />} aria-label="Archive automation" disabled={switchReason !== null} title={switchReason ?? undefined} onClick={() => void flip(client.automationArchive({ automation_id: a.id }))} />
                  </>
                )}
              </div>
              {testOf === a.id ? <TestRun automation={a} tableId={tableId} fields={fields} onRan={() => { setRunsOf(null); reread(); }} /> : null}
              {runsOf === a.id ? <RunHistory automationId={a.id} limit={runsShown} /> : null}
              {a.spec.trigger.on === "webhook" ? <WebhookUrl item={a} /> : null}
              {isAutomationAppTrigger(a.spec.trigger.on) && !a.archived_at ? (
                <div className="flex items-center gap-1" data-testid="spaces-automation-app-check">
                  <AppCheckText item={a} result={checked[a.id]} />
                  <Button variant="quiet" disabled={checking === a.id || !a.enabled} title={a.enabled ? undefined : "Switch it on first"} onClick={() => void checkNow(a)}>
                    {checking === a.id ? "Checking…" : "Check now"}
                  </Button>
                </div>
              ) : null}
              {versionsOf === a.id ? <Versions automationId={a.id} onRestored={() => { setVersionsOf(null); reread(); }} /> : null}
            </div>
          ))}
          {said ? <p className="type-secondary text-destructive">{said}</p> : null}
          <div className="flex items-center justify-between gap-1">
            <Button variant="quiet" icon={<Plus size={14} />} onClick={startNew}>New automation</Button>
            <Button variant="quiet" onClick={() => setShowArchived(!showArchived)}>{showArchived ? "Hide archived" : "Show archived"}</Button>
          </div>
          <TableScripting tableId={tableId} organizationId={organizationId} />
        </>
      )}
    </div>
  );
}
