/**
 * Content Editor window callbacks.
 *
 * These windows talk back to the page that opened them via the global
 * `callbackManager` (see `utils/callbackManager.ts`). The contract is:
 *
 *   1. The caller creates a callback GROUP via `createContentEditorCallbackGroup`
 *      and registers any subset of lifecycle handlers (onChange, onSave, etc.).
 *   2. The returned `callbackGroupId` is passed through `openOverlay` in the
 *      window's `data` payload.
 *   3. The window component subscribes to that group and emits typed events
 *      as the user edits, opens tabs, saves, or closes.
 *   4. The caller dispose()-s the group when it no longer needs events — the
 *      window continues working (DB-backed persistence) even if no caller is
 *      listening.
 *
 * We intentionally do NOT put editor content or methods into Redux. The window
 * owns its own state; Redux only tracks "is open" + initial/persistence data.
 * The callback group is the live channel back to the caller.
 */
import { callbackManager } from "@/utils/callbackManager";

// ─── Event surface ───────────────────────────────────────────────────────────

export type ContentEditorWindowEventType =
  | "ready"
  | "change"
  | "save"
  | "mode-change"
  | "active-change"
  | "open"
  | "close-tab"
  | "documents-change"
  | "window-close";

export interface ContentEditorWindowEventBase {
  type: ContentEditorWindowEventType;
  /** The overlay instanceId of the window emitting the event. */
  windowInstanceId: string;
}

export interface ContentEditorReadyEvent extends ContentEditorWindowEventBase {
  type: "ready";
}

export interface ContentEditorChangeEvent extends ContentEditorWindowEventBase {
  type: "change";
  documentId: string;
  value: string;
}

export interface ContentEditorSaveEvent extends ContentEditorWindowEventBase {
  type: "save";
  documentId: string;
  value: string;
}

export interface ContentEditorModeChangeEvent
  extends ContentEditorWindowEventBase {
  type: "mode-change";
  documentId: string | null;
  mode: string;
}

export interface ContentEditorActiveChangeEvent
  extends ContentEditorWindowEventBase {
  type: "active-change";
  documentId: string | null;
}

export interface ContentEditorOpenDocumentEvent
  extends ContentEditorWindowEventBase {
  type: "open";
  documentId: string;
}

export interface ContentEditorCloseTabEvent
  extends ContentEditorWindowEventBase {
  type: "close-tab";
  documentId: string;
}

export interface ContentEditorDocumentsChangeEvent
  extends ContentEditorWindowEventBase {
  type: "documents-change";
  documents: Array<{ id: string; title: string; value: string }>;
  openIds: string[];
}

export interface ContentEditorWindowCloseEvent
  extends ContentEditorWindowEventBase {
  type: "window-close";
}

export type ContentEditorWindowEvent =
  | ContentEditorReadyEvent
  | ContentEditorChangeEvent
  | ContentEditorSaveEvent
  | ContentEditorModeChangeEvent
  | ContentEditorActiveChangeEvent
  | ContentEditorOpenDocumentEvent
  | ContentEditorCloseTabEvent
  | ContentEditorDocumentsChangeEvent
  | ContentEditorWindowCloseEvent;

// ─── Handler shape ───────────────────────────────────────────────────────────

export interface ContentEditorWindowHandlers {
  onReady?: (event: ContentEditorReadyEvent) => void;
  onChange?: (event: ContentEditorChangeEvent) => void;
  onSave?: (event: ContentEditorSaveEvent) => void;
  onModeChange?: (event: ContentEditorModeChangeEvent) => void;
  onActiveChange?: (event: ContentEditorActiveChangeEvent) => void;
  onOpenDocument?: (event: ContentEditorOpenDocumentEvent) => void;
  onCloseTab?: (event: ContentEditorCloseTabEvent) => void;
  onDocumentsChange?: (event: ContentEditorDocumentsChangeEvent) => void;
  onWindowClose?: (event: ContentEditorWindowCloseEvent) => void;
  /** Catch-all hook, called for every event after the typed handler. */
  onEvent?: (event: ContentEditorWindowEvent) => void;
}

// ─── Group creation / disposal ───────────────────────────────────────────────

/**
 * Create a callback group for a content-editor window and register the given
 * handlers into it. Returns the groupId (pass this through `openOverlay` data
 * as `callbackGroupId`) plus a `dispose` fn.
 *
 * Under the hood we register a single callback in the group. `triggerGroup`
 * with `removeAfterTrigger: false` fans out every emission to it; the window
 * resolves handlers from the single entry.
 */
export function createContentEditorCallbackGroup(
  handlers: ContentEditorWindowHandlers,
): { callbackGroupId: string; dispose: () => void } {
  const callbackGroupId = callbackManager.createGroup();

  const fanOut = (event: ContentEditorWindowEvent) => {
    switch (event.type) {
      case "ready":
        handlers.onReady?.(event);
        break;
      case "change":
        handlers.onChange?.(event);
        break;
      case "save":
        handlers.onSave?.(event);
        break;
      case "mode-change":
        handlers.onModeChange?.(event);
        break;
      case "active-change":
        handlers.onActiveChange?.(event);
        break;
      case "open":
        handlers.onOpenDocument?.(event);
        break;
      case "close-tab":
        handlers.onCloseTab?.(event);
        break;
      case "documents-change":
        handlers.onDocumentsChange?.(event);
        break;
      case "window-close":
        handlers.onWindowClose?.(event);
        break;
    }
    handlers.onEvent?.(event);
  };

  callbackManager.registerWithContext<ContentEditorWindowEvent>(
    (event) => fanOut(event),
    { groupId: callbackGroupId },
  );

  return {
    callbackGroupId,
    dispose: () => callbackManager.removeGroup(callbackGroupId),
  };
}

/**
 * Emit an event to a callback group, if it is still registered. Safe to call
 * with `undefined` group id (no-op) so windows can be opened with no caller.
 */
export function emitContentEditorEvent(
  callbackGroupId: string | undefined | null,
  event: ContentEditorWindowEvent,
): void {
  if (!callbackGroupId) return;
  callbackManager.triggerGroup<ContentEditorWindowEvent>(
    callbackGroupId,
    event,
    { removeAfterTrigger: false },
  );
}
