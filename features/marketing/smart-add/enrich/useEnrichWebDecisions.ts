"use client";

/**
 * Enrich's "On the web" answers, saved on the brand the moment they are given (smart-add/webDecisions.ts), and the
 * brand's earlier answers shown again when the review opens (a reload, a second Enrich). Absent brand = Create:
 * a no-op, Create's own run memory and routeWebChoices hold those answers until the brand exists.
 */

import { useEffect, useEffectEvent, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { useQuery } from "@tanstack/react-query";
import type { BrandRelationKind } from "@/features/marketing/data/service";
import type { MarketingBrand } from "@/features/marketing/types";
import { persistAnswer } from "../validate/persist";
import { retractSavedAnswer } from "../validate/savedAnswers";
import type { WebMark } from "../runMemory";
import { reportAnswerNotSaved } from "../validate/notSaved";
import type { FocusItem } from "../validate/queue";
import type { EvidenceItem } from "../evidence";
import type { SuggestContext, WebChoice } from "../webKinds";
import {
  listBrandWebDecisions,
  matchSavedWebDecisions,
  matchSavedWebMarks,
  WebDecisionSaver,
  type WebSaveStatus,
} from "../webDecisions";

export interface EnrichWebDecisions {
  /** Save one answer now (null = the answer was cleared; a mark = Ask me later / Ignore). */
  decide: (item: EvidenceItem, choice: WebChoice | null, mark?: WebMark | null) => void;
  /** Before Apply: every answer saved (retrying failures), Founder / Key person names included. */
  flush: (names: (key: string) => string) => Promise<{ saved: string[]; failed: { key: string; error: string }[] }>;
  statuses: Record<string, WebSaveStatus>;
}

export function webDecisionsQueryKey(brandId: string) {
  return ["marketing", "brand-web-decisions", brandId] as const;
}

export function useEnrichWebDecisions(input: {
  brand: MarketingBrand | null;
  kinds: BrandRelationKind[];
  suggest: SuggestContext;
  webItems: EvidenceItem[];
  choices: Record<string, WebChoice>;
  setChoices: Dispatch<SetStateAction<Record<string, WebChoice>>>;
  marks: Record<string, WebMark>;
  setMarks: Dispatch<SetStateAction<Record<string, WebMark>>>;
}): EnrichWebDecisions | null {
  const { brand, webItems, choices, setChoices, marks, setMarks } = input;
  const [statuses, setStatuses] = useState<Record<string, WebSaveStatus>>({});
  const brandRef = useRef(brand);
  const kindsRef = useRef(input.kinds);
  const suggestRef = useRef(input.suggest);
  useEffect(() => {
    kindsRef.current = input.kinds;
    suggestRef.current = input.suggest;
  });
  // One saver for the visit; it reads the brand, kinds and suggestion context at call time.
  const [saver] = useState(
    () =>
      new WebDecisionSaver({
        kinds: () => kindsRef.current,
        suggest: () => suggestRef.current,
        persist: (item, answer, opts) => {
          const current = brandRef.current as MarketingBrand;
          return persistAnswer(
            {
              // Writes carry the brand's organization, never the active one.
              organizationId: current.organization_id,
              getBrand: () => brandRef.current as MarketingBrand,
              setBrand: (b) => {
                brandRef.current = b;
              },
              kinds: kindsRef.current,
            },
            item,
            answer,
            opts,
          );
        },
        retract: async (key) => {
          await retractSavedAnswer((brandRef.current as MarketingBrand).id, kindsRef.current, { evidenceKey: key });
        },
        onStatus: (key, status) => setStatuses((cur) => ({ ...cur, [key]: status })),
        onFailed: (item, label, error) =>
          void reportAnswerNotSaved({
            brandId: (brandRef.current as MarketingBrand).id,
            item: { key: item.key, kind: "web" } as FocusItem,
            answer: "related",
            value: label,
            error,
          }),
      }),
  );

  // The brand's earlier answers: read once when the review opens, then shown on the matching results as they arrive.
  const saved = useQuery({
    queryKey: webDecisionsQueryKey(brand?.id ?? ""),
    queryFn: () => listBrandWebDecisions((brand as MarketingBrand).id),
    enabled: Boolean(brand),
    staleTime: Infinity,
  });
  const restored = useRef<Set<string>>(new Set());
  const restoreSaved = useEffectEvent(() => {
    if (!brand || !saved.data?.length) return;
    const fresh = webItems.filter((i) => !restored.current.has(i.key) && !choices[i.key] && !marks[i.key]);
    if (!fresh.length) return;
    const found = matchSavedWebDecisions(fresh, saved.data);
    const foundMarks = matchSavedWebMarks(fresh, saved.data);
    for (const i of fresh) restored.current.add(i.key);
    for (const k of Object.keys(found)) saver.markRestored(k, { choice: found[k] });
    for (const k of Object.keys(foundMarks)) if (!found[k]) saver.markRestored(k, { mark: foundMarks[k] });
    if (Object.keys(found).length) setChoices((cur) => ({ ...found, ...cur }));
    if (Object.keys(foundMarks).length) setMarks((cur) => ({ ...foundMarks, ...cur }));
  });
  const itemKeys = webItems.map((i) => i.key).join("|");
  // Re-runs when the result set or the saved rows change.
  useEffect(() => restoreSaved(), [itemKeys, saved.data]);

  if (!brand) return null;
  return {
    decide: (item, choice, mark = null) => {
      restored.current.add(item.key);
      void saver.decide(item, choice, "", mark);
    },
    flush: (names) => saver.flush(webItems, choices, names, marks),
    statuses,
  };
}
