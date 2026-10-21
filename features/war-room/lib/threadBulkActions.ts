// features/war-room/lib/threadBulkActions.ts — THE BULK TWIN RULE for /war-room/all (Threads view).
//
// The thread's right-click menu (`useWarRoomThreadMenuSection`) can Pin / Unpin it, Move it to a room and
// Also-add it to a room. The same verbs work on the TICKED threads, through the SAME thunks
// (`toggleThreadPin`, `attachExistingThreadToRoom`); the room is asked once for the whole selection. Open,
// Open in a new tab and Copy link are one-thread verbs. A thread already in the wanted state is skipped and named.

import { FolderInput, FolderPlus, Pin, PinOff } from "lucide-react";
import { toggleThreadPin, attachExistingThreadToRoom } from "@/features/war-room/redux/thunks";
import { getStore } from "@/lib/redux/store-singleton";
import { bulkActionsFromRowVerbs } from "@/lib/entity-list/rowVerbs";
import type { EntityBulkAction } from "@/lib/entity-list/selection";
import type { WarRoomThreadMenuRow } from "./thread-actions";

export const THREAD_VERBS = [
  { id: "pin", label: "Pin", icon: Pin },
  { id: "unpin", label: "Unpin", icon: PinOff },
  { id: "move-to-room", label: "Move to room", icon: FolderInput },
  { id: "add-to-room", label: "Also add to room", icon: FolderPlus },
] as const;

function roomOptions(): { value: string; label: string }[] {
  const state = getStore()?.getState() as
    | { warRoom: { sessionIds: string[]; sessionsById: Record<string, { title?: string | null } | undefined> } }
    | undefined;
  if (!state) return [];
  return state.warRoom.sessionIds.map((id) => ({
    value: id,
    label: state.warRoom.sessionsById[id]?.title?.trim() || "Untitled War Room",
  }));
}

async function setPinned(id: string, pinned: boolean): Promise<void> {
  const store = getStore();
  if (!store) throw new Error("The app is still starting — try again.");
  await store.dispatch(toggleThreadPin(id, pinned) as never);
  // The thunk reports its own failure and reverts; read the state to know which happened.
  const now = (store.getState() as { warRoom: { threadUserStateById: Record<string, { isPinned?: boolean } | undefined> } }).warRoom
    .threadUserStateById[id];
  if ((now?.isPinned ?? false) !== pinned) throw new Error("The pin did not change");
}

async function attach(id: string, roomId: string | undefined, mode: "move" | "add"): Promise<void> {
  const store = getStore();
  if (!store) throw new Error("The app is still starting — try again.");
  if (!roomId) throw new Error("Pick a room first");
  const ok: unknown = await store.dispatch(attachExistingThreadToRoom(id, roomId, mode) as never);
  if (ok === false) throw new Error("It was not added to that room");
}

export function threadBulkActions(): EntityBulkAction<WarRoomThreadMenuRow>[] {
  const askRoom = (verb: string) => (t: { ids: string[] }) => {
    const options = roomOptions();
    return {
      title: `${verb} ${t.ids.length} ${t.ids.length === 1 ? "thread" : "threads"}`,
      description: options.length > 0 ? "Pick the War Room." : "There is no War Room to pick yet.",
      confirmLabel: verb,
      ask: { kind: "choice" as const, label: "War Room", options, defaultValue: options[0]?.value ?? "" },
    };
  };
  return bulkActionsFromRowVerbs(
    THREAD_VERBS,
    {
      pin: {
        done: "Pinned",
        skipReason: (row) => (row.isPinned ? "Already pinned" : null),
        runOne: (id) => setPinned(id, true),
      },
      unpin: {
        done: "Unpinned",
        skipReason: (row) => (row.isPinned ? null : "Not pinned"),
        runOne: (id) => setPinned(id, false),
      },
      "move-to-room": {
        done: "Moved",
        confirm: askRoom("Move to room"),
        runOne: (id, row, input) =>
          row && row.roomId && row.roomId === input.value ? Promise.reject(new Error("Already in that room")) : attach(id, input.value, "move"),
      },
      "add-to-room": {
        done: "Added to the room",
        confirm: askRoom("Also add to room"),
        runOne: (id, row, input) =>
          row && row.roomId && row.roomId === input.value ? Promise.reject(new Error("Already in that room")) : attach(id, input.value, "add"),
      },
    },
    { noun: "thread", getRowId: (row) => row.id, getRowName: (row) => row.title },
  );
}
