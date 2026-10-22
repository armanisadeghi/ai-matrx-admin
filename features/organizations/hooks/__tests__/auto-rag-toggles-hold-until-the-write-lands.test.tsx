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
let orgIdForTest: string | null = "org-1";
jest.mock("@/lib/redux/slices/appContextSlice", () => ({
  selectOrganizationId: () => orgIdForTest,
}));

import { useOrgAutoRagPreference } from "../useOrgAutoRagPreference";
import { useAutoRagPreference } from "@/features/kg-suggestions/hooks/useAutoRagPreference";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function mount<T>(
  useHook: () => T,
): { current: () => T; rerender: () => void; unmount: () => void } {
  let latest!: T;
  function Probe() {
    latest = useHook();
    return null;
  }
  const el = document.createElement("div");
  const root = createRoot(el);
  act(() => root.render(<Probe />));
  return {
    current: () => latest,
    // What a Redux organization switch causes: the SAME mounted hook renders
    // again and reads a different organization.
    rerender: () => act(() => root.render(<Probe />)),
    unmount: () => act(() => root.unmount()),
  };
}
const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });

const RAW = /permission denied for|organization_preferences|user_preferences|42501/;
const AUTO_RAG = "knowledge.auto_rag_enabled";
/** What the hook falls back to when it knows nothing — the register's own default. */
const AUTO_RAG_REGISTER_DEFAULT = true;

beforeEach(() => {
  jest.clearAllMocks();
  orgIdForTest = "org-1";
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

  it("a FAILED write is said in words too, not just a refusal", async () => {
    // `callKnobOverrideSet` throws a real Error WITH a message for every
    // transport / permission / RPC failure, so a catch that tested
    // `err instanceof Error && err.message` could not tell it from a refusal
    // whose sentence was already set — and set no message at all.
    setKnobOverride.mockRejectedValue(
      new Error("knob_override_set failed: permission denied for table user_preferences"),
    );
    const h = mount(() => useAutoRagPreference());
    await flush();
    await act(async () => { await h.current().setEnabled(false).catch(() => undefined); });
    await flush();
    expect(h.current().enabled).toBe(true);
    // The point: a message IS set. Before this fix the catch tested
    // `err instanceof Error && err.message`, which matched this throw as well as
    // a refusal whose sentence was already set — so it set nothing and the pane
    // showed a stale sentence or none at all.
    expect(h.current().error).toBeTruthy();
    expect(h.current().error).toMatch(/could not turn off auto knowledge-graph/i);
    expect(h.current().error).not.toMatch(RAW);
    h.unmount();
  });

  it("a new failure replaces an older message instead of leaving it standing", async () => {
    // THE STICKY-ERROR BUG. The catch used to fire only when React's `error` was
    // null — read from the closure of the render the callback was made in, so it
    // could never see a message set earlier in the same callback either. Walk it:
    // the organization overrules an ON (success path sets a sentence), then the
    // next press fails. With the old test the screen kept claiming the
    // organization overruled them while the write had actually failed.
    resolved = { ...resolved, [AUTO_RAG]: false };
    setKnobOverride.mockResolvedValue({ ok: true, effective_value: false, origin: "organization" });
    const h = mount(() => useAutoRagPreference());
    await flush();
    await act(async () => { await h.current().setEnabled(true); });
    await flush();
    expect(h.current().error).toMatch(/organization has turned this off/i);

    setKnobOverride.mockRejectedValue(new Error("knob_override_set failed: network unreachable"));
    await act(async () => { await h.current().setEnabled(true).catch(() => undefined); });
    await flush();
    expect(h.current().error).not.toMatch(/organization has turned this off/i);
    expect(h.current().error).toMatch(/could not turn on auto knowledge-graph/i);
    h.unmount();
  });

  it("never shows another organization's value after a switch", async () => {
    // A snapshot answers for ONE (organization, person) pair. Holding the last
    // known value unkeyed meant switching organization showed the PREVIOUS
    // tenant's setting — enabled, not loading — until the new read landed, and
    // kept showing it if that read failed. Cross-tenant, on screen.
    resolved = { ...resolved, [AUTO_RAG]: false };
    const h = mount(() => useAutoRagPreference());
    await flush();
    expect(h.current().enabled).toBe(false); // org-1 has it off

    orgIdForTest = "org-2";
    resolved = {}; // org-2's snapshot has not answered yet
    h.rerender();
    await flush();
    // org-1's `false` must NOT be presented as org-2's answer.
    expect(h.current().loading).toBe(true);
    expect(h.current().enabled).toBe(AUTO_RAG_REGISTER_DEFAULT);
    h.unmount();
  });

  it("does not claim success when there is nobody to write a rung for", async () => {
    // Returning the REQUESTED value here made Privacy compare it to what it
    // asked for and toast "enabled" with nothing written anywhere.
    orgIdForTest = null;
    const h = mount(() => useAutoRagPreference());
    await flush();
    expect(h.current().canChange).toBe(false);
    await act(async () => {
      await expect(h.current().setEnabled(false)).rejects.toThrow(/choose an organization/i);
    });
    await flush();
    expect(setKnobOverride).not.toHaveBeenCalled();
    expect(h.current().error).toMatch(/choose an organization/i);
    h.unmount();
  });

  it("never shows the register DEFAULT in the gap a write opens", async () => {
    // A successful write calls `invalidateEffectiveKnob`, which clears the whole
    // snapshot — so `resolved` goes back to undefined until the refetch lands.
    // Reading that as the default made a switch just turned OFF render ON.
    setKnobOverride.mockResolvedValue({ ok: true, effective_value: false, origin: "user" });
    const h = mount(() => useAutoRagPreference());
    await flush();
    expect(h.current().enabled).toBe(true);

    await act(async () => {
      await h.current().setEnabled(false);
      resolved = {}; // what invalidateEffectiveKnob leaves behind
    });
    expect(h.current().enabled).toBe(false); // the door's own answer, not the default
    expect(h.current().loading).toBe(false);
    h.unmount();
  });

  it("shows the DOOR's own refusal, not a generic wrapper around it", async () => {
    // The door says exactly why. The catch used to replace that sentence with
    // `describeWriteFailure`'s "Could not … Try again." wrapper, because it
    // decided whether a message was already set by reading React state — which
    // this callback's closure holds from the render it was created in, so it
    // always looked unset. The door's own words are the useful ones.
    setKnobOverride.mockResolvedValue({
      ok: false,
      reason: "not_overridable",
      detail: "This setting is decided by the platform.",
    });
    const h = mount(() => useAutoRagPreference());
    await flush();
    await act(async () => { await h.current().setEnabled(false).catch(() => undefined); });
    await flush();
    expect(h.current().enabled).toBe(true);
    expect(h.current().error).toBe("not_overridable — This setting is decided by the platform.");
    expect(h.current().error).not.toMatch(/Could not/i);
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
