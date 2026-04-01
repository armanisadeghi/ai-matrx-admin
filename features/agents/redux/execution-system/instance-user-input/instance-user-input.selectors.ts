import type { RootState } from "@/lib/redux/store";

export const selectUserInputText =
  (instanceId: string) =>
  (state: RootState): string =>
    state.instanceUserInput.byInstanceId[instanceId]?.text ?? "";

export const selectUserInputContentBlocks =
  (instanceId: string) =>
  (state: RootState): Array<Record<string, unknown>> | null =>
    state.instanceUserInput.byInstanceId[instanceId]?.contentBlocks ?? null;

export const selectHasUserInput =
  (instanceId: string) =>
  (state: RootState): boolean => {
    const entry = state.instanceUserInput.byInstanceId[instanceId];
    if (!entry) return false;
    return (
      entry.text.trim().length > 0 || (entry.contentBlocks?.length ?? 0) > 0
    );
  };
