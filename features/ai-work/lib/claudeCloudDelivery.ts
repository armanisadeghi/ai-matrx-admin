/**
 * claudeCloudDelivery — one Claude account, one row, one answer to "do messages
 * reach this account's Claude cloud sessions?".
 *
 * The page already knows the person's Claude accounts from their computer
 * (`apps.accounts.list`, by email). Cloud delivery is a fact ABOUT those same
 * accounts, so it is matched to them by email and drawn on their rows — never a
 * second, disconnected list. A cloud-connected account the computer has not
 * seen (another computer, or the computer is off) still gets a row.
 *
 * Pure: no React, no network. The rules are tested in
 * `__tests__/claude-cloud-delivery.test.ts`.
 */

/** A connected claude.ai account the server's cloud courier can deliver through. */
export interface CloudAccountRow {
  id: string;
  label: string;
  email: string | null;
  status: string;
  slot: string | null;
}

/** A sign-in running for one account, as the screen tracks it. */
export interface CloudSignInRunning {
  /** The email of the account row it was started from; null for "another account". */
  forEmail: string | null;
  step: "starting" | "awaiting_code" | "checking_code" | "cancelling";
}

export type CloudDeliveryState =
  | { kind: "ready"; row: CloudAccountRow }
  | { kind: "ready_via_mac"; row: CloudAccountRow | null }
  | { kind: "signed_out"; row: CloudAccountRow }
  | { kind: "needs_sign_in" }
  /** The local account has no email yet, so nothing can be matched or signed in for it. */
  | { kind: "email_unknown" }
  | { kind: "in_progress"; step: CloudSignInRunning["step"] };

/** Why a row with no email has no cloud action, and what makes the email known. */
export const EMAIL_UNKNOWN_REASON =
  "Its email is not known yet; it fills in the next time this account signs in on this computer";

export const normalEmail = (email: string | null | undefined): string | null => {
  const e = email?.trim().toLowerCase();
  return e && e.includes("@") ? e : null;
};

/** The cloud row for an email: a connected one first, else the newest signed-out one. */
export function cloudRowFor(email: string | null, rows: readonly CloudAccountRow[]): CloudAccountRow | null {
  const key = normalEmail(email);
  if (!key) return null;
  const mine = rows.filter((r) => normalEmail(r.email ?? r.label) === key);
  return mine.find((r) => r.status === "connected") ?? mine[0] ?? null;
}

/**
 * The accounts a live Mac delivers through: Matrx 2's desktop courier names itself and the Claude
 * accounts signed in there on the Mac's own `app_instances.metadata.agent_mail_cloud`
 * (`{at, fresh_s, accounts:[{key,label}]}`, written by the server each time the Mac checks in).
 * Live while `at` is inside its `fresh_s`. Returns their emails (labels are emails).
 */
export function macCourierEmails(metadatas: ReadonlyArray<unknown>, nowMs: number): Set<string> {
  const out = new Set<string>();
  for (const meta of metadatas) {
    const rec = meta && typeof meta === "object" ? (meta as Record<string, unknown>).agent_mail_cloud : null;
    if (!rec || typeof rec !== "object") continue;
    const { at, fresh_s, accounts } = rec as { at?: unknown; fresh_s?: unknown; accounts?: unknown };
    const atMs = typeof at === "string" ? Date.parse(at) : NaN;
    const freshMs = typeof fresh_s === "number" ? fresh_s * 1000 : 0;
    if (!Number.isFinite(atMs) || nowMs - atMs > freshMs) continue;
    for (const a of Array.isArray(accounts) ? accounts : []) {
      const email = normalEmail(a && typeof a === "object" ? String((a as { label?: unknown }).label ?? "") : null);
      if (email) out.add(email);
    }
  }
  return out;
}

/** Where cloud delivery stands for one account (by email). `viaMac`: emails a live Mac delivers through. */
export function cloudDeliveryFor(
  email: string | null,
  rows: readonly CloudAccountRow[],
  running: CloudSignInRunning | null,
  viaMac: ReadonlySet<string> = new Set(),
): CloudDeliveryState {
  const key = normalEmail(email);
  if (!key) return { kind: "email_unknown" };
  if (running && normalEmail(running.forEmail) === key) return { kind: "in_progress", step: running.step };
  const row = cloudRowFor(email, rows);
  if (key && viaMac.has(key)) return { kind: "ready_via_mac", row };
  if (row?.status === "connected") return { kind: "ready", row };
  if (row) return { kind: "signed_out", row };
  return { kind: "needs_sign_in" };
}

/** The status cell's words and tone. */
export function cloudDeliveryWords(state: CloudDeliveryState): {
  word: string;
  tone: "success" | "neutral" | "warning";
  order: number;
} {
  switch (state.kind) {
    case "ready":
      return { word: "Ready", tone: "success", order: 0 };
    case "ready_via_mac":
      return { word: "Ready (via this Mac)", tone: "success", order: 0 };
    case "in_progress":
      return {
        word:
          state.step === "awaiting_code"
            ? "Waiting for your code"
            : state.step === "checking_code"
              ? "Checking the code"
              : state.step === "cancelling"
                ? "Canceling"
                : "Signing in",
        tone: "warning",
        order: 1,
      };
    case "signed_out":
      return { word: "Signed out", tone: "neutral", order: 2 };
    case "needs_sign_in":
      return { word: "Needs one sign-in", tone: "neutral", order: 3 };
    case "email_unknown":
      return { word: "Email not known", tone: "neutral", order: 4 };
  }
}

/** The action's label for one account row. */
export function cloudActionLabel(state: CloudDeliveryState, name: string): string {
  if (state.kind === "ready") return `Messages already reach ${name}'s cloud sessions`;
  if (state.kind === "ready_via_mac")
    return state.row?.status === "connected" ? `Messages already reach ${name}'s cloud sessions` : `Also deliver to ${name}'s cloud sessions while the Mac is off (one sign-in)`;
  if (state.kind === "in_progress") return `Signing ${name} in for cloud sessions…`;
  if (state.kind === "email_unknown") return `Deliver to cloud sessions (${EMAIL_UNKNOWN_REASON})`;
  return `Deliver to ${name}'s cloud sessions (one sign-in)`;
}

/**
 * Cloud delivery is one claude.ai sign-in per email: the cloud list knows nothing finer (no
 * account id, no organization). Two rows on this computer with the same email are therefore ONE
 * cloud identity: they share one state and one action. The first row (in the order given) carries
 * the action; every row of the group names the others.
 */
export interface CloudSharing {
  /** The row that carries the cloud action for the whole group. */
  primary: boolean;
  /** The names of the group's primary row (for non-primary rows) or of the other rows (for the primary). */
  others: string[];
  /** The primary row's name. */
  primaryName: string;
}

export function cloudSharing(
  accounts: ReadonlyArray<{ id: string; email: string | null; name: string }>,
): Map<string, CloudSharing> {
  const groups = new Map<string, { id: string; name: string }[]>();
  for (const a of accounts) {
    const key = normalEmail(a.email);
    if (!key) continue;
    const g = groups.get(key) ?? [];
    g.push({ id: a.id, name: a.name });
    groups.set(key, g);
  }
  const out = new Map<string, CloudSharing>();
  for (const g of groups.values()) {
    if (g.length < 2) continue;
    const [first, ...rest] = g;
    out.set(first.id, { primary: true, others: rest.map((r) => r.name), primaryName: first.name });
    for (const r of rest) out.set(r.id, { primary: false, others: [first.name], primaryName: first.name });
  }
  return out;
}

/** The short note a shared row shows beside its cloud state, and its full sentence. */
export function cloudSharingWords(share: CloudSharing): { tag: string; sentence: string } {
  const names = share.others.join(", ");
  return share.primary
    ? { tag: "Shared sign-in", sentence: `One Claude sign-in with ${names} (same email): this row's cloud action covers both.` }
    : { tag: "Shared sign-in", sentence: `Same Claude sign-in as ${share.primaryName} (same email): use that row's cloud action.` };
}

/** Connected cloud accounts no row on this computer names: they still get a row. */
export function unmatchedCloudRows(
  localEmails: ReadonlyArray<string | null>,
  rows: readonly CloudAccountRow[],
): CloudAccountRow[] {
  const seen = new Set(localEmails.map(normalEmail).filter((e): e is string => e !== null));
  const out = new Map<string, CloudAccountRow>();
  for (const row of rows) {
    const key = normalEmail(row.email ?? row.label) ?? `id:${row.id}`;
    if (seen.has(key)) continue;
    const kept = out.get(key);
    if (!kept || (kept.status !== "connected" && row.status === "connected")) out.set(key, row);
  }
  return [...out.values()];
}

/**
 * After a sign-in finishes: did the person sign in as the account they started
 * it from? Claude's page lets them pick any account, so a different one is
 * named plainly (it is connected either way).
 */
export function signedInAsSomeoneElse(forEmail: string | null, signedInAs: string | null): string | null {
  const want = normalEmail(forEmail);
  const got = normalEmail(signedInAs);
  if (!want || !got || want === got) return null;
  return `You signed in as ${got}, not ${want}. ${got} now receives cloud messages; to add ${want}, sign in again and pick ${want} on Claude's page.`;
}
