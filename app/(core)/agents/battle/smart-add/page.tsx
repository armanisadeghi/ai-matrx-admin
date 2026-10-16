import { BattleSurfaceRuntime } from "@/features/agent-comparison/shared/BattleSurfaceRuntime";
import { SmartAddBenchPage } from "@/features/agent-comparison/modes/smart-add/components/SmartAddBenchPage";

export default function SmartAddBenchRoute() {
  return (
    <BattleSurfaceRuntime>
      <SmartAddBenchPage />
    </BattleSurfaceRuntime>
  );
}
