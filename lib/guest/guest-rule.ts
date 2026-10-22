/**
 * lib/guest/guest-rule.ts — THE guest rule every transport applies (serverApi, callApi,
 * python-client): before a signed-out write, make sure the visitor exists; after a 403
 * guest_challenge_failed refusal (nothing ran), run the check fresh and send ONCE more.
 * The check itself is `ensureGuestIdentity` (./turnstile).
 */
import { ensureGuestIdentity, isGuestChallengeRefusalBody } from "@/lib/guest/turnstile";

/** GET and HEAD are reads by HTTP contract; every other method is a write. THE one copy. */
export function isReadMethod(method: string): boolean {
  const upper = method.toUpperCase();
  return upper === "GET" || upper === "HEAD";
}

/** Before a signed-out write: the visitor exists (minted once per tab). */
export async function beforeGuestWrite(signedIn: boolean, method: string): Promise<void> {
  if (!signedIn && !isReadMethod(method)) await ensureGuestIdentity();
}

/** After a refusal: true when it was the guest check and a fresh check passed — send once more. `refusalBody` is read only after a 403. */
export async function retriesAfterGuestRefusal(
  signedIn: boolean,
  status: number | null | undefined,
  refusalBody: () => unknown | Promise<unknown>,
): Promise<boolean> {
  if (signedIn || status !== 403) return false;
  if (!isGuestChallengeRefusalBody(await refusalBody())) return false;
  return ensureGuestIdentity({ fresh: true });
}
