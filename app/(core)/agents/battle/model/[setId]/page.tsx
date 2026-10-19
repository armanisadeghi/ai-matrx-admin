// record-view: none — an editor or experiment surface for a record, not the record view
import { ModelBattlePage } from "@/features/agent-comparison/modes/model/components/ModelBattlePage";

export default async function SavedModelBattleRoute({
  params,
}: {
  params: Promise<{ setId: string }>;
}) {
  const { setId } = await params;
  return <ModelBattlePage setId={setId} />;
}
