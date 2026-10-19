import { EntityCustomFields } from "@/features/unified-data/components/EntityCustomFields";
import { StudioRunView } from "@/features/podcasts/studio/components/StudioRunView";


export default async function StudioRunPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="h-full w-full pt-6 overflow-y-auto overscroll-contain bg-textured" data-matrx-page-runway="">
      <StudioRunView runId={id} />
      <div className="mx-auto max-w-3xl px-4 pb-[var(--matrx-page-runway)]">
        <EntityCustomFields entityToken="pc_studio_run" recordId={id} />
      </div>
    </div>
  );
}
