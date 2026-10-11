/** Moved into @ai-matrx/chat; this path stays as a shim for app importers. */
export * from "@ai-matrx/chat/ui/mandates-storage/shortcutStorage";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import * as packageStorage from "@ai-matrx/chat/ui/mandates-storage/shortcutStorage";
import { asMatrxPackageClient } from "@/lib/supabase/matrxPackageClient";

export const shortcutTable = (supabase: SupabaseClient<Database>) =>
  packageStorage.shortcutTable(asMatrxPackageClient(supabase));
export const contextMenuView = (supabase: SupabaseClient<Database>) =>
  packageStorage.contextMenuView(asMatrxPackageClient(supabase));
export const fetchShortcutMandateKey = (
  supabase: SupabaseClient<Database>,
  shortcutId: string,
) => packageStorage.fetchShortcutMandateKey(asMatrxPackageClient(supabase), shortcutId);
