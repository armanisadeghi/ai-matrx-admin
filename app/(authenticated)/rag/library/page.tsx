/**
 * /rag/library — visibility surface for processed documents.
 *
 * Shows every processed_documents row owned by the caller, with derived
 * counts and a status badge. The "where did my content go?" page.
 */

import { LibraryPage } from "@/features/library/components/LibraryPage";

export default function Page() {
  return <LibraryPage />;
}
