// app/(core)/masterwork/encore/[id]/page.tsx
//
// Run one released Masterwork — the Encore run experience (input form, live
// streamed run, result, this Operator's own run history).

"use client";

import { EntityCustomFields } from "@/features/unified-data/components/EntityCustomFields";
import { use } from "react";
import RouteHeader from "@/features/shell/components/header/RouteHeader";
import { ChevronLeftTapButton } from "@ai-matrx/design-system/tap-target/buttons";
import { EncoreRunPage } from "@/features/masterwork/encore/EncoreRunPage";

export default function EncoreRunRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <>
      <RouteHeader
        left={
          <>
            <ChevronLeftTapButton
              href="/masterwork/encore"
              ariaLabel="Back to Encore"
            />
            <h1 className="ml-2 truncate text-sm font-medium text-foreground">
              Run
            </h1>
          </>
        }
      />
      <div className="h-full overflow-y-auto bg-textured pt-[calc(var(--shell-header-h)+1rem)]" data-matrx-page-runway="">
        <EncoreRunPage masterworkId={id} />
        <div className="mx-auto max-w-5xl px-4 pb-[var(--matrx-page-runway)]">
          <EntityCustomFields entityToken="masterwork_run" recordId={id} />
        </div>
      </div>
    </>
  );
}
