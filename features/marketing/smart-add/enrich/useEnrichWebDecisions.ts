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
import { reportAnswerNotSaved } from "../validate/notSaved";
import type { FocusItem } from "../validate/queue";
import type { EvidenceItem } from "../evidence";
import type { SuggestContext, WebChoice } from "../webKinds";
import {
  listBrandWebDecisions,
  matchSavedWebDecisions,
  reopenWebDecision,
  WebDecisionSaver,
  type WebSaveStatus,
} from "../webDecisions";

export interface EnrichWebDecisions {
  /** Save one answer now (null = the answer was cleared). */
  decide: (item: EvidenceItem, choice: WebChoice | null) => void;
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
}): EnrichWebDecisions | null {
  const { brand, webItems, choices, setChoices } = input;
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
        reopen: (key) => reopenWebDecision((brandRef.current as MarketingBrand).id, key),
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
    const fresh = webItems.filter((i) => !restored.current.has(i.key) && !choices[i.key]);
    if (!fresh.length) return;
    const found = matchSavedWebDecisions(fresh, saved.data);
    for (const i of fresh) restored.current.add(i.key);
    const keys = Object.keys(found);
    if (!keys.length) return;
    for (const k of keys) saver.markRestored(k, found[k]);
    setChoices((cur) => ({ ...found, ...cur }));
  });
  const itemKeys = webItems.map((i) => i.key).join("|");
  // Re-runs when the result set or the saved rows change.
  useEffect(() => restoreSaved(), [itemKeys, saved.data]);

  if (!brand) return null;
  return {
    decide: (item, choice) => {
      restored.current.add(item.key);
      void saver.decide(item, choice);
    },
    flush: (names) => saver.flush(webItems, choices, names),
    statuses,
  };
}
