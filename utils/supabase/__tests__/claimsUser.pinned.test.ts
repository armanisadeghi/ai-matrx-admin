/** @jest-environment node */
import type { AuthError, JwtPayload } from "@supabase/supabase-js";
// The app-wide getClaimsUser hands the project's pinned signing keys to the verified-claims read,
// so a cold page never fetches /.well-known/jwks.json. Pinned keys exist only for the live authority.
import { getClaimsUser } from "@/utils/supabase/claimsUser";
import { PROJECT_SIGNING_KEY_AUTHORITIES } from "@ai-matrx/auth";

const authority = PROJECT_SIGNING_KEY_AUTHORITIES[0];

function client() {
  const getClaims = jest.fn(async (..._a: unknown[]) => ({ data: { claims: { sub: "u1" } as JwtPayload }, error: null as AuthError | null }));
  return { getClaims, c: { auth: { getClaims } } };
}

test("passes the pinned keys to getClaims for the live authority", async () => {
  const prev = process.env.NEXT_PUBLIC_SUPABASE_URL;
  process.env.NEXT_PUBLIC_SUPABASE_URL = `https://${authority}`;
  try {
    const { getClaims, c } = client();
    const res = await getClaimsUser(c);
    expect(res.data.user?.id).toBe("u1");
    const opts = (getClaims.mock.calls[0] as unknown[])[1] as { jwks: { keys: unknown[] } };
    expect(opts.jwks.keys.length).toBeGreaterThan(0);
  } finally {
    process.env.NEXT_PUBLIC_SUPABASE_URL = prev;
  }
});

test("explicit options win", async () => {
  const { getClaims, c } = client();
  await getClaimsUser(c, undefined, { jwks: { keys: [] } });
  expect(((getClaims.mock.calls[0] as unknown[])[1] as { jwks: { keys: unknown[] } }).jwks.keys).toEqual([]);
});
