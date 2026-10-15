/**
 * Where a link's prefill lands on the person name card (MKT-103). The name card has rows for name, city, email,
 * occupation and company, and one "anything else" row that takes a school or a profile link. A person link
 * `?name=…&social=…` has no handle row to fill, so its `social` rides the "anything else" row instead of being dropped.
 * Pure.
 */
import { linkInBioService } from "@/features/marketing/lib/link-in-bio";
import { resolveAccountInput } from "@/features/marketing/social/account-input";
import { learnFediverseFromText } from "@/features/marketing/social/fediverse";
import { fediverseProfileShape } from "@/features/marketing/social/profile-sites";
import type { SmartAddPrefill } from "./smartAddUrl";

export function personExtraPrefill(person: boolean, initial: Pick<SmartAddPrefill, "name" | "social"> | undefined): string {
  return person && initial?.name && initial.social ? initial.social : "";
}

/**
 * The first profile link typed in any Person box (MKT-110): a link-in-bio page (Beacons, Linktree) or a social account
 * address. It becomes the round's social source and the address's `social=`, so it is read — never only passed to the
 * person agent as "other". Plain words, a bare `@handle` (no platform) and a plain website are not one. Pure.
 */
export function profileLinkIn(...texts: (string | null | undefined)[]): string | null {
  for (const text of texts) {
    for (const raw of (text ?? "").split(/[\s,;]+/)) {
      const token = raw.replace(/^[(<"']+|[)>"'.]+$/g, "");
      if (!token || !token.includes(".")) continue;
      if (linkInBioService(token)) return token;
      const account = resolveAccountInput({ text: token });
      if (account.status === "ok" && account.detected) return token;
    }
  }
  return null;
}

/**
 * Is a profile link typed anywhere? Includes a `host/@user` shape whose host is not yet checked (a Mastodon server),
 * so the "job or company" gate never stands in front of a link that already anchors the search (MKT-123).
 */
export function hasProfileLink(...texts: (string | null | undefined)[]): boolean {
  if (profileLinkIn(...texts)) return true;
  return texts
    .flatMap((t) => (t ?? "").split(/[\s,;]+/))
    .map((raw) => raw.replace(/^[(<"']+|[)>"'.]+$/g, ""))
    .some((t) => fediverseProfileShape(t));
}

/**
 * A Mastodon profile on its own server reads as a website until its host is checked (MKT-102), so a link typed in a
 * Person box was dropped by {@link profileLinkIn} (MKT-119). Check every `host/@user` token first (free, cached by
 * host); `profileLinkIn` then sees the account. Resolves when every check has answered. A failed check is a miss.
 */
export async function learnProfileLinkHosts(
  texts: (string | null | undefined)[],
  onLearned?: (host: string, url: string) => void,
): Promise<void> {
  const tokens = texts.flatMap((t) => (t ?? "").split(/[\s,;]+/)).map((raw) => raw.replace(/^[(<"']+|[)>"'.]+$/g, ""));
  await Promise.all(tokens.filter((t) => fediverseProfileShape(t)).map((t) => learnFediverseFromText(t, { onLearned }).catch(() => false)));
}
