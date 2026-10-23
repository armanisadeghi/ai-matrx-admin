/**
 * THE FRAMED-SURFACE BRIDGE — a Page tile's framed app page publishes its
 * surface to the board, and the board acts on it, exactly as on that page.
 *
 * A Page tile (items/page-items.tsx) runs an app page in a same-origin iframe
 * (`<html data-board-embed>`). That page registers its surface in ITS OWN
 * window's surface registry, which the board's agent never sees. This bridge
 * joins the two windows:
 *
 *   frame side — `installFramedSurfaceBridge(window, registry)` (mounted by
 *     `BoardEmbedSurfaceBridge` when the page is framed by a board) puts a
 *     `FramedSurfaceBridge` on the frame's window and posts READY to the
 *     parent. The bridge reads the frame's registry live: the active surface
 *     (its primary runtime), its scope, its write handlers and client tools.
 *   board side — `connectFramedSurface(iframe, onChange)` hears READY (and BYE
 *     when the page unloads), reads the bridge object DIRECTLY (same origin),
 *     and reports the framed surface; `FramedPageSurface` registers it as
 *     the tile's surface (into the tile's capture, and globally while the tile
 *     is live) — one registration in the ONE surface system, no second registry.
 *
 * Every window message is checked: the sender's origin must be this origin and
 * its window must be the expected one (the parent's iframe, or the frame's
 * parent). The bridge object itself is reached only through a same-origin
 * window reference, which a cross-origin frame refuses.
 *
 * Policy stays on the board: the board's canonical runtimes (`applySurfaceWrite`,
 * `executeSurfaceClientTool` with the tile's capture as `source`) run the value
 * checks, apply policy and approval card; the frame only validates and applies
 * through the page's own handlers. Values cross the windows as JSON copies, so
 * nothing from a gone page is ever read again.
 */

import type {
  SurfaceActionCostFigure,
  SurfaceRegistry,
  SurfaceToolCall,
  SurfaceWriteContext,
  SurfaceWriteHandler,
  SurfaceWriteHandlerEntry,
  SurfaceWriteOutcome,
} from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import type { SurfaceScopePayload } from "@ai-matrx/chat/surfaces/types";

/** Where the frame keeps its bridge on its window. */
export const FRAMED_SURFACE_BRIDGE_KEY = "__matrxFramedSurfaceBridge";
/** frame → board: the bridge is on my window. */
export const FRAMED_SURFACE_READY = "matrx-board-embed:surface-ready";
/** frame → board: this page is unloading; its bridge is gone. */
export const FRAMED_SURFACE_BYE = "matrx-board-embed:surface-bye";
/** board → frame: announce your bridge if you have one. */
export const FRAMED_SURFACE_HELLO = "matrx-board-embed:surface-hello";
export const FRAMED_SURFACE_BRIDGE_VERSION = 1;

/** What the framed page has, right now. */
export interface FramedSurfaceSnapshot {
  /** The page's active surface (its registry's primary runtime). */
  surface: string;
  /** Every write handler the page registered for it. */
  writeTargets: Array<{ name: string; readCurrent: boolean }>;
  /** Every client-tool handler the page registered for it. */
  clientTools: string[];
}

export interface FramedSurfaceBridge {
  readonly version: number;
  snapshot: () => FramedSurfaceSnapshot | null;
  /** Called on every registration change in the frame (a navigation, a dialog, a handler). */
  subscribe: (listener: () => void) => () => void;
  /** The surface's scope, read live; null when that surface is no longer mounted. */
  readScope: (surface: string) => Promise<SurfaceScopePayload | null>;
  runTool: (surface: string, name: string, input: unknown, call?: SurfaceToolCall) => Promise<unknown>;
  toolCost: (surface: string, name: string, input: unknown) => Promise<SurfaceActionCostFigure | null>;
  validateWrite: (surface: string, name: string, value: unknown, context?: SurfaceWriteContext) => Promise<void>;
  applyWrite: (
    surface: string,
    name: string,
    value: unknown,
    context?: SurfaceWriteContext,
  ) => Promise<void | SurfaceWriteOutcome>;
  readCurrent: (surface: string, name: string, context?: SurfaceWriteContext) => Promise<string | null>;
  writeCost: (surface: string, name: string, value: unknown) => Promise<SurfaceActionCostFigure | null>;
}

interface BridgeMessage {
  type?: unknown;
}

function messageType(data: unknown): string | null {
  return data && typeof data === "object" && typeof (data as BridgeMessage).type === "string"
    ? ((data as BridgeMessage).type as string)
    : null;
}

/** A JSON copy made in THIS window's realm (undefined stays undefined). */
function copy<T>(value: T): T {
  return value === undefined ? value : (JSON.parse(JSON.stringify(value)) as T);
}

function entryOf(handler: SurfaceWriteHandler | undefined): SurfaceWriteHandlerEntry | null {
  if (!handler) return null;
  return typeof handler === "function" ? { apply: handler } : handler;
}

// ── frame side ──────────────────────────────────────────────────────────────

/** The bridge over one window's surface registry. */
export function createFramedSurfaceBridge(registry: SurfaceRegistry): FramedSurfaceBridge {
  const runtimeFor = (surface: string) => registry.stack().find((r) => r.surfaceName === surface) ?? null;
  // The same precedence as the writeback seam: a registered handler wins over the provider's.
  const writeHandlers = (surface: string) => ({
    ...(runtimeFor(surface)?.getWriteHandlers?.() ?? {}),
    ...registry.writeHandlers(surface),
  });
  const writeEntry = (surface: string, name: string) => {
    const entry = entryOf(writeHandlers(surface)[name]);
    if (!entry) throw new Error(`The page no longer handles "${name}" on ${surface}. Nothing was changed.`);
    return entry;
  };
  const tool = (surface: string, name: string) => {
    const handler = registry.clientTools(surface)[name];
    if (!handler) throw new Error(`The page no longer offers the tool "${name}" on ${surface}. Nothing ran.`);
    return handler;
  };
  return {
    version: FRAMED_SURFACE_BRIDGE_VERSION,
    snapshot() {
      const primary = registry.primary();
      if (!primary) return null;
      const surface = primary.surfaceName;
      const handlers = writeHandlers(surface);
      return {
        surface,
        writeTargets: Object.keys(handlers).map((name) => ({ name, readCurrent: !!entryOf(handlers[name])?.readCurrent })),
        clientTools: Object.keys(registry.clientTools(surface)),
      };
    },
    subscribe: (listener) => registry.subscribe(listener),
    async readScope(surface) {
      const runtime = runtimeFor(surface);
      return runtime ? copy(await runtime.getScope()) : null;
    },
    async runTool(surface, name, input, call) {
      return copy(await tool(surface, name)(copy(input), call));
    },
    async toolCost(surface, name, input) {
      const handler = registry.clientTools(surface)[name];
      return handler?.cost ? copy(await handler.cost(copy(input))) : null;
    },
    async validateWrite(surface, name, value, context) {
      await writeEntry(surface, name).validate?.(copy(value), copy(context));
    },
    async applyWrite(surface, name, value, context) {
      return copy(await writeEntry(surface, name).apply(copy(value), copy(context)));
    },
    async readCurrent(surface, name, context) {
      const read = writeEntry(surface, name).readCurrent;
      return read ? await read(copy(context)) : null;
    },
    async writeCost(surface, name, value) {
      const cost = entryOf(writeHandlers(surface)[name])?.cost;
      return cost ? copy(await cost(copy(value))) : null;
    },
  };
}

/**
 * Put the bridge on a framed page's window and tell the board (its parent,
 * same origin only). Answers the board's HELLO, says BYE when the page unloads.
 * Returns the uninstall.
 */
export function installFramedSurfaceBridge(win: Window, registry: SurfaceRegistry): () => void {
  const parent = win.parent;
  if (!parent || parent === win) return () => {};
  const origin = win.location.origin;
  const bridge = createFramedSurfaceBridge(registry);
  (win as unknown as Record<string, unknown>)[FRAMED_SURFACE_BRIDGE_KEY] = bridge;
  const announce = (type: string) => {
    try {
      parent.postMessage({ type }, origin);
    } catch {
      // A parent on another origin: it never hears from this page.
    }
  };
  const onMessage = (event: MessageEvent) => {
    if (event.origin !== origin || event.source !== parent) return;
    if (messageType(event.data) === FRAMED_SURFACE_HELLO) announce(FRAMED_SURFACE_READY);
  };
  const onPageHide = () => announce(FRAMED_SURFACE_BYE);
  win.addEventListener("message", onMessage);
  win.addEventListener("pagehide", onPageHide);
  announce(FRAMED_SURFACE_READY);
  return () => {
    win.removeEventListener("message", onMessage);
    win.removeEventListener("pagehide", onPageHide);
    const slot = win as unknown as Record<string, unknown>;
    if (slot[FRAMED_SURFACE_BRIDGE_KEY] === bridge) delete slot[FRAMED_SURFACE_BRIDGE_KEY];
    announce(FRAMED_SURFACE_BYE);
  };
}

// ── board side ──────────────────────────────────────────────────────────────

export interface FramedSurfaceConnection {
  bridge: FramedSurfaceBridge;
  /** What the page has now (a copy); null while the page has no surface. */
  snapshot: FramedSurfaceSnapshot | null;
}

function isBridge(value: unknown): value is FramedSurfaceBridge {
  return (
    !!value &&
    typeof value === "object" &&
    (value as FramedSurfaceBridge).version === FRAMED_SURFACE_BRIDGE_VERSION &&
    typeof (value as FramedSurfaceBridge).snapshot === "function" &&
    typeof (value as FramedSurfaceBridge).subscribe === "function"
  );
}

/** The frame's bridge, only when the frame is on this origin right now. */
function bridgeIn(frame: HTMLIFrameElement, origin: string): FramedSurfaceBridge | null {
  try {
    const win = frame.contentWindow;
    if (!win || win.location.origin !== origin) return null;
    const found = (win as unknown as Record<string, unknown>)[FRAMED_SURFACE_BRIDGE_KEY];
    return isBridge(found) ? found : null;
  } catch {
    // Cross-origin: reading the frame's window throws.
    return null;
  }
}

/**
 * Follow `frame`'s page surface. `onChange` gets the connection whenever the
 * page's surface changes, and null when the page goes (unloads, navigates,
 * leaves the origin). Returns the disconnect.
 */
export function connectFramedSurface(
  frame: HTMLIFrameElement,
  onChange: (connection: FramedSurfaceConnection | null) => void,
): () => void {
  const here = frame.ownerDocument.defaultView;
  if (!here) return () => {};
  const origin = here.location.origin;
  let bridge: FramedSurfaceBridge | null = null;
  let unsubscribe: (() => void) | null = null;
  let lastKey: string | null = null;

  const release = () => {
    try {
      unsubscribe?.();
    } catch {
      // The page's window is gone; so is its listener.
    }
    unsubscribe = null;
    bridge = null;
  };
  const drop = () => {
    const had = bridge !== null;
    release();
    lastKey = null;
    if (had) onChange(null);
  };
  const publish = () => {
    if (!bridge) return;
    let snapshot: FramedSurfaceSnapshot | null;
    try {
      snapshot = copy(bridge.snapshot());
    } catch {
      drop();
      return;
    }
    const key = JSON.stringify(snapshot);
    if (key === lastKey) return;
    lastKey = key;
    onChange({ bridge, snapshot });
  };
  const attach = () => {
    const found = bridgeIn(frame, origin);
    if (!found) {
      drop();
      return;
    }
    if (found !== bridge) {
      release();
      lastKey = null;
      bridge = found;
      unsubscribe = found.subscribe(publish);
    }
    publish();
  };
  const onMessage = (event: MessageEvent) => {
    if (event.origin !== origin) return;
    const win = frame.contentWindow;
    if (!win || event.source !== win) return;
    const type = messageType(event.data);
    if (type === FRAMED_SURFACE_READY) attach();
    else if (type === FRAMED_SURFACE_BYE) drop();
  };
  const hello = () => {
    try {
      frame.contentWindow?.postMessage({ type: FRAMED_SURFACE_HELLO }, origin);
    } catch {
      // Not on this origin: it cannot answer.
    }
  };
  const onLoad = () => {
    // A new document: the old page's bridge is gone; the new one announces itself.
    if (bridge && bridgeIn(frame, origin) !== bridge) drop();
    hello();
  };
  here.addEventListener("message", onMessage);
  frame.addEventListener("load", onLoad);
  // A page already running (a tile woken, the board remounted) has its bridge now.
  if (bridgeIn(frame, origin)) attach();
  else hello();
  return () => {
    here.removeEventListener("message", onMessage);
    frame.removeEventListener("load", onLoad);
    drop();
  };
}

// ── which surface a page shows ──────────────────────────────────────────────

/** The surface each framed page path last published in this tab (a woken tile names it before its page loads). */
const lastPublished = new Map<string, string>();

export function rememberFramedSurface(path: string, surface: string): void {
  lastPublished.set(path, surface);
}

export function lastFramedSurface(path: string): string | null {
  return lastPublished.get(path) ?? null;
}

/** True when `path` matches a manifest `urlPattern` (`/notes/[id]`, `/scribe/:id`, `/notes`). */
export function pathMatchesPattern(path: string, pattern: string): boolean {
  const clean = (p: string) => p.split(/[?#]/)[0].replace(/\/+$/, "").split("/").filter(Boolean);
  const want = clean(pattern);
  const have = clean(path);
  if (want.length !== have.length) return false;
  return want.every((part, i) => /^\[.+\]$|^:.+$/.test(part) || part === have[i]);
}
