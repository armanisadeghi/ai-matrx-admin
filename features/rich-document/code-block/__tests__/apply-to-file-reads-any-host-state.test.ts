/**
 * "Apply to <file>" is a registry row every code block evaluates — including the package's
 * compact snippet, whose published context handed rows `getState: () => undefined`. The row read
 * `getState().codeTabs` and threw inside the answer's render: the whole research answer fell to
 * the markdown error boundary (2026-10-17, /research/topics). A row's predicate must survive any
 * host state, and the resolver must keep one bad row from taking down the menu.
 */
import { getAction, getAllActions } from "@ai-matrx/rich-content/rich-document/actions/provider";
import type { RichDocumentActionContext } from "@ai-matrx/rich-content/rich-document/types";
import { codeBlockContext, resolveCodeBlockMenuItems } from "../code-block-registry-bridge";

jest.mock("@/lib/toast", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const facts = { code: "print(1)", language: "python", conversationId: null, messageId: null };

function ctxWith(getState: () => unknown): RichDocumentActionContext {
  return codeBlockContext({
    facts,
    dispatch: jest.fn() as never,
    getState: getState as never,
    isAuthenticated: true,
    organizationId: null,
  });
}

test("Apply to file is absent, not a crash, when the host state is undefined or empty", () => {
  const action = getAction("code-block-apply-to-file");
  expect(action?.visible).toBeDefined();
  for (const state of [undefined, {}, { codeTabs: undefined }]) {
    expect(() => action!.visible!(ctxWith(() => state))).not.toThrow();
    expect(action!.visible!(ctxWith(() => state))).toBe(false);
  }
});

test("Apply to file shows when an editable tab is open", () => {
  const state = { codeTabs: { activeId: "t1", byId: { t1: { id: "t1", name: "main.py", content: "" } } } };
  const items = resolveCodeBlockMenuItems(ctxWith(() => state));
  expect(items.map((i) => i.label)).toContain("Apply to main.py");
});

test("a code-block row whose predicate throws is reported and absent; the menu still resolves", () => {
  const all = getAllActions();
  const thrower = { ...all[0], id: "code-block-test-throws", visible: () => { throw new TypeError("boom"); } };
  const spy = jest.spyOn(require("@ai-matrx/rich-content/rich-document/actions/provider"), "getAllActions")
    .mockReturnValue([...all, thrower]);
  const err = jest.spyOn(console, "error").mockImplementation(() => {});
  try {
    expect(() => resolveCodeBlockMenuItems(ctxWith(() => ({})))).not.toThrow();
    const keys = resolveCodeBlockMenuItems(ctxWith(() => ({}))).map((i) => i.key);
    expect(keys).not.toContain("code-block-test-throws");
    expect(err).toHaveBeenCalledWith(expect.stringContaining("code-block-test-throws"), expect.any(TypeError));
  } finally {
    spy.mockRestore();
    err.mockRestore();
  }
});
