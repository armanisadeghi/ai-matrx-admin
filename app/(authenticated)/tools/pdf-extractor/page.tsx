"use client";

/**
 * Full-page route for the PDF Extractor.
 *
 *   /tools/pdf-extractor
 *
 * Same workspace as the Tools-grid floating window — just hosted on a
 * dedicated route. Click any document in the sidebar and the URL
 * advances to `/tools/pdf-extractor/<id>` (handled by the [id] route).
 */

import React from "react";
import { useRouter } from "next/navigation";
import { PdfExtractorFloatingWorkspace } from "@/features/pdf-extractor/components/PdfExtractorWorkspace";

export default function PdfExtractorPage() {
  const router = useRouter();
  return (
    <div className="h-[calc(100vh-2.5rem)] flex flex-col overflow-hidden">
      <PdfExtractorFloatingWorkspace
        onClose={() => router.push("/")}
      />
    </div>
  );
}
