// utils/supabase/clientClaimsCache.ts — the browser's de-duplicated claims read, wired for this
// app: `@ai-matrx/auth` `createClaimsCache` over the app's browser client, its Supabase URL (which
// decides the pinned keys), and the app's "end a foreign session" action.

"use client";

import { createClaimsCache } from "@ai-matrx/auth";
import { supabase } from "@/utils/supabase/client";
import { endUnverifiableSession } from "@/utils/supabase/unverifiableSession";

export const getClientClaimsUserCached = createClaimsCache(supabase, {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  onUnverifiable: () => {
    void endUnverifiableSession(supabase.auth, { door: "auth.getClaims", via: "claims" });
  },
});
