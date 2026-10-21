/**
 * SurfaceAgentBindWindow callbacks.
 *
 * The window talks back to the page that opened it via `callbackManager`:
 *   1. Caller creates a group via `createSurfaceAgentBindCallbackGroup`
 *   2. Passes `callbackGroupId` through `openOverlay` data
 *   3. Window emits `bound` / `window-close` events
 *   4. Caller `dispose()`s when done
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
import type { ValueMappingMap } from "@ai-matrx/chat/surfaces/types";

export type SurfaceAgentBindEventType = "bound" | "window-close";

export interface SurfaceAgentBindEventBase {
  type: SurfaceAgentBindEventType;
  instanceId: string;
}

export interface SurfaceAgentBindBoundEvent extends SurfaceAgentBindEventBase {
  type: "bound";
  bindingId: string;
  agentId: string;
  surfaceName: string;
}

export interface SurfaceAgentBindCloseEvent extends SurfaceAgentBindEventBase {
  type: "window-close";
}

export type SurfaceAgentBindEvent =
  SurfaceAgentBindBoundEvent | SurfaceAgentBindCloseEvent;

export interface SurfaceAgentBindHandlers {
  onBound?: (e: SurfaceAgentBindBoundEvent) => void;
  onWindowClose?: (e: SurfaceAgentBindCloseEvent) => void;
  onEvent?: (e: SurfaceAgentBindEvent) => void;
}

export interface SurfaceAgentBindWindowData {
  surfaceName: string;
  initialAgentId?: string | null;
  /** A mapping to start from (e.g. a Custom Agent run's). */
  initialValueMappings?: ValueMappingMap | null;
  callbackGroupId?: string | null;
}

export function createSurfaceAgentBindCallbackGroup(
  handlers: SurfaceAgentBindHandlers,
): { callbackGroupId: string; dispose: () => void } {
  const callbackGroupId = newHandleId();
  void loadHandles();

  const fanOut = (event: SurfaceAgentBindEvent) => {
    switch (event.type) {
      case "bound":
        handlers.onBound?.(event);
        break;
      case "window-close":
        handlers.onWindowClose?.(event);
        break;
    }
    handlers.onEvent?.(event);
  };

  registerHandleEntry((event: SurfaceAgentBindEvent) => fanOut(event), {
    groupId: callbackGroupId,
  });

  return {
    callbackGroupId,
    dispose: () => removeHandleGroup(callbackGroupId),
  };
}

export function emitSurfaceAgentBindEvent(
  callbackGroupId: string | undefined | null,
  event: SurfaceAgentBindEvent,
): void {
  if (!callbackGroupId) return;
  const trigger = (m: Handles) =>
    m.callbackManager.triggerGroup<SurfaceAgentBindEvent>(
      callbackGroupId,
      event,
      { removeAfterTrigger: false },
    );
  if (handles) trigger(handles);
  else void loadHandles().then(trigger);
}
