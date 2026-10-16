"use client";

/**
 * The app's side of the Docs model and io (`@ai-matrx/office/docs`): the two things the package
 * cannot own, stated once at start-up (imported for effect by the client `StoreProvider`).
 */
import { configureDocsHost, type DocsSupabase } from "@ai-matrx/office/docs";
import { requestRaw } from "@/lib/python-client";
import { supabase } from "@/utils/supabase/client";

configureDocsHost({
  getSupabase: () => supabase as unknown as DocsSupabase,
  requestRaw: (path, init) => requestRaw(path, init),
});
