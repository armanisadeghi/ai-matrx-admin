// record-view: none — an editor or experiment surface for a record, not the record view
import { BattleSurfaceRuntime } from "@/features/agent-comparison/shared/BattleSurfaceRuntime";
import { VariationsBattlePage } from "@/features/agent-comparison/modes/variations/components/VariationsBattlePage";

export default async function SavedVariationsBattleRoute({
  params,
}: {
  params: Promise<{ setId: string }>;
}) {
  const { setId } = await params;
  return (
    <BattleSurfaceRuntime>
      <VariationsBattlePage setId={setId} />
    </BattleSurfaceRuntime>
  );
}
