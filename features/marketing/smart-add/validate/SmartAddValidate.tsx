"use client";

/**
 * Smart Add validation — the container. Builds the focus queue from everything the identify rounds
 * found (and keep finding), saves each answer the moment it is given (persist.ts), hands the
 * workflow-facing decision back to Smart Add so a confirmed account / website / name wakes the
 * steps waiting on it (a new round), and publishes every answer to the Builder panel.
 */

import { useEffect, useRef, useState } from "react";
import { extractErrorMessage } from "@/utils/errors";
import type { BuilderPublishInput } from "@/features/builder-panel/types";
import type { BrandRelationKind } from "@/features/marketing/data/service";
import type { MarketingBrand } from "@/features/marketing/types";
import { marketingRoutes } from "@/features/marketing/lib/routes";
import { marketingSeg } from "@/features/marketing/lib/keys";
import type { EvidenceItem as Ev } from "../evidence";
import type { Decision, EvidenceItem } from "../evidence";
import type { SuggestContext, WebChoice } from "../webKinds";
import { buildQueue, decisionFor, gapFacts, mergeFacts, type Answer, type BrandFact, type CoreGap, type FocusItem } from "./queue";
import { persistAnswer, type Persisted } from "./persist";
import { answeredKeysOf, EMPTY_KNOWN, foldQueue, logoImagesOf, logosLabel, type KnownOnBrand } from "./fold";
import { loadSavedFindings } from "./fromSaved";
import { loadSavedAnswers, type SavedAnswers } from "./savedAnswers";
import { emptyAnswers, useRunMemory } from "../runMemory";
import { ValidateStage, type AnsweredEntry, type AnswerOptions } from "./ValidateStage";
import { RetractionDialog } from "@/features/marketing/components/brands/RetractionDialog";

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
  gaps = [],
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
  /** The part of the core Create saved without: its cards come first (MKT-143). */
  gaps?: CoreGap[];
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
  // "Ask me later" is kept on the server with the session's other answers (runMemory), per brand, so the back of
  // the line survives a reload and a return visit.
  useRunMemory(`validate:${initialBrand.id}`, { ...emptyAnswers(), later }, (saved) => setLater((cur) => [...new Set([...saved.later, ...cur])]));
  // Undo pressed while the save was still in flight: take it back as soon as it lands.
  const undoWhenSaved = useRef<Set<string>>(new Set());
  // Cards answered this session, tracked synchronously: a repeated key press or click lands before the next render
  // removes the card, and must not save it a second time (MKT-125).
  const answeredNow = useRef<Set<string>>(new Set());
  // An "Ours" that pulled data in (tracking, posts, a crawl) is undone through the retraction: preview first.
  const [retracting, setRetracting] = useState<Saved | null>(null);

  // Everything Create saved on the brand (and what the brand already knows): the page opens from it, and the
  // live rounds' findings join on top (same key = the live copy).
  const [saved, setSaved] = useState<{ items: Ev[]; facts: BrandFact[]; known: KnownOnBrand } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Earlier answers (a reload, a return visit) fill the Answered tray, latest first, each undoable (MKT-137).
  const [past, setPast] = useState<SavedAnswers | null>(null);
  useEffect(() => {
    let live = true;
    Promise.all([loadSavedFindings(brandRef.current), loadSavedAnswers(brandRef.current, kinds, ctx)])
      .then(([s, a]) => {
        if (!live) return;
        setSaved(s);
        setPast(a);
        setAnswered((list) => {
          const have = new Set(list.map((x) => x.id));
          const mine = new Set(list.flatMap((x) => answeredKeysOf(x.item)));
          const earlier: Saved[] = a.entries
            .filter((e) => !have.has(e.id) && !answeredKeysOf(e.item).some((k) => mine.has(k)))
            .map((e) => ({ id: e.id, item: e.item, answer: e.answer, relationLabel: e.relationLabel, value: e.value, state: "saved", error: null, persisted: e.persisted }));
          return [...list, ...earlier];
        });
      })
      .catch((e: unknown) => live && setLoadError(extractErrorMessage(e)));
    return () => {
      live = false;
    };
  }, []);
  const liveKeys = new Set(items.map((i) => i.key));
  const allItems = [...items, ...[...(saved?.items ?? []), ...(past?.items ?? [])].filter((i) => !liveKeys.has(i.key))];
  const allFacts = mergeFacts(facts, [...(saved?.facts ?? []), ...(past?.facts ?? [])]);

  const answeredKeys = new Set(answered.flatMap((a) => answeredKeysOf(a.item)));
  // A gap is closed once its card is answered, or once an answered "ours" / "preferred" card gave that part of the core.
  const given = (g: CoreGap) => answered.some((a) => (g === "account" ? a.item.kind === "account" && a.answer === "ours" : g === "website" ? a.item.kind === "website" && a.answer === "ours" : a.item.kind === "name" && a.answer === "preferred"));
  const raw = buildQueue({ items: allItems, facts: allFacts, decisions, webChoices, answered: answeredKeys, later, broken, kinds, ctx, gaps: gapFacts(gaps.filter((g) => !given(g))) });
  // A logo picture already answered (this visit or an earlier one) or saved as the brand's logo is never asked again,
  // whichever key a later round finds it under (MKT-139).
  const answeredLogoImages = [...answered.map((a) => a.item), ...(past?.entries ?? []).map((e) => e.item)].filter((i) => i.kind === "logo").flatMap(logoImagesOf);
  const known: KnownOnBrand = {
    ...(saved?.known ?? EMPTY_KNOWN),
    names: [...(saved?.known.names ?? []), brand.name],
    images: [...(saved?.known.images ?? []), ...(brand.logo_url ? [brand.logo_url] : []), ...answeredLogoImages],
  };
  const folded = foldQueue({ queue: raw, known, later });
  // The card in focus stays in focus: a finding arriving live never jumps in front of it.
  const pinned = useRef<string | null>(null);
  const pinnedAt = folded.findIndex((q) => q.key === pinned.current);
  const queue = pinnedAt > 0 ? [folded[pinnedAt], ...folded.slice(0, pinnedAt), ...folded.slice(pinnedAt + 1)] : folded;
  pinned.current = queue[0]?.key ?? null;

  const patch = (id: string, change: Partial<Saved>) => setAnswered((list) => list.map((a) => (a.id === id ? { ...a, ...change } : a)));

  const onAnswer = (item: FocusItem, answer: Answer, opts: AnswerOptions = {}) => {
    if (answer === "later") {
      // Back of the line: it returns once everything else is answered.
      setLater((l) => [...l.filter((k) => k !== item.key), item.key]);
      pinned.current = null;
      publish({ key: `validate.answer.${item.key}`, label: `Later: ${item.value}`, group: "inputs", data: { item, answer }, source: "smart_add.validate" });
      return;
    }
    const cardKeys = answeredKeysOf(item);
    if (cardKeys.some((k) => answeredNow.current.has(k))) return;
    for (const k of cardKeys) answeredNow.current.add(k);
    const id = crypto.randomUUID();
    const relationLabel = opts.relationKey ? (kinds.find((k) => k.key === opts.relationKey)?.label ?? opts.relationKey) : null;
    const entry: Saved = {
      id,
      item,
      answer,
      relationLabel,
      value: opts.value?.trim() || (item.kind === "logo" ? logosLabel(item) : item.kind === "web" ? (item.title ?? item.value) : item.value),
      state: "saving",
      error: null,
      persisted: null,
    };
    setAnswered((list) => [entry, ...list]);
    setLater((l) => l.filter((k) => k !== item.key));
    const decision = decisionFor(answer);
    if (decision && item.evidence) for (const k of [item.key, ...item.twins]) onDecide(k, decision);
    pinned.current = null;
    void persistCard(item, answer, opts)
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

  const pctx = { organizationId, getBrand: () => brandRef.current, setBrand, kinds };
  // A set card: every value answered at once — Yes keeps the values left on (the rest are Wrong), No marks all Wrong.
  const persistCard = async (item: FocusItem, answer: Answer, opts: AnswerOptions): Promise<Persisted> => {
    if (!item.members?.length) return persistAnswer(pctx, item, answer, opts);
    const off = new Set(opts.off ?? []);
    const done: Persisted[] = [];
    try {
      for (const m of item.members) {
        const each: Answer = answer === "correct" ? (off.has(m.key) ? "wrong" : "correct") : answer;
        done.push(await persistAnswer(pctx, m, each));
      }
    } catch (error) {
      for (const p of [...done].reverse()) await p.undo().catch(() => undefined);
      throw error;
    }
    return {
      discoveredId: done[0]?.discoveredId ?? null,
      homes: done.flatMap((p) => p.homes),
      undo: async () => {
        for (const p of [...done].reverse()) await p.undo();
      },
    };
  };

  const release = (item: FocusItem) => {
    for (const k of answeredKeysOf(item)) answeredNow.current.delete(k);
  };

  const forget = (entry: AnsweredEntry, label: string) => {
    release(entry.item);
    setAnswered((list) => list.filter((a) => a.id !== entry.id));
    if (decisionFor(entry.answer) && entry.item.evidence) for (const k of [entry.item.key, ...entry.item.twins]) onDecide(k, null);
    publish({ key: `validate.answer.${entry.item.key}`, label: `${label}: ${entry.value}`, group: "inputs", data: { item: entry.item, undone: entry.answer }, source: "smart_add.validate" });
  };

  const onUndo = (entry: AnsweredEntry) => {
    // Undone = back in focus, where it can be answered again.
    pinned.current = entry.item.key;
    const saved = answered.find((a) => a.id === entry.id);
    if (saved?.persisted?.retraction) {
      setRetracting(saved);
      return;
    }
    release(entry.item);
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
    <>
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
        loading={!saved && !loadError}
        loadError={loadError}
        brandHref={marketingRoutes.brand(marketingSeg(brand))}
        websiteHost={brand.website_url}
        accountCount={answered.filter((a) => a.item.kind === "account" && (a.answer === "ours")).length}
      />
      <RetractionDialog
        target={retracting?.persisted?.retraction ? { ...retracting.persisted.retraction, name: retracting.value } : null}
        onCancel={() => setRetracting(null)}
        onDone={(summary) => {
          if (retracting) forget(retracting, "Retracted");
          publish({ key: `validate.retraction.${summary.decision_id ?? "none"}`, label: `Retracted: ${summary.label ?? ""}`, group: "inputs", data: summary, source: "smart_add.validate" });
          setRetracting(null);
        }}
      />
    </>
  );
}
