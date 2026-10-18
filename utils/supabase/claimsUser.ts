// utils/supabase/claimsUser.ts — THE app-wide `getClaimsUser`. Every caller imports it from here,
// never from `@ai-matrx/auth` directly (guard: `pnpm check:claims-user-pinned`).
//
// Same verified-claims read as the package's (local WebCrypto verification, NEVER `getUser()`), but
// the project's PINNED public signing keys are tried first, so a cold page never fetches
// `/auth/v1/.well-known/jwks.json` from the browser. Pinned keys can only remove a network call:
// an unknown `kid` still falls back to the JWKS fetch.
import { getClaimsUser as packageGetClaimsUser, pinnedSigningKeysFor } from "@ai-matrx/auth";

type Args = Parameters<typeof packageGetClaimsUser>;

export function getClaimsUser(client: Args[0], jwt?: Args[1], options?: Args[2]): ReturnType<typeof packageGetClaimsUser> {
  if (options) return packageGetClaimsUser(client, jwt, options);
  const keys = pinnedSigningKeysFor(process.env.NEXT_PUBLIC_SUPABASE_URL);
  return keys.length ? packageGetClaimsUser(client, jwt, { jwks: { keys } }) : packageGetClaimsUser(client, jwt);
}
