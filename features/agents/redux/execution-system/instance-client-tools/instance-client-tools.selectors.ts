import type { RootState } from "@/lib/redux/store";

export const selectInstanceClientTools =
  (instanceId: string) =>
  (state: RootState): string[] =>
    state.instanceClientTools.byInstanceId[instanceId] ?? [];
