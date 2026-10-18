// Registration is the light path on `./open` (no registry in first load); the emit loads it.
import { newHandleId, registerHandleEntry, removeHandleGroup } from "@ai-matrx/summon/open";

import type { CanonicalStorageImport } from "@/features/files/storage-sources/types";

export interface GoogleDriveImportedEvent {
  type: "drive-imported";
  files: CanonicalStorageImport[];
  failures: Array<{ name: string; error: string }>;
}

export interface GoogleConnectWindowCloseEvent {
  type: "window-close";
}

export type GoogleConnectWindowEvent =
  GoogleDriveImportedEvent | GoogleConnectWindowCloseEvent;

export interface GoogleConnectWindowHandlers {
  onDriveImported?: (
    event: GoogleDriveImportedEvent,
  ) => unknown | Promise<unknown>;
  onWindowClose?: (
    event: GoogleConnectWindowCloseEvent,
  ) => unknown | Promise<unknown>;
}

const activeGoogleConnectCallbackGroups = new Set<string>();

export function disposeGoogleConnectCallbackGroup(
  callbackGroupId: string | null | undefined,
): void {
  if (!callbackGroupId) return;
  activeGoogleConnectCallbackGroups.delete(callbackGroupId);
  removeHandleGroup(callbackGroupId);
}

export function createGoogleConnectCallbackGroup(
  handlers: GoogleConnectWindowHandlers,
): { callbackGroupId: string; dispose: () => void } {
  const callbackGroupId = newHandleId();
  activeGoogleConnectCallbackGroups.add(callbackGroupId);
  registerHandleEntry(
    async (event: GoogleConnectWindowEvent) => {
      if (event.type === "drive-imported") {
        await handlers.onDriveImported?.(event);
      }
      if (event.type === "window-close") {
        await handlers.onWindowClose?.(event);
      }
    },
    { groupId: callbackGroupId },
  );
  return {
    callbackGroupId,
    dispose: () => disposeGoogleConnectCallbackGroup(callbackGroupId),
  };
}

export async function emitGoogleConnectEvent(
  callbackGroupId: string | null | undefined,
  event: GoogleConnectWindowEvent,
): Promise<void> {
  if (
    !callbackGroupId ||
    !activeGoogleConnectCallbackGroups.has(callbackGroupId)
  ) {
    return;
  }
  const { callbackManager } = await import("@ai-matrx/summon/handles");
  await callbackManager.triggerGroupCommand(callbackGroupId, event, {
    removeAfterSuccess: false,
  });
}
