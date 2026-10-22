/**
 * ADVERSARIAL-8 F6: a fresh copy's Dashboard drew nothing at all while the database was saturated — the page's
 * read never answered and the page kept its empty busy frame; a failed read drew "No Space here". A page read
 * that fails or runs past its deadline is now said in one sentence with Try again.
 */
import React from "react";
import { act } from "react-dom/test-utils";
import { createRoot } from "react-dom/client";

jest.mock("next/navigation", () => ({ usePathname: () => "/spaces/x" }));

import { PAGE_READ_FAILED, PAGE_READ_SLOW, readPageWithDeadline } from "../page-read";
import { LoadAccessState } from "../../workspace/LoadAccessState";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

it("a read that never answers becomes the 'took too long' sentence at its deadline", async () => {
  jest.useFakeTimers();
  const answer = readPageWithDeadline(() => new Promise<null>(() => {}), 15_000);
  jest.advanceTimersByTime(15_000);
  await expect(answer).resolves.toEqual({ kind: "fault", sentence: PAGE_READ_SLOW });
  jest.useRealTimers();
});

it("a read that fails is a sentence for the person, never database text; a page that is not there stays null", async () => {
  jest.spyOn(console, "error").mockImplementation(() => {});
  await expect(readPageWithDeadline(() => Promise.reject(new Error("canceling statement due to statement timeout")))).resolves.toEqual({
    kind: "fault",
    sentence: PAGE_READ_FAILED,
  });
  await expect(readPageWithDeadline(() => Promise.resolve(null))).resolves.toEqual({ kind: "read", doc: null });
});

it("the refusal draws that sentence and a Try again that reads again", () => {
  const host = document.createElement("div");
  const root = createRoot(host);
  let retried = 0;
  act(() => root.render(<LoadAccessState access="fault" title={PAGE_READ_SLOW} onRetry={() => void (retried += 1)} />));
  expect(host.textContent).toContain(PAGE_READ_SLOW);
  const button = [...host.querySelectorAll("button")].find((b) => b.textContent === "Try again");
  expect(button).toBeTruthy();
  act(() => button!.click());
  expect(retried).toBe(1);
  act(() => root.unmount());
});
