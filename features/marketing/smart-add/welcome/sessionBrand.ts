/**
 * Sign-up welcome — "Looks right" is idempotent per welcome subject. Create stamps every round of the session on the
 * brand (`metadata.smart_add.runs`), and a welcome subject's anchor run is stable (welcomeSession.roundSubject), so the
 * brand a session already made is found by that run id: a reload and a second press reuse it and never make a second.
 */

import { supabase } from "@/utils/supabase/client";
import { authenticatedWebDb } from "@/utils/supabase/webDb";
import { getBrand } from "@/features/marketing/data/service";
import type { MarketingBrand } from "@/features/marketing/types";

/** The newest live brand any of `runIds` created (`metadata.smart_add.runs`), or null. Row security scopes the read. */
export async function findSessionBrand(runIds: readonly string[]): Promise<MarketingBrand | null> {
  const db = await authenticatedWebDb(supabase);
  for (const runId of runIds) {
    const { data, error } = await db
      .from("brand")
      .select("id")
      .contains("metadata", { smart_add: { runs: [runId] } })
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1);
    if (error) throw new Error(error.message);
    if (data?.[0]) return getBrand(data[0].id);
  }
  return null;
}
