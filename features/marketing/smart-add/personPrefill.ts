/**
 * Where a link's prefill lands on the person name card (MKT-103). The name card has rows for name, city, email,
 * occupation and company, and one "anything else" row that takes a school or a profile link. A person link
 * `?name=…&social=…` has no handle row to fill, so its `social` rides the "anything else" row instead of being dropped.
 * Pure.
 */
import { linkInBioService } from "@/features/marketing/lib/link-in-bio";
import { resolveAccountInput } from "@/features/marketing/social/account-input";
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
