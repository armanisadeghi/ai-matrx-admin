"use client";

/**
 * Smart Add validation — the container. Builds the focus queue from everything the identify rounds
 * found (and keep finding), saves each answer the moment it is given (persist.ts), hands the
 * workflow-facing decision back to Smart Add so a confirmed account / website / name wakes the
 * steps waiting on it (a new round), and publishes every answer to the Builder panel.
 */

import { useRef, useState } from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@ai-matrx/design-system/controls";
import { extractErrorMessage } from "@/utils/errors";
import type { BuilderPublishInput } from "@/features/builder-panel/types";
import type { BrandRelationKind } from "@/features/marketing/data/service";
import type { MarketingBrand } from "@/features/marketing/types";
import { marketingRoutes } from "@/features/marketing/lib/routes";
import { marketingSeg } from "@/features/marketing/lib/keys";
import type { Decision, EvidenceItem } from "../evidence";
import type { SuggestContext, WebChoice } from "../webKinds";
import { buildQueue, decisionFor, type Answer, type BrandFact, type FocusItem } from "./queue";
import { persistAnswer, type Persisted } from "./persist";
import { ValidateStage, type AnsweredEntry, type AnswerOptions } from "./ValidateStage";

interface Saved extends AnsweredEntry {
  persisted: Persisted | null;
}

export function SmartAddValidate({
  brand: initialBrand,
  organizationId,
  items,
  facts,
  decisions,
  webChoices,
  kinds,
  ctx,
  broken,
  working,
  onDecide,
  publish,
}: {
  brand: MarketingBrand;
  organizationId: string;
  items: EvidenceItem[];
  facts: BrandFact[];
  decisions: Record<string, Decision>;
  webChoices: Record<string, WebChoice>;
  kinds: BrandRelationKind[];
  ctx: SuggestContext;
  broken: ReadonlySet<string>;
  working: boolean;
  /** The workflow-facing answer (null = cleared): a confirmed finding seeds / wakes the next round. */
  onDecide: (key: string, decision: Decision | null) => void;
  publish: (entry: BuilderPublishInput) => void;
}) {
  const brandRef = useRef(initialBrand);
  const [brand, setBrandState] = useState(initialBrand);
  const setBrand = (b: MarketingBrand) => {
    brandRef.current = b;
    setBrandState(b);
  };
  const [answered, setAnswered] = useState<Saved[]>([]);
  const [later, setLater] = useState<string[]>([]);
  // Undo pressed while the save was still in flight: take it back as soon as it lands.
  const undoWhenSaved = useRef<Set<string>>(new Set());

  const answeredKeys = new Set(answered.map((a) => a.item.key));
  const queue = buildQueue({ items, facts, decisions, webChoices, answered: answeredKeys, later, broken, kinds, ctx });

  const patch = (id: string, change: Partial<Saved>) => setAnswered((list) => list.map((a) => (a.id === id ? { ...a, ...change } : a)));

  const onAnswer = (item: FocusItem, answer: Answer, opts: AnswerOptions = {}) => {
    if (answer === "later") {
      // Back of the line: it returns once everything else is answered.
      setLater((l) => [...l.filter((k) => k !== item.key), item.key]);
      publish({ key: `validate.answer.${item.key}`, label: `Later: ${item.value}`, group: "inputs", data: { item, answer }, source: "smart_add.validate" });
      return;
    }
    const id = crypto.randomUUID();
    const relationLabel = opts.relationKey ? (kinds.find((k) => k.key === opts.relationKey)?.label ?? opts.relationKey) : null;
    const entry: Saved = {
      id,
      item,
      answer,
      relationLabel,
      value: opts.value?.trim() || item.value,
      state: "saving",
      error: null,
      persisted: null,
    };
    setAnswered((list) => [entry, ...list]);
    setLater((l) => l.filter((k) => k !== item.key));
    const decision = decisionFor(answer);
    if (decision && item.evidence) for (const k of [item.key, ...item.twins]) onDecide(k, decision);
    void persistAnswer({ organizationId, getBrand: () => brandRef.current, setBrand, kinds }, item, answer, opts)
      .then((persisted) => {
        if (undoWhenSaved.current.delete(id)) {
          void persisted.undo();
          return;
        }
        patch(id, { state: "saved", persisted });
        publish({
          key: `validate.answer.${item.key}`,
          label: `${relationLabel ?? answer}: ${entry.value}`,
          group: "inputs",
          data: { item, answer, relationKey: opts.relationKey ?? null, value: entry.value, homes: persisted.homes, suggestion: item.suggestion },
          source: "smart_add.validate",
        });
      })
      .catch((error: unknown) => {
        const message = extractErrorMessage(error);
        patch(id, { state: "failed", error: message });
        publish({ key: `validate.answer.${item.key}`, label: `Failed: ${entry.value}`, group: "inputs", data: { item, answer, error: message }, source: "smart_add.validate" });
      });
  };

  const onUndo = (entry: AnsweredEntry) => {
    const saved = answered.find((a) => a.id === entry.id);
    setAnswered((list) => list.filter((a) => a.id !== entry.id));
    if (decisionFor(entry.answer) && entry.item.evidence) for (const k of [entry.item.key, ...entry.item.twins]) onDecide(k, null);
    publish({ key: `validate.answer.${entry.item.key}`, label: `Undone: ${entry.value}`, group: "inputs", data: { item: entry.item, undone: entry.answer }, source: "smart_add.validate" });
    if (saved?.state === "saving") undoWhenSaved.current.add(entry.id);
    if (saved?.persisted) {
      saved.persisted.undo().catch((error: unknown) => {
        // The undo did not land: the answer stays on record, and the tray says so.
        setAnswered((list) => [{ ...saved, state: "failed", error: extractErrorMessage(error) }, ...list]);
      });
    }
  };

  return (
    <ValidateStage
      brandName={brand.name}
      brandLogo={brand.logo_url}
      queue={queue}
      answered={answered}
      laterCount={later.filter((k) => queue.some((q) => q.key === k)).length}
      kinds={kinds}
      working={working}
      onAnswer={onAnswer}
      onUndo={onUndo}
      footer={
        <Button asChild variant="outline" icon={<ExternalLink aria-hidden />}>
          <a href={marketingRoutes.brand(marketingSeg(brand))} target="_blank" rel="noreferrer">
            Open brand
          </a>
        </Button>
      }
    />
  );
}
