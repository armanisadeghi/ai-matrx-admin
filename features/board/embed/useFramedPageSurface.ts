"use client";

/**
 * A Page tile's surface IS the framed page's surface (framed-surface-bridge.ts).
 *
 * Mounted by the Page body inside the tile's `SurfaceActivity`, so it registers
 * exactly where every native item's surface registers: into the tile's capture
 * always (what `board_items`, `board_open_item` and `board_item_act` read), and
 * globally while the tile is the live one (the surface chain and tool
 * injection). The registered runtime is a proxy: its scope, write handlers and
 * client tools reach into the frame through the bridge, under the framed
 * page's own surface name and manifest, so the agent gets the same values,
 * targets and tools as on that page.
 *
 * While the page is gone (asleep, unloaded, navigating, not booted yet) its
 * values read as NOT LOADED (`not_loaded_yet`), never a copy kept from before,
 * and its actions refuse with nothing changed. A page whose surface is not
 * known yet registers nothing until it says.
 */

import { useEffect, useState } from "react";
import {
  useSurfaceClientTools,
  useSurfaceRuntimeRegistration,
  type SurfaceClientToolHandlers,
  type SurfaceWriteHandlers,
} from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import { getAllManifests } from "@ai-matrx/chat/surfaces/runtime/registry";
import type { SurfaceScopePayload } from "@ai-matrx/chat/surfaces/types";
import { SURFACE_NOT_LOADED_KEY } from "../tools/item-surfaces";
import {
  connectFramedSurface,
  lastFramedSurface,
  pathMatchesPattern,
  rememberFramedSurface,
  type FramedSurfaceConnection,
} from "./framed-surface-bridge";

/** How long a read waits for a page that is still booting before it answers "not loaded". */
export const FRAME_CONNECT_WAIT_MS = 3000;

const NOT_LOADED: SurfaceScopePayload = { [SURFACE_NOT_LOADED_KEY]: true } as SurfaceScopePayload;

/** The surface a page path is expected to publish: what it last published here, else its manifest's `urlPattern`. */
export function expectedPageSurface(path: string): string | null {
  if (!path) return null;
  const known = lastFramedSurface(path);
  if (known) return known;
  const matches = getAllManifests().filter((m) => m.urlPattern && pathMatchesPattern(path, m.urlPattern));
  return matches.length === 1 ? matches[0].surfaceName : null;
}

/** The current connection, and a way to wait (bounded) for one. */
function createConnectionHolder() {
  let current: FramedSurfaceConnection | null = null;
  const waiters = new Set<() => void>();
  return {
    get: () => current,
    set(next: FramedSurfaceConnection | null) {
      current = next;
      if (next) for (const wake of [...waiters]) wake();
    },
    wait(timeoutMs: number): Promise<FramedSurfaceConnection | null> {
      if (current) return Promise.resolve(current);
      return new Promise((resolve) => {
        const wake = () => {
          clearTimeout(timer);
          waiters.delete(wake);
          resolve(current);
        };
        const timer = setTimeout(wake, timeoutMs);
        waiters.add(wake);
      });
    },
  };
}

function gone(what: string): Error {
  return new Error(`The page in this tile is not loaded right now, so ${what}. Bring the tile into view and try again.`);
}

/**
 * Follow `frame` (the Page tile's iframe, null while it is not rendered) and
 * register its page's surface as this tile's. `path` is the tile's address.
 */
export function useFramedPageSurface(frame: HTMLIFrameElement | null, path: string): void {
  const [holder] = useState(createConnectionHolder);
  const [connection, setConnection] = useState<FramedSurfaceConnection | null>(null);

  useEffect(() => {
    if (!frame) return;
    const disconnect = connectFramedSurface(frame, (next) => {
      holder.set(next);
      if (next?.snapshot) rememberFramedSurface(path, next.snapshot.surface);
      setConnection(next);
    });
    return () => {
      disconnect();
      holder.set(null);
      setConnection(null);
    };
  }, [frame, path, holder]);

  const snapshot = connection?.snapshot ?? null;
  // A page that has said nothing yet keeps the name it is expected to publish, so a read waits for it.
  const surfaceName = connection ? (snapshot?.surface ?? null) : expectedPageSurface(path);

  /** The bridge, only while the page still shows `surfaceName`. */
  const live = () => {
    const now = holder.get();
    return now && now.snapshot?.surface === surfaceName ? now.bridge : null;
  };

  const writeHandlers = (): SurfaceWriteHandlers => {
    if (!surfaceName || !snapshot) return {};
    const name = surfaceName;
    const out: SurfaceWriteHandlers = {};
    for (const target of snapshot.writeTargets) {
      const bridge = () => {
        const b = live();
        if (!b) throw gone("nothing was changed");
        return b;
      };
      out[target.name] = {
        validate: (value, context) => bridge().validateWrite(name, target.name, value, context),
        apply: (value, context) => bridge().applyWrite(name, target.name, value, context),
        cost: (value) => live()?.writeCost(name, target.name, value) ?? null,
        ...(target.readCurrent ? { readCurrent: (context) => bridge().readCurrent(name, target.name, context) } : {}),
      };
    }
    return out;
  };

  useSurfaceRuntimeRegistration(
    surfaceName
      ? {
          surfaceName,
          getScope: async () => {
            const now = await holder.wait(FRAME_CONNECT_WAIT_MS);
            if (!now || now.snapshot?.surface !== surfaceName) return NOT_LOADED;
            try {
              return (await now.bridge.readScope(surfaceName)) ?? NOT_LOADED;
            } catch (error) {
              console.error(`[board] the page tile's ${surfaceName} values could not be read`, error);
              return NOT_LOADED;
            }
          },
          getWriteHandlers: writeHandlers,
        }
      : null,
  );

  const tools: SurfaceClientToolHandlers = {};
  const costs: Record<string, (input: unknown) => Promise<string | null>> = {};
  for (const tool of surfaceName ? (snapshot?.clientTools ?? []) : []) {
    const name = surfaceName as string;
    tools[tool] = async (input, call) => {
      const bridge = live();
      if (!bridge) throw gone("nothing ran");
      return bridge.runTool(name, tool, input, call);
    };
    costs[tool] = async (input) => (await live()?.toolCost(name, tool, input)) ?? null;
  }
  useSurfaceClientTools(surfaceName, tools, { costs });
}
