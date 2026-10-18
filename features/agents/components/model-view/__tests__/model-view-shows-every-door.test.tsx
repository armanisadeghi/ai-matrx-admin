/**
 * The Builder shows everything the model receives, on any door (Arman, 2026-10-18; lane L11d).
 *
 * The Model view asks the server for a door (chat by default) and lists EVERY labeled part the
 * server returns for it — the turn-assembly step's staged parts (the chat surface's notes) and the
 * request's platform parts — and every tool with its source. Choosing another door asks again
 * for that door; its own (smaller) list replaces the first.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import captured from "./fixtures/captured-requests.json";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const requestModelView = jest.fn();
jest.mock("../requestModelView", () => ({
  requestModelView: (...args: unknown[]) => requestModelView(...args),
}));
const FALLBACK = { id: "agent-1" };
const STABLE_DISPATCH = jest.fn();
const STABLE_STORE = { getState: () => ({}) };
jest.mock("@/lib/redux/hooks", () => ({
  useAppDispatch: () => STABLE_DISPATCH,
  useAppStore: () => STABLE_STORE,
  useAppSelector: (select: (s: unknown) => unknown) => {
    try {
      return select({
        conversations: { byConversationId: {} },
        instanceVariableValues: { byConversationId: { "c-1": FALLBACK } },
        instanceUIState: { byConversationId: {} },
        messages: { byConversationId: {} },
      });
    } catch {
      return FALLBACK;
    }
  },
}));
jest.mock("@ai-matrx/chat/agents/redux/agent-definition/selectors", () => {
  const draft = { id: "agent-1" };
  return { selectAgentById: () => draft };
});
jest.mock("@ai-matrx/kit/clipboard", () => ({ useClipboard: () => ({ copyText: jest.fn() }) }));
jest.mock("@/lib/toast", () => ({ toast: { error: jest.fn(), success: jest.fn() } }));
jest.mock("@/features/prompt-blocks/service", () => ({ listVariants: async () => [] }));
// The design-system Select, as a native select: the test drives its value, not its popover.
jest.mock("@ai-matrx/design-system/controls", () => {
  const actual = jest.requireActual("@ai-matrx/design-system/controls");
  return {
    ...actual,
    Select: ({
      value,
      options,
      onValueChange,
      "aria-label": label,
    }: {
      value: string;
      options: { value: string; label: string }[];
      onValueChange: (v: string) => void;
      "aria-label": string;
    }) => (
      <select aria-label={label} value={value} onChange={(e) => onValueChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    ),
  };
});

import { ModelViewPanel } from "../ModelViewPanel";

const anthropic = (captured as Record<string, any>).anthropic;
const DOORS = [
  { id: "chat", label: "Chat", family: "interactive", surface: "matrx-user/chat", covers: "Chat page" },
  { id: "builder", label: "Builder", family: "interactive", surface: "matrx-user/agent-builder", covers: "Builder" },
  { id: "agent_call", label: "Agent call", family: "programmatic", surface: null, covers: "agent_call child" },
];
const WIRE_TOOLS = (anthropic.body.tools as { name: string }[]).map((t) => t.name);

function previewFor(door: string) {
  const chat = door === "chat";
  return {
    provider: "anthropic",
    model: "claude-haiku-5-5",
    request: anthropic,
    notices: [],
    prompt_blocks: [],
    door: DOORS.find((d) => d.id === door),
    doors: DOORS,
    platform_parts: [
      { id: "current_date", label: "Current date line", source: "matrx_ai.instructions", text: "Current date: today" },
    ],
    turn_assembly: {
      door: "interactive",
      ran: chat ? ["system_notes"] : [],
      skipped: {},
      staged: chat
        ? [
            { injector: "system_notes", label: "Surface notes", slot: "system_notes", text: "DECISION-BLOCKS NOTE" },
            { injector: "minor_safety", label: "Minor-safety note", slot: "system", text: "MINOR NOTE" },
          ]
        : [],
    },
    tools: WIRE_TOOLS.map((name, i) => ({ name, source: chat && i === 0 ? "surface" : "agent" })),
  };
}

describe("Model view: every door, every labeled part", () => {
  let host: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    jest.useFakeTimers();
    requestModelView.mockReset();
    requestModelView.mockImplementation(async (...args: unknown[]) => previewFor(String(args[5] ?? "")));
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
  });
  afterEach(() => {
    act(() => root.unmount());
    host.remove();
    jest.useRealTimers();
  });

  async function settle() {
    await act(async () => {
      jest.advanceTimersByTime(600);
    });
  }

  const additions = () =>
    Array.from(host.querySelectorAll('[data-testid="model-view-addition"]')).map((el) => ({
      source: el.getAttribute("data-source"),
      text: el.textContent ?? "",
    }));
  const toolRows = () =>
    Array.from(host.querySelectorAll('[data-testid="model-view-tool"] button')).map((b) => b.textContent ?? "");

  it("opens on chat and lists every labeled part and every tool's source the server returned", async () => {
    await act(async () => {
      root.render(<ModelViewPanel agentId="agent-1" conversationId="c-1" />);
    });
    await settle();
    expect(requestModelView.mock.calls[0][5]).toBe("chat");

    const expected = previewFor("chat");
    const shown = additions();
    expect(shown).toHaveLength(expected.turn_assembly.staged.length + expected.platform_parts.length);
    for (const s of expected.turn_assembly.staged) {
      expect(shown.some((a) => a.source === s.injector && a.text.includes(s.label) && a.text.includes(s.text))).toBe(true);
    }
    for (const p of expected.platform_parts) {
      expect(shown.some((a) => a.source === p.source && a.text.includes(p.label) && a.text.includes(p.text))).toBe(true);
    }
    const rows = toolRows();
    expect(rows).toHaveLength(expected.tools.length);
    expect(rows[0]).toContain(expected.tools[0].name);
    expect(rows[0]).toContain("surface");

    const select = host.querySelector('select[aria-label="Door"]') as HTMLSelectElement;
    expect(Array.from(select.options).map((o) => o.value)).toEqual(DOORS.map((d) => d.id));
    expect(select.value).toBe("chat");
  });

  it("choosing the Builder door asks for it, and the chat-only parts and sources are gone", async () => {
    await act(async () => {
      root.render(<ModelViewPanel agentId="agent-1" conversationId="c-1" />);
    });
    await settle();
    const select = host.querySelector('select[aria-label="Door"]') as HTMLSelectElement;
    await act(async () => {
      select.value = "builder";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await settle();
    expect(requestModelView.mock.calls.at(-1)?.[5]).toBe("builder");
    const shown = additions();
    expect(shown.map((a) => a.source)).toEqual(["matrx_ai.instructions"]);
    expect(shown.some((a) => a.text.includes("DECISION-BLOCKS NOTE"))).toBe(false);
    expect(toolRows().some((r) => r.includes("surface"))).toBe(false);
  });
});
