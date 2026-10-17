"use client";

// features/admin/applications/catalogs/components/ModelListingEditor.tsx
//
// The Catalogs page's model edit (one editor): name, common name, description, order, active and the
// display facts (ratings, speed, knowledge cutoff, tier, notes — what the old catalog entry payload
// carried) — saved through THE one write path, PATCH /admin/ai-catalog/discovery/models/{id}/listing,
// with the last-read stamp so a stale edit is refused, never silently overwritten.

import { useState } from "react";
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
import { Input } from "@ai-matrx/design-system/controls";
import type { ListingEdit } from "@/features/ai-models/discovery/api";

/** A fact value as text (strings as they are, everything else as JSON). */
export function factText(v: unknown): string {
  return typeof v === "string" ? v : JSON.stringify(v);
}

/** Text back to a fact value: a number, true/false, null, an object or list as JSON; anything else is text. */
export function factValue(text: string): unknown {
  const t = text.trim();
  if (t === "") return null;
  if (/^(-?\d+(\.\d+)?|true|false|null)$/.test(t) || /^[[{]/.test(t)) {
    try {
      return JSON.parse(t);
    } catch {
      return text;
    }
  }
  return text;
}

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
    const v = factValue(f.value);
    if (JSON.stringify(v) !== JSON.stringify(model.facts[k] ?? null)) facts[k] = v;
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
  facts: Array<{ key: string; value: string }>;
}

const formOf = (m: CuratedModel): ListingForm => ({
  name: m.name,
  common_name: m.common_name ?? "",
  description: m.description ?? "",
  order: m.presentation?.display_order == null ? "" : String(m.presentation.display_order),
  active: m.offered,
  facts: Object.entries(m.facts).map(([key, value]) => ({ key, value: factText(value) })),
});

interface ModelListingEditorProps {
  model: CuratedModel;
  onClose: () => void;
  /** Sends the edit; resolves when saved (the parent reloads), throws a sentence when refused. */
  onSave: (edit: ListingEdit) => Promise<void>;
}

export function ModelListingEditor({ model, onClose, onSave }: ModelListingEditorProps) {
  const [form, setForm] = useState<ListingForm>(() => formOf(model));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof ListingForm>(k: K, v: ListingForm[K]) => setForm((f) => ({ ...f, [k]: v }));
  const orderBad = form.order.trim() !== "" && !Number.isInteger(Number(form.order));

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
          {form.facts.map((f, i) => (
            <div key={i} className="grid grid-cols-[12rem_1fr_auto] items-center gap-2">
              <Input aria-label={`Fact ${i + 1} name`} mono value={f.key} onChange={(e) => set("facts", form.facts.map((x, j) => (j === i ? { ...x, key: e.target.value } : x)))} />
              <Input aria-label={`Fact ${i + 1} value`} value={f.value} onChange={(e) => set("facts", form.facts.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} />
              <Button type="button" variant="quiet" onClick={() => set("facts", form.facts.filter((_, j) => j !== i))}>
                Remove
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" onClick={() => set("facts", [...form.facts, { key: "", value: "" }])}>
            Add a fact
          </Button>
        </section>
        {orderBad ? <p className="text-xs text-destructive-ink">The order must be a whole number</p> : null}
        {error ? <ErrorNotice message={error} size="compact" /> : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="primary" disabled={busy || orderBad} onClick={() => void save()}>
            {busy ? "Saving…" : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
