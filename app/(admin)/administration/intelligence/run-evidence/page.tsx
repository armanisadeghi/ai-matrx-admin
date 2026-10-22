// Intelligence › Run Evidence: every run started from one surface by any agent (aidream surface_evidence).
"use client";

import { RecordPageHeader } from "@/features/shell/components/header/templates/RecordPageHeader";
import { SurfaceEvidencePage } from "@/features/admin/surface-evidence/SurfaceEvidencePage";

export default function RunEvidenceRoute() {
  return (
    <div className="flex h-[calc(100dvh-2.5rem)] min-h-0 flex-col overflow-hidden">
      <RecordPageHeader
        backHref="/administration/intelligence"
        parents={[{ label: "Intelligence", href: "/administration/intelligence" }]}
        level={{ name: "Run Evidence" }}
      />
      <SurfaceEvidencePage />
    </div>
  );
}
