/**
 * Sign-up welcome — the admin's test-login values survive a reload. They are this tab's moment only (admin + debug
 * mode never persist a test identity beyond the tab), so they live in sessionStorage through the one client-storage
 * door, which never throws (private mode, quota, disabled storage all read as "nothing stored").
 */

import { defineClientKey } from "@/lib/sync/client-storage";
import { EMPTY_TEST_LOGIN, type TestLogin } from "./welcomeSession";

const stored = defineClientKey({
  id: "welcome.test-login",
  area: "session",
  kind: "draft",
  reason: "An admin's test-login values for this tab's welcome session; a reload keeps them, a new tab starts clean.",
});

/** The values this tab last used, or null (nothing stored, or not a test login). */
export function readTestLogin(): TestLogin | null {
  try {
    const v = stored.getJSON<Partial<TestLogin>>();
    if (!v || typeof v !== "object") return null;
    const t: TestLogin = { ...EMPTY_TEST_LOGIN };
    for (const k of Object.keys(EMPTY_TEST_LOGIN) as (keyof TestLogin)[]) if (typeof v[k] === "string") (t[k] as string) = v[k] as string;
    return t;
  } catch {
    return null;
  }
}

export function writeTestLogin(t: TestLogin | null): void {
  try {
    if (t) stored.setJSON(t);
    else stored.remove();
  } catch {
    // nothing stored: the next reload starts from an empty form
  }
}
