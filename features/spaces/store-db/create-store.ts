// features/spaces/store-db/create-store.ts — the database SpacesStore for the browser.

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";
import { supabase } from "@/utils/supabase/client";
import { SupabaseSpacesStore } from "./supabase-store";

/**
 * The signed-in person's Spaces; new top-level Spaces are filed in `organizationId`. `client` is the session
 * the reads run as — the app's own by default; a host with its own visitor session (the Applet host's guest
 * client) passes that one, so a Space page reads as the same person the page around it does.
 */
export function createDatabaseSpacesStore(organizationId: string, client: SupabaseClient<Database> = supabase): SupabaseSpacesStore {
  return new SupabaseSpacesStore(client, organizationId);
}
