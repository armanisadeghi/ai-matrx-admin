/**
 * Callback group for the `saveToTable` overlay — the caller learns which table the rows landed in
 * (the canvas table artifact links itself to it, so it becomes a live table in the conversation).
 * Functions never travel through Redux; the group id does.
 */
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

export interface SaveToTableSavedEvent {
  type: "saved";
  tableId: string;
  /** `new` when the overlay made the table; `existing` when rows were added to one. */
  how: "new" | "existing";
  /** The table's name, when the overlay knows it. */
  tableName: string | null;
}

export interface SaveToTableHandlers {
  onSaved?: (event: SaveToTableSavedEvent) => unknown | Promise<unknown>;
}

const activeGroups = new Set<string>();

export function disposeSaveToTableCallbackGroup(
  callbackGroupId: string | null | undefined,
): void {
  if (!callbackGroupId) return;
  activeGroups.delete(callbackGroupId);
  removeHandleGroup(callbackGroupId);
}

export function createSaveToTableCallbackGroup(handlers: SaveToTableHandlers): {
  callbackGroupId: string;
  dispose: () => void;
} {
  const callbackGroupId = newHandleId();
  void loadHandles();
  activeGroups.add(callbackGroupId);
  registerHandleEntry(
    async (event: SaveToTableSavedEvent) => {
      if (event.type === "saved") await handlers.onSaved?.(event);
    },
    { groupId: callbackGroupId },
  );
  return {
    callbackGroupId,
    dispose: () => disposeSaveToTableCallbackGroup(callbackGroupId),
  };
}

export async function emitSaveToTableEvent(
  callbackGroupId: string | null | undefined,
  event: SaveToTableSavedEvent,
): Promise<void> {
  if (!callbackGroupId || !activeGroups.has(callbackGroupId)) return;
  await (handles ?? (await loadHandles())).callbackManager.triggerGroupCommand(
    callbackGroupId,
    event,
    { removeAfterSuccess: false },
  );
}
