/**
 * lib/boot/shellCountsKey.ts — THE LEAF that names the shell counts query and re-counts it.
 *
 * Imports nothing but a type, so a writer deep in a kind module (approvals, notices, assists) can
 * call it without closing an import cycle through the hooks in `./shellCounts`.
 */

import type { QueryClient } from "@tanstack/react-query";

export const SHELL_COUNTS_QUERY_KEY = ["shell-counts"] as const;

/**
 * The ONE call a write makes when it moves a number the header shows (the bell, assists, needs-you,
 * KG suggestions). A writer that settles an older key (`["inbox", …]`, `["assists"]`, the approvals
 * badge) calls this too — the bell reads `["shell-counts", uid]`, a sibling of those keys.
 */
export function invalidateShellCounts(client: QueryClient): void {
  void client.invalidateQueries({ queryKey: SHELL_COUNTS_QUERY_KEY });
}
