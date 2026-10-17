/**
 * Sign-up welcome — write what "Looks right" confirmed into the person's plain profile through the existing
 * `/api/user/form-profile` route (GET, then PATCH only the empty fields; welcomeProfile.ts decides what).
 *
 * The write survives the page going away. "Looks right" records the confirmed values in this browser FIRST
 * (`welcome.profile-pending`, one entry per welcome subject, owned by the signed-in account), then writes, and
 * clears the entry only once the route said yes. A page that died mid-way — a dev-server full reload, a closed tab, a
 * crash — leaves the entry behind, and the next /welcome load (WelcomeDoor → resumeWelcomeProfiles) writes it.
 * The write is idempotent: it fills empty fields only, so a retry after a write that did land changes nothing.
 * (Cause, 2026-10-16: the write used to start only after Create's last step; the shared dev server's Fast Refresh
 * full reloads, ~40 a day from other lanes' edits, landed inside that window and the profile was never written.)
 */

import { ensureOrgId } from "@/lib/organizations/ensureOrgId";
import { applyOrganizationContextHeader } from "@/lib/api/organization-context";
import { defineClientKeyFamily } from "@/lib/sync/client-storage";
import { supabase } from "@/utils/supabase/client";
import type { UserFormProfileData } from "@/features/user-profile/types";
import { welcomeProfilePatch, type WelcomeConfirmed } from "./welcomeProfile";
import { WELCOME_SUBJECT_PREFIX } from "./welcomeSession";

const ENDPOINT = "/api/user/form-profile";

const pending = defineClientKeyFamily({
  id: "welcome.profile-pending",
  area: "local",
  kind: "handoff",
  reason: "Confirmed sign-up values not yet written to the profile; the next /welcome load writes them.",
});

/** An admin's test login (welcomeSession.testSubject): it never writes the signed-in admin's own profile. */
const isTestSubject = (subject: string) => subject.startsWith(`${WELCOME_SUBJECT_PREFIX}test:`);

export interface PendingWelcomeProfile {
  /** The signed-in account whose profile this is. */
  ownerId: string;
  found: WelcomeConfirmed;
  at: string;
}

/** Returns the fields written (empty when there was nothing new). Throws with the route's own message. */
export async function saveWelcomeProfile(found: WelcomeConfirmed): Promise<string[]> {
  const res = await fetch(ENDPOINT, { cache: "no-store" });
  const got = (await res.json()) as { success: boolean; data?: UserFormProfileData | null; msg?: string };
  if (!res.ok || !got.success) throw new Error(got.msg || `Profile could not be read (${res.status})`);
  const patch = welcomeProfilePatch(got.data ?? null, found);
  const fields = Object.keys(patch);
  if (!fields.length) return [];
  const organizationId = await ensureOrgId(null);
  const put = await fetch(ENDPOINT, {
    method: "PATCH",
    headers: applyOrganizationContextHeader({ "Content-Type": "application/json" }, organizationId),
    body: JSON.stringify(patch),
  });
  const saved = (await put.json()) as { success: boolean; msg?: string };
  if (!put.ok || !saved.success) throw new Error(saved.msg || `Profile could not be saved (${put.status})`);
  return fields;
}

async function signedInId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

/**
 * "Looks right": record, then write, then clear. Throws when the write failed (the record stays for the next load).
 * Without a signed-in account nothing can be written and nothing is recorded.
 */
export async function writeWelcomeProfile(subject: string, found: WelcomeConfirmed): Promise<string[]> {
  if (isTestSubject(subject)) return [];
  const ownerId = await signedInId();
  if (!ownerId) throw new Error("You are signed out");
  pending.setJSON(subject, { ownerId, found, at: new Date().toISOString() } satisfies PendingWelcomeProfile);
  const fields = await saveWelcomeProfile(found);
  pending.remove(subject);
  return fields;
}

/** Every unwritten profile this account left behind in this browser, written now. Returns the subjects written. */
export async function resumeWelcomeProfiles(ownerId: string): Promise<string[]> {
  const done: string[] = [];
  for (const subject of pending.suffixes()) {
    // A test login's record (left by an older build) is never written: it would fill the admin's own profile.
    if (isTestSubject(subject)) {
      pending.remove(subject);
      continue;
    }
    const rec = pending.getJSON<PendingWelcomeProfile>(subject);
    if (!rec || rec.ownerId !== ownerId) continue;
    await saveWelcomeProfile(rec.found);
    pending.remove(subject);
    done.push(subject);
  }
  return done;
}
