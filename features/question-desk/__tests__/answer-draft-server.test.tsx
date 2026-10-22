/** @jest-environment jsdom */
// NEVER LOSE HIS WORDS, ON ANY DEVICE. An unsaved answer draft lives on the
// server (users.user_surface_state, keyed by interview + question), is restored
// on a reload or another device, and is retired when the answer is saved.
// Red recipe: the previous hook kept the draft in this browser's localStorage
// only — the server store below stayed empty and a "new device" (localStorage
// wiped) restored nothing.

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const store = new Map<string, { state: unknown; deleted: boolean; org: string }>();
const id = (k: { userId: string; feature: string; surfaceKey: string }) => `${k.userId}|${k.feature}|${k.surfaceKey}`;

jest.mock("@/lib/surface-state/userSurfaceState", () => ({
  readSurfaceState: async (k: { userId: string; feature: string; surfaceKey: string }) => {
    const row = store.get(id(k));
    return row && !row.deleted ? { state: row.state } : null;
  },
  writeSurfaceState: async (k: { userId: string; feature: string; surfaceKey: string; organizationId: string; state: unknown }) => {
    store.set(id(k), { state: k.state, deleted: false, org: k.organizationId });
    return null;
  },
  retireSurfaceState: async (k: { userId: string; feature: string; surfaceKey: string }) => {
    const row = store.get(id(k));
    if (row) row.deleted = true;
    return null;
  },
}));
jest.mock("@/lib/redux/hooks", () => ({ useAppSelector: () => "user-1" }));
jest.mock("@ai-matrx/chat/host/identity", () => ({ selectUserId: () => "user-1" }));
jest.mock("@/lib/organizations/ensureOrgId", () => ({ ensureOrgId: async () => "org-1" }));

import { ANSWER_DRAFT_DEBOUNCE_MS, ANSWER_DRAFT_FEATURE, useAnswerDraft, type AnswerDraft } from "../hooks/useAnswerDraft";

let latest: AnswerDraft | null = null;
function Harness({ interviewId, questionId }: { interviewId: string; questionId: string }) {
  latest = useAnswerDraft(interviewId, questionId);
  return null;
}

const KEY = `user-1|${ANSWER_DRAFT_FEATURE}|sit-1:q-1`;
const settle = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

describe("answer drafts live on the server", () => {
  let host: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    jest.useFakeTimers();
    store.clear();
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
  });
  afterEach(() => {
    act(() => root.unmount());
    host.remove();
    jest.useRealTimers();
  });

  it("saves typed words (debounced), restores them on another device, retires them on save", async () => {
    act(() => root.render(<Harness interviewId="sit-1" questionId="q-1" />));
    await settle();
    act(() => latest!.setText("The customer I would clone "));
    act(() => latest!.setText("The customer I would clone is Dana."));
    expect(store.has(KEY)).toBe(false); // nothing written mid-typing
    await act(async () => {
      jest.advanceTimersByTime(ANSWER_DRAFT_DEBOUNCE_MS);
    });
    await settle();
    expect(store.get(KEY)).toMatchObject({ deleted: false, org: "org-1", state: { text: "The customer I would clone is Dana." } });

    // Another device: a fresh mount with no browser storage restores the words.
    window.localStorage.clear();
    act(() => root.unmount());
    root = createRoot(host);
    act(() => root.render(<Harness interviewId="sit-1" questionId="q-1" />));
    await settle();
    expect(latest!.text).toBe("The customer I would clone is Dana.");

    // The answer was saved: the draft is retired, and a reload shows an empty box.
    act(() => latest!.clear());
    await settle();
    expect(store.get(KEY)?.deleted).toBe(true);
  });

  it("flushes pending words when the page is hidden, and never wipes a saved draft on load", async () => {
    store.set(KEY, { state: { text: "kept" }, deleted: false, org: "org-1" });
    act(() => root.render(<Harness interviewId="sit-1" questionId="q-1" />));
    await settle();
    expect(latest!.text).toBe("kept");
    act(() => latest!.setText("kept and more"));
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await settle();
    expect(store.get(KEY)?.state).toMatchObject({ text: "kept and more" });
  });
});
