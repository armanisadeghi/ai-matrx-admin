"use client";

import { useState } from "react";
import type { BrandRelationKind } from "@/features/marketing/data/service";
import { ValidateStage, type AnsweredEntry } from "@/features/marketing/smart-add/validate/ValidateStage";
import { buildQueue, type Answer, type FocusItem } from "@/features/marketing/smart-add/validate/queue";
import { fixtureEvidence, fixtureFacts } from "@/features/marketing/smart-add/validate/fixtures";

const KINDS: BrandRelationKind[] = [
  ["ours", "Ours", "ours"],
  ["review_site", "Review site", "about_us"],
  ["claimable_listing", "Listing we can claim", "about_us"],
  ["mention", "Mentions us", "about_us"],
  ["partner_page", "Partner or client page", "about_us"],
  ["founder", "Founder / owner", "associated"],
  ["parent_company", "Parent company", "associated"],
  ["competitor", "Competitor", "competitor"],
  ["not_us", "Not us", "not_us"],
  ["irrelevant", "Irrelevant", "irrelevant"],
].map(([key, label, stance]) => ({
  id: key,
  key,
  label,
  routesTo: null,
  isKnown: true,
  stance: stance as BrandRelationKind["stance"],
  description: null,
  hasSentiment: key === "mention",
  match: { hosts: [], paths: [] },
}));

const ITEMS = fixtureEvidence();
const FACTS = fixtureFacts();
const CTX = { ourHosts: ["fullspecstaff.com"], ourAccounts: [], name: "Full Spectrum Search Group" };

export function LabValidateStory() {
  const [answered, setAnswered] = useState<AnsweredEntry[]>([]);
  const [later, setLater] = useState<string[]>([]);
  const queue = buildQueue({
    items: ITEMS,
    facts: FACTS,
    decisions: {},
    webChoices: {},
    answered: new Set(answered.map((a) => a.item.key)),
    later,
    kinds: KINDS,
    ctx: CTX,
  });
  const onAnswer = (item: FocusItem, answer: Answer, opts: { relationKey?: string | null; value?: string } = {}) => {
    if (answer === "later") return setLater((l) => [...l.filter((k) => k !== item.key), item.key]);
    const id = crypto.randomUUID();
    const relationLabel = opts.relationKey ? (KINDS.find((k) => k.key === opts.relationKey)?.label ?? null) : null;
    setAnswered((a) => [{ id, item, answer, relationLabel, value: opts.value?.trim() || item.value, state: "saving", error: null }, ...a]);
    setTimeout(() => setAnswered((a) => a.map((x) => (x.id === id ? { ...x, state: "saved" } : x))), 500);
  };
  return (
    <ValidateStage
      brandName="Full Spectrum Search Group"
      brandLogo={null}
      queue={queue}
      answered={answered}
      laterCount={later.length}
      kinds={KINDS}
      working
      onAnswer={onAnswer}
      onUndo={(e) => setAnswered((a) => a.filter((x) => x.id !== e.id))}
    />
  );
}
