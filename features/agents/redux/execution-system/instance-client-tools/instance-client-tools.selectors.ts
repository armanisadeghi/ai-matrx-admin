import type { RootState } from "@/lib/redux/store";

const EMPTY_CLIENT_TOOLS: string[] = [];

export const selectInstanceClientTools =
  (instanceId: string) =>
  (state: RootState): string[] =>
    state.instanceClientTools.byInstanceId[instanceId] ?? EMPTY_CLIENT_TOOLS;
