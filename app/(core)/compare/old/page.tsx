// record-view: none — the old-version comparison home
// app/(core)/compare/old/page.tsx — the index of old Knowledge pages kept for
// comparison, each beside its new page. Review-only; linked from nowhere.

import { CompareOldTable } from "./_components/CompareOldTable";

export default function CompareOldIndexPage() {
  return (
    <div className="h-full overflow-auto bg-background pt-[var(--shell-header-h)]">
      <div className="mx-auto max-w-4xl space-y-4 px-4 py-6 sm:px-6">
        {/* The old addresses already send people to the new pages; these copies stay only
            until the comparison is confirmed, then they are deleted. */}
        <h1 className="text-xl font-semibold tracking-tight">Old pages, kept for comparison</h1>
        <CompareOldTable />
      </div>
    </div>
  );
}
