/**
 * Fixture data for the validation page story (lab `/lab/smart-add-validate`) and the queue tests:
 * the REAL evidence of one fullspecstaff.com identify round (run 5bc15b94, captured from
 * workflow.node_outcome), plus facts in the facts agent's `brand_basics` shape and "we think"
 * suggestions in the shape the suggestion agent will fill. The facts and suggestions are fixtures,
 * not findings.
 */

import round from "../__tests__/fixtures/fullspecstaff_round.json";
import { mergeEvidence, parseEvidenceItem, type EvidenceItem } from "../evidence";
import { factsFromPayload, type BrandFact } from "./queue";

const SUGGESTIONS: Record<string, unknown> = {
  "social:instagram:fullspecstaff": {
    choice: "ours",
    probability: 0.94,
    reason: "The site's footer links to this account, and its bio links back to fullspecstaff.com.",
  },
  "social:youtube:fullspectrumsearchgroup": {
    choice: "ours",
    probability: 0.81,
    reason: "Same name as the brand; the site links to this channel.",
  },
  "name:healthcare executive search for senior care": {
    choice: "not_us",
    probability: 0.7,
    reason: "This reads as a page headline, not a name the business goes by.",
  },
};

export function fixtureEvidence(): EvidenceItem[] {
  const parsed = (round as unknown[])
    .map((raw) => {
      const item = parseEvidenceItem(raw);
      if (!item) return null;
      const s = SUGGESTIONS[item.key];
      return s ? { ...item, suggestion: s } : item;
    })
    .filter((i): i is EvidenceItem => Boolean(i));
  return [...mergeEvidence(new Map(), parsed).values()];
}

/** One `brand_basics` output, as the Brand Basics Fact Finder returns it. */
export const FIXTURE_BRAND_BASICS = {
  __kind: "brand_basics",
  brand_name: "Full Spectrum Search Group",
  items: [
    {
      __kind: "brand_basics_fact",
      field: "industry",
      field_label: "Industry",
      value: "Healthcare executive search",
      certainty: "confirmed",
      reason: "The homepage title and LinkedIn industry both say so.",
      evidence_urls: ["https://fullspecstaff.com", "https://www.linkedin.com/company/full-spectrum-search-group"],
      known_field: "category",
      suggestion: { choice: "correct", probability: 0.9, reason: "Two sources agree word for word." },
    },
    {
      __kind: "brand_basics_fact",
      field: "phone",
      field_label: "Main phone",
      value: "(866) 587-4112",
      certainty: "likely",
      reason: "Shown in the site header; a second number appears in the footer.",
      evidence_urls: ["https://fullspecstaff.com"],
      known_field: "phone",
    },
    {
      __kind: "brand_basics_fact",
      field: "headquarters",
      field_label: "Headquarters",
      value: "Orange County, California",
      certainty: "possible",
      reason: "The 949 area code is Orange County; no street address was found.",
      evidence_urls: [],
      known_field: null,
    },
  ],
};

export function fixtureFacts(): BrandFact[] {
  return factsFromPayload({ result: FIXTURE_BRAND_BASICS });
}
