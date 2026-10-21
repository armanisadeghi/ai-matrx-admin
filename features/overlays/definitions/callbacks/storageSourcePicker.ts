// Registration is summon's light path on `./open`: this module is reached from the boot graph, so the
// full handles registry must not ride it into first load. Creating a group starts loading the
// registry; the emit side runs long after, through the loaded registry (same pattern as the
// projects window callbacks).
import {
  newHandleId,
  registerHandleEntry,
  removeHandleGroup,
} from "@ai-matrx/summon/open";

type Handles = typeof import("@ai-matrx/summon/handles");
let handles: Handles | null = null;
const loadHandles = (): Promise<Handles> =>
  import("@ai-matrx/summon/handles").then((m) => (handles = m));
import type { CanonicalStorageImport } from "@/features/files/storage-sources/types";

export interface StorageSourcePickerHandlers {
  onImported: (files: CanonicalStorageImport[]) => unknown | Promise<unknown>;
}

const activeGroups = new Set<string>();

export function createStorageSourcePickerCallbackGroup(
  handlers: StorageSourcePickerHandlers,
): { callbackGroupId: string; dispose: () => void } {
  const callbackGroupId = newHandleId();
  void loadHandles();
  activeGroups.add(callbackGroupId);
  registerHandleEntry(
    async (files: CanonicalStorageImport[]) => {
      await handlers.onImported(files);
    },
    { groupId: callbackGroupId },
  );
  return {
    callbackGroupId,
    dispose: () => disposeStorageSourcePickerCallbackGroup(callbackGroupId),
  };
}

export async function deliverStorageSourceImports(
  callbackGroupId: string,
  files: CanonicalStorageImport[],
): Promise<void> {
  if (!activeGroups.has(callbackGroupId)) {
    throw new Error("The file destination is no longer available.");
  }
  await (handles ?? (await loadHandles())).callbackManager.triggerGroupCommand(
    callbackGroupId,
    files,
    {
      removeAfterSuccess: false,
    },
  );
}

export function disposeStorageSourcePickerCallbackGroup(
  callbackGroupId: string | null | undefined,
): void {
  if (!callbackGroupId) return;
  activeGroups.delete(callbackGroupId);
  removeHandleGroup(callbackGroupId);
}
