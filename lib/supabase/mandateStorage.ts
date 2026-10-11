/** Moved into @ai-matrx/chat; this path stays as a shim for app importers. */
export * from "@ai-matrx/chat/ui/mandates-storage/mandateStorage";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import * as packageStorage from "@ai-matrx/chat/ui/mandates-storage/mandateStorage";
import { asMatrxPackageClient } from "@/lib/supabase/matrxPackageClient";

export const appClientForMatrxStorage = asMatrxPackageClient;

export const mandateDefinitions = (supabase: SupabaseClient<Database>) =>
  packageStorage.mandateDefinitions(appClientForMatrxStorage(supabase));
export const mandateProvisions = (supabase: SupabaseClient<Database>) =>
  packageStorage.mandateProvisions(appClientForMatrxStorage(supabase));
export const mandateBindings = (supabase: SupabaseClient<Database>) =>
  packageStorage.mandateBindings(appClientForMatrxStorage(supabase));
export const mandateTreatments = (supabase: SupabaseClient<Database>) =>
  packageStorage.mandateTreatments(appClientForMatrxStorage(supabase));
export const mandateNotes = (supabase: SupabaseClient<Database>) =>
  packageStorage.mandateNotes(appClientForMatrxStorage(supabase));

/**
 * Bridge the app's generated database type to Chat's generated snapshot for the
 * mandate treatment table. Their treatment Row/Insert/Update shapes are
 * identical; the generic mismatch comes from unrelated schema drift elsewhere
 * (for example, the app's newer platform.field_data_type enum). At runtime the
 * package helper only calls schema("mandate").from("treatment"), so the same
 * Supabase client methods and table are used.
 */
export const mandateTreatmentsForApp = mandateTreatments;
