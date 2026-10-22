/**
 * A stored code language the picker does not list never takes the page down (audit round 2 #1).
 * BlockNote's code block throws "Language py is not supported." when the stored `language` is not a
 * key of its list (aliases only count when typed after "```"). A Space page holding `py` crashed every
 * surface that drew it — the whole launchpad included.
 */
import type { createCodeBlockSpec } from "@blocknote/core";

import { CODE_LANGUAGES, notionCodeBlock, resolveCodeLanguage } from "../code-block";

jest.mock("@/lib/toast", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("@/lib/clipboard/copy", () => ({ copyToClipboard: jest.fn() }));

type CodeSpec = ReturnType<typeof createCodeBlockSpec>;

/** BlockNote 0.55's render, reduced to the part that throws (blocks-*.js `In`). */
function fakeBase(seen: string[]): CodeSpec {
  const render = (block: { props: { language: string } }) => {
    if (!(block.props.language in CODE_LANGUAGES)) throw new Error(`Language ${block.props.language} is not supported.`);
    seen.push(block.props.language);
    const dom = document.createElement("div");
    return { dom, contentDOM: document.createElement("code") };
  };
  return { config: { type: "codeBlock", propSchema: { language: { default: "text" } }, content: "plain" }, implementation: { render } } as unknown as CodeSpec;
}

describe("resolveCodeLanguage", () => {
  it("keeps a listed key, maps an alias to its key, and draws anything else as Plain text", () => {
    expect(resolveCodeLanguage("python")).toBe("python");
    expect(resolveCodeLanguage("py")).toBe("python");
    expect(resolveCodeLanguage("TS")).toBe("typescript");
    expect(resolveCodeLanguage("tsx")).toBe("typescript");
    expect(resolveCodeLanguage("brainfuck")).toBe("text");
    expect(resolveCodeLanguage(undefined)).toBe("text");
  });
});

describe("notionCodeBlock render", () => {
  it.each(["py", "ts", "elixir", ""])("draws a block stored as %j without throwing", (language) => {
    const seen: string[] = [];
    const spec = notionCodeBlock(fakeBase(seen));
    const editor = { isEditable: false, updateBlock: jest.fn() };
    const block = { id: "b1", type: "codeBlock", props: { language, wrap: false, caption: "" } };
    expect(() => spec.implementation.render.call(null as never, block as never, editor as never)).not.toThrow();
    expect(seen).toEqual([resolveCodeLanguage(language)]);
  });
});
