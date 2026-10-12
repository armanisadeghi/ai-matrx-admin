/**
 * The builder's Model view lays out the provider request the server captured —
 * in order, whitespace kept, nothing hidden — offers the raw payload, copies its
 * exact bytes, and asks again when anything the request reads changes.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import captured from "./fixtures/captured-requests.json";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const requestModelView = jest.fn();
jest.mock("../requestModelView", () => ({
  requestModelView: (...args: unknown[]) => requestModelView(...args),
}));
let selected: unknown = { id: "agent-1" };
jest.mock("@/lib/redux/hooks", () => ({
  useAppDispatch: () => jest.fn(),
  useAppStore: () => ({ getState: () => ({}) }),
  useAppSelector: (select: (s: unknown) => unknown) => {
    try {
      return select({
        conversations: { byConversationId: {} },
        instanceVariableValues: { byConversationId: { "c-1": selected } },
        instanceUIState: { byConversationId: {} },
        messages: { byConversationId: {} },
      });
    } catch {
      return { id: "agent-1" };
    }
  },
}));
jest.mock("@ai-matrx/chat/agents/redux/agent-definition/selectors", () => ({
  selectAgentById: () => ({ id: "agent-1" }),
}));
const copyText = jest.fn();
jest.mock("@ai-matrx/kit/clipboard", () => ({
  useClipboard: () => ({ copyText }),
}));
jest.mock("@/lib/toast", () => ({ toast: { error: jest.fn(), success: jest.fn() } }));
jest.mock("@/features/prompt-blocks/service", () => ({
  listVariants: async () => [{ id: "v1", label: "Latest models", condition: {}, content: "" }],
}));

import { ModelViewPanel } from "../ModelViewPanel";

const anthropic = (captured as Record<string, any>).anthropic;
const TYPED = "Where should I go in May?\n\n   Two lines,\ttabbed.";

describe("ModelViewPanel", () => {
  let host: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    jest.useFakeTimers();
    copyText.mockReset();
    requestModelView.mockReset();
    requestModelView.mockResolvedValue({
      provider: "anthropic",
      model: "claude-haiku-5-5",
      request: anthropic,
      notices: [],
      prompt_blocks: [{ name: "rules", level: "organization", block_id: "b1", variant_id: "v1" }],
    });
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
  const section = (label: string) => host.querySelector(`section[aria-label^="${label}"]`) as HTMLElement;

  it("lays the request out in order: system, messages, tools, parameters", async () => {
    await mount();
    const titles = Array.from(host.querySelectorAll("section")).map((s) => s.getAttribute("aria-label"));
    expect(titles.slice(0, 4)).toEqual(["System (2)", "Messages (1)", "Tools", "Parameters"]);
    // The date and the organisation catalogue are part of the system text, where the provider gets them.
    const system = section("System").textContent ?? "";
    expect(system.indexOf("Current date")).toBeLessThan(system.indexOf("You help Dana Whitfield"));
    expect(system).toContain("<org_catalog");
  });

  it("shows the typed message exactly, whitespace and tabs kept, in a pre-wrap block", async () => {
    await mount();
    const pres = Array.from(section("Messages").querySelectorAll("pre"));
    const typed = pres.find((p) => (p.textContent ?? "").includes("Where should I go"));
    expect(typed?.textContent).toContain(TYPED);
    expect(typed?.className).toContain("whitespace-pre-wrap");
    // The block's cache_control rides beside the text, never hidden.
    expect(section("Messages").textContent).toContain("cache_control");
  });

  it("every parameter is listed, nothing dropped", async () => {
    await mount();
    const params = section("Parameters").textContent ?? "";
    for (const key of ["max_tokens", "model", "stream"]) expect(params).toContain(key);
  });

  it("tools open to their full JSON", async () => {
    await mount();
    const tool = host.querySelector('[data-testid="model-view-tool"] button') as HTMLButtonElement;
    expect(tool.textContent).toContain("scope_system");
    await act(async () => tool.click());
    expect(host.querySelector('[data-testid="model-view-tool"] pre')?.textContent).toContain('"input_schema"');
  });

  it("Raw JSON shows the whole payload; Copy all copies the exact bytes", async () => {
    await mount();
    const raw = Array.from(host.querySelectorAll("button")).find((b) => b.textContent === "Raw JSON")!;
    await act(async () => raw.click());
    const shown = host.querySelector('[data-testid="model-view-raw"]')?.textContent ?? "";
    expect(JSON.parse(shown)).toEqual(anthropic.body);
    const copyAll = Array.from(host.querySelectorAll("button")).find((b) => b.textContent === "Copy all")!;
    await act(async () => copyAll.click());
    expect(copyText).toHaveBeenCalledWith(anthropic.body_text, "Request copied");
  });

  it("names the prompt block's level and variant", async () => {
    await mount();
    await act(async () => {
      await Promise.resolve();
    });
    const row = host.querySelector('[data-testid="model-view-block-rules"]')!;
    expect(row.textContent).toContain("Organization");
    expect(row.textContent).toContain("Latest models");
  });

  it("asks again when the inputs change", async () => {
    await mount();
    expect(requestModelView).toHaveBeenCalledTimes(1);
    selected = { userValues: { customer: "Lee" } };
    await act(async () => {
      root.render(<ModelViewPanel agentId="agent-1" conversationId="c-1" />);
    });
    await act(async () => {
      jest.advanceTimersByTime(600);
    });
    expect(requestModelView).toHaveBeenCalledTimes(2);
  });

  it("says when a route's wire cannot be captured", async () => {
    requestModelView.mockResolvedValue({
      provider: "typesafe",
      model: "sys-one",
      request: { ...anthropic, transport: "uncaptured" },
    });
    await mount();
    expect(host.textContent).toContain("can't be captured");
  });
});
