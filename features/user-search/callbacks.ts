// Registration is summon's light path on `./open` (same pattern as the projects window callbacks):
// the open hook and the field import this module, so the full handles registry must not ride it
// into first load. Creating a group starts loading the registry; the window emits long after,
// through the loaded registry (synchronously), so event order is unchanged.
import {
  newHandleId,
  registerHandleEntry,
  removeHandleGroup,
} from "@ai-matrx/summon/open";
import type { UserSearchCandidate } from "./types";

type Handles = typeof import("@ai-matrx/summon/handles");
let handles: Handles | null = null;
const loadHandles = (): Promise<Handles> =>
  import("@ai-matrx/summon/handles").then((m) => (handles = m));

export interface UserSearchSelectedEvent {
  type: "selected";
  instanceId: string;
  user: UserSearchCandidate;
}

export interface UserSearchClosedEvent {
  type: "window-close";
  instanceId: string;
}

export type UserSearchEvent = UserSearchSelectedEvent | UserSearchClosedEvent;

export interface UserSearchHandlers {
  onSelected?: (event: UserSearchSelectedEvent) => void;
  onWindowClose?: (event: UserSearchClosedEvent) => void;
}

export function createUserSearchCallbackGroup(handlers: UserSearchHandlers): {
  callbackGroupId: string;
  dispose: () => void;
} {
  const callbackGroupId = newHandleId();
  void loadHandles();
  registerHandleEntry(
    (event: UserSearchEvent) => {
      if (event.type === "selected") handlers.onSelected?.(event);
      else {
        handlers.onWindowClose?.(event);
        removeHandleGroup(callbackGroupId);
      }
    },
    { groupId: callbackGroupId },
  );
  return {
    callbackGroupId,
    dispose: () => removeHandleGroup(callbackGroupId),
  };
}

export function emitUserSearchEvent(
  callbackGroupId: string | null | undefined,
  event: UserSearchEvent,
): void {
  if (!callbackGroupId) return;
  const trigger = (m: Handles) =>
    m.callbackManager.triggerGroup<UserSearchEvent>(callbackGroupId, event, {
      removeAfterTrigger: false,
    });
  if (handles) trigger(handles);
  else void loadHandles().then(trigger);
}
