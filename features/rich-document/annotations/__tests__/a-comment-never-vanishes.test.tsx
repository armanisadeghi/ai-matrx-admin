/**
 * @jest-environment jsdom
 *
 * NOTHING FAILS SILENTLY — chat-answer comments (2026-10-17, report
 * common-docs/projects/rich-content-unification/evidence/chat-comments-broken.md).
 *
 *   1. A comment written while the sidecar has no record never vanishes: the write REJECTS (the
 *      composer keeps the words and shows the sentence); one-click writes toast.
 *   2. A signed-out tab (the live `permission denied for function cmt_list`, 42501) is told it is
 *      signed out, with the Sign in remedy, never "ask the owner to share it".
 */

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
// jsdom has no matchMedia; the archive control asks it for phone vs desktop.
if (typeof window.matchMedia !== "function") {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (query: string) => ({ matches: false, media: query, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, onchange: null, dispatchEvent: () => false }),
  });
}
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
}
if (!("randomUUID" in globalThis.crypto)) {
  let n = 0;
  (globalThis.crypto as unknown as { randomUUID: () => string }).randomUUID = () =>
    `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
}

const service = {
  listCommentThreads: jest.fn(),
  listEdgeItems: jest.fn(),
  annotationPairs: jest.fn(async () => ({ highlights: true, links: true })),
  addComment: jest.fn(),
  editComment: jest.fn(),
  deleteComment: jest.fn(),
  resolveComment: jest.fn(),
  createHighlight: jest.fn(),
  deleteHighlight: jest.fn(),
  linkRecord: jest.fn(),
  unlinkRecord: jest.fn(),
  notifyMentions: jest.fn(),
  rewriteHighlightEdge: jest.fn(),
  saveHighlightNote: jest.fn(),
  mentionCandidates: jest.fn(async () => []),
  canEditSource: jest.fn(async () => true),
};
jest.mock("../service", () => service);
// The sidecar's live half opens through the realtime manager, once per source (sidecarStore.ts).
const mockRealtime = { open: jest.fn(() => ({ close: jest.fn() })) as jest.Mock };
jest.mock("@ai-matrx/data/realtime/react", () => ({ useChannel: jest.fn(), useRealtimeManager: () => mockRealtime }));
jest.mock("@ai-matrx/data/realtime", () => ({ defineChannelNamespace: () => ({ topic: () => "t" }) }));
jest.mock("@/features/scopes/host/associationsStore", () => ({
  getAssociationsStore: () => ({ titles: { fetch: async () => new Map() } }),
}));
jest.mock("@/features/scopes/registry/entityRegistry", () => ({ tryGetEntityInfo: () => null }));
jest.mock("@/features/scopes/service/associationCandidates", () => ({ searchCandidatesAcrossTokens: jest.fn(async () => ({ results: [], failures: [] })) }));
jest.mock("@/utils/auth/getUserId", () => ({ getUserId: () => "me" }));
jest.mock("@ai-matrx/auth/organizations", () => ({ ...jest.requireActual("@ai-matrx/auth/organizations"), ...(() => ({ isOrganizationRequiredError: () => false }))() }));
jest.mock("@ai-matrx/chat/host/org", () => ({
  ...jest.requireActual("@ai-matrx/chat/host/org"),
  ...(() => ({ organizationRefusalMessage: () => "" }))(),
}));
jest.mock("@/lib/toast", () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warning: jest.fn() } }));
jest.mock("@/components/official/entity-ref/EntityRef", () => ({ EntityRef: () => null }));
jest.mock("@ai-matrx/rich-content/levels/RichContent", () => ({ RichContent: ({ source }: { source: string }) => <span>{source}</span> }));
jest.mock("../LinkRecordSheet", () => ({ LinkRecordSheet: () => null }));

import { useAnnotationSidecar } from "../useAnnotationSidecar";
import { SIGNED_OUT_LEAD, humanError, isSignedOutSentence } from "../errors";
import { toast } from "@/lib/toast";

let api: ReturnType<typeof useAnnotationSidecar> | null = null;
function Harness() {
  api = useAnnotationSidecar(null);
  return null;
}

describe("a comment never vanishes", () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root.render(<Harness />));
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    jest.clearAllMocks();
  });

  it("a comment posted before the record is known REJECTS, so its composer keeps the text", async () => {
    // Before 2026-10-17 this resolved null: the composer had already closed and the words were gone.
    expect(api!.ready).toBe(false);
    await expect(api!.postComment({ body: "Is this per shift?", anchor: null })).rejects.toThrow(/nothing was saved/);
    await expect(api!.postComment({ body: "Reply", anchor: null, parentId: "c1" })).rejects.toThrow(/nothing was saved/);
    expect(service.addComment).not.toHaveBeenCalled();
  });

  it("a one-click write with no record says so, never a silent false", async () => {
    await act(async () => {
      expect(await api!.addHighlight(null)).toBe(false);
    });
    expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/nothing was saved/));
  });
});

describe("a signed-out tab is told to sign in, not to ask an owner", () => {
  it("the anonymous refusal measured on live is a signed-out sentence", () => {
    const e = humanError("loading the comments", { code: "42501", details: null, hint: null, message: "permission denied for function cmt_list" });
    expect(e.signedOut).toBe(true);
    expect(e.retryable).toBe(true);
    expect(e.message.startsWith(SIGNED_OUT_LEAD)).toBe(true);
    expect(isSignedOutSentence(e.message)).toBe(true);
    expect(e.message).not.toMatch(/owner/);
  });

  it("an HTTP 401 is signed out; a real permission refusal is still a permission sentence", () => {
    expect(humanError("posting your comment", { code: "42501", status: 401, message: "x" }).signedOut).toBe(true);
    const real = humanError("posting your comment", { code: "42501", message: "cmt_add: you cannot comment on this record (message)" });
    expect(real.signedOut).toBe(false);
    expect(real.message).toMatch(/permission/);
  });
});
