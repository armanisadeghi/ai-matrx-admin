/**
 * @jest-environment jsdom
 *
 * GATES-TAIL-2. The organization's (and the person's) auto knowledge-graph switches flipped
 * BEFORE the write answered and, on a refusal, snapped back beside the database's own line
 * ("permission denied for table organization_preferences"). Rule: pending, never optimistic —
 * the value does not change until the write lands, and a refusal is said in words.
 *
 * Since 2026-10-22 both switches stand on the scoped-knob register
 * (`knowledge.auto_rag_enabled`, `knowledge.suggestion_sweeps_enabled`) instead of boolean
 * columns, so what is mocked here is the knob door and the resolved snapshot. The displayed
 * value is now the SNAPSHOT — the write busts it and the next render reads the new answer —
 * which is why the harness below updates `resolved` only when the door has answered: that is
 * exactly the sequence `setKnobOverride` -> `invalidateEffectiveKnob` produces in the browser.
 *
 * It also pins the rule the register ADDED: `auto_rag_enabled` is `lower_only`, so a person
 * asking to turn it back ON while their organization has it OFF is discarded by the resolver.
 * The door still answers ok, so the only way the person learns is if the hook reads
 * `effective_value` back and says so.
 */
import React, { act } from "react";
import { createRoot } from "react-dom/client";

/** The value the resolved-knob snapshot currently holds, per full key. */
let resolved: Record<string, unknown> = {};
const setKnobOverride = jest.fn();

jest.mock("@/lib/scoped-config/effectiveKnobs.client", () => ({
  useEffectiveKnob: (
    _organizationId: string | null | undefined,
    _userId: string | null | undefined,
    ref: { feature: string; key: string } | string,
  ) => resolved[typeof ref === "string" ? ref : `${ref.feature}.${ref.key}`],
}));
jest.mock("@/lib/scoped-config/service", () => ({
  setKnobOverride: (...a: unknown[]) => setKnobOverride(...a),
  // The real one joins reason + detail into one sentence and never leaks SQLSTATE.
  knobRefusalSentence: (r: { reason?: string | null; detail?: string | null }) =>
    [r.reason, r.detail].filter(Boolean).join(" — ") ||
    "The setting was refused and the door gave no reason.",
}));
jest.mock("@/utils/supabase/client", () => ({
  supabase: {
    rpc: jest.fn(async () => ({ error: null })),
    schema: () => ({
      from: () => ({
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
      }),
    }),
  },
}));
jest.mock("@/lib/redux/hooks", () => ({ useAppSelector: (sel: () => unknown) => sel() }));
jest.mock("@/lib/redux/selectors/userSelectors", () => ({ selectUserId: () => "user-1" }));
jest.mock("@/lib/redux/slices/appContextSlice", () => ({ selectOrganizationId: () => "org-1" }));

import { useOrgAutoRagPreference } from "../useOrgAutoRagPreference";
import { useAutoRagPreference } from "@/features/kg-suggestions/hooks/useAutoRagPreference";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function mount<T>(useHook: () => T): { current: () => T; unmount: () => void } {
  let latest!: T;
  function Probe() {
    latest = useHook();
    return null;
  }
  const el = document.createElement("div");
  const root = createRoot(el);
  act(() => root.render(<Probe />));
  return { current: () => latest, unmount: () => act(() => root.unmount()) };
}
const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });

const RAW = /permission denied for|organization_preferences|user_preferences|42501/;
const AUTO_RAG = "knowledge.auto_rag_enabled";

beforeEach(() => {
  jest.clearAllMocks();
  resolved = { [AUTO_RAG]: true, "knowledge.suggestion_sweeps_enabled": false };
});

describe("the organization's auto knowledge-graph switch", () => {
  it("keeps its value while the write is in flight, and shows it pending", async () => {
    let answer!: (v: unknown) => void;
    setKnobOverride.mockImplementation(() => new Promise((r) => { answer = r; }));
    const h = mount(() => useOrgAutoRagPreference("org-1"));
    await flush();
    expect(h.current().enabled).toBe(true);

    let done!: Promise<void>;
    act(() => { done = h.current().setEnabled(false); });
    await flush();
    expect(h.current().enabled).toBe(true); // not flipped yet
    expect(h.current().saving).toBe(true);
    expect(h.current().pendingField).toBe("enabled");

    await act(async () => {
      // The door agreed; the snapshot it busted now answers with the new value.
      resolved = { ...resolved, [AUTO_RAG]: false };
      answer({ ok: true, effective_value: false, origin: "organization" });
      await done;
    });
    expect(h.current().enabled).toBe(false);
    expect(h.current().pendingField).toBeNull();
    h.unmount();
  });

  it("writes the ORGANIZATION rung of the knob, never a preference column", async () => {
    setKnobOverride.mockResolvedValue({ ok: true, effective_value: false });
    const h = mount(() => useOrgAutoRagPreference("org-1"));
    await flush();
    await act(async () => { await h.current().setEnabled(false); });
    expect(setKnobOverride).toHaveBeenCalledWith({
      feature: "knowledge",
      key: "auto_rag_enabled",
      scopeKind: "organization",
      scopeId: "org-1",
      organizationId: "org-1",
      value: false,
    });
    h.unmount();
  });

  it("a refusal leaves it as it was and says so in words, never the database's line", async () => {
    setKnobOverride.mockResolvedValue({
      ok: false,
      reason: "forbidden",
      detail: "Organization configuration is owner/admin only.",
    });
    const h = mount(() => useOrgAutoRagPreference("org-1"));
    await flush();
    await act(async () => { await h.current().setEnabled(false).catch(() => undefined); });
    expect(h.current().enabled).toBe(true);
    expect(h.current().error).toBeTruthy();
    expect(h.current().error).not.toMatch(RAW);
    expect(h.current().error).toMatch(/owner\/admin only/i);
    h.unmount();
  });
});

describe("the person's auto knowledge-graph switch", () => {
  it("keeps its value while the write is in flight", async () => {
    let answer!: (v: unknown) => void;
    setKnobOverride.mockImplementation(() => new Promise((r) => { answer = r; }));
    const h = mount(() => useAutoRagPreference());
    await flush();
    expect(h.current().enabled).toBe(true);

    let done!: Promise<boolean>;
    act(() => { done = h.current().setEnabled(false); });
    await flush();
    expect(h.current().enabled).toBe(true);
    expect(h.current().saving).toBe(true);

    await act(async () => {
      resolved = { ...resolved, [AUTO_RAG]: false };
      answer({ ok: true, effective_value: false, origin: "user" });
      expect(await done).toBe(false); // the value that is actually in effect
    });
    expect(h.current().enabled).toBe(false);
    h.unmount();
  });

  it("writes the USER rung inside the organization the app is working in", async () => {
    setKnobOverride.mockResolvedValue({ ok: true, effective_value: false });
    const h = mount(() => useAutoRagPreference());
    await flush();
    await act(async () => { await h.current().setEnabled(false); });
    expect(setKnobOverride).toHaveBeenCalledWith({
      feature: "knowledge",
      key: "auto_rag_enabled",
      scopeKind: "user",
      scopeId: "user-1",
      organizationId: "org-1",
      value: false,
    });
    h.unmount();
  });

  it("a refusal is said in words", async () => {
    setKnobOverride.mockResolvedValue({
      ok: false,
      reason: "not_overridable",
      detail: "This setting is decided by the platform.",
    });
    const h = mount(() => useAutoRagPreference());
    await flush();
    await act(async () => { await h.current().setEnabled(false).catch(() => undefined); });
    expect(h.current().enabled).toBe(true);
    expect(h.current().error).toBeTruthy();
    expect(h.current().error).not.toMatch(RAW);
    h.unmount();
  });

  it("says so when the organization's OFF overrules the person's ON, instead of lying", async () => {
    // The organization turned auto-RAG off. The person asks for ON: `lower_only`
    // means the resolver DISCARDS that rung, so the door agrees and the effective
    // value is still false. A switch that showed ON here would be a control that lies.
    resolved = { ...resolved, [AUTO_RAG]: false };
    setKnobOverride.mockResolvedValue({ ok: true, effective_value: false, origin: "organization" });
    const h = mount(() => useAutoRagPreference());
    await flush();
    expect(h.current().enabled).toBe(false);

    await act(async () => {
      // It resolves to what is IN EFFECT, not to what was asked — that is how the
      // screen knows to say "your organization keeps this off" instead of "enabled".
      expect(await h.current().setEnabled(true)).toBe(false);
    });
    expect(h.current().enabled).toBe(false); // the snapshot still says off, because it is
    expect(h.current().error).toMatch(/organization has turned this off/i);
    expect(h.current().error).not.toMatch(RAW);
    h.unmount();
  });
});
