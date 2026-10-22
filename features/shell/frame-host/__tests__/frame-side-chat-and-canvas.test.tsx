/**
 * THE SIDE CHAT AND THE CANVAS IN THE NEW APP FRAME (ROLLOUT-PLAN §3, P3).
 *
 *   1. One shell per request: the classic dock and canvas column live only in AppShell; the frame
 *      host never mounts them, and the (core) layout renders exactly one of the two shells.
 *   2. Zero weight: the frame host's only eager chat import is the light open/closed module; the
 *      Side Chat (SideChatSession) and the canvas body arrive through ONE dynamic import each.
 *   3. Lazy, with the shared rule: the frame's side chat is closed by default, nothing loads on
 *      render, the first open loads it once, and the person's choice lands in the SAME per-home
 *      cookie the classic dock reads.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Search } from "lucide-react";
import {
  AppFrame,
  FRAME_COMPANION_DEFAULT_PX,
  FRAME_COMPANION_MAX_PX,
  FRAME_COMPANION_MIN_PX,
  type AppFrameProps,
} from "@/features/shell/frame/AppFrame";
import { HeaderToolButtons } from "@/features/shell/frame/SheetHeader";
import { PRODUCTS, PRODUCT_FAMILIES } from "@/features/shell/frame/products";
import type { CompanionProps } from "@/features/shell/frame/types";
import { useSideChatOpen } from "@ai-matrx/chat/canvas/workspace/side-chat-state";
import { CANVAS_CHAT_SIZES, canvasChatCookieName } from "@ai-matrx/chat/canvas/workspace/workspace-cookies";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const REPO = process.cwd();
const read = (rel: string) => readFileSync(join(REPO, rel), "utf8");
const staticImports = (src: string) =>
  [...src.matchAll(/^\s*(?:import|export)\b(?!\s+type\b)[^;]*?\bfrom\s*["']([^"']+)["']/gm)].map((m) => m[1]);

describe("one shell per request: exactly one side chat host and one canvas host per page", () => {
  it("the (core) layout renders FrameShell OR AppShell, never both", () => {
    const layout = read("app/(core)/layout.tsx");
    expect(layout).toMatch(/frameMode === "frame" \? FrameShell : AppShell/);
  });

  it("the classic dock and canvas column are AppShell's; the frame host mounts neither", () => {
    const appShell = read("features/shell/components/AppShell.tsx");
    expect(appShell).toMatch(/<ShellChatDock\b/);
    expect(appShell).toMatch(/<ShellCanvasColumn\b/);
    for (const file of ["FrameShell.tsx", "FrameHostGate.tsx", "FrameHostImpl.tsx", "FrameSideChat.tsx", "FrameCanvas.tsx", "FrameChrome.tsx"]) {
      const src = read(`features/shell/frame-host/${file}`);
      expect([file, /ShellChatDock|ShellCanvasColumn/.test(src)]).toEqual([file, false]);
    }
  });
});

describe("zero weight until engaged", () => {
  it("FrameHostImpl's only eager chat import is the light open/closed module", () => {
    const chat = staticImports(read("features/shell/frame-host/FrameHostImpl.tsx")).filter((s) => s.startsWith("@ai-matrx/chat"));
    expect(chat).toEqual(["@ai-matrx/chat/canvas/workspace/side-chat-state"]);
  });

  it("the stand-in doors import only the two tiny registries (no session, no composer)", () => {
    const chat = staticImports(read("features/shell/frame-host/frameSideChatQueue.ts")).filter((s) => s.startsWith("@ai-matrx/chat"));
    expect(chat.sort()).toEqual([
      "@ai-matrx/chat/agents/components/chat/in-place-chat-host",
      "@ai-matrx/chat/agents/redux/execution-system/instance-resources/remark-sink",
    ]);
  });

  it("the side chat and the canvas body each arrive through ONE dynamic import", () => {
    const impl = read("features/shell/frame-host/FrameHostImpl.tsx");
    expect(impl).toMatch(/import\("\.\/FrameSideChat"\)/);
    expect(impl).toMatch(/import\("\.\/FrameCanvas"\)/);
    expect(staticImports(impl)).not.toContain("./FrameSideChat");
    expect(staticImports(impl)).not.toContain("./FrameCanvas");
    expect(staticImports(read("features/shell/frame-host/FrameSideChat.tsx"))).toContain(
      "@ai-matrx/chat/canvas/workspace/SideChatSession",
    );
    expect(staticImports(read("features/shell/frame-host/FrameCanvas.tsx"))).toContain("@/features/canvas/host/ShellCanvasBody");
  });
});

let host: HTMLElement;
let root: Root;
afterEach(() => {
  act(() => root?.unmount());
  document.body.innerHTML = "";
  for (const part of document.cookie.split("; ")) {
    const name = part.split("=")[0];
    if (name) document.cookie = `${name}=; path=/; max-age=0`;
  }
});

function LoadedSideChat(_: CompanionProps) {
  return <p data-testid="loaded-side-chat">side chat</p>;
}

function Host({ loader }: { loader: AppFrameProps["loadCompanion"] }) {
  const state = useSideChatOpen({ pathname: "/notes/a", search: "", signedIn: true, initialChoice: null });
  return (
    <AppFrame
      products={PRODUCTS}
      families={PRODUCT_FAMILIES}
      product={PRODUCTS[0]}
      favorites={[]}
      onFavoritesChange={() => {}}
      crumbs={[{ id: "page", label: "Page" }]}
      actions={[]}
      headerTools={<HeaderToolButtons tools={[{ id: "search", label: "Search", icon: Search }]} />}
      phoneTools={[]}
      variant="workspace"
      form="desktop"
      loadCompanion={loader}
      companionOpen={state.open}
      onCompanionOpenChange={state.setOpen}
    >
      <p>Body</p>
    </AppFrame>
  );
}

const flush = () =>
  act(async () => {
    await Promise.resolve();
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));
  });

describe("the frame's side chat follows the shared rule and loads only when opened", () => {
  it("closed by default, nothing loads on render, the first open loads it once into the per-home cookie", async () => {
    window.history.replaceState(null, "", "/notes/a");
    const loader = jest.fn(() => Promise.resolve({ default: LoadedSideChat }));
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    act(() => root.render(<Host loader={loader} />));
    await flush();
    const door = host.querySelector<HTMLButtonElement>('header button[aria-label="Side chat"]')!;
    expect(door.getAttribute("aria-pressed")).toBe("false");
    expect(loader).not.toHaveBeenCalled();
    act(() => door.click());
    await flush();
    expect(loader).toHaveBeenCalledTimes(1);
    expect(host.querySelector('[data-testid="loaded-side-chat"]')).not.toBeNull();
    expect(door.getAttribute("aria-pressed")).toBe("true");
    // The classic dock's own cookie for the home `page:notes` — one choice, both shells.
    expect(document.cookie).toContain(`${canvasChatCookieName("page:notes")}=side`);
    act(() => door.click());
    await flush();
    expect(document.cookie).toContain(`${canvasChatCookieName("page:notes")}=side:closed`);
    expect(loader).toHaveBeenCalledTimes(1);
  });
});

describe("one width rule and one full-screen state", () => {
  it("the frame's side chat widths are the classic dock's (owner: 340 to 768, default 350)", () => {
    expect([FRAME_COMPANION_MIN_PX, FRAME_COMPANION_MAX_PX, FRAME_COMPANION_DEFAULT_PX]).toEqual([
      CANVAS_CHAT_SIZES.minPx,
      CANVAS_CHAT_SIZES.maxPx,
      CANVAS_CHAT_SIZES.defaultPx,
    ]);
    expect([CANVAS_CHAT_SIZES.minPx, CANVAS_CHAT_SIZES.maxPx]).toEqual([340, 768]);
  });

  it("the canvas's full screen is the host's (the canvas store's), read and written through it", async () => {
    const changes: boolean[] = [];
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    act(() =>
      root.render(
        <AppFrame
          products={PRODUCTS}
          families={PRODUCT_FAMILIES}
          product={PRODUCTS[0]}
          favorites={[]}
          onFavoritesChange={() => {}}
          crumbs={[{ id: "page", label: "Page" }]}
          actions={[]}
          phoneTools={[]}
          variant="workspace"
          form="wide"
          canvasOpen
          canvasFull
          onCanvasFullChange={(full) => changes.push(full)}
        >
          <p>Body</p>
        </AppFrame>,
      ),
    );
    await flush();
    const exit = host.querySelector<HTMLButtonElement>('button[aria-label="Exit full screen"]')!;
    expect(exit.getAttribute("aria-pressed")).toBe("true");
    act(() => exit.click());
    expect(changes).toEqual([false]);
  });
});

describe("the canvas has ONE title row (adversarial review, 2026-10-22)", () => {
  it("a loaded canvas module brings its own pane header: the frame draws no second close or full screen", async () => {
    const loadCanvas = () =>
      Promise.resolve({ default: () => <div data-testid="canvas-module">Canvas module</div> });
    const el = document.createElement("div");
    document.body.appendChild(el);
    const r = createRoot(el);
    act(() =>
      r.render(
        <AppFrame
          products={PRODUCTS}
          families={PRODUCT_FAMILIES}
          product={PRODUCTS[0]}
          favorites={[]}
          onFavoritesChange={() => {}}
          crumbs={[{ id: "page", label: "Page" }]}
          actions={[]}
          phoneTools={[]}
          variant="workspace"
          form="wide"
          loadCanvas={loadCanvas}
          canvasOpen
          canvasFull={false}
        >
          <p>Body</p>
        </AppFrame>,
      ),
    );
    await flush();
    await flush();
    expect(el.querySelector('[data-testid="canvas-module"]')).not.toBeNull();
    expect(el.querySelector('button[aria-label="Close canvas"]')).toBeNull();
    expect(el.querySelector('button[aria-label="Full screen"]')).toBeNull();
    act(() => r.unmount());
    el.remove();
  });
});
