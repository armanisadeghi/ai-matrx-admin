/**
 * A Page tile carries its framed page's FULL surface (embed/framed-surface-bridge.ts).
 *
 * SUT: the real Page item `Body` (items/page-items.tsx) inside a dormant
 * `SurfaceActivity` with the tile's capture, exactly as the board mounts a
 * tile, and the real frame side (`installFramedSurfaceBridge`) over the framed
 * page's own surface registry. The agent path is the board's own:
 * `openItemSurface` / `actOnItem` (board_open_item / board_item_act).
 *
 * jsdom's `postMessage` delivers no origin and no source, so each window's is
 * replaced by what a browser does: the event carries the sender's origin and
 * window.
 *
 * Breaks it catches: a Page tile whose surface is `none` again (the agent sees
 * a title only); a tool that runs on the board instead of in the page; a
 * message from another origin or another window that connects the bridge; a
 * page that unloaded still answering with the values it had; a tool set that
 * changes and is never registered.
 */
const FRAMED = "matrx-user/test-framed-notes";
const OTHER = "matrx-user/test-framed-other";

jest.mock("@/features/surfaces/manifests/registry", () => {
  const notes = {
    surfaceName: "matrx-user/test-framed-notes",
    label: "Framed notes",
    description: "Notes, as the notes page shows them.",
    urlPattern: "/notes",
    briefValues: ["note_title"],
    values: [
      { name: "note_title", label: "Title", description: "The open note's title.", valueType: "string" },
      { name: "note_body", label: "Body", description: "The open note's text.", valueType: "string" },
    ],
    writeTargets: [
      {
        name: "framed_note_title_set",
        label: "Note title",
        description: "Rename the open note.",
        valueType: "string",
        mode: "ui",
        applyPolicy: "auto",
        updatesValue: "note_title",
      },
    ],
    clientTools: [
      {
        name: "framed_note_count_words",
        label: "Count words",
        description: "Counts the open note's words.",
        inputSchema: { type: "object", properties: {}, required: [] },
      },
    ],
  };
  const other = {
    surfaceName: "matrx-user/test-framed-other",
    label: "Other page",
    description: "Another page.",
    values: [{ name: "other_name", label: "Name", description: "Its name.", valueType: "string" }],
  };
  const all = [notes, other];
  return {
    getManifest: (name: string) => all.find((m) => m.surfaceName === name),
    getAllManifests: () => all,
    getRawManifest: (name: string) => all.find((m) => m.surfaceName === name),
    getSurfaceAncestry: () => [] as string[],
    getSurfaceChildren: () => [] as string[],
  };
});
jest.mock("@/lib/toast", () => ({ toast: Object.assign(jest.fn(), { error: jest.fn(), success: jest.fn() }) }));

import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  SurfaceActivity,
  SurfaceRuntimeProvider,
  createSurfaceCapture,
  useSurfaceClientTools,
  useSurfaceWriteHandlers,
  type SurfaceRegistry,
} from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import { configureChat, _resetChatHostForTests } from "@ai-matrx/chat/host";
import { PAGE_ITEMS, pageSource } from "../items/page-items";
import { actOnItem, openItemSurface } from "../tools/item-surfaces";
import {
  FRAMED_SURFACE_BRIDGE_KEY,
  FRAMED_SURFACE_BYE,
  FRAMED_SURFACE_HELLO,
  FRAMED_SURFACE_READY,
  createFramedSurfaceBridge,
  installFramedSurfaceBridge,
} from "../embed/framed-surface-bridge";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const PAGE = PAGE_ITEMS.find((t) => t.key === "page")!;

/** What the framed page holds, and what ran inside it. */
const page = { title: "Launch plan", body: "Ship the board bridge on Tuesday", ranInFrame: [] as string[] };

function FramedNotesPage() {
  useSurfaceWriteHandlers(FRAMED, {
    framed_note_title_set: (value) => {
      page.ranInFrame.push(`write:${String(value)}`);
      page.title = String(value);
      return { summary: `Renamed to ${String(value)}.` };
    },
  });
  useSurfaceClientTools(FRAMED, {
    framed_note_count_words: () => {
      page.ranInFrame.push("tool:count");
      return { words: page.body.split(/\s+/).filter(Boolean).length };
    },
  });
  return (
    <SurfaceRuntimeProvider surfaceName={FRAMED} getScope={() => ({ note_title: page.title, note_body: page.body })}>
      <span />
    </SurfaceRuntimeProvider>
  );
}

function FramedOtherPage() {
  return (
    <SurfaceRuntimeProvider surfaceName={OTHER} getScope={() => ({ other_name: "Elsewhere" })}>
      <span />
    </SurfaceRuntimeProvider>
  );
}

/** A browser's postMessage: delivered later, carrying the sender's origin and window. */
function browserPostMessage(target: Window, sender: Window) {
  target.postMessage = ((data: unknown, targetOrigin: string) => {
    if (targetOrigin !== "*" && targetOrigin !== target.location.origin) return;
    setTimeout(() => deliver(target, data, sender.location.origin, sender));
  }) as Window["postMessage"];
}

function deliver(target: Window, data: unknown, origin: string, source: Window) {
  const Ctor = (target as unknown as { MessageEvent: typeof MessageEvent }).MessageEvent;
  target.dispatchEvent(new Ctor("message", { data, origin, source }));
}

async function flush(ms = 60) {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
}

beforeAll(() =>
  configureChat({
    db: { auth: {}, rpc: () => undefined, from: () => undefined } as never,
    org: { active: () => null, subscribe: () => () => undefined, require: async () => null },
  } as never),
);
afterAll(() => _resetChatHostForTests());

describe("a Page tile's surface is its framed page's surface", () => {
  let boardRoot: Root;
  let frameRoot: Root;
  let tile: SurfaceRegistry;
  let frameRegistry: SurfaceRegistry;
  let frame: HTMLIFrameElement;
  let frameWin: Window;
  let showPage: (which: "notes" | "other") => void;

  function FramePage() {
    const [which, setWhich] = useState<"notes" | "other">("notes");
    showPage = setWhich;
    return which === "notes" ? <FramedNotesPage /> : <FramedOtherPage />;
  }

  beforeEach(async () => {
    page.title = "Launch plan";
    page.ranInFrame = [];
    tile = createSurfaceCapture();
    frameRegistry = createSurfaceCapture();
    const host = document.createElement("div");
    document.body.appendChild(host);
    boardRoot = createRoot(host);
    await act(async () =>
      boardRoot.render(
        <SurfaceActivity active={false} capture={tile}>
          <PAGE.Body tileId="t-page" source={pageSource("/notes")} title="Notes" tier="read" interacting={false} onSource={() => undefined} />
        </SurfaceActivity>,
      ),
    );
    frame = host.querySelector("iframe")!;
    frameWin = frame.contentWindow!;
    browserPostMessage(window, frameWin);
    browserPostMessage(frameWin, window);
    // The framed page's own window registry (its global registry in a browser): the page renders into it.
    frameRoot = createRoot(frameWin.document.createElement("div"));
    await act(async () =>
      frameRoot.render(
        <SurfaceActivity active={false} capture={frameRegistry}>
          <FramePage />
        </SurfaceActivity>,
      ),
    );
  });

  afterEach(() => {
    act(() => frameRoot.unmount());
    act(() => boardRoot.unmount());
    delete (frameWin as unknown as Record<string, unknown>)[FRAMED_SURFACE_BRIDGE_KEY];
  });

  it("the Page item declares a surface its content publishes, never none", () => {
    expect("none" in PAGE.surface).toBe(false);
    expect("published" in PAGE.surface && PAGE.surface.published(pageSource("/notes"))).toBe(FRAMED);
  });

  it("values arrive: the page's surface registers as the tile's, with its live values and controls", async () => {
    installFramedSurfaceBridge(frameWin, frameRegistry);
    await flush();
    expect(tile.primary()?.surfaceName).toBe(FRAMED);
    const opened = await openItemSurface(tile);
    if (!opened.ok) throw new Error(opened.error);
    expect(opened.surface).toBe(FRAMED);
    expect(opened.values.note_title).toEqual({ value: "Launch plan", description: "The open note's title." });
    expect(opened.values.note_body?.value).toBe("Ship the board bridge on Tuesday");
    expect(opened.client_tools.map((t) => t.name)).toEqual(["framed_note_count_words"]);
    expect(opened.write_targets.join("\n")).toContain("framed_note_title_set");
  });

  it("a tool call runs IN the frame and returns its result; a write lands in the page", async () => {
    installFramedSurfaceBridge(frameWin, frameRegistry);
    await flush();
    const counted = await actOnItem(tile, { tool: "framed_note_count_words", input: {} });
    expect(counted).toEqual({ ok: true, surface_name: FRAMED, output: { words: 6 } });
    const written = await actOnItem(tile, { target: "framed_note_title_set", value: "Launch plan v2" });
    expect(written.ok).toBe(true);
    expect(page.ranInFrame).toEqual(["tool:count", "write:Launch plan v2"]);
    expect(page.title).toBe("Launch plan v2");
    // The page's live value, read again through the bridge.
    const scope = await tile.primary()!.getScope();
    expect(scope.note_title).toBe("Launch plan v2");
  });

  it("enforces the origin and the window on every message, both ways", async () => {
    // The bridge is on the page's window, but nobody announced it yet.
    (frameWin as unknown as Record<string, unknown>)[FRAMED_SURFACE_BRIDGE_KEY] = createFramedSurfaceBridge(frameRegistry);
    await act(async () => deliver(window, { type: FRAMED_SURFACE_READY }, "https://evil.example", frameWin));
    await flush();
    // The right origin from the wrong window (the board itself) is ignored too.
    await act(async () => deliver(window, { type: FRAMED_SURFACE_READY }, window.location.origin, window));
    await flush();
    // Not connected: the tile holds no surface at all.
    expect(tile.primary()).toBeNull();
    // From the frame, on this origin: connected.
    await act(async () => deliver(window, { type: FRAMED_SURFACE_READY }, window.location.origin, frameWin));
    await flush();
    expect((await tile.primary()!.getScope()).note_title).toBe("Launch plan");

    // The frame side answers a HELLO only from its parent on its origin.
    delete (frameWin as unknown as Record<string, unknown>)[FRAMED_SURFACE_BRIDGE_KEY];
    const heard: unknown[] = [];
    const listen = (e: MessageEvent) => heard.push(e.data);
    window.addEventListener("message", listen);
    const uninstall = installFramedSurfaceBridge(frameWin, frameRegistry);
    await flush();
    heard.length = 0;
    await act(async () => deliver(frameWin, { type: FRAMED_SURFACE_HELLO }, "https://evil.example", window));
    await flush();
    expect(heard).toEqual([]);
    await act(async () => deliver(frameWin, { type: FRAMED_SURFACE_HELLO }, window.location.origin, window));
    await flush();
    expect(heard).toEqual([{ type: FRAMED_SURFACE_READY }]);
    window.removeEventListener("message", listen);
    uninstall();
  }, 15_000);

  it("follows the page as it navigates within itself", async () => {
    installFramedSurfaceBridge(frameWin, frameRegistry);
    await flush();
    expect(tile.primary()?.surfaceName).toBe(FRAMED);
    await act(async () => showPage("other"));
    await flush();
    expect(tile.primary()?.surfaceName).toBe(OTHER);
    expect(await tile.primary()!.getScope()).toEqual({ other_name: "Elsewhere" });
  });

  it("a page that unloads leaves the tile with no surface, never its old values, and its tools refuse", async () => {
    const uninstall = installFramedSurfaceBridge(frameWin, frameRegistry);
    await flush();
    expect((await tile.primary()!.getScope()).note_title).toBe("Launch plan");
    const runtimeBefore = tile.primary()!;
    uninstall(); // pagehide: BYE
    await flush();
    // Gone: no surface on the tile, and the runtime an agent may still hold answers nothing it said before.
    expect(tile.primary()).toBeNull();
    expect(await runtimeBefore.getScope()).toEqual({});
    const ran = await actOnItem(tile, { tool: "framed_note_count_words", input: {} });
    expect(ran.ok).toBe(false);
    expect(page.ranInFrame).toEqual([]);
    const opened = await openItemSurface(tile);
    expect(opened).toEqual({ ok: false, error: expect.stringContaining("did not mount") });
    // The tile still names the surface the page will publish when it comes back.
    expect("published" in PAGE.surface && PAGE.surface.published(pageSource("/notes"))).toBe(FRAMED);
    // A BYE from another origin never disconnects a live page.
    installFramedSurfaceBridge(frameWin, frameRegistry);
    await flush();
    await act(async () => deliver(window, { type: FRAMED_SURFACE_BYE }, "https://evil.example", frameWin));
    await flush();
    expect((await tile.primary()!.getScope()).note_title).toBe("Launch plan");
  }, 25_000);
});
