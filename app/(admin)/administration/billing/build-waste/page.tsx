// Billing › Build waste: package builds (npm, PyPI, Docker) that shipped nothing new — aidream billing.ci_package_build.
"use client";

import { Suspense } from "react";
import { RecordPageHeader } from "@/features/shell/components/header/templates/RecordPageHeader";
import { BuildWasteBoard } from "@/features/admin/build-waste/BuildWasteBoard";

export default function BuildWastePage() {
  return (
    <>
      <RecordPageHeader
        backHref="/administration/billing"
        parents={[{ label: "Billing", href: "/administration/billing" }]}
        level={{ name: "Build waste" }}
      />
      <div className="flex h-full min-h-0 flex-col p-3">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-md bg-muted/50" />}>
          <BuildWasteBoard />
        </Suspense>
      </div>
    </>
  );
}
