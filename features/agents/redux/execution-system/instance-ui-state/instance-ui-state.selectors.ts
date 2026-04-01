import type { RootState } from "@/lib/redux/store";
import type {
  InstanceUIState,
  ResultDisplayMode,
} from "@/features/agents/types";

export const selectInstanceUIState =
  (instanceId: string) =>
  (state: RootState): InstanceUIState | undefined =>
    state.instanceUIState.byInstanceId[instanceId];

export const selectDisplayMode =
  (instanceId: string) =>
  (state: RootState): ResultDisplayMode =>
    state.instanceUIState.byInstanceId[instanceId]?.displayMode ?? "modal-full";

export const selectAllowChat =
  (instanceId: string) =>
  (state: RootState): boolean =>
    state.instanceUIState.byInstanceId[instanceId]?.allowChat ?? true;

export const selectShowVariablePanel =
  (instanceId: string) =>
  (state: RootState): boolean =>
    state.instanceUIState.byInstanceId[instanceId]?.showVariablePanel ?? false;

export const selectModeState =
  (instanceId: string) =>
  (state: RootState): Record<string, unknown> =>
    state.instanceUIState.byInstanceId[instanceId]?.modeState ?? {};

export const selectSubmitOnEnter =
  (instanceId: string) =>
  (state: RootState): boolean =>
    state.instanceUIState.byInstanceId[instanceId]?.submitOnEnter ?? true;

export const selectIsCreator =
  (instanceId: string) =>
  (state: RootState): boolean =>
    state.instanceUIState.byInstanceId[instanceId]?.isCreator ?? false;

export const selectShowCreatorDebug =
  (instanceId: string) =>
  (state: RootState): boolean =>
    state.instanceUIState.byInstanceId[instanceId]?.showCreatorDebug ?? false;

export const selectExpandedVariableId =
  (instanceId: string) =>
  (state: RootState): string | null =>
    state.instanceUIState.byInstanceId[instanceId]?.expandedVariableId ?? null;

export const selectAutoClearConversation =
  (instanceId: string) =>
  (state: RootState): boolean =>
    state.instanceUIState.byInstanceId[instanceId]?.autoClearConversation ??
    false;
