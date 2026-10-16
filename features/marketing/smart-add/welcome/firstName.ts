/**
 * Sign-up welcome — the name we greet someone by. Pure (also read on the server by app/(core)/welcome/page.tsx).
 *
 * The first word of their name, when it is a real word. A given name that is an initial ("N K Jemisin",
 * "J. R. R. Tolkien", "N.K. Jemisin") is never a greeting: "Welcome, N" reads as a mistake, so the full name is used.
 */

/** One letter, with or without its dot ("N", "N."), or a run of dotted initials ("N.K.", "J.R.R."). */
const INITIAL = /^(?:\p{L}\.?|(?:\p{L}\.){2,})$/u;

export function firstNameOf(name: string | null | undefined): string {
  const full = (name ?? "").trim().replace(/\s+/g, " ");
  const first = full.split(" ")[0] ?? "";
  return INITIAL.test(first) ? full : first;
}
