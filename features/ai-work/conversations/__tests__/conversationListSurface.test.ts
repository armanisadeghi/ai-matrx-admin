// The conversations list's write targets report EVERY problem in one refusal
// (before the approval card) and refuse unknown keys instead of ignoring them.

import {
  buildConversationListWriteHandlers,
  parseListView,
} from "../conversationListSurface";
import type { ConversationBrowseRow } from "../types";
import type { SurfaceWriteHandlerEntry } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";

jest.mock("../service", () => ({ saveConversationTitle: jest.fn() }));
jest.mock("../bulkTrash", () => ({ trashConversation: jest.fn() }));

const row = (over: Partial<ConversationBrowseRow>) =>
  ({ id: "c1", title: "One", is_owner: true, provider: null, ...over }) as ConversationBrowseRow;

const rows = [
  row({ id: "c1", title: "Mine" }),
  row({ id: "c2", title: "Shared", is_owner: false }),
  row({ id: "c3", title: "Coding", provider: "claude_code" } as Partial<ConversationBrowseRow>),
];

const list = {
  rows,
  query: { filters: {} },
  patchQuery: jest.fn(),
  patchRow: jest.fn(),
  removeRow: jest.fn(),
} as unknown as Parameters<typeof buildConversationListWriteHandlers>[0];

const handlers = buildConversationListWriteHandlers(list);
const refusal = (fn: () => unknown): string => {
  try {
    fn();
  } catch (e) {
    return (e as Error).message;
  }
  throw new Error("expected a refusal");
};

describe("update_conversations", () => {
  const validate = (v: unknown) => (handlers.update_conversations as SurfaceWriteHandlerEntry).validate!(v);

  it("accepts a valid list", () => {
    expect(() => validate([{ id: "c1", title: "New", favorite: true }])).not.toThrow();
  });

  it("reports every bad item at once, not just the first", () => {
    const msg = refusal(() =>
      validate([
        { id: "c1", title: "" },
        { id: "c2", favorite: true },
        { id: "nope", title: "x" },
        { id: "c1", favorite: "yes" },
      ]),
    );
    expect(msg).toMatch(/problems/);
    expect(msg).toMatch(/update_conversations\[0\].*title must be non-empty/);
    expect(msg).toMatch(/update_conversations\[1\].*only its owner can favorite/);
    expect(msg).toMatch(/update_conversations\[2\].*nope is not a conversation on screen/);
    expect(msg).toMatch(/update_conversations\[3\].*favorite must be true or false/);
    expect(msg).toMatch(/same conversation id more than once/);
  });

  it("refuses unknown keys in an item", () => {
    const msg = refusal(() => validate([{ id: "c1", titel: "Typo" }]));
    expect(msg).toMatch(/does not accept titel/);
    expect(msg).toMatch(/changes nothing/);
  });
});

describe("delete_conversations", () => {
  const validate = (v: unknown) => (handlers.delete_conversations as SurfaceWriteHandlerEntry).validate!(v);

  it("accepts ids or { id } objects", () => {
    expect(() => validate(["c1", { id: "c2" }])).not.toThrow();
  });

  it("reports every bad item at once and refuses unknown keys", () => {
    const msg = refusal(() => validate(["c3", "missing", { id: "c1", force: true }]));
    expect(msg).toMatch(/delete_conversations\[0\].*linked to a coding session/);
    expect(msg).toMatch(/delete_conversations\[1\].*missing is not a conversation on screen/);
    expect(msg).toMatch(/delete_conversations\[2\].*does not accept force/);
  });
});

describe("list_view", () => {
  it("parses a valid view change", () => {
    expect(parseListView({ lane: "all", search: " x " })).toEqual({ lane: "all", search: "x" });
  });

  it("reports every problem at once, unknown keys included", () => {
    const msg = refusal(() =>
      parseListView({ lane: "everywhere", bucket: 3, search: 5, sort: "new" }),
    );
    expect(msg).toMatch(/4 problems/);
    expect(msg).toMatch(/does not accept sort/);
    expect(msg).toMatch(/lane must be one of/);
    expect(msg).toMatch(/bucket must be one of/);
    expect(msg).toMatch(/search must be text/);
  });

  it("refuses an unknown key even beside a valid one", () => {
    expect(refusal(() => parseListView({ lane: "all", archived: "all" }))).toMatch(
      /does not accept archived/,
    );
  });

  it("refuses a non-object and an empty change", () => {
    expect(refusal(() => parseListView("mine"))).toMatch(/expects an OBJECT/);
    expect(refusal(() => parseListView({}))).toMatch(/changes nothing/);
  });
});
