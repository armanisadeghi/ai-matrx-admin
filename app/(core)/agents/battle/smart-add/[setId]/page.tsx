import { BattleSurfaceRuntime } from "@/features/agent-comparison/shared/BattleSurfaceRuntime";
import { SmartAddBenchPage } from "@/features/agent-comparison/modes/smart-add/components/SmartAddBenchPage";

export default async function SavedSmartAddBenchRoute({ params }: { params: Promise<{ setId: string }> }) {
  const { setId } = await params;
  return (
    <BattleSurfaceRuntime>
      <SmartAddBenchPage setId={setId} />
    </BattleSurfaceRuntime>
  );
}
