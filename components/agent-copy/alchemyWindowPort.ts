/**
 * The web app's `WindowPort` (Preparation parity PP-01a): a preparation session is drawn in a real
 * window — non-blocking, movable, resizable, minimizable, several at once — as the multi-instance
 * summon overlay `alchemyPrepareWindow`. The render function is a live closure (never overlay
 * `Json`), so it rides as a summon handle owned by its overlay instance: the open data carries only
 * the handle id, closing the window (any way) disposes the handle, and disposal tells the opener.
 * The overlay is ephemeral: a live session cannot survive a reload, so its window is never restored.
 *
 * Boot-safe: `AlchemyHost` is in the root provider graph, so this file reaches summon only through
 * `./boot` and `./boot-kit`; `WindowPanel` loads with the overlay's render module on the first open.
 */

import type { WindowHandle, WindowOpenOptions, WindowPort } from "@ai-matrx/alchemy/ports";
import { focusWindow, mintInstanceId } from "@ai-matrx/summon/boot";
import { peekHandle, registerHandleEntry } from "@ai-matrx/summon/boot-kit";
import { alchemyPrepareWindowOpener } from "@/features/overlays/definitions/alchemyPrepareWindow.overlay";

const OVERLAY_ID = "alchemyPrepareWindow";

/** What one window draws now; replaced when the package re-opens the same instance id. */
export interface AlchemyWindowView {
  title: string;
  size: WindowOpenOptions["size"];
  render: (window: WindowHandle) => unknown;
}

/** The handle a window's open data points at (by id). */
export interface AlchemyWindowSession {
  readonly handle: WindowHandle;
  view(): AlchemyWindowView;
  subscribe(listener: () => void): () => void;
}

/** The window-manager id a session's panel registers under (focus is addressed by it). */
export const alchemyPanelId = (instanceId: string) => `alchemy-prepare-${instanceId}`;

const handleIdOf = (instanceId: string) => `${OVERLAY_ID}:${instanceId}:session`;

type Dispatch = (action: { type: string; payload?: unknown }) => unknown;

export function createAlchemyWindowPort(store: { dispatch: Dispatch }): WindowPort {
  const focus = (instanceId: string) => void store.dispatch(focusWindow(alchemyPanelId(instanceId)));

  return {
    presentation: "window",
    multiInstance: true,
    open(render, opts) {
      const requested = opts.instanceId;
      const existing = requested === undefined ? undefined : peekHandle<LiveSession>(handleIdOf(requested));
      if (existing) {
        existing.replace({ render, title: opts.title, size: opts.size }, opts.onClose);
        focus(existing.handle.instanceId);
        return existing.handle;
      }

      const instanceId = requested ?? mintInstanceId(OVERLAY_ID);
      const handleId = handleIdOf(instanceId);
      const session = createLiveSession(
        { render, title: opts.title, size: opts.size },
        opts.onClose,
        {
          instanceId,
          close: () => void store.dispatch(alchemyPrepareWindowOpener.opener.close(instanceId)),
          focus: () => {
            if (peekHandle(handleId) === session) focus(instanceId);
          },
          isOpen: () => peekHandle(handleId) === session,
        },
      );
      // Owned by the overlay instance: every close (the X, `close()`, the host) disposes it once,
      // and disposal is what tells the opener.
      registerHandleEntry(session, {
        id: handleId,
        owner: `${OVERLAY_ID}:${instanceId}`,
        onRemove: () => session.closed(),
      });
      alchemyPrepareWindowOpener.open(store.dispatch, { instanceId, handleId });
      return session.handle;
    },
  };
}

interface LiveSession extends AlchemyWindowSession {
  replace(view: AlchemyWindowView, onClose: (() => void) | undefined): void;
  closed(): void;
}

function createLiveSession(
  initial: AlchemyWindowView,
  initialOnClose: (() => void) | undefined,
  handle: WindowHandle,
): LiveSession {
  let view = initial;
  let onClose = initialOnClose;
  let done = false;
  const listeners = new Set<() => void>();
  return {
    handle,
    view: () => view,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    replace(next, nextOnClose) {
      view = next;
      onClose = nextOnClose;
      listeners.forEach((listener) => listener());
    },
    closed() {
      if (done) return;
      done = true;
      listeners.clear();
      onClose?.();
    },
  };
}
