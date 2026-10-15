/**
 * Who writes the canonical snapshot in a collab workbook — pure, so it loads in the editor without yjs
 * (the session file pulls yjs in; the editor must not).
 */

/** The sentinel the session stamps on a mutation that ARRIVED from a peer (value: the peer's uid). */
export const REMOTE_PARAM_TAG = "__matrxRemote";

/**
 * THE host election (the host writes the canonical snapshot for OTHER people's edits). The lowest uid
 * wins. Two tabs of ONE person share a uid; with `tabTieBreak` the tab's own client id breaks the tie so
 * exactly one tab is host (the document editor keeps the uid-only rule: there every originating tab
 * writes its own edit).
 */
export function electCollabHost(
  states: Array<Record<string, unknown>>,
  selfUid: string,
  selfClientId: string,
  tabLeader: boolean,
  tabTieBreak = false,
): { isHost: boolean; hostUid: string | null } {
  const keys = states
    .filter((s): s is Record<string, unknown> & { uid: string } => typeof s.uid === "string")
    .map((s) => ({ uid: s.uid, clientId: typeof s.clientId === "string" ? s.clientId : "" }))
    .sort((a, b) => {
      if (a.uid !== b.uid) return a.uid < b.uid ? -1 : 1;
      return a.clientId < b.clientId ? -1 : a.clientId > b.clientId ? 1 : 0;
    });
  const host = keys[0] ?? null;
  const sameUid = !!host && host.uid === selfUid;
  return {
    isHost: sameUid && (!tabTieBreak || host.clientId === selfClientId) && tabLeader,
    hostUid: host?.uid ?? null,
  };
}

/**
 * Who may AUTOSAVE after one mutation, so that one edit is written exactly once (review 2026-10-15:
 * with two tabs of one person open, the tab that made the edit AND the tab that received it both wrote
 * a snapshot and patched the workbook).
 *  - An edit made HERE (`remoteFrom` null): written here when this person's tabs are the host
 *    (`hostUid` is me, or nobody is known yet = solo). If another person is host, the host writes it.
 *  - An edit that ARRIVED from a peer: only the elected host writes it, and never when it came from
 *    this same person (the tab that made it writes it).
 */
export function mayAutosave(i: {
  collab: boolean;
  isHost: boolean;
  hostUid: string | null;
  selfUid: string;
  remoteFrom: string | true | null;
}): boolean {
  if (!i.collab) return true;
  if (i.remoteFrom === null) return i.hostUid === null || i.hostUid === i.selfUid;
  return i.isHost && i.remoteFrom !== i.selfUid;
}

/** Where a mutation that Univer just ran came from, read off the tag the session stamps on remote ones. */
export function remoteOriginOf(params: unknown): string | true | null {
  if (!params || typeof params !== "object" || Array.isArray(params)) return null;
  const tag = (params as Record<string, unknown>)[REMOTE_PARAM_TAG];
  if (typeof tag === "string") return tag;
  return tag === true ? true : null;
}
