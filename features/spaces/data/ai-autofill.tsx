"use client";

// features/spaces/data/ai-autofill.tsx — Notion's AI autofill property (mandate `spaces.autofill`).
//
// An AI property is a real text column of the table plus its job, kept on the database block
// (`props.aiFields`: kind summary | keywords | translation | custom, the instruction or language). The block's
// view settings carry the doors: "AI autofill" adds one; under each AI property, "Fill all" fills the empty
// cells and "Refresh" rewrites every cell. Each cell is ONE run of the mandate with that row as markdown
// (`row_markdown`) — never the table, never another row — and the answer is written to that row's cell.

import { readVersionNow, updateRecordAt } from "@/lib/records/record-versions";
import { Button, Field, Select, Textarea } from "@ai-matrx/design-system/controls";
import { useLiveAgentRun } from "@ai-matrx/chat/agents/hooks/useLiveAgentRun";
import { useDeclaredSurfaceMandates } from "@ai-matrx/chat/surfaces/runtime/surface-mandates";
import { presetInstruction, presetsFor, aiFieldPreset, type AiPresetKey } from "@ai-matrx/records";
import type { RecordsClient } from "@ai-matrx/records/core";
import type { Field as RecordField } from "@ai-matrx/records/react";
import { RefreshCw, Wand2 } from "lucide-react";
import { useState } from "react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { selectActiveOrganizationId } from "@/features/scopes/redux/selectors/active-context";
import { useAppSelector } from "@/lib/redux/hooks";
import { toast } from "@/lib/toast";

import { AUTOFILL_KEY } from "../ai/spaces-ai";
import { MenuRow } from "./menu-parts";
import type { AiFieldSpec, AutofillKind } from "./sources";

// ONE preset list with the table page's "Let AI fill" (@ai-matrx/records AI_FIELD_PRESETS). A Spaces property is always a plain text
// column, so Categorize (a choice column) and Describe image (an attachment column) are not offered here.
const PRESETS = presetsFor({ targetIsChoice: false, hasAttachmentColumn: false });
type PresetPick = AiPresetKey | "custom";

const cell = (v: unknown): string => {
  if (v === null || v === undefined) return "";
  if (Array.isArray(v)) return v.map(cell).filter(Boolean).join(", ");
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    return cell(o.label ?? o.name ?? o.title ?? o.value ?? o.text ?? "");
  }
  return String(v);
};

/** One row as the agent reads it: its title, every other property as "Name: value", never the AI cells. */
export function rowMarkdown(fields: Array<Pick<RecordField, "key" | "label">>, doc: Record<string, unknown>, aiKeys: string[]): string {
  const rest = fields.filter((f) => !aiKeys.includes(f.key));
  const title = rest[0] ? cell(doc[rest[0].key]) : "";
  const lines = [`# ${title || "Untitled"}`];
  for (const f of rest.slice(1)) lines.push(`${f.label}: ${cell(doc[f.key])}`);
  const body = cell(doc.body ?? doc.page_body ?? "");
  if (body) lines.push("", body);
  return lines.join("\n");
}

export function AutofillRows({
  tableId,
  databaseName,
  fields,
  aiFields,
  client,
  organizationId: tableOrganizationId,
  onAiFields,
}: {
  tableId: string;
  databaseName: string;
  fields: RecordField[];
  aiFields: AiFieldSpec[];
  client: RecordsClient;
  /** The table's own organization: what each autofill run is filed in (never the active one). */
  organizationId: string | null;
  onAiFields: (next: AiFieldSpec[]) => void;
}) {
  useDeclaredSurfaceMandates(AUTOFILL_KEY ? [{ mandateKey: AUTOFILL_KEY, does: "fills AI autofill properties row by row" }] : []);
  const live = useLiveAgentRun();
  // org-filter: server-call each autofill run executes in the organization the person works in
  const activeOrg = useAppSelector(selectActiveOrganizationId);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [name, setName] = useState("AI summary");
  const [pick, setPick] = useState<PresetPick>("summarize");
  const [instruction, setInstruction] = useState("");
  if (!AUTOFILL_KEY) return null;
  const key = AUTOFILL_KEY;

  const fill = async (spec: AiFieldSpec, onlyEmpty: boolean) => {
    setBusy(spec.key);
    let done = 0;
    try {
      if (!tableOrganizationId) throw new Error("This table's organization isn't known yet, so the fill can't start.");
      const organizationId = tableOrganizationId;
      const page = await client.listPage({ table_id: tableId, limit: 200 });
      if (!page.ok) throw new Error(page.error.message);
      const aiKeys = aiFields.map((f) => f.key);
      for (const row of page.data.rows) {
        const doc = (row.document ?? {}) as Record<string, unknown>;
        if (onlyEmpty && cell(doc[spec.key]).trim()) continue;
        const out = await live.run<unknown>({
          mandateKey: key,
          variables: {
            fill_kind: spec.kind,
            row_markdown: rowMarkdown(fields, doc, aiKeys),
            property_name: spec.label,
            instruction: spec.instruction ?? "",
            target_language: spec.language ?? "",
            database_name: databaseName,
          },
          organizationId,
          initiation: "user",
          expect: "text",
          surfaceName: null,
          sourceFeature: "documents",
          surfaceKey: "spaces-page",
        });
        const value = typeof out === "string" ? out.trim() : "";
        if (!value) continue;
        const wrote = await updateRecordAt(client, { record_id: row.id, patch: { [spec.key]: value }, version: await readVersionNow(client, row.id) });
        if (!wrote.ok) throw new Error(wrote.error.message);
        done += 1;
      }
      toast.success(done === 1 ? `${spec.label}: 1 row filled` : `${spec.label}: ${done} rows filled`);
    } catch (err) {
      toast.error(`${spec.label} could not be filled`, { description: err instanceof Error ? err.message : undefined });
    } finally {
      setBusy(null);
    }
  };

  const add = async (): Promise<void> => {
    const label = name.trim();
    if (!label) return;
    const fieldKey = `ai_${label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")}_${Date.now().toString(36).slice(-4)}`;
    const made = await client.fieldDeclare({ table_id: tableId, spec: { key: fieldKey, label, type: "text", sort: 5000 } });
    if (!made.ok) {
      toast.error(`${label} could not be added`, { description: made.error.message });
      return;
    }
    const preset = pick === "custom" ? undefined : aiFieldPreset(pick);
    const answer = instruction.trim();
    const kind: AutofillKind = preset ? preset.autofillKind : "custom";
    const written = preset && kind === "custom" ? presetInstruction(preset.key, { answer }) : null;
    const spec: AiFieldSpec = { key: fieldKey, label, kind, ...(kind === "custom" ? { instruction: written ?? answer } : {}), ...(kind === "translation" ? { language: answer || "Spanish" } : {}) };
    onAiFields([...aiFields, spec]);
    setAdding(false);
    setInstruction("");
    void fill(spec, true);
  };

  return (
    <>
      <MenuRow icon={<Wand2 size={15} />} label="AI autofill" onClick={() => setAdding(true)} />
      {aiFields.map((f) => (
        <div key={f.key} className="flex items-center gap-1 px-2">
          <span className="flex-1 truncate type-secondary">{f.label}</span>
          <Button variant="quiet" disabled={busy !== null} onClick={() => void fill(f, true)}>
            {busy === f.key ? "Filling…" : "Fill all"}
          </Button>
          <Button variant="quiet" icon={<RefreshCw size={13} />} aria-label={`Refresh ${f.label}`} disabled={busy !== null} onClick={() => void fill(f, false)} />
        </div>
      ))}
      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="max-w-[min(440px,96vw)] gap-3 p-4">
          <DialogTitle>AI autofill</DialogTitle>
          <Field aria-label="Property name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Property name" />
          <Select aria-label="Autofill kind" value={pick} onValueChange={(v) => setPick(v as PresetPick)} options={[...PRESETS.map((p) => ({ value: p.key, label: p.label })), { value: "custom", label: "Custom" }]} />
          {pick === "custom" || aiFieldPreset(pick)?.ask ? (
            <Textarea rows={2} aria-label={pick === "custom" ? "Instruction" : aiFieldPreset(pick)?.ask === "language" ? "Language" : "What to pull out"} value={instruction} onChange={(e) => setInstruction(e.target.value)}
              placeholder={pick === "custom" ? "What should AI write for each row?" : aiFieldPreset(pick)?.ask === "language" ? "Spanish" : "the invoice number"} />
          ) : null}
          <div className="flex justify-end gap-2">
            <Button variant="quiet" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <Button variant="primary" disabled={!name.trim() || ((pick === "custom" || !!aiFieldPreset(pick)?.ask) && !instruction.trim())} onClick={() => void add()}>
              Add and fill
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
