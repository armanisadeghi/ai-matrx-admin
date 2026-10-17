import type { KnobClient, KnobRpcError } from "@ai-matrx/data/knobs";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

type LooseRpc = (name: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: KnobRpcError | null }>;

/**
 * The website's Supabase client as the `KnobClient` the `@ai-matrx/*` packages read
 * organization settings through. The generated Database type narrows `rpc` to known function
 * names, which a package's structural client (any name) cannot express, so the one loose cast
 * lives here instead of at every package call site.
 */
export function packageKnobClient(client: SupabaseClient<Database>): KnobClient {
  return {
    schema: (name) => ({
      rpc: (fn, args) => (client.schema(name as "platform") as unknown as { rpc: LooseRpc }).rpc(fn, args),
    }),
  };
}
