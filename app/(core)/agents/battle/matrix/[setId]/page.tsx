// record-view: none — an editor or experiment surface for a record, not the record view
import { BattleSurfaceRuntime } from "@/features/agent-comparison/shared/BattleSurfaceRuntime";
import { MatrixBattlePage } from "@/features/agent-comparison/modes/matrix/components/MatrixBattlePage";

export default async function SavedMatrixBattleRoute({
  params,
}: {
  params: Promise<{ setId: string }>;
}) {
  const { setId } = await params;
  return (
    <BattleSurfaceRuntime>
      <MatrixBattlePage setId={setId} />
    </BattleSurfaceRuntime>
  );
}
