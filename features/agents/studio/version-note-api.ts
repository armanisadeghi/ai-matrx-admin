import type { AppDispatch } from "@/lib/redux/store";
import { callApi } from "@/lib/api/call-api";

type ApiResult = { data?: unknown; error?: { message?: string; detail?: { message?: string } } };

export interface WrittenVersionNote {
  versionNumber: number;
  changeNote: string | null;
  tier: string | null;
  system: string | null;
}

/**
 * Writes the change note of the version a Studio save just created, through the server door
 * (aidream `/agent-studio/agents/{id}/version-note`, which takes the same `change_note` the agent update path
 * takes). The browser never writes `definition_version.change_note` itself. Rejects when the note did not land.
 */
export async function writeVersionNote(
  dispatch: AppDispatch,
  agentId: string,
  versionNumber: number,
  changeNote: string,
): Promise<WrittenVersionNote> {
  const result = (await dispatch(
    callApi({
      path: `/agent-studio/agents/${agentId}/version-note` as never,
      method: "POST",
      body: { version_number: versionNumber, change_note: changeNote } as never,
    }),
  )) as ApiResult;
  if (result.error) throw new Error(result.error.detail?.message ?? result.error.message ?? "The version note was not saved");
  const d = (result.data ?? {}) as { version_number?: number; change_note?: string | null; created_by_tier?: string | null; created_by_system?: string | null };
  return { versionNumber: d.version_number ?? versionNumber, changeNote: d.change_note ?? null, tier: d.created_by_tier ?? null, system: d.created_by_system ?? null };
}
