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
  | { kind: "signed_out"; row: CloudAccountRow }
  | { kind: "needs_sign_in" }
  | { kind: "in_progress"; step: CloudSignInRunning["step"] };

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

/** Where cloud delivery stands for one account (by email). */
export function cloudDeliveryFor(
  email: string | null,
  rows: readonly CloudAccountRow[],
  running: CloudSignInRunning | null,
): CloudDeliveryState {
  const key = normalEmail(email);
  if (running && key && normalEmail(running.forEmail) === key) return { kind: "in_progress", step: running.step };
  const row = cloudRowFor(email, rows);
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
  }
}

/** The action's label for one account row. */
export function cloudActionLabel(state: CloudDeliveryState, name: string): string {
  if (state.kind === "ready") return `Messages already reach ${name}'s cloud sessions`;
  if (state.kind === "in_progress") return `Signing ${name} in for cloud sessions…`;
  return `Deliver to ${name}'s cloud sessions (one sign-in)`;
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
