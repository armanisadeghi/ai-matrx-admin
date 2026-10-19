/**
 * "Add <platform> login" from the capture hub: the Vault window opens on a new website login with
 * the platform's name and sign-in address filled in, and when it closes the login that was just
 * added is the one picked (the old create dialog's behavior, parity 2026-10-19).
 */

/** The Vault window's address for a new login named "<platform> login" at the platform's site. */
export function addLoginLocation(platformName: string, loginUrl: string): string {
  const location = new URLSearchParams({ mode: "new", kind: "website_login", name: `${platformName} login` });
  if (loginUrl) location.set("url", loginUrl);
  return location.toString();
}

/** The login that is new since the window opened, if one was added. */
export function addedLogin(before: ReadonlySet<string>, logins: readonly { itemId: string }[]): string | null {
  return logins.find((l) => !before.has(l.itemId))?.itemId ?? null;
}
