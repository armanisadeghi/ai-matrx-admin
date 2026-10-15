/**
 * MKT-080: rank labels were each result's best rank per search query, so three queries gave
 * "#1" on three rows. The label is the row's place in the list; per-query ranks live in the hover.
 */
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { SearchReviewBody } from "../SearchReviewBody";
import type { SearchReviewSession } from "../types";

jest.mock("@/lib/redux/hooks", () => ({ useAppSelector: () => false, useAppDispatch: () => jest.fn() }));

const result = (key: string, rank: number, query: string) => ({
  key,
  result: { url: `https://example.com/${key}`, title: key },
  hits: [{ engine: "brave", rank, query }],
});

it("labels rows 1..n even when every result was #1 for its own query", async () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  const session: SearchReviewSession = {
    subject: { type: "brand", name: "Acme" },
    results: [result("a", 1, "q1"), result("b", 1, "q2"), result("c", 1, "q3")],
    choices: [],
    answers: {},
    onAnswer: () => undefined,
  };
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => {
    root.render(<SearchReviewBody session={session} />);
  });
  const labels = [...host.querySelectorAll('[data-testid="search-review-rank"]')].map((n) => n.textContent);
  expect(labels).toEqual(["#1", "#2", "#3"]);
  await act(async () => root.unmount());
});
