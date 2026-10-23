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
 * Registered only while the page is connected. While it is gone (asleep,
 * unloaded, navigating, still booting) the tile has no live surface:
 * `board_open_item` waits for the page to come back and otherwise says it did
 * not mount, and `board_items` lists the tile with its dated last-known
 * basics. Nothing the page said before is ever answered as current.
 */

import { createElement, useEffect, useState } from "react";
import {
  useSurfaceClientTools,
  useSurfaceRuntimeRegistration,
  type SurfaceActionCost,
  type SurfaceClientToolHandlers,
  type SurfaceWriteHandlerEntry,
  type SurfaceWriteHandlers,
} from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import { getAllManifests } from "@ai-matrx/chat/surfaces/runtime/registry";
import {
  connectFramedSurface,
  lastFramedSurface,
  pathMatchesPattern,
  rememberFramedSurface,
  type FramedSurfaceBridge,
  type FramedSurfaceConnection,
} from "./framed-surface-bridge";

/** The surface a page path is expected to publish: what it last published here, else its manifest's `urlPattern`. */
export function expectedPageSurface(path: string): string | null {
  if (!path) return null;
  const known = lastFramedSurface(path);
  if (known) return known;
  const matches = getAllManifests().filter((m) => m.urlPattern && pathMatchesPattern(path, m.urlPattern));
  return matches.length === 1 ? matches[0].surfaceName : null;
}

function gone(what: string): Error {
  return new Error(`The page in this tile is not loaded right now, so ${what}. Bring the tile into view and try again.`);
}

/**
 * Follow `frame` (the Page tile's iframe, null while it is not rendered) and
 * register its page's surface as this tile's. `path` is the tile's address.
 */
export function FramedPageSurface({ frame, path }: { frame: HTMLIFrameElement | null; path: string }) {
  const [connection, setConnection] = useState<FramedSurfaceConnection | null>(null);
  // The connection as of now, for a handler called between renders (a page that just left).
  const [current] = useState(() => ({ value: null as FramedSurfaceConnection | null }));

  useEffect(() => {
    if (!frame) return;
    const disconnect = connectFramedSurface(frame, (next) => {
      current.value = next;
      if (next?.snapshot) rememberFramedSurface(path, next.snapshot.surface);
      setConnection(next);
    });
    return () => {
      disconnect();
      current.value = null;
      setConnection(null);
    };
  }, [frame, path, current]);

  const snapshot = connection?.snapshot ?? null;
  const surfaceName = snapshot?.surface ?? null;

  /** The bridge, only while the page still shows `surfaceName`. */
  const live = (): FramedSurfaceBridge | null => {
    const now = current.value;
    return now && now.snapshot?.surface === surfaceName ? now.bridge : null;
  };
  const bridge = (what: string): FramedSurfaceBridge => {
    const b = live();
    if (!b) throw gone(what);
    return b;
  };

  const writeHandlers = (): SurfaceWriteHandlers => {
    if (!surfaceName || !snapshot) return {};
    const name = surfaceName;
    const out: SurfaceWriteHandlers = {};
    for (const target of snapshot.writeTargets) {
      const entry: SurfaceWriteHandlerEntry = {
        validate: (value, context) => bridge("nothing was changed").validateWrite(name, target.name, value, context),
        apply: (value, context) => bridge("nothing was changed").applyWrite(name, target.name, value, context),
        cost: async (value) => (await live()?.writeCost(name, target.name, value)) ?? null,
      };
      if (target.readCurrent) {
        entry.readCurrent = (context) => bridge("nothing was read").readCurrent(name, target.name, context);
      }
      out[target.name] = entry;
    }
    return out;
  };

  useSurfaceRuntimeRegistration(
    surfaceName
      ? {
          surfaceName,
          // Read live from the page every time; a page that left between renders answers nothing.
          getScope: async () => (await live()?.readScope(surfaceName)) ?? {},
          getWriteHandlers: writeHandlers,
        }
      : null,
  );

  const tools = surfaceName ? (snapshot?.clientTools ?? []) : [];
  // Keyed by the tool set: a handler set is read when it registers, so a new set mounts fresh.
  return createElement(FramedPageTools, { key: `${surfaceName ?? ""}|${tools.join("|")}`, surfaceName, tools, live });
}

function FramedPageTools({
  surfaceName,
  tools,
  live,
}: {
  surfaceName: string | null;
  tools: readonly string[];
  live: () => FramedSurfaceBridge | null;
}) {
  const handlers: SurfaceClientToolHandlers = {};
  const costs: Record<string, SurfaceActionCost> = {};
  for (const tool of tools) {
    const name = surfaceName as string;
    handlers[tool] = async (input, call) => {
      const bridge = live();
      if (!bridge) throw gone("nothing ran");
      return bridge.runTool(name, tool, input, call);
    };
    costs[tool] = async (input) => (await live()?.toolCost(name, tool, input)) ?? null;
  }
  useSurfaceClientTools(tools.length > 0 ? surfaceName : null, handlers, { costs });
  return null;
}
