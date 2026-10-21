/**
 * Remount safety — board-only content: label, image, write-up, cover, web page, page.
 *
 * SUT: each type's `Body` from `items/catalog.ts`, mounted as the board mounts
 * a tile (`remount-safety/harness.tsx`). The break each case catches: a body
 * that keeps the person's words in mount-local state and loses them on a
 * remount, re-creates its content on wake, or reaches the network on wake.
 * These types own no record, so `ownRecord` is empty: any write still fails.
 */

jest.mock("@/utils/supabase/client", () => {
  const { createFakeSupabase } = jest.requireActual("./remount-safety/fake-backend");
  const client = createFakeSupabase();
  return { createClient: () => client, supabase: client };
});
jest.mock("next/navigation", () => jest.requireActual("./remount-safety/next-navigation"));

import { BOARD_ITEM_TYPES } from "../items/catalog";
import { pageSource } from "../items/page-items";
import { expectRemountSafe, runCycle, settle, typeInto } from "./remount-safety/harness";
import { createSurfaceCapture, type SurfaceRegistry } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import { FRAMED_SURFACE_BRIDGE_KEY, installFramedSurfaceBridge } from "../embed/framed-surface-bridge";
import { installBrowserGaps } from "./remount-safety/browser-gaps";
import { remountType } from "./remount-safety/cases";

installBrowserGaps();

const type = (key: string) => {
  const t = BOARD_ITEM_TYPES.find((x) => x.key === key);
  if (!t) throw new Error(`no board item type ${key}`);
  return t;
};

const LABEL = "Unit 4B — lease renewal due Nov 30";
remountType(
  "label",
  () =>
    runCycle(type("label"), { kind: "label", text: "" }, {
      title: "Label",
      act: async (tile) => {
        await typeInto(tile.container.querySelector("textarea")!, LABEL);
      },
      kept: (tile) => ({ shown: tile.container.querySelector("textarea")?.value, saved: tile.source() }),
    }),
  (r) => expectRemountSafe(r, { shown: LABEL, saved: { kind: "label", text: LABEL } }, []),
);

const IMAGE = "https://images.harborviewproperties.com/units/4b/kitchen-after-remodel.jpg";
remountType(
  "image",
  () =>
    runCycle(type("image"), { kind: "image", url: IMAGE }, {
      title: "kitchen-after-remodel.jpg",
      kept: (tile) => tile.container.querySelector("img")?.getAttribute("src"),
    }),
  (r) => expectRemountSafe(r, IMAGE, []),
);

const WRITE_UP = "# Move-out inspection, Unit 4B\n\nCarpet in the second bedroom needs replacing; deduct $640 from the deposit.";
remountType(
  "write-up",
  () =>
    runCycle(type("write-up"), { kind: "text", markdown: WRITE_UP }, {
      title: "Write-up",
      kept: (tile) => {
        const text = tile.container.textContent ?? "";
        return { heading: text.includes("Move-out inspection, Unit 4B"), body: text.includes("deduct $640 from the deposit") };
      },
    }),
  (r) => expectRemountSafe(r, { heading: true, body: true }, []),
);

const COVER_HERO = '<div class="h"><h1>Harborview Properties, one look</h1></div>';
const COVER_TEXT = "## Principles\n\n- **Calm by default.** Color is for meaning, never for decoration.";
remountType(
  "cover",
  () =>
    runCycle(type("cover"), { kind: "entity", entity: "cover", id: null, meta: { hero: COVER_HERO, markdown: COVER_TEXT } }, {
      title: "Design system",
      kept: (tile) => ({
        prose: (tile.container.textContent ?? "").includes("Color is for meaning"),
        hero: tile.container.querySelector("iframe") !== null,
        saved: tile.source(),
      }),
    }),
  (r) =>
    expectRemountSafe(
      r,
      { prose: true, hero: true, saved: { kind: "entity", entity: "cover", id: null, meta: { hero: COVER_HERO, markdown: COVER_TEXT } } },
      [],
    ),
);

const WEB = "https://www.portlandoregon.gov/bds/rental-registration";
remountType(
  "web-page",
  () =>
    runCycle(type("web-page"), { kind: "html", url: WEB }, {
      title: "www.portlandoregon.gov",
      kept: (tile) => tile.container.querySelector("iframe")?.getAttribute("src"),
    }),
  (r) => expectRemountSafe(r, WEB, []),
);

/**
 * The framed page as a browser runs it: its own window registry with its surface, the bridge on its
 * window, and postMessage carrying the sender's origin and window (jsdom's carries neither). Booted
 * once per iframe — a remount is a new iframe, so the page loads (and announces itself) again.
 */
function bootFramedPage(tile: { container: Element }): void {
  const frame = tile.container.querySelector("iframe");
  const win = frame?.contentWindow;
  if (!win || (win as unknown as Record<string, unknown>)[FRAMED_SURFACE_BRIDGE_KEY]) return;
  const post = (target: Window, sender: Window) => {
    target.postMessage = ((data: unknown) => {
      setTimeout(() => {
        const Ctor = (target as unknown as { MessageEvent: typeof MessageEvent }).MessageEvent;
        target.dispatchEvent(new Ctor("message", { data, origin: sender.location.origin, source: sender }));
      });
    }) as Window["postMessage"];
  };
  post(window, win);
  post(win, window);
  const pageRegistry = createSurfaceCapture();
  pageRegistry.register({ surfaceName: "matrx-user/meeting", getScope: () => ({ meeting_title: "Weekly sync" }) }, 1);
  installFramedSurfaceBridge(win, pageRegistry);
}

/** What the board's agent reads of the Page tile: the framed page's surface and a live value of it. */
async function framedSurfaceOf(tile: { container: Element; capture: SurfaceRegistry }) {
  bootFramedPage(tile);
  await settle(100);
  const runtime = tile.capture.primary();
  return { surface: runtime?.surfaceName ?? null, title: runtime ? (await runtime.getScope()).meeting_title : null };
}

remountType(
  "page",
  () =>
    runCycle(type("page"), pageSource("/meetings"), {
      title: "Meetings",
      act: async (tile) => {
        bootFramedPage(tile);
        await settle(100);
      },
      kept: async (tile) => ({
        src: tile.container.querySelector("iframe")?.getAttribute("src"),
        saved: tile.source(),
        framed: await framedSurfaceOf(tile),
      }),
    }),
  (r) =>
    expectRemountSafe(
      r,
      { src: "/meetings", saved: pageSource("/meetings"), framed: { surface: "matrx-user/meeting", title: "Weekly sync" } },
      [],
    ),
);
