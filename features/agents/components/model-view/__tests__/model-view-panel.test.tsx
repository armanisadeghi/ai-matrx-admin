/**
 * The builder's Model view shows what the server's dry run returned — the
 * prompt after substitution, the platform blocks APART from it — marks the
 * inserted values, names the empty variables, and re-asks when a value is edited.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const requestModelView = jest.fn();
jest.mock("../requestModelView", () => ({
  requestModelView: (...args: unknown[]) => requestModelView(...args),
}));
jest.mock("@/lib/redux/hooks", () => ({
  useAppDispatch: () => jest.fn(),
  useAppStore: () => ({ getState: () => ({}) }),
  useAppSelector: () => ({ id: "agent-1" }),
}));
jest.mock("@ai-matrx/chat/agents/redux/agent-definition/selectors", () => ({
  selectAgentById: jest.fn(),
}));
jest.mock("@ai-matrx/chat/agents/agent-context/buildAgentBuilderContextData", () => ({
  AGENT_BUILDER_CONTEXT_MENU_PROPS: { surfaceName: "agent-builder" },
}));
jest.mock("@ai-matrx/kit/clipboard", () => ({
  useClipboard: () => ({ copyText: jest.fn() }),
}));
jest.mock("@/lib/toast", () => ({ toast: { error: jest.fn(), success: jest.fn() } }));
jest.mock("@/components/official/ProTextarea", () => ({
  ProTextarea: ({ value, onChange, "aria-label": label }: any) => (
    <textarea aria-label={label} value={value} onChange={onChange} />
  ),
}));

jest.mock("@/features/prompt-blocks/service", () => ({
  listVariants: async () => [{ id: "v1", label: "Latest models", condition: {}, content: "" }],
}));

import { ModelViewPanel } from "../ModelViewPanel";

const answer = (who: string) => ({
  preview: {
    model: "model-x",
    system_prompt: `<!--matrx:current_date-->Current date: 2026-10-10<!--matrx:/current_date-->\n\nYou help ${who}. Keep {{undeclared}}.`,
    system_parts: [
      { kind: "date", text: "<!--matrx:current_date-->Current date: 2026-10-10<!--matrx:/current_date-->" },
      { kind: "prompt", text: `\n\nYou help ${who}. Keep {{undeclared}}.` },
    ],
    turn_blocks: [{ kind: "active_context", text: "<active_context>None</active_context>" }],
    messages: [{ role: "user", content: [{ type: "text", text: `Hello ${who} about ` }] }],
    tools: [],
  },
  baseVariables: { who, topic: "" },
  declared: ["who", "topic"],
});

describe("ModelViewPanel", () => {
  let host: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    jest.useFakeTimers();
    requestModelView.mockReset();
    requestModelView.mockImplementation(async (_d, _s, _c, edits: Record<string, string>) =>
      answer(edits.who ?? "Ann Lee"),
    );
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
  });
  afterEach(() => {
    act(() => root.unmount());
    host.remove();
    jest.useRealTimers();
  });

  async function mount() {
    await act(async () => {
      root.render(<ModelViewPanel agentId="agent-1" conversationId="c-1" />);
    });
    await act(async () => {
      jest.advanceTimersByTime(600);
    });
  }
  const section = (label: string) => host.querySelector(`[aria-label="${label}"]`) as HTMLElement;

  it("separates the prompt from the platform blocks and marks inserted values", async () => {
    await mount();
    const prompt = section("System prompt");
    expect(prompt.textContent).toContain("Keep {{undeclared}}.");
    expect(prompt.textContent).not.toContain("Current date");
    expect(Array.from(prompt.querySelectorAll("mark")).map((m) => m.textContent)).toEqual(["Ann Lee"]);

    const platform = section("Platform blocks");
    expect(platform.textContent).toContain("Current date: 2026-10-10");
    expect(platform.textContent).toContain("<active_context>");
  });

  it("shows which level and variant supplied each prompt block, and the wrapped block in the prompt", async () => {
    requestModelView.mockImplementation(async () => {
      const base = answer("Ann Lee");
      return {
        ...base,
        preview: {
          ...base.preview,
          system_prompt: "<rules>\nCite sources.\n</rules>",
          system_parts: [{ kind: "prompt", text: "<rules>\nCite sources.\n</rules>" }],
          prompt_blocks: [
            { name: "rules", level: "organization", block_id: "b1", variant_id: "v1" },
            { name: "tone", level: "system", block_id: "b2", variant_id: null },
          ],
        },
      };
    });
    await mount();
    await act(async () => {
      await Promise.resolve();
    });
    expect(section("System prompt").textContent).toContain("<rules>");
    const rules = host.querySelector('[data-testid="model-view-block-rules"]') as HTMLElement;
    expect(rules.textContent).toContain("Organization");
    expect(rules.textContent).toContain("Latest models");
    const tone = host.querySelector('[data-testid="model-view-block-tone"]') as HTMLElement;
    expect(tone.textContent).toContain("System");
    expect(tone.textContent).toContain("Default text");
  });

  it("names the empty variables", async () => {
    await mount();
    const variables = section("Variables");
    expect(variables.textContent).toContain("Empty");
    expect(variables.textContent).toContain("topic");
  });

  it("asks again with the edited value and shows the new answer", async () => {
    await mount();
    const box = host.querySelector('textarea[aria-label="Value of who"]') as HTMLTextAreaElement;
    await act(async () => {
      const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!;
      set.call(box, "Maria Soto");
      box.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => {
      jest.advanceTimersByTime(600);
    });
    expect(requestModelView).toHaveBeenLastCalledWith(expect.anything(), expect.anything(), "c-1", {
      who: "Maria Soto",
    }, "agent-1");
    expect(section("System prompt").textContent).toContain("You help Maria Soto.");
  });

  it("says why when the dry run is refused", async () => {
    requestModelView.mockRejectedValue(new Error("Choose a model first."));
    await mount();
    expect(host.querySelector('[role="alert"]')?.textContent).toContain("Choose a model first.");
  });
});
