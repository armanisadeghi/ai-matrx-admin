// record-view: none — a sub-view (snapshots) inside a record or scope, not the record page; the record's own page carries the section
import { Suspense } from "react";
import { SnapshotsTable } from "@/features/marketing/components/pages/SnapshotsTable";
import { LoadingSurface } from "@/features/marketing/components/shared/MarketingUi";

export default async function MarketingSnapshotsPage({
  params,
}: {
  params: Promise<{ pageId: string }>;
}) {
  const { pageId } = await params;
  return (
    <Suspense fallback={<LoadingSurface label="Loading page captures…" />}>
      <SnapshotsTable pageId={pageId} />
    </Suspense>
  );
}
