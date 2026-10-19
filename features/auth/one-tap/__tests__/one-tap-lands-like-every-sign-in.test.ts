/**
 * Google One Tap ends where every sign-in path ends (utils/auth/auth-destination.ts `signInDestination`):
 * the page she asked for wins; with none — and `/dashboard` counts as none — her saved layout's landing;
 * else /dashboard. Absent `landing` (a public page) = reload in place (destination null).
 * RED when: the action lands on /dashboard while a saved landing exists, or a deep link loses to the landing.
 */
const landing = jest.fn<Promise<string | null>, []>();
jest.mock("@/features/shell/shell-layout/server", () => ({ shellLandingAfterSignIn: () => landing() }));
jest.mock("@/utils/supabase/server", () => ({ createClient: async () => ({ auth: { signInWithIdToken: jest.fn() } }) }));
jest.mock("@/lib/guest/session-handover", () => ({
  handOverSession: async () => ({ data: { user: { id: "u-1", is_anonymous: false } }, error: null }),
}));
jest.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
jest.mock("next/server", () => ({ after: jest.fn() }));
jest.mock("@/lib/product-analytics/user-acquisition", () => ({ ACQUISITION_VISITOR_COOKIE: "v" }));
jest.mock("@/lib/product-analytics/server/acquisition-persistence", () => ({ linkAcquisitionToUser: jest.fn() }));
jest.mock("@/utils/auth/pending-signup", () => ({ clearPendingSignupEmail: async () => undefined }));

import { signInWithGoogleOneTap } from "../actions";

const base = { credential: "id-token", nonce: "n", visitorId: null };

beforeEach(() => landing.mockReset());

it("no destination of her own → her saved layout's landing", async () => {
  landing.mockResolvedValue("/launchpad/start");
  expect(await signInWithGoogleOneTap({ ...base, landing: { redirectTo: null } })).toEqual({ ok: true, destination: "/launchpad/start" });
});

it("/dashboard counts as no destination → the saved landing still applies", async () => {
  landing.mockResolvedValue("/launchpad/start");
  expect(await signInWithGoogleOneTap({ ...base, landing: { redirectTo: "/dashboard" } })).toEqual({ ok: true, destination: "/launchpad/start" });
});

it("a deep link wins and the landing is never asked", async () => {
  landing.mockResolvedValue("/launchpad/start");
  expect(await signInWithGoogleOneTap({ ...base, landing: { redirectTo: "/agents/all" } })).toEqual({ ok: true, destination: "/agents/all" });
  expect(landing).not.toHaveBeenCalled();
});

it("no saved landing → /dashboard", async () => {
  landing.mockResolvedValue(null);
  expect(await signInWithGoogleOneTap({ ...base, landing: { redirectTo: null } })).toEqual({ ok: true, destination: "/dashboard" });
});

it("a public page (no landing) reloads in place", async () => {
  expect(await signInWithGoogleOneTap(base)).toEqual({ ok: true, destination: null });
  expect(landing).not.toHaveBeenCalled();
});
