// Billing › Free allowance: today's free use by visitors and free accounts, the daily free budget, and every decision.
"use client";

import { Suspense } from "react";
import { RecordPageHeader } from "@/features/shell/components/header/templates/RecordPageHeader";
import { FreeAllowanceBoard } from "@/features/admin/free-allowance/FreeAllowanceBoard";

export default function FreeAllowancePage() {
  return (
    <>
      <RecordPageHeader
        backHref="/administration/billing"
        parents={[{ label: "Billing", href: "/administration/billing" }]}
        level={{ name: "Free allowance" }}
      />
      <div className="flex h-full min-h-0 flex-col p-3">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-md bg-muted/50" />}>
          <FreeAllowanceBoard />
        </Suspense>
      </div>
    </>
  );
}
