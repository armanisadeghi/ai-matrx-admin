/** The verdict headline shows the leader's FULL name, wrapping (live walk 2026-10-22: "Breeze Day Spa at Agapanthus - Gai…"). */
import { act } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { parseResult, type ComparisonResult } from "../contract";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
jest.mock("@/components/agent-copy/CopyButtons", () => ({ CopyButtons: () => null }));
jest.mock("next/image", () => ({ __esModule: true, default: () => null }));

import { ComparisonView } from "../components/ComparisonView";

const LONG = "Breeze Day Spa at Agapanthus - Gainesville Wellness and Massage Center";

it("the headline is the full name and wraps, never cut", async () => {
  const r = parseResult({
    kind: "local_business", kind_label: "Places", primary_field: "rating",
    fields: [{ key: "rating", label: "Rating", type: "rating", direction: "higher_better", is_primary: true, help: "" }],
    items: [LONG, "Spa Royale"].map((n, i) => ({
      item_id: n, item_index: i, name: n, rank: i + 1, values: { rating: { value: 5 - i, display: String(5 - i), is_best: i === 0, basis: "" } }, facets: [],
    })),
  }) as ComparisonResult;
  const host = document.createElement("div");
  document.body.appendChild(host);
  await act(async () => {
    createRoot(host).render(<QueryClientProvider client={new QueryClient()}><ComparisonView result={r} /></QueryClientProvider>);
  });
  const h1 = host.querySelector("h1") as HTMLElement;
  expect(h1.textContent).toContain(LONG);
  expect(h1.className).not.toMatch(/\btruncate\b|line-clamp/);
});
