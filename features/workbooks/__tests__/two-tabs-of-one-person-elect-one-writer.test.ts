/**
 * Two tabs of one person on one workbook: exactly ONE of them is the host that writes the canonical
 * snapshot. Review 2026-10-15: both were host (same uid), so one edit wrote a snapshot and patched
 * udt_workbooks from both tabs.
 */
import { electCollabHost } from "../collab/WorkbookCollabSession";

const tabs = [
  { uid: "u-1", clientId: "tab-b" },
  { uid: "u-1", clientId: "tab-a" },
];

describe("host election across tabs of one person", () => {
  it("exactly one of two same-uid tabs is host", () => {
    const a = electCollabHost(tabs, "u-1", "tab-a", true).isHost;
    const b = electCollabHost(tabs, "u-1", "tab-b", true).isHost;
    expect([a, b].filter(Boolean)).toHaveLength(1);
    expect(a).toBe(true);
  });

  it("a lower uid still outranks every tab of a higher uid", () => {
    const states = [...tabs, { uid: "u-0", clientId: "z" }];
    expect(electCollabHost(states, "u-1", "tab-a", true).isHost).toBe(false);
    expect(electCollabHost(states, "u-0", "z", true).isHost).toBe(true);
  });

  it("a same-tab holder that is not the tab leader is never host", () => {
    expect(electCollabHost(tabs, "u-1", "tab-a", false).isHost).toBe(false);
  });

  it("the old rule (uid alone) elects both tabs; this guard fails on it", () => {
    const oldRule = (uid: string) => [...tabs].map((s) => s.uid).sort()[0] === uid;
    expect([oldRule("u-1"), oldRule("u-1")]).toEqual([true, true]); // both tabs host under the old rule
    expect(electCollabHost(tabs, "u-1", "tab-b", true).isHost).toBe(false);
  });
});
