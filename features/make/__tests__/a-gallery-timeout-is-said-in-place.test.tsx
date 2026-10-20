/**
 * @jest-environment jsdom
 */
// features/make/__tests__/a-gallery-timeout-is-said-in-place.test.tsx — LANE AT-FIX-H3 (2026-10-19).
//
// THE USE CASE. Dana opens aimatrx.com/templates while the database is slow. The catalog read ran past the
// database's limit and the whole page crashed ("This page stopped working"), taking the header, the search and
// the category rail with it. Now only the results area says the shared timed-out sentence with Try again, in the
// same box the cards fill, and the page asks once more by itself.
//
// SUT: the real /templates page, the real read (readPublicCatalogueWith) over a door that answers with the
// database's timeout, and the real GalleryTimedOut island (router mocked to count refreshes).
// BREAKS THIS CATCHES (each RED on the old code): the read throwing on a timeout (page crash) · the page drawing
// "No public templates yet" for a timeout · the sentence being a private copy · no Try again · no automatic retry ·
// a refused-for-real error being swallowed as a timeout.

import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { TIMED_OUT_SENTENCE } from "@ai-matrx/design-system";

import { PublicGalleryPage } from "../gallery/PublicGalleryPage";
import { GALLERY_RETRY_PAUSE_MS } from "../gallery/GalleryTimedOut";
import { readPublicCatalogueWith } from "../gallery/publicGallery";

const refresh = jest.fn();
jest.mock("next/navigation", () => ({
  ...jest.requireActual("next/navigation"),
  useRouter: () => ({ replace: () => undefined, refresh }),
  permanentRedirect: () => undefined,
}));

const timeoutDoor = (error: { code?: string; message?: string; name?: string }) => async () => ({ data: null, error });
jest.mock("../gallery/publicCatalogue.server", () => {
  const { readPublicCatalogueWith: read } = jest.requireActual("../gallery/publicGallery") as typeof import("../gallery/publicGallery");
  const door = async () => ({ data: null, error: { name: "AbortError", message: "database did not answer within the 9000ms server deadline (https://x)" } });
  return { readPublicCatalogue: () => read(door), readPublicCatalogueFresh: () => read(door) };
});

// eslint-disable-next-line import/first -- the page loads after the read is wired
import PublicTemplatesPage from "@/app/(public)/templates/page";

beforeEach(() => {
  refresh.mockClear();
  jest.useFakeTimers();
});
afterEach(() => jest.useRealTimers());

it("a timeout from the door is a state, not a throw", async () => {
  expect(await readPublicCatalogueWith(timeoutDoor({ code: "57014", message: "canceling statement due to statement timeout" }))).toEqual({ state: "timed_out" });
  expect(await readPublicCatalogueWith(timeoutDoor({ name: "AbortError", message: "database did not answer within the 9000ms server deadline" }))).toEqual({
    state: "timed_out",
  });
});

it("a real failure still throws (never read as a timeout)", async () => {
  await expect(readPublicCatalogueWith(timeoutDoor({ code: "XX000", message: "internal error" }))).rejects.toThrow(/could not be read/);
});

it("/templates draws its header, search and rail, and says the timeout in place instead of crashing or saying 'empty'", async () => {
  const markup = renderToStaticMarkup(await PublicTemplatesPage({ searchParams: Promise.resolve({}) }));
  expect(markup).toContain('data-public-templates="timed_out"');
  expect(markup).toContain(TIMED_OUT_SENTENCE);
  expect(markup).toContain("Try again");
  expect(markup).toContain("Sign up free");
  expect(markup).not.toContain("No public templates yet");
  expect(markup).not.toMatch(/>0</); // no "0" beside All templates
  expect(markup).not.toContain("0 templates");
  expect(markup).not.toContain("application/ld+json"); // an empty list is never offered to a crawler
});

it("Try again refreshes, and the page asks once more by itself, only once", async () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  const { GalleryTimedOut } = await import("../gallery/GalleryTimedOut");
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  await act(async () => root.render(<GalleryTimedOut />));
  expect(host.querySelector('[role="alert"]')?.textContent).toContain(TIMED_OUT_SENTENCE);
  expect(refresh).not.toHaveBeenCalled();
  await act(async () => {
    jest.advanceTimersByTime(GALLERY_RETRY_PAUSE_MS + 10);
  });
  expect(refresh).toHaveBeenCalledTimes(1);
  await act(async () => {
    jest.advanceTimersByTime(GALLERY_RETRY_PAUSE_MS * 5);
  });
  expect(refresh).toHaveBeenCalledTimes(1);
  const button = [...host.querySelectorAll("button")].find((b) => b.textContent === "Try again");
  expect(button).toBeDefined();
  await act(async () => button!.click());
  expect(refresh).toHaveBeenCalledTimes(2);
  await act(async () => root.unmount());
});

it("drawn in the browser (a client navigation or a refresh) the gallery creates no executable script, timed out or not", async () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  const errors: string[] = [];
  const spy = jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => void errors.push(args.map(String).join(" ")));
  for (const state of ["open", "timed_out"]) {
    const host = document.createElement("div");
    const root = createRoot(host);
    await act(async () => root.render(<PublicGalleryPage title="Templates" cards={[]} all={[]} path="/templates" hub state={state} />));
    const executable = [...host.querySelectorAll("script")].filter((el) => !/json/.test(el.getAttribute("type") ?? ""));
    expect(executable).toEqual([]);
    await act(async () => root.unmount());
  }
  spy.mockRestore();
  expect(errors.filter((e) => /script tag/i.test(e))).toEqual([]);
});
