/**
 * The builder's Model view lays out the provider request the server captured —
 * in order, whitespace kept, nothing hidden — offers the raw payload, copies its
 * exact bytes, and asks again when anything the request reads changes.
 */
import React, { act, Profiler } from "react";
import { createRoot, type Root } from "react-dom/client";
import captured from "./fixtures/captured-requests.json";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const requestModelView = jest.fn();
jest.mock("../requestModelView", () => ({
  requestModelView: (...args: unknown[]) => requestModelView(...args),
}));
let selected: unknown = { id: "agent-1" };
const FALLBACK = { id: "agent-1" }; // stable across renders, like a store value
const STABLE_DISPATCH = jest.fn(); // the real hooks return the same dispatch and store on every render
const STABLE_STORE = { getState: () => ({}) };
jest.mock("@/lib/redux/hooks", () => ({
  useAppDispatch: () => STABLE_DISPATCH,
  useAppStore: () => STABLE_STORE,
  useAppSelector: (select: (s: unknown) => unknown) => {
    try {
      return select({
        conversations: { byConversationId: {} },
        instanceVariableValues: { byConversationId: { "c-1": selected } },
        instanceUIState: { byConversationId: {} },
        messages: { byConversationId: {} },
      });
    } catch {
      return FALLBACK;
    }
  },
}));
jest.mock("@ai-matrx/chat/agents/redux/agent-definition/selectors", () => {
  const draft = { id: "agent-1" }; // one object, like the store's: a new one per read would re-run the effect forever
  return { selectAgentById: () => draft };
});
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
      for (let i = 0; i < 5; i++) await Promise.resolve();
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

  it("shows an outline of the final layout and a Capturing state before the first capture lands", async () => {
    requestModelView.mockReturnValue(new Promise(() => {}));
    await mount();
    expect(host.querySelector('[data-testid="model-view-skeleton"]')).not.toBeNull();
    const status = host.querySelector('[data-testid="model-view-capturing"]') as HTMLElement;
    expect(status.textContent).toContain("Capturing");
    // The outline holds the same four sections the finished view has, in the same order.
    const titles = Array.from(host.querySelectorAll('[data-testid="model-view-skeleton"] h3')).map((h) => h.textContent);
    expect(titles).toEqual(["System", "Messages", "Tools", "Parameters"]);
  });

  it("keeps the previous capture on screen, dimmed, while the next one runs", async () => {
    await mount();
    await act(async () => {
      for (let i = 0; i < 5; i++) await Promise.resolve();
    });
    expect(host.querySelector('[data-testid="model-view-skeleton"]')).toBeNull();
    expect(host.querySelector('[data-testid="model-view-capturing"]')).toBeNull();
    requestModelView.mockReturnValue(new Promise(() => {}));
    selected = { userValues: { customer: "Sam" } };
    await act(async () => {
      root.render(<ModelViewPanel agentId="agent-1" conversationId="c-1" />);
    });
    await act(async () => {
      jest.advanceTimersByTime(600);
    });
    const body = host.querySelector('[data-testid="model-view-body"]') as HTMLElement;
    expect(body.className).toContain("opacity-50");
    expect(body.getAttribute("aria-busy")).toBe("true");
    expect(section("System").textContent).toContain("You help Dana Whitfield");
    expect(host.querySelector('[data-testid="model-view-skeleton"]')).toBeNull();
    expect(host.querySelector('[data-testid="model-view-capturing"]')?.textContent).toContain("Capturing");
  });

  it("says plainly why nothing can be shown, and drops the stale request", async () => {
    await mount();
    expect(section("System")).not.toBeNull();
    requestModelView.mockRejectedValue(
      new Error("This agent has no message of its own and nothing is typed, so a run would send nothing. Type a message to see the request."),
    );
    selected = { userValues: { customer: "Pat" } };
    await act(async () => {
      root.render(<ModelViewPanel agentId="agent-1" conversationId="c-1" />);
    });
    await act(async () => {
      jest.advanceTimersByTime(600);
    });
    const alert = host.querySelector('[role="alert"]') as HTMLElement;
    expect(alert.textContent).toContain("nothing is typed, so a run would send nothing");
    expect(host.textContent).not.toContain("Invalid request");
    expect(section("System")).toBeNull();
    expect(host.querySelector('[data-testid="model-view-skeleton"]')).toBeNull();
  });
  it("clears the loading state the moment the request settles, and the old refusal when a new capture starts", async () => {
    requestModelView.mockRejectedValueOnce(new Error("Nothing is typed."));
    await mount();
    await act(async () => {
      for (let i = 0; i < 5; i++) await Promise.resolve();
    });
    expect(host.querySelector('[role="alert"]')?.textContent).toContain("Nothing is typed.");
    expect(host.querySelector('[data-testid="model-view-capturing"]')).toBeNull();
    // A new capture starts: the last refusal is gone while Capturing shows.
    let settle: (v: unknown) => void = () => undefined;
    requestModelView.mockReturnValue(new Promise((r) => (settle = r)));
    selected = { userValues: { customer: "Ana" } };
    await act(async () => {
      root.render(<ModelViewPanel agentId="agent-1" conversationId="c-1" />);
    });
    await act(async () => {
      jest.advanceTimersByTime(600);
    });
    expect(host.querySelector('[data-testid="model-view-capturing"]')).not.toBeNull();
    expect(host.querySelector('[role="alert"]')).toBeNull();
    // The answer lands: Capturing is gone in the same turn, no later tick needed.
    await act(async () => {
      settle({ provider: "anthropic", model: "m", request: anthropic, notices: [] });
    });
    expect(host.querySelector('[data-testid="model-view-capturing"]')).toBeNull();
  });

  it("a capture replaced by a newer one is aborted, never left running beside it", async () => {
    const signals: AbortSignal[] = [];
    requestModelView.mockImplementation((...args: unknown[]) => {
      signals.push(args[4] as AbortSignal);
      return new Promise(() => {});
    });
    await mount();
    selected = { userValues: { customer: "Bo" } };
    await act(async () => {
      root.render(<ModelViewPanel agentId="agent-1" conversationId="c-1" />);
    });
    await act(async () => {
      jest.advanceTimersByTime(600);
    });
    expect(signals).toHaveLength(2);
    expect(signals[0].aborted).toBe(true);
    expect(signals[1].aborted).toBe(false);
  });

  // React #185 on the live builder (2026-10-14): the capture effect set state on every
  // keystroke, so each composer commit queued a second render; a fast typist outran it
  // and React threw "Maximum update depth exceeded" from the composer's onChange.
  it("a keystroke is ONE commit: the capture effect never sets state, Capturing is derived", async () => {
    let commits = 0;
    const tree = () => (
      <Profiler id="mv" onRender={() => void commits++}>
        <ModelViewPanel agentId="agent-1" conversationId="c-1" />
      </Profiler>
    );
    await act(async () => {
      root.render(tree());
    });
    await act(async () => {
      jest.advanceTimersByTime(600);
    });
    await act(async () => {
      for (let i = 0; i < 5; i++) await Promise.resolve();
    });
    // The first capture has landed: nothing is loading.
    expect(host.querySelector('[data-testid="model-view-capturing"]')).toBeNull();
    // The composer changes — one keystroke.
    commits = 0;
    selected = { userValues: { customer: "Kim" } };
    await act(async () => {
      root.render(tree());
    });
    expect(commits).toBe(1);
    expect(host.querySelector('[data-testid="model-view-capturing"]')).not.toBeNull();
  });

  it("the header's Raw JSON, Copy all and Refresh keep their names when the panel is narrow", async () => {
    await mount();
    for (const name of ["Raw JSON", "Copy all", "Refresh"]) {
      expect(host.querySelector(`button[aria-label="${name}"]`)).not.toBeNull();
    }
  });
});
