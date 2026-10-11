"use client";

/** Variants of one block: first match wins; the block's own text is the default. */
import { useCallback, useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Badge, Button, Field, Textarea } from "@ai-matrx/design-system/controls";
import { Switch } from "@ai-matrx/design-system/controls";
import { toast } from "@/lib/toast";
import { archiveVariant, createVariant, listVariants, updateVariant } from "../service";
import { REASONING_LEVELS, conditionToJson, describeCondition, parseCondition, type BlockCondition } from "../conditions";
import { invalidateBlocks } from "../blocksCache";
import type { PromptBlockRow, PromptBlockVariantRow } from "../types";

const splitList = (value: string): string[] => value.split(",").map((s) => s.trim()).filter(Boolean);

interface Draft {
  id: string;
  label: string;
  content: string;
  provider: string;
  model: string;
  latest: boolean;
  reasoning: string[];
}

function toDraft(row: PromptBlockVariantRow): Draft {
  const c = parseCondition(row.condition);
  return {
    id: row.id,
    label: row.label,
    content: row.content,
    provider: (c.provider ?? []).join(", "),
    model: (c.model ?? []).join(", "),
    latest: !!c.latest,
    reasoning: c.reasoning ?? [],
  };
}

function draftCondition(d: Draft): BlockCondition {
  return parseCondition({ provider: splitList(d.provider), model: splitList(d.model), latest: d.latest, reasoning: d.reasoning });
}

export function VariantsEditor({ block, readOnly }: { block: PromptBlockRow; readOnly: boolean }) {
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setDrafts((await listVariants(block.id)).map(toDraft));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load variants");
    }
  }, [block.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const patch = (id: string, change: Partial<Draft>) => setDrafts((list) => (list ?? []).map((d) => (d.id === id ? { ...d, ...change } : d)));

  const save = async (d: Draft, order: number) => {
    setBusy(d.id);
    try {
      await updateVariant(d.id, { label: d.label, content: d.content, sort_order: order, condition: conditionToJson(draftCondition(d)) });
      invalidateBlocks();
      toast.success("Variant saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save the variant");
    } finally {
      setBusy(null);
    }
  };

  const add = async () => {
    setBusy("new");
    try {
      await createVariant(block, { label: "New variant", condition: {}, content: "", sort_order: (drafts?.length ?? 0) });
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add the variant");
    } finally {
      setBusy(null);
    }
  };

  const move = async (index: number, delta: -1 | 1) => {
    if (!drafts) return;
    const next = [...drafts];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setDrafts(next);
    try {
      await Promise.all(next.map((d, i) => updateVariant(d.id, { sort_order: i })));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not reorder");
      void load();
    }
  };

  const remove = async (id: string) => {
    setBusy(id);
    try {
      await archiveVariant(id);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove the variant");
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="flex flex-col gap-3" aria-label="Variants" data-testid="prompt-block-variants">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Variants</h2>
        {!readOnly && (
          <Button variant="quiet" icon={<Plus />} disabled={busy === "new"} onClick={add} data-testid="prompt-block-add-variant">
            Add variant
          </Button>
        )}
      </div>
      {drafts?.length === 0 && <p className="text-xs text-muted-foreground">None. The default text always runs.</p>}
      {(drafts ?? []).map((d, index) => (
        <div key={d.id} className="flex flex-col gap-2 rounded-lg border border-border p-3" data-testid={`prompt-block-variant-${index}`}>
          <div className="flex items-center gap-2">
            <Badge>{index + 1}</Badge>
            <Field aria-label="Variant label" value={d.label} disabled={readOnly} onChange={(e) => patch(d.id, { label: e.target.value })} />
            {!readOnly && (
              <>
                <Button variant="quiet" aria-label="Move up" icon={<ArrowUp />} disabled={index === 0} onClick={() => move(index, -1)} />
                <Button variant="quiet" aria-label="Move down" icon={<ArrowDown />} disabled={index === drafts!.length - 1} onClick={() => move(index, 1)} />
                <Button variant="quiet" aria-label="Remove variant" icon={<Trash2 />} disabled={busy === d.id} onClick={() => remove(d.id)} />
              </>
            )}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
              Provider
              <Field aria-label="Provider" placeholder="Anthropic, OpenAI" value={d.provider} disabled={readOnly} onChange={(e) => patch(d.id, { provider: e.target.value })} />
            </label>
            <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
              Model or alias
              <Field aria-label="Model or alias" placeholder="claude-opus-5-5" value={d.model} disabled={readOnly} onChange={(e) => patch(d.id, { model: e.target.value })} />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <label className="flex items-center gap-2">
              <Switch checked={d.latest} disabled={readOnly} onCheckedChange={(v) => patch(d.id, { latest: v })} aria-label="Latest model" />
              Latest model
            </label>
            <span className="text-muted-foreground">Reasoning</span>
            {REASONING_LEVELS.map((level) => (
              <label key={level} className="flex items-center gap-1">
                <input
                  type="checkbox"
                  disabled={readOnly}
                  checked={d.reasoning.includes(level)}
                  onChange={(e) => patch(d.id, { reasoning: e.target.checked ? [...d.reasoning, level] : d.reasoning.filter((r) => r !== level) })}
                />
                {level}
              </label>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground" data-testid="prompt-block-variant-when">
            Runs for: {describeCondition(draftCondition(d))}
          </p>
          <Textarea aria-label="Variant text" mono rows={5} value={d.content} disabled={readOnly} onChange={(e) => patch(d.id, { content: e.target.value })} />
          {!readOnly && (
            <div>
              <Button variant="primary" disabled={busy === d.id} onClick={() => save(d, index)} data-testid="prompt-block-save-variant">
                Save variant
              </Button>
            </div>
          )}
        </div>
      ))}
    </section>
  );
}
