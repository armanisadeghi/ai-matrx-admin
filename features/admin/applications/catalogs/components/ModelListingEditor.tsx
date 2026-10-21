"use client";

// features/admin/applications/catalogs/components/ModelListingEditor.tsx
//
// The Catalogs page's model edit (one editor): name, common name, description, order, active and the
// display facts (ratings, speed, knowledge cutoff, tier, notes — what the old catalog entry payload
// carried) — saved through THE one write path, PATCH /admin/ai-catalog/discovery/models/{id}/listing,
// with the last-read stamp so a stale edit is refused, never silently overwritten. Each fact keeps the
// typed control its kind's payload schema gives it (schemas.ts factControl): number, yes/no, choice
// list, JSON for lists/objects, and text (with the values in use as suggestions) only when untyped.

import { useId, useState } from "react";
import type { CuratedModel } from "@ai-matrx/agents/models";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ErrorNotice } from "@ai-matrx/design-system";
import { Input, Select } from "@ai-matrx/design-system/controls";
import type { ListingEdit } from "@/features/ai-models/discovery/api";
import { factControl, factControlsFor, type FactControl } from "@/features/admin/applications/catalogs/schemas";

/** The listing edit for what changed (fields and a facts merge; a removed fact is sent as null). */
export function listingEditOf(model: CuratedModel, form: ListingForm): ListingEdit {
  const edit: ListingEdit = { expected_updated_at: model.updated_at };
  if (form.name.trim() && form.name.trim() !== model.name) edit.name = form.name.trim();
  if ((form.common_name.trim() || null) !== (model.common_name ?? null)) edit.common_name = form.common_name.trim() || null;
  if ((form.description.trim() || null) !== (model.description ?? null)) edit.description = form.description.trim() || null;
  const order = form.order.trim() === "" ? null : Number(form.order);
  if (order !== (model.presentation?.display_order ?? null)) edit.display_order = order;
  if (form.active !== model.offered) edit.active = form.active;
  const facts: Record<string, unknown> = {};
  const keys = new Set(form.facts.map((f) => f.key.trim()).filter(Boolean));
  for (const k of Object.keys(model.facts)) if (!keys.has(k)) facts[k] = null;
  for (const f of form.facts) {
    const k = f.key.trim();
    if (!k) continue;
    const v = f.value;
    if (JSON.stringify(v ?? null) !== JSON.stringify(model.facts[k] ?? null)) facts[k] = v ?? null;
  }
  if (Object.keys(facts).length) edit.facts = facts;
  return edit;
}

export interface ListingForm {
  name: string;
  common_name: string;
  description: string;
  order: string;
  active: boolean;
  /** Typed values (a number stays a number); `bad` holds a JSON fact that does not parse yet. */
  facts: Array<{ key: string; value: unknown; bad?: boolean }>;
}

const formOf = (m: CuratedModel): ListingForm => ({
  name: m.name,
  common_name: m.common_name ?? "",
  description: m.description ?? "",
  order: m.presentation?.display_order == null ? "" : String(m.presentation.display_order),
  active: m.offered,
  facts: Object.entries(m.facts).map(([key, value]) => ({ key, value })),
});

/** One fact's control, typed by the kind schema (or the value's own type when the schema does not name it). */
function FactInput({ name, control, value, suggestions, onChange }: { name: string; control: FactControl; value: unknown; suggestions: string[]; onChange: (v: unknown, bad?: boolean) => void }) {
  const listId = useId();
  const [jsonText, setJsonText] = useState(() => (value === undefined ? "" : JSON.stringify(value, null, 2)));
  switch (control.kind) {
    case "number":
      return (
        <Input
          type="number"
          aria-label={name}
          data-fact-control="number"
          step={control.integer ? 1 : "any"}
          {...(control.min !== null ? { min: control.min } : {})}
          {...(control.max !== null ? { max: control.max } : {})}
          value={typeof value === "number" ? String(value) : ""}
          onChange={(e) => onChange(e.target.value.trim() === "" ? null : Number(e.target.value))}
        />
      );
    case "boolean":
      return <Switch aria-label={name} data-fact-control="boolean" checked={value === true} onCheckedChange={(v) => onChange(Boolean(v))} />;
    case "choice":
      return (
        <span data-fact-control="choice" data-options={control.options.join(",")} className="contents">
          <Select
            aria-label={name}
            value={typeof value === "string" ? value : ""}
            options={[{ value: "", label: "Not set" }, ...control.options.map((o) => ({ value: o, label: o }))]}
            onValueChange={(v) => onChange(v === "" ? null : v)}
          />
        </span>
      );
    case "json":
      return (
        <Textarea
          aria-label={name}
          data-fact-control="json"
          rows={3}
          className="font-mono text-xs"
          value={jsonText}
          onChange={(e) => {
            setJsonText(e.target.value);
            const t = e.target.value.trim();
            if (t === "") return onChange(null);
            try {
              onChange(JSON.parse(t));
            } catch {
              onChange(value, true);
            }
          }}
        />
      );
    default:
      return (
        <>
          <Input type="text" aria-label={name} data-fact-control="text" list={listId} value={value == null ? "" : String(value)} onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)} />
          <datalist id={listId}>
            {suggestions.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
        </>
      );
  }
}

interface ModelListingEditorProps {
  /** The catalog kind the model is listed under: its payload schema types the facts. */
  kind: string;
  /** Text facts offer the values other models of the kind use. */
  suggestions?: Record<string, string[]>;
  model: CuratedModel;
  onClose: () => void;
  /** Sends the edit; resolves when saved (the parent reloads), throws a sentence when refused. */
  onSave: (edit: ListingEdit) => Promise<void>;
}

export function ModelListingEditor({ kind, suggestions = {}, model, onClose, onSave }: ModelListingEditorProps) {
  const schemaKeys = [...factControlsFor(kind).keys()];
  const [form, setForm] = useState<ListingForm>(() => formOf(model));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof ListingForm>(k: K, v: ListingForm[K]) => setForm((f) => ({ ...f, [k]: v }));
  const orderBad = form.order.trim() !== "" && !Number.isInteger(Number(form.order));
  const factsBad = form.facts.some((f) => f.bad);
  const setFact = (i: number, patch: Partial<ListingForm["facts"][number]>) => set("facts", form.facts.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const factListId = useId();

  const save = async () => {
    const edit = listingEditOf(model, form);
    if (Object.keys(edit).length === 1) return onClose();
    setBusy(true);
    setError(null);
    try {
      await onSave(edit);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => (o ? null : onClose())}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl" data-testid="model-listing-editor">
        <DialogHeader>
          <DialogTitle>{model.common_name || model.name}</DialogTitle>
          <DialogDescription>Saved to the model catalog Matrx 2 reads</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-[9rem_1fr] items-center gap-3 text-sm">
          <Label htmlFor="ml-common">Display name</Label>
          <Input id="ml-common" aria-label="Display name" value={form.common_name} onChange={(e) => set("common_name", e.target.value)} />
          <Label htmlFor="ml-name">Name</Label>
          <Input id="ml-name" aria-label="Name" mono value={form.name} onChange={(e) => set("name", e.target.value)} />
          <Label htmlFor="ml-desc">Description</Label>
          <Textarea id="ml-desc" aria-label="Description" rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} />
          <Label htmlFor="ml-order">Order</Label>
          <Input id="ml-order" aria-label="Order" value={form.order} onChange={(e) => set("order", e.target.value)} />
          <Label htmlFor="ml-active">Offered in Matrx 2</Label>
          <Switch id="ml-active" aria-label="Offered in Matrx 2" checked={form.active} onCheckedChange={(v) => set("active", Boolean(v))} />
        </div>
        <section className="space-y-2" aria-label="Facts">
          <h3 className="text-sm font-semibold text-foreground">Facts</h3>
          {form.facts.length === 0 ? <p className="text-xs text-muted-foreground">No facts yet</p> : null}
          <datalist id={factListId}>
            {schemaKeys.filter((k) => !form.facts.some((f) => f.key === k)).map((k) => (
              <option key={k} value={k} />
            ))}
          </datalist>
          {form.facts.map((f, i) => (
            <div key={`${i}-${f.key}`} className="grid grid-cols-[12rem_1fr_auto] items-center gap-2">
              <Input aria-label={`Fact ${i + 1} name`} mono list={factListId} value={f.key} onChange={(e) => setFact(i, { key: e.target.value })} />
              <FactInput
                name={f.key || `Fact ${i + 1} value`}
                control={factControl(kind, f.key.trim(), f.value)}
                value={f.value}
                suggestions={suggestions[f.key] ?? []}
                onChange={(value, bad) => setFact(i, { value, bad: Boolean(bad) })}
              />
              <Button type="button" variant="quiet" onClick={() => set("facts", form.facts.filter((_, j) => j !== i))}>
                Remove
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" onClick={() => set("facts", [...form.facts, { key: "", value: null }])}>
            Add a fact
          </Button>
        </section>
        {orderBad ? <p className="text-xs text-destructive-ink">The order must be a whole number</p> : null}
        {factsBad ? <p className="text-xs text-destructive-ink">A list or object fact is not valid JSON yet</p> : null}
        {error ? <ErrorNotice message={error} size="compact" /> : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="primary" disabled={busy || orderBad || factsBad} onClick={() => void save()}>
            {busy ? "Saving…" : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
