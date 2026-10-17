import { Suspense } from "react";
import { ToolAlertRecord } from "@/features/admin/tool-control/ToolAlertRecord";

// record-view: ToolAlertRecord
// ONE Tool-control alarm by id (a price that may have changed, new sources
// to review, a vendor account switched off, the guard failing). The dock opens it; it is never a list.
export default async function ToolAlertRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={null}>
      <ToolAlertRecord alarmId={decodeURIComponent(id)} />
    </Suspense>
  );
}
