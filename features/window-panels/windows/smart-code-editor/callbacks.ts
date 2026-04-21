/**
 * Smart Code Editor window callbacks.
 *
 * Pattern (identical to content-editors/callbacks.ts):
 *
 *   1. The caller creates a callback GROUP via `createSmartCodeEditorCallbackGroup`
 *      and registers any subset of lifecycle handlers (onCodeChange, onReady, …).
 *   2. The returned `callbackGroupId` is passed through `openOverlay` in the
 *      window's `data` payload.
 *   3. The window subscribes to that group and emits typed events as the
 *      agent mutates the code or the user closes the window.
 *   4. The caller `dispose()`-s the group when it no longer needs events.
 *
 * Handlers — and the live code/onCodeChange closures they reference — are
 * NEVER put into Redux. The callback group is the live channel back to the
 * caller.
 */
import { callbackManager } from "@/utils/callbackManager";

// ─── Event surface ───────────────────────────────────────────────────────────

export type SmartCodeEditorWindowEventType =
  | "ready"
  | "launched"
  | "code-change"
  | "agent-complete"
  | "agent-error"
  | "window-close";

export interface SmartCodeEditorWindowEventBase {
  type: SmartCodeEditorWindowEventType;
  /** The overlay instanceId of the window emitting the event. */
  windowInstanceId: string;
}

export interface SmartCodeEditorReadyEvent
  extends SmartCodeEditorWindowEventBase {
  type: "ready";
}

export interface SmartCodeEditorLaunchedEvent
  extends SmartCodeEditorWindowEventBase {
  type: "launched";
  conversationId: string;
}

export interface SmartCodeEditorCodeChangeEvent
  extends SmartCodeEditorWindowEventBase {
  type: "code-change";
  code: string;
}

export interface SmartCodeEditorAgentCompleteEvent
  extends SmartCodeEditorWindowEventBase {
  type: "agent-complete";
  conversationId: string;
  finalCode: string;
}

export interface SmartCodeEditorAgentErrorEvent
  extends SmartCodeEditorWindowEventBase {
  type: "agent-error";
  message: string;
}

export interface SmartCodeEditorWindowCloseEvent
  extends SmartCodeEditorWindowEventBase {
  type: "window-close";
  finalCode: string;
}

export type SmartCodeEditorWindowEvent =
  | SmartCodeEditorReadyEvent
  | SmartCodeEditorLaunchedEvent
  | SmartCodeEditorCodeChangeEvent
  | SmartCodeEditorAgentCompleteEvent
  | SmartCodeEditorAgentErrorEvent
  | SmartCodeEditorWindowCloseEvent;

// ─── Handler shape ───────────────────────────────────────────────────────────

export interface SmartCodeEditorWindowHandlers {
  onReady?: (event: SmartCodeEditorReadyEvent) => void;
  onLaunched?: (event: SmartCodeEditorLaunchedEvent) => void;
  onCodeChange?: (event: SmartCodeEditorCodeChangeEvent) => void;
  onAgentComplete?: (event: SmartCodeEditorAgentCompleteEvent) => void;
  onAgentError?: (event: SmartCodeEditorAgentErrorEvent) => void;
  onWindowClose?: (event: SmartCodeEditorWindowCloseEvent) => void;
  /** Catch-all — called after the typed handler for every emission. */
  onEvent?: (event: SmartCodeEditorWindowEvent) => void;
}

// ─── Group creation / disposal ───────────────────────────────────────────────

export function createSmartCodeEditorCallbackGroup(
  handlers: SmartCodeEditorWindowHandlers,
): { callbackGroupId: string; dispose: () => void } {
  const callbackGroupId = callbackManager.createGroup();

  const fanOut = (event: SmartCodeEditorWindowEvent) => {
    switch (event.type) {
      case "ready":
        handlers.onReady?.(event);
        break;
      case "launched":
        handlers.onLaunched?.(event);
        break;
      case "code-change":
        handlers.onCodeChange?.(event);
        break;
      case "agent-complete":
        handlers.onAgentComplete?.(event);
        break;
      case "agent-error":
        handlers.onAgentError?.(event);
        break;
      case "window-close":
        handlers.onWindowClose?.(event);
        break;
    }
    handlers.onEvent?.(event);
  };

  callbackManager.registerWithContext<SmartCodeEditorWindowEvent>(
    (event) => fanOut(event),
    { groupId: callbackGroupId },
  );

  return {
    callbackGroupId,
    dispose: () => callbackManager.removeGroup(callbackGroupId),
  };
}

/**
 * Emit an event to a callback group. Safe to call with `undefined` groupId —
 * the window can run fine without a listener (no callers, no events).
 */
export function emitSmartCodeEditorEvent(
  callbackGroupId: string | undefined | null,
  event: SmartCodeEditorWindowEvent,
): void {
  if (!callbackGroupId) return;
  callbackManager.triggerGroup<SmartCodeEditorWindowEvent>(
    callbackGroupId,
    event,
    { removeAfterTrigger: false },
  );
}
