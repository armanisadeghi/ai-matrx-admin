"use client";

/**
 * Deep-link route for the PDF Extractor.
 *
 *   /tools/pdf-extractor/<processed_documents.id>
 *
 * Renders the floating workspace as a full-page surface and opens the
 * requested document as soon as the workspace mounts. The window-panel
 * `onClose` navigates back rather than closing an overlay.
 */

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { PdfExtractorFloatingWorkspace } from "@/features/pdf-extractor/components/PdfExtractorWorkspace";

export default function PdfExtractorDocumentPage() {
  const router = useRouter();
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : null;

  if (!id) {
    return (
      <div className="h-[calc(100vh-2.5rem)] flex items-center justify-center text-sm text-muted-foreground">
        Missing document id.
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-2.5rem)] flex flex-col overflow-hidden">
      <PdfExtractorFloatingWorkspace
        initialDocumentId={id}
        onClose={() => router.push("/tools/pdf-extractor")}
      />
    </div>
  );
}
