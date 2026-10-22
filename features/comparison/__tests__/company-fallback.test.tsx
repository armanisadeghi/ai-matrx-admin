/** Small companies (live walk 2026-10-22: midtownfamilydental.org vs sparoyale.net read "Nothing to compare yet"):
 *  with no reviews page they are compared on their facets and ranked by the map rating; only when nothing at all
 *  was found does the page say so, with a way out. Shapes as the server now answers them. */
import { act } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { parseResult, type ComparisonResult } from "../contract";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
jest.mock("@/components/agent-copy/CopyButtons", () => ({ CopyButtons: () => null }));
jest.mock("next/image", () => ({ __esModule: true, default: () => null }));

import { ComparisonView, noLeaderTitle } from "../components/ComparisonView";

const FIELDS = [
  { key: "overall_rating", label: "Overall rating", type: "rating", direction: "higher_better", is_primary: false, help: "" },
  { key: "google_rating", label: "Google rating", type: "rating", direction: "higher_better", is_primary: true, help: "", facet: "google", facet_label: "Google rating" },
];
const NO_PAGE = (d: string) => `No reviews page found for ${d}.`;

function compared(): ComparisonResult {
  return parseResult({
    kind: "companies_reviews", kind_label: "Companies by their reviews", primary_field: "google_rating", fields: FIELDS,
    items: [["sparoyale.net", 4.9, 1], ["midtownfamilydental.org", 4.7, 2]].map(([d, g, rank], i) => ({
      item_id: `https://www.trustpilot.com/review/${d}`, item_index: i, name: d, rank, error: null, source_error: NO_PAGE(String(d)),
      values: { overall_rating: { value: null, display: "—", basis: NO_PAGE(String(d)) },
        google_rating: { value: g, display: String(g), is_best: rank === 1, basis: "map listing" } },
      facets: [{ key: "google", label: "Google rating", status: "done" }],
    })),
  }) as ComparisonResult;
}

function nothing(): ComparisonResult {
  return parseResult({
    kind: "companies_reviews", kind_label: "Companies by their reviews", primary_field: "overall_rating", fields: FIELDS,
    items: ["highsierracabinets.com", "brianscabinets.com"].map((d, i) => ({
      item_id: d, item_index: i, name: d, rank: 0, error: NO_PAGE(d), values: {}, facets: [],
    })),
  }) as ComparisonResult;
}

async function render(r: ComparisonResult, wayOut?: React.ReactNode) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  await act(async () => {
    createRoot(host).render(<QueryClientProvider client={new QueryClient()}><ComparisonView result={r} wayOut={wayOut} /></QueryClientProvider>);
  });
  return host;
}

it("parses source_error and keeps the item compared", () => {
  const r = compared();
  expect(r.items[0].error).toBeNull();
  expect(r.items[0].source_error).toBe(NO_PAGE("sparoyale.net"));
});

it("no reviews page: a real verdict on the map rating, each card says its reviews page is missing", async () => {
  const host = await render(compared(), <button>Try as local businesses</button>);
  expect(host.querySelector("h1")?.textContent).not.toMatch(/Nothing to compare|couldn't find/);
  expect(host.textContent).toContain("sparoyale.net");
  expect(host.textContent).toContain(NO_PAGE("midtownfamilydental.org"));
  expect(host.textContent).not.toContain("Try as local businesses"); // the way out only when nothing compared
});

it("nothing found for any company: an honest title and the way out, never a dead end", async () => {
  const r = nothing();
  expect(noLeaderTitle(r)).toBe("We couldn't find public data for these companies");
  const host = await render(r, <><button>Try as local businesses</button><button>Edit names</button></>);
  expect(host.querySelector("h1")?.textContent).toBe("We couldn't find public data for these companies");
  expect(host.textContent).toContain("Try as local businesses");
  expect(host.textContent).toContain("Edit names");
});

it("compared but unranked reads side by side", () => {
  const r = compared();
  r.items.forEach((i) => { i.rank = 0; });
  expect(noLeaderTitle(r)).toBe("Side by side");
});
