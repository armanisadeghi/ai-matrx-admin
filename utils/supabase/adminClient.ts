// utils/supabase/adminClient.ts — the server-only secret-key client, wired for this app.
// `@ai-matrx/auth/node` `createServiceClient` is the one door; this injects the env and the
// Database type. Bypasses row security: server code only, with proper validation.
// Only the sb_secret_* key (the legacy service-role JWT is banned; ESLint blocks it).

import { createServiceClient } from "@ai-matrx/auth/node";
import type { Database } from "@/types/database.types";

export function createAdminClient() {
  return createServiceClient<Database>({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    secretKey: process.env.SUPABASE_SECRET_KEY,
  });
}
