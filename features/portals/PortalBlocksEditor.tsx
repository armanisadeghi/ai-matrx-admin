"use client";

// features/portals/PortalBlocksEditor.tsx — THE PORTAL'S PAGE BUILDER (lane PORTAL-BLOCKS).
//
// Add, order and set up the blocks a client's page is built from: tiles, charts, lists, cards and
// tables over the Tables the portal shows, and which Fields each record's own page carries. Only
// the portal's `visible_fields` are offered, so the owner cannot pick a column the client may not
// see. It saves through the portal's own declare door (`portalDeclare({ config: { blocks } })`,
// judged by the store); the Tables and people the portal already has are sent back unchanged.

import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";

import { Button, Select } from "@ai-matrx/design-system/controls";
import { useRecordsClient } from "@ai-matrx/records/react";
import type { Field, PortalCard, RecordsError } from "@ai-matrx/records";

import { PORTAL_BLOCK_KINDS, type PortalBlock, type PortalBlockKind, type PortalMeasureOp } from "./blocks";

/** The store's refusal in its own words, with its remedy when it wrote one. */
function refusalText(error: RecordsError): string {
  return error.hint ? `${error.message} ${error.hint}` : error.message;
}

const KIND_LABEL: Record<PortalBlockKind, string> = {
  kpi: "Number tile",
  bar: "Bar chart",
  line: "Line chart",
  donut: "Donut chart",
  list: "List",
  cards: "Cards",
  table: "Table",
};
const OPS: Array<{ value: PortalMeasureOp; label: string }> = [
  { value: "count", label: "How many" },
  { value: "sum", label: "Total" },
  { value: "avg", label: "Average" },
  { value: "min", label: "Lowest" },
  { value: "max", label: "Highest" },
];
const NUMBER_TYPES = new Set(["number", "integer", "decimal", "currency", "money", "float"]);

export function PortalBlocksEditor({ portalId, onSaved }: { portalId: string; onSaved?: () => void }) {
  const client = useRecordsClient();
  const [card, setCard] = useState<PortalCard | null>(null);
  const [fields, setFields] = useState<Record<string, Field[]>>({});
  const [blocks, setBlocks] = useState<PortalBlock[]>([]);
  const [saving, setSaving] = useState(false);
  const [said, setSaid] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const answered = await client.portalCard({ portal_id: portalId as never });
      if (!alive) return;
      if (!answered.ok) return setSaid({ ok: false, text: refusalText(answered.error) });
      setCard(answered.data);
      setBlocks(((answered.data.config as { blocks?: PortalBlock[] }).blocks ?? []).map((b) => ({ ...b })));
      for (const t of answered.data.tables) {
        const got = await client.fields({ table_id: t.table_id });
        if (alive && got.ok) setFields((prev) => ({ ...prev, [t.table_id]: got.data }));
      }
    })();
    return () => {
      alive = false;
    };
  }, [client, portalId]);

  if (!card) return <p className="text-sm text-muted-foreground">{said ? said.text : "Loading the page blocks"}</p>;
  if (card.tables.length === 0) return <p className="text-sm text-muted-foreground">Show a table on this portal first, then add blocks.</p>;

  const patch = (i: number, change: Partial<PortalBlock>) =>
    setBlocks((prev) => prev.map((b, n) => (n === i ? { ...b, ...change } : b)));
  const move = (i: number, by: number) =>
    setBlocks((prev) => {
      const j = i + by;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j]!, next[i]!];
      return next;
    });

  async function save() {
    if (!card) return;
    setSaving(true);
    setSaid(null);
    const answered = await client.portalDeclare({
      title: card.title,
      client_table_id: card.client_table_id,
      portal_id: card.portal_id,
      tables: card.tables.map((t) => ({
        table_id: t.table_id,
        names_via: t.names_via,
        visible_fields: t.visible_fields,
        editable_fields: t.editable_fields,
        comments: t.comments,
      })),
      config: { blocks } as NonNullable<Parameters<typeof client.portalDeclare>[0]["config"]>,
    });
    setSaving(false);
    if (!answered.ok) return setSaid({ ok: false, text: refusalText(answered.error) });
    setSaid({ ok: true, text: "Saved" });
    onSaved?.();
  }

  return (
    <section className="space-y-3" data-portal-blocks-editor="">
      <h3 className="text-sm font-semibold tracking-tight text-foreground">Page blocks</h3>
      {blocks.map((b, i) => {
        const table = card.tables.find((t) => t.table_id === b.table_id) ?? card.tables[0]!;
        const shown = (fields[table.table_id] ?? []).filter((f) => table.visible_fields.includes(f.key));
        const fieldOptions = shown.map((f) => ({ value: f.key, label: f.label || f.key }));
        const numberOptions = shown.filter((f) => NUMBER_TYPES.has(f.type)).map((f) => ({ value: f.key, label: f.label || f.key }));
        const chart = b.kind === "bar" || b.kind === "line" || b.kind === "donut";
        const items = b.kind === "list" || b.kind === "cards" || b.kind === "table";
        const toggle = (list: string[] | undefined, key: string) =>
          (list ?? []).includes(key) ? (list ?? []).filter((k) => k !== key) : [...(list ?? []), key];
        return (
          <div key={i} className="space-y-3 rounded-xl border border-border bg-card p-3" data-portal-block-editor={b.kind}>
            <div className="flex flex-wrap items-center gap-2">
              <Select<PortalBlockKind>
                aria-label="Block type"
                value={b.kind}
                options={PORTAL_BLOCK_KINDS.map((k) => ({ value: k, label: KIND_LABEL[k] }))}
                onValueChange={(kind) => patch(i, { kind })}
              />
              <Select
                aria-label="Table"
                value={table.table_id}
                options={card.tables.map((t) => ({ value: t.table_id, label: t.name }))}
                onValueChange={(table_id) => {
                  const next = { ...b, table_id };
                  delete next.group_by;
                  delete next.measure_key;
                  delete next.fields;
                  delete next.detail_fields;
                  setBlocks((prev) => prev.map((x, n) => (n === i ? next : x)));
                }}
              />
              <input
                aria-label="Block title"
                className="h-7 min-w-0 flex-1 rounded-md border border-border bg-background px-2 text-sm"
                placeholder="Title"
                value={b.title ?? ""}
                onChange={(e) => patch(i, { title: e.target.value })}
              />
              <Button variant="quiet" icon={<ArrowUp />} aria-label="Move up" onClick={() => move(i, -1)} />
              <Button variant="quiet" icon={<ArrowDown />} aria-label="Move down" onClick={() => move(i, 1)} />
              <Button variant="quiet" icon={<Trash2 />} aria-label="Remove block" onClick={() => setBlocks((prev) => prev.filter((_, n) => n !== i))} />
            </div>
            {chart ? (
              <Select
                aria-label="Group by"
                value={b.group_by ?? ""}
                options={[{ value: "", label: "Group by" }, ...fieldOptions]}
                onValueChange={(group_by) => patch(i, { group_by })}
              />
            ) : null}
            {b.kind === "kpi" || chart ? (
              <div className="flex flex-wrap items-center gap-2">
                <Select<PortalMeasureOp>
                  aria-label="Measure"
                  value={b.measure_op ?? "count"}
                  options={OPS}
                  onValueChange={(measure_op) => patch(i, { measure_op })}
                />
                {(b.measure_op ?? "count") !== "count" ? (
                  <Select
                    aria-label="Of which field"
                    value={b.measure_key ?? ""}
                    options={[{ value: "", label: "Of which field" }, ...numberOptions]}
                    onValueChange={(measure_key) => patch(i, { measure_key })}
                  />
                ) : null}
              </div>
            ) : null}
            {items ? (
              <FieldChecks label="Shown on each item" options={fieldOptions} chosen={b.fields ?? []} onToggle={(k) => patch(i, { fields: toggle(b.fields, k) })} />
            ) : null}
            {items ? (
              <FieldChecks label="Shown when it opens" options={fieldOptions} chosen={b.detail_fields ?? []} onToggle={(k) => patch(i, { detail_fields: toggle(b.detail_fields, k) })} />
            ) : null}
          </div>
        );
      })}
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={() => setBlocks((prev) => [...prev, { kind: "kpi", table_id: card.tables[0]!.table_id }])}>
          <Plus className="mr-1 h-4 w-4" />
          Add block
        </Button>
        <Button variant="primary" onClick={save} disabled={saving}>Save blocks</Button>
        {said ? <span className={said.ok ? "text-sm text-muted-foreground" : "text-sm text-destructive"} role="status">{said.text}</span> : null}
      </div>
    </section>
  );
}

function FieldChecks({ label, options, chosen, onToggle }: { label: string; options: Array<{ value: string; label: string }>; chosen: string[]; onToggle: (key: string) => void }) {
  return (
    <fieldset>
      <legend className="text-xs font-medium text-muted-foreground">{label}</legend>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
        {options.map((o) => (
          <label key={o.value} className="flex items-center gap-1.5 text-sm text-foreground">
            <input type="checkbox" checked={chosen.includes(o.value)} onChange={() => onToggle(o.value)} />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
