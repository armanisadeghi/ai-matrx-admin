// record-view: none — an editor or experiment surface for a record, not the record view
import { BattleSurfaceRuntime } from "@/features/agent-comparison/shared/BattleSurfaceRuntime";
import { SettingsBattlePage } from "@/features/agent-comparison/modes/settings/components/SettingsBattlePage";

export default async function SavedSettingsBattleRoute({
  params,
}: {
  params: Promise<{ setId: string }>;
}) {
  const { setId } = await params;
  return (
    <BattleSurfaceRuntime>
      <SettingsBattlePage setId={setId} />
    </BattleSurfaceRuntime>
  );
}
