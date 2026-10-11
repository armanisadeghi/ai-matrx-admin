import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database as AppDatabase } from "@/types/database.types";
import type { Database as PackageDatabase } from "@ai-matrx/data/types";

/**
 * Adapt the app client to the generated Database snapshot consumed by Matrx
 * packages. The app schema currently has additive enum values (including
 * `document_source.linked_gdoc`) that have not yet landed in the package type
 * snapshot. The runtime is the same SupabaseClient; only its generic changes.
 * Keep this at package boundaries so callers retain their local DB typing.
 */
export function asMatrxPackageClient(
  client: SupabaseClient<AppDatabase>,
): SupabaseClient<PackageDatabase> {
  return client as unknown as SupabaseClient<PackageDatabase>;
}
