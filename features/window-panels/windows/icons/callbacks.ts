/**
 * CuratedIconPickerWindow callbacks.
 *
 * The window talks back to the page that opened it via the global
 * `callbackManager`. Contract mirrors `ImageUploaderWindow`:
 *
 *   1. Caller creates a callback GROUP via `createCuratedIconPickerCallbackGroup`
 *      and registers any subset of lifecycle handlers (onPicked, onClose, …).
 *   2. The returned `callbackGroupId` is passed through `openOverlay` data.
 *   3. The window subscribes to that group and emits typed events when the
 *      user picks an icon or closes the window.
 *   4. Caller `dispose()`s the group when it no longer needs events.
 *
 * No selection state is stored in Redux — Redux only tracks "is open" + the
 * initial payload. The callback group is the live channel back to the caller.
 */

import { callbackManager } from "@/utils/callbackManager";

// ─── Event surface ───────────────────────────────────────────────────────────

export type CuratedIconPickerEventType = "picked" | "window-close";

export interface CuratedIconPickerEventBase {
    type: CuratedIconPickerEventType;
    instanceId: string;
}

export interface CuratedIconPickerPickedEvent
    extends CuratedIconPickerEventBase {
    type: "picked";
    iconId: string;
}

export interface CuratedIconPickerCloseEvent
    extends CuratedIconPickerEventBase {
    type: "window-close";
    /** The last icon picked in this session, if any. */
    lastPicked: string | null;
}

export type CuratedIconPickerEvent =
    | CuratedIconPickerPickedEvent
    | CuratedIconPickerCloseEvent;

// ─── Caller-facing handler surface ───────────────────────────────────────────

export interface CuratedIconPickerHandlers {
    /** Called every time the user picks an icon. The window stays open. */
    onPicked?: (e: CuratedIconPickerPickedEvent) => void;
    /** Called when the window closes (by the user, close API, or anything else). */
    onWindowClose?: (e: CuratedIconPickerCloseEvent) => void;
    /** Catch-all for any emitted event. */
    onEvent?: (e: CuratedIconPickerEvent) => void;
}

// ─── Window-side data payload ────────────────────────────────────────────────

export interface CuratedIconPickerWindowData {
    callbackGroupId?: string | null;
}

// ─── Group creation / disposal ───────────────────────────────────────────────

export function createCuratedIconPickerCallbackGroup(
    handlers: CuratedIconPickerHandlers,
): { callbackGroupId: string; dispose: () => void } {
    const callbackGroupId = callbackManager.createGroup();

    const fanOut = (event: CuratedIconPickerEvent) => {
        switch (event.type) {
            case "picked":
                handlers.onPicked?.(event);
                break;
            case "window-close":
                handlers.onWindowClose?.(event);
                break;
        }
        handlers.onEvent?.(event);
    };

    callbackManager.registerWithContext<CuratedIconPickerEvent>(
        (event) => fanOut(event),
        { groupId: callbackGroupId },
    );

    return {
        callbackGroupId,
        dispose: () => callbackManager.removeGroup(callbackGroupId),
    };
}

export function emitCuratedIconPickerEvent(
    callbackGroupId: string | undefined | null,
    event: CuratedIconPickerEvent,
): void {
    if (!callbackGroupId) return;
    callbackManager.triggerGroup<CuratedIconPickerEvent>(
        callbackGroupId,
        event,
        { removeAfterTrigger: false },
    );
}
