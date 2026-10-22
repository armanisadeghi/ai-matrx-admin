/**
 * No reason code ever renders on the run view (2026-10-22 review: "owned_docs_or_help",
 * "product_or_ecommerce_page", "seo_landing_page" printed as a hygiene reason). The server's ONE mapping
 * (`aidream/services/news/engine/reason_words.py`) ships every code's words on
 * `candidates.diagnostics.reason_words`; this view prints those words, and a run recorded before them reads
 * "older run", never the code.
 */
import { act } from "react";
import { createRoot } from "react-dom/client";

import { SetAsideLists } from "../SetAsideLists";
import { OLDER_RUN_REASON, readSetAside, type RunParts } from "../run-document";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** A reason code: snake_case, or one of the engine's one-word codes printed bare. */
const CODE = /\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b|\b(?:Hygiene|Safety|Unspecified)\b/;

const WORDS = {
  hygiene: "Not news coverage",
  safety: "Brand safety",
  owned_docs_or_help: "A help or documentation page",
  product_or_ecommerce_page: "A product or shop page",
  seo_landing_page: "A marketing landing page",
  older_than_max_age: "Older than the monitor's age limit",
  no_title_or_excerpt: "No headline or summary to read",
  below_floor: "Below the selection floor",
  over_limit: "Over the run's story limit",
  not_news: "Not a news story",
  keyword_collision: "Same words, different subject",
  stale_low_value: "Small and already stale",
  x_posts_weak: "Posts on X, weak match to the brand",
  profile_relevance_weak: "Weak match to the brand profile",
};

function parts(reasonWords: Record<string, string> | undefined): RunParts {
  return {
    runId: "r", nodeId: "n", summary: { counts: {} }, digest: null, report: null, triage: null, angleSets: [],
    verdicts: {}, clientContext: null, notices: [], stages: [],
    withheld: [
      { title: "Acme help center: reset your password", reason: "hygiene", detail: "owned_docs_or_help", urls: [] },
      { title: "Buy the Acme Pro", reason: "hygiene", detail: "product_or_ecommerce_page", urls: [] },
      { title: "Best CRM 2026", reason: "hygiene", detail: "seo_landing_page", urls: [] },
      { signal_id: "s1", title: "Gunman kills 3", reason: "safety", detail: "Death or injury: “kills 3”" },
    ],
    rejected: [{ signal_id: "s2", title: "Acme Street parade", reason: "keyword_collision" },
               { signal_id: "s3", title: "Opinion: Acme", reason: "not_news" }],
    preGated: [{ signal_id: "s4", title: "Old Acme story", pre_gate_reason: "stale_low_value" }],
    diagnostics: {
      ...(reasonWords ? { reason_words: reasonWords } : {}),
      s2_dropped: { older_than_max_age: 2, no_title_or_excerpt: 1 },
      below_floor_by_lane: { x_posts_weak: 3, profile_relevance_weak: 1 },
      set_aside_items: [
        { reason: "older_than_max_age", id: "i1", title: "Acme in 2019", detail: "published 2019-01-01" },
        { reason: "below_floor", id: "s5", title: "Acme mention", detail: "" },
        { reason: "over_limit", id: "s6", title: "Acme again", detail: "" },
      ],
      below_floor: ["s5"], over_limit: ["s6"],
    },
  };
}

function render(p: RunParts): string {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() =>
    root.render(
      <SetAsideLists lists={readSetAside(p)} stories={new Map()} storyActions={() => null}
        request={{ list: "all", nonce: 1 }} />,
    ),
  );
  const text = container.textContent ?? "";
  act(() => root.unmount());
  container.remove();
  return text;
}

describe("no reason code renders on the run view", () => {
  beforeAll(() => {
    Element.prototype.scrollIntoView = () => {};
  });

  it("prints the server's words for every withheld and set-aside reason", () => {
    const text = render(parts(WORDS));
    for (const words of Object.values(WORDS)) expect(text).toContain(words);
    expect(text).not.toMatch(CODE);
  });

  it("an older run without words says so instead of printing codes", () => {
    const text = render(parts(undefined));
    expect(text).toContain(OLDER_RUN_REASON);
    expect(text).not.toMatch(CODE);
  });
});
