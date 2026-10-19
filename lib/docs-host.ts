"use client";

/**
 * The app's side of the Docs model and io (`@ai-matrx/office/docs`): the two things the package
 * cannot own, stated once at start-up (imported for effect by the client `StoreProvider`). It imports
 * only the ports entry (`/docs/host`): the service entry would put Univer, lodash-es, rxjs and mammoth
 * in every route's first load.
 */
import { configureDocsHost, type DocsSupabase } from "@ai-matrx/office/docs/host";
import { requestRaw } from "@/lib/python-client";
import { supabase } from "@/utils/supabase/client";

configureDocsHost({
  getSupabase: () => supabase as unknown as DocsSupabase,
  requestRaw: (path, init) => requestRaw(path, init),
  // "Make a copy" copies what people are typing right now, not only the last save (lazy: the reader pulls the service in).
  async readCurrentSnapshot(documentId) {
    const { readCurrentDocument } = await import("@/lib/collab/current-record");
    return { snapshot: (await readCurrentDocument(documentId)).snapshot };
  },
});
