/**
 * Multi-file Smart Code Editor window callbacks.
 *
 * Same contract as `smart-code-editor/callbacks.ts`, but events are
 * file-aware — the agent and user can switch the active file at any
 * time, and downstream listeners must know which file each change
 * applies to.
 *
 * Pattern:
 *
 *   1. Caller creates a callback GROUP via
 *      `createMultiFileSmartCodeEditorCallbackGroup` and registers
 *      any subset of lifecycle handlers (onFileChange, onActiveFileChange…).
 *   2. The returned `callbackGroupId` is passed through `openOverlay` in
 *      the window's `data` payload.
 *   3. The window subscribes to that group and emits typed events as
 *      the agent mutates files or the user interacts with the editor.
 *   4. Caller `dispose()`-s the group when it no longer needs events.
 *
 * Handlers — and any live closures they reference — are NEVER stored
 * in Redux. The callback group is the live channel back to the caller.
 */

import { callbackManager } from "@/utils/callbackManager";

// ─── Event surface ───────────────────────────────────────────────────────────

export type MultiFileSmartCodeEditorWindowEventType =
  | "ready"
  | "launched"
  | "active-file-change"
  | "file-change"
  | "file-open"
  | "file-close"
  | "agent-complete"
  | "agent-error"
  | "window-close";

export interface MultiFileSmartCodeEditorWindowEventBase {
  type: MultiFileSmartCodeEditorWindowEventType;
  /** The overlay instanceId of the window emitting the event. */
  windowInstanceId: string;
}

export interface MultiFileReadyEvent extends MultiFileSmartCodeEditorWindowEventBase {
  type: "ready";
}

export interface MultiFileLaunchedEvent extends MultiFileSmartCodeEditorWindowEventBase {
  type: "launched";
  conversationId: string;
}

export interface MultiFileActiveFileChangeEvent extends MultiFileSmartCodeEditorWindowEventBase {
  type: "active-file-change";
  /** File path of the newly active file, or null when no file is active. */
  path: string | null;
}

export interface MultiFileFileChangeEvent extends MultiFileSmartCodeEditorWindowEventBase {
  type: "file-change";
  path: string;
  language: string;
  content: string;
  /** True when the change came from an agent widget call; false for user edits. */
  fromAgent: boolean;
}

export interface MultiFileFileOpenEvent extends MultiFileSmartCodeEditorWindowEventBase {
  type: "file-open";
  path: string;
}

export interface MultiFileFileCloseEvent extends MultiFileSmartCodeEditorWindowEventBase {
  type: "file-close";
  path: string;
}

export interface MultiFileAgentCompleteEvent extends MultiFileSmartCodeEditorWindowEventBase {
  type: "agent-complete";
  conversationId: string;
  /** Path of the file that was active when the agent run completed. */
  activePath: string | null;
}

export interface MultiFileAgentErrorEvent extends MultiFileSmartCodeEditorWindowEventBase {
  type: "agent-error";
  message: string;
}

export interface MultiFileWindowCloseEvent extends MultiFileSmartCodeEditorWindowEventBase {
  type: "window-close";
  /** Snapshot of every file's final content when the window unmounted. */
  finalFiles: Array<{ path: string; language: string; content: string }>;
}

export type MultiFileSmartCodeEditorWindowEvent =
  | MultiFileReadyEvent
  | MultiFileLaunchedEvent
  | MultiFileActiveFileChangeEvent
  | MultiFileFileChangeEvent
  | MultiFileFileOpenEvent
  | MultiFileFileCloseEvent
  | MultiFileAgentCompleteEvent
  | MultiFileAgentErrorEvent
  | MultiFileWindowCloseEvent;

// ─── Handler shape ───────────────────────────────────────────────────────────

export interface MultiFileSmartCodeEditorWindowHandlers {
  onReady?: (event: MultiFileReadyEvent) => void;
  onLaunched?: (event: MultiFileLaunchedEvent) => void;
  onActiveFileChange?: (event: MultiFileActiveFileChangeEvent) => void;
  onFileChange?: (event: MultiFileFileChangeEvent) => void;
  onFileOpen?: (event: MultiFileFileOpenEvent) => void;
  onFileClose?: (event: MultiFileFileCloseEvent) => void;
  onAgentComplete?: (event: MultiFileAgentCompleteEvent) => void;
  onAgentError?: (event: MultiFileAgentErrorEvent) => void;
  onWindowClose?: (event: MultiFileWindowCloseEvent) => void;
  /** Catch-all — called after the typed handler for every emission. */
  onEvent?: (event: MultiFileSmartCodeEditorWindowEvent) => void;
}

// ─── Group creation / disposal ───────────────────────────────────────────────

export function createMultiFileSmartCodeEditorCallbackGroup(
  handlers: MultiFileSmartCodeEditorWindowHandlers,
): { callbackGroupId: string; dispose: () => void } {
  const callbackGroupId = callbackManager.createGroup();

  const fanOut = (event: MultiFileSmartCodeEditorWindowEvent) => {
    switch (event.type) {
      case "ready":
        handlers.onReady?.(event);
        break;
      case "launched":
        handlers.onLaunched?.(event);
        break;
      case "active-file-change":
        handlers.onActiveFileChange?.(event);
        break;
      case "file-change":
        handlers.onFileChange?.(event);
        break;
      case "file-open":
        handlers.onFileOpen?.(event);
        break;
      case "file-close":
        handlers.onFileClose?.(event);
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

  callbackManager.registerWithContext<MultiFileSmartCodeEditorWindowEvent>(
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
export function emitMultiFileSmartCodeEditorEvent(
  callbackGroupId: string | undefined | null,
  event: MultiFileSmartCodeEditorWindowEvent,
): void {
  if (!callbackGroupId) return;
  callbackManager.triggerGroup<MultiFileSmartCodeEditorWindowEvent>(
    callbackGroupId,
    event,
    { removeAfterTrigger: false },
  );
}
