/**
 * The scanner's race rules: a slow result never overwrites something newer.
 *  - a background enhance (Clean all) lands only if it is still the newest
 *    thing that happened to that page;
 *  - background boundary detection never replaces a crop the person chose;
 *  - Save waits for enhances in flight.
 */
import { act } from "react";
import { createRoot } from "react-dom/client";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** The smallest hook harness: render once, read the latest value through `current`. */
function renderHook<R>(hook: () => R): { result: { current: R } } {
  const result = {} as { current: R };
  function Probe() {
    result.current = hook();
    return null;
  }
  act(() => {
    createRoot(document.createElement("div")).render(<Probe />);
  });
  return { result };
}

jest.mock("@/features/files/handler/handler", () => ({
  fileHandler: {
    upload: jest.fn(async () => ({ fileId: "file-original" })),
  },
}));
jest.mock("@/lib/media/object-url-registry", () => ({
  createTrackedObjectUrl: () => "blob:preview",
  revokeTrackedObjectUrl: () => {},
}));

import { useScanSession } from "../useScanSession";
import type { Quad } from "../types";

const QUAD: Quad = {
  top_left: [1, 1],
  top_right: [9, 1],
  bottom_right: [9, 9],
  bottom_left: [1, 9],
};

async function sessionWithOnePage() {
  window.localStorage.clear();
  const hook = renderHook(() => useScanSession());
  act(() => {
    hook.result.current.addFiles([
      new File(["x"], "page.jpg", { type: "image/jpeg" }),
    ]);
  });
  // Let the mocked upload resolve and its state update commit.
  await act(async () => {
    await Promise.resolve();
  });
  expect(hook.result.current.allUploaded).toBe(true);
  const itemId = hook.result.current.items[0].itemId;
  return { hook, itemId };
}

describe("scan session races", () => {
  it("a background enhance lands when nothing newer happened", async () => {
    const { hook, itemId } = await sessionWithOnePage();
    let token = 0;
    act(() => {
      token = hook.result.current.beginEnhance(itemId);
    });
    expect(hook.result.current.enhancingCount).toBe(1);
    expect(hook.result.current.readyToSave).toBe(false);
    act(() => {
      hook.result.current.finishEnhance(itemId, token, "clean", "file-clean");
    });
    expect(hook.result.current.items[0].enhancedFileId).toBe("file-clean");
    expect(hook.result.current.enhancingCount).toBe(0);
    expect(hook.result.current.readyToSave).toBe(true);
  });

  it("an explicit choice made while Clean all runs is never overwritten", async () => {
    const { hook, itemId } = await sessionWithOnePage();
    let token = 0;
    act(() => {
      token = hook.result.current.beginEnhance(itemId);
    });
    act(() => {
      hook.result.current.setEnhance(itemId, "bw", "file-bw");
    });
    let landed = true;
    act(() => {
      landed = hook.result.current.finishEnhance(itemId, token, "clean", "file-clean");
    });
    expect(landed).toBe(false);
    expect(hook.result.current.items[0].enhance).toBe("bw");
    expect(hook.result.current.items[0].enhancedFileId).toBe("file-bw");
    expect(hook.result.current.enhancingCount).toBe(0);
  });

  it("only the newest of two overlapping requests may land", async () => {
    const { hook, itemId } = await sessionWithOnePage();
    let first = 0;
    let second = 0;
    act(() => {
      first = hook.result.current.beginEnhance(itemId);
      second = hook.result.current.beginEnhance(itemId);
    });
    act(() => {
      hook.result.current.finishEnhance(itemId, second, "clean", "file-new");
    });
    act(() => {
      hook.result.current.finishEnhance(itemId, first, "clean", "file-old");
    });
    expect(hook.result.current.items[0].enhancedFileId).toBe("file-new");
  });

  it("a failed request stops showing as in progress", async () => {
    const { hook, itemId } = await sessionWithOnePage();
    let token = 0;
    act(() => {
      token = hook.result.current.beginEnhance(itemId);
    });
    act(() => hook.result.current.cancelEnhance(itemId, token));
    expect(hook.result.current.enhancingCount).toBe(0);
    expect(hook.result.current.items[0].enhance).toBeUndefined();
  });

  it("a late detection never replaces the person's crop or full-frame choice", async () => {
    const { hook, itemId } = await sessionWithOnePage();
    act(() => hook.result.current.setQuad(itemId, null)); // explicit full frame
    act(() => hook.result.current.setDetectedQuad(itemId, QUAD));
    expect(hook.result.current.items[0].quad).toBeNull();
  });

  it("a detection lands on an untouched page", async () => {
    const { hook, itemId } = await sessionWithOnePage();
    act(() => hook.result.current.setDetectedQuad(itemId, QUAD));
    expect(hook.result.current.items[0].quad).toEqual(QUAD);
  });
});
