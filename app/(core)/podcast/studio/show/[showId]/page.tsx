import { EntityCustomFields } from "@/features/unified-data/components/EntityCustomFields";
import { ShowManageClient } from "@/features/podcasts/studio/components/ShowManageClient";


export default async function ManageShowPage({
  params,
}: {
  params: Promise<{ showId: string }>;
}) {
  const { showId } = await params;
  return (
    <div className="h-full w-full overflow-y-auto overscroll-contain bg-textured">
      <ShowManageClient showId={showId} />
      <div className="mx-auto max-w-3xl px-4 pb-16">
        <EntityCustomFields entityToken="pc_show" recordId={showId} />
      </div>
    </div>
  );
}
