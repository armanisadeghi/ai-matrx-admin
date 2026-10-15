/**
 * One edit is written ONCE. Review 2026-10-15: with two tabs of one person on one workbook, the tab that
 * made an edit AND the tab that received it both wrote a snapshot and patched udt_workbooks.
 * Each scenario counts how many tabs would write one edit.
 */
import { electCollabHost, mayAutosave, remoteOriginOf, REMOTE_PARAM_TAG } from "../collab/autosave-writer";

type Tab = { uid: string; clientId: string };
const states = (tabs: Tab[]) => tabs.map((t) => ({ uid: t.uid, clientId: t.clientId }));

/** How many tabs write one edit made in `origin`, given everyone present. */
function writers(tabs: Tab[], origin: Tab): number {
  const room = states(tabs);
  return tabs.filter((t) => {
    const e = electCollabHost(room, t.uid, t.clientId, true, true);
    return mayAutosave({
      collab: true,
      isHost: e.isHost,
      hostUid: e.hostUid,
      selfUid: t.uid,
      remoteFrom: t === origin ? null : origin.uid,
    });
  }).length;
}

const a: Tab = { uid: "u-1", clientId: "tab-a" };
const b: Tab = { uid: "u-1", clientId: "tab-b" };
const other: Tab = { uid: "u-2", clientId: "tab-z" };

describe("one edit, one write", () => {
  it("two tabs of one person: the edit is written once, from either tab", () => {
    expect(writers([a, b], a)).toBe(1);
    expect(writers([a, b], b)).toBe(1);
  });

  it("two people: the host writes the other person's edit, the host's own edit is written by the host", () => {
    expect(writers([a, other], a)).toBe(1);
    expect(writers([a, other], other)).toBe(1);
  });

  it("two tabs of the host person plus another person: still exactly one writer per edit", () => {
    expect(writers([a, b, other], other)).toBe(1);
    expect(writers([a, b, other], a)).toBe(1);
  });

  it("solo is written", () => {
    expect(mayAutosave({ collab: true, isHost: true, hostUid: null, selfUid: "u-1", remoteFrom: null })).toBe(true);
    expect(mayAutosave({ collab: false, isHost: false, hostUid: null, selfUid: "", remoteFrom: null })).toBe(true);
  });

  it("the old rule (every host tab writes whatever it applied) writes twice; this guard fails on it", () => {
    const old = [a, b].filter((t) => electCollabHost(states([a, b]), t.uid, t.clientId, true, false).isHost).length;
    expect(old).toBe(2);
  });

  it("reads the origin off a tagged mutation", () => {
    expect(remoteOriginOf({ [REMOTE_PARAM_TAG]: "u-9" })).toBe("u-9");
    expect(remoteOriginOf({ [REMOTE_PARAM_TAG]: true })).toBe(true);
    expect(remoteOriginOf({ x: 1 })).toBeNull();
    expect(remoteOriginOf(null)).toBeNull();
  });
});
