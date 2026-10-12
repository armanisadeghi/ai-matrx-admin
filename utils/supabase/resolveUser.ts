// utils/supabase/resolveUser.ts — who is calling this API route, wired for this app.
//
// Bearer token (public/mobile/extension/desktop) or the session cookie (browser), verified locally
// by `@ai-matrx/auth/node` `verifyRequest` — never `getUser()`. Signed out is an answer
// (`user: null`), not a failure. This file injects the app's URL, publishable key and cookie client.

import type { NextRequest } from "next/server";
import { verifyRequest } from "@ai-matrx/auth/node";
import { createClient } from "@/utils/supabase/server";
import { requireEnv } from "@/utils/supabase/env";

const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
const supabasePublishableKey = requireEnv(
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);

export async function resolveUser(request: NextRequest) {
  const { user } = await verifyRequest(request, {
    url: supabaseUrl,
    publishableKey: supabasePublishableKey,
    cookieClient: () => createClient(),
  });
  return { user };
}
