// utils/supabase/getServerAuth.ts — THE server identity door, wired for this app.
//
// The door itself (claims verified locally against the pinned key, one retry on a fresh client,
// `authUnavailable` never set for a bad token) lives in `@ai-matrx/auth/next` `createServerAuth`.
// This file only injects the app's cookie client, its Supabase URL and React's per-request `cache`.
// A SCREEN never reads this door directly: it reads `getSessionVerdict()` (`./sessionVerdict`).
// Contract: `common-docs/systems/platform/auth/proxy-identity/FEATURE.md`.

import { cache } from "react";
import { createServerAuth, type ServerAuthState } from "@ai-matrx/auth/next";
import { createClient } from "./server";

export type { ServerAuthState };

export const getServerAuth = createServerAuth({
  createClient: () => createClient(),
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  cache,
});
