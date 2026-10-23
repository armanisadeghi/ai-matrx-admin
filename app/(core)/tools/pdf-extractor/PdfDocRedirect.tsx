"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { resolvePdfSurfaceIds } from "@/features/pdf/hooks/usePdfSurfaceLinks";
import { sourceStudioPath } from "@/features/source-studio/sourceStudioModel";

/**
 * `/tools/pdf-extractor?doc=<processed document id>` (an old link) goes to that document's file in the PDF
 * workspace; a document whose original file is gone goes to its Source screen, which still shows the text.
 */
export default function PdfDocRedirect({ documentId }: { documentId: string }) {
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    resolvePdfSurfaceIds({ processedDocumentId: documentId }).then(
      (ids) => {
        if (!alive) return;
        router.replace(ids.fileId ? `/pdf/${encodeURIComponent(ids.fileId)}` : sourceStudioPath(documentId));
      },
      () => {
        if (alive) setFailed(true);
      },
    );
    return () => {
      alive = false;
    };
  }, [documentId, router]);
  return failed ? (
    <div role="alert" className="p-6 text-sm text-destructive">That document could not be opened. Open it from your PDFs instead.</div>
  ) : (
    <div className="p-6 text-sm text-muted-foreground" aria-busy="true">Opening</div>
  );
}
