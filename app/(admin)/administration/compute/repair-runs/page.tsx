import { Suspense } from "react";
import RepairRunsConsole from "@/features/admin/repair-runs/RepairRunsConsole";

/**
 * /administration/compute/repair-runs
 *
 * Route leaf only — every decision lives in `features/admin/repair-runs/`.
 */
export default function RepairRunsPage() {
  return (
    <Suspense>
      <RepairRunsConsole />
    </Suspense>
  );
}
