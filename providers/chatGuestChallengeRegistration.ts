// The ONE place the human check (lib/guest/turnstile.ts) is handed to the chat package, so a
// signed-out visitor's first chat turn — the request that mints them on the X-Fingerprint-ID lane —
// carries X-Turnstile-Token and is retried once on 403 guest_challenge_failed (FREE-ALLOWANCE.md §5).
// chatUiRegistrationBase imports it for every build profile.
//
// Read off the namespace: until the lockfile carries the @ai-matrx/chat release that exports
// `registerChatGuestChallenge`, this registers nothing and the turn goes without a token (as before).
import * as chatHost from "@ai-matrx/chat/host";
import { guestChallengeToken } from "@/lib/guest/turnstile";

type Register = (next: { token(options?: { fresh?: boolean }): Promise<string | null> } | null) => void;

const register = (chatHost as unknown as { registerChatGuestChallenge?: Register }).registerChatGuestChallenge;
if (register) register({ token: (options) => guestChallengeToken(options) });
