/**
 * Sign-up welcome — "Looks right" fills the person's plain profile (SIGNUP-WELCOME.md step 6) through the existing
 * `PATCH /api/user/form-profile` (app/api/user/form-profile/route.ts: name parts, company_name, job_title,
 * website_url, social_handles). Pure: the current profile and what they confirmed go in, the patch comes out.
 *
 * Only what they confirmed, and only into EMPTY fields: a value the person already saved is never replaced.
 * Social handles merge by platform + handle (the route replaces the whole array, so the patch carries all of them).
 */

import { firstNameOf } from "./firstName";
import type { SocialHandle, UserFormProfileData, UserFormProfilePatch } from "@/features/user-profile/types";

export interface WelcomeConfirmed {
  /** The name they confirmed. */
  name: string | null;
  websiteUrl: string | null;
  accounts: { platform: string | null; handle: string | null; url: string | null }[];
  company: string | null;
  jobTitle: string | null;
}

type Current = Pick<
  UserFormProfileData,
  "legal_first_name" | "legal_last_name" | "preferred_name" | "company_name" | "job_title" | "website_url" | "social_handles"
> | null;

const empty = (v: string | null | undefined) => !v || !v.trim();
const handleKey = (platform: string, handle: string) => `${platform.toLowerCase()}:${handle.toLowerCase().replace(/^@/, "")}`;

export function welcomeProfilePatch(current: Current, found: WelcomeConfirmed, newId: () => string = () => crypto.randomUUID()): UserFormProfilePatch {
  const patch: UserFormProfilePatch = {};
  const parts = (found.name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length) {
    // What they are called: the first word, or the full name when that word is an initial ("N K Jemisin").
    if (empty(current?.preferred_name)) patch.preferred_name = firstNameOf(found.name);
    if (parts.length >= 2 && empty(current?.legal_first_name) && empty(current?.legal_last_name)) {
      patch.legal_first_name = parts[0];
      patch.legal_last_name = parts.slice(1).join(" ");
    }
  }
  if (found.websiteUrl && empty(current?.website_url)) patch.website_url = found.websiteUrl;
  if (found.company && empty(current?.company_name)) patch.company_name = found.company;
  if (found.jobTitle && empty(current?.job_title)) patch.job_title = found.jobTitle;

  const have = current?.social_handles ?? [];
  const seen = new Set(have.map((h) => handleKey(h.platform, h.handle)));
  const added: SocialHandle[] = [];
  for (const a of found.accounts) {
    if (!a.platform || !a.handle) continue;
    const k = handleKey(a.platform, a.handle);
    if (seen.has(k)) continue;
    seen.add(k);
    added.push({ id: newId(), platform: a.platform, handle: a.handle.replace(/^@/, ""), url: a.url });
  }
  if (added.length) patch.social_handles = [...have, ...added];
  return patch;
}
