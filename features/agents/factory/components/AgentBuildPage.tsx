"use client";

import { useRouter } from "next/navigation";
import { RecordPageHeader } from "@/features/shell/components/header/templates/RecordPageHeader";
import { BuildProgress } from "./BuildProgress";
import { SIBLINGS_MAX } from "@/features/shell/breadcrumbs/record-siblings";

/** The person's own build page (the completion notice links here). */
export function AgentBuildPage({ buildId }: { buildId: string }) {
  const router = useRouter();
  // The build's door opens the person's other builds (the builds list's own read), newest first.
  const loadBuilds = async () => {
    const [{ listBuildRuns }, { listItemFromRun }] = await Promise.all([import("../build-run-service"), import("../build-run")]);
    const rows = await listBuildRuns();
    return rows.slice(0, SIBLINGS_MAX).map((row) => {
      const item = listItemFromRun(row);
      return { label: item.name ?? "New agent", href: `/agents/builds/${item.id}`, active: item.id === buildId };
    });
  };
  return (
    <>
      <RecordPageHeader backHref="/agents" parents={[{ label: "Agents", href: "/agents" }]} record={{ name: "Agent build", loadSiblings: loadBuilds }} />
      <div className="h-full overflow-y-auto bg-textured pt-[var(--shell-header-h)]" data-matrx-page-scroll>
        <div className="mx-auto w-full max-w-3xl p-4">
          <BuildProgress buildId={buildId} onRebuilt={(next) => router.replace(`/agents/builds/${next}`)} />
        </div>
      </div>
    </>
  );
}
