/**
 * A helper candidate as a Smart Add finding: the same EvidenceItem shape (with `anchor`) the anchor
 * round produces, so the card, the answers and the round all treat it exactly like an anchor card.
 */
import { customItem, type EvidenceItem } from "../evidence";
import type { HelperCandidate } from "./types";

export function candidateItem(c: HelperCandidate): EvidenceItem {
  const social = c.platform !== "website";
  const base = social
    ? customItem("social", c.url, { platform: c.platform, handle: c.handle, url: c.url, label: c.name })
    : customItem("website", c.url, { label: c.name });
  return {
    ...base,
    image_url: c.image_url,
    followers: c.followers,
    verified: c.verified,
    snippet: c.snippet,
    source: { node: "person_helper", kind: "web_search", url: c.url, where: `helper: ${c.sources.join(", ")}` },
    confidence: 0.5,
    anchor: {
      score: 0,
      reasons: [
        `Found by ${c.sources.join(" + ")}`,
        ...c.hits.slice(0, 4).map((h) => `${h.query} · page ${h.page} · #${h.rank}`),
      ],
      kind: social ? "account" : "website",
      person_profile: c.platform === "linkedin",
      display_name: c.name,
      bio_line: [c.headline, c.employer].filter(Boolean).join(" · ") || c.snippet,
      location: c.location,
      followers: c.followers,
      private: false,
    },
  };
}
