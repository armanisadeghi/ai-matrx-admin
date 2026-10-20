// features/make/__tests__/live-previews-start-only-on-a-press.test.tsx — ADVERSARIAL-5 F1 (2026-10-20).
//
// THE USE CASE. A guest opens aimatrx.com/templates/spaces-meal-planner and never scrolls. The live preview sits in the
// first screen, and its "load when reached" trigger fired at once: the whole app tree (store, providers, the editor)
// came down, 8.3 MB for a page that should weigh under 2 MB. The live preview must start ONLY on a press.
//
// SUT: the two real preview islands (Space template TemplatePackPreview, table template TemplateLivePreview) mounted
// in jsdom under a light public tier whose `requestFull` is the observable (asking for it is what loads the app tree).
// The browser is made as eager as it gets: an IntersectionObserver that says "in view" the moment anything observes.
// BREAKS THIS CATCHES: an intersection trigger (RED on the pre-F1 islands), a hover/focus/touch-start trigger, and a
// press that no longer starts it.

import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const loadPack = jest.fn(() => new Promise(() => undefined));
jest.mock("@/features/make/gallery/templatePage", () => ({ loadPublicPackTemplate: () => loadPack() }));
jest.mock("@/features/spaces/page/usePinnedTop", () => ({ usePinnedTop: () => undefined }));
jest.mock("@/features/spaces/page/Cover", () => ({ Cover: () => null }));
jest.mock("@/features/spaces/page/SpaceIcon", () => ({ SpaceIcon: () => null, isImageMedia: () => false }));
jest.mock("@/features/spaces/state/read-only-value", () => ({ readOnlySpacesValue: () => ({}) }));
jest.mock("@/features/spaces/state/SpacesProvider", () => ({ StaticSpacesProvider: ({ children }: { children: ReactNode }) => <>{children}</> }));
jest.mock("@/features/make/gallery/TemplateLivePreviewImpl", () => ({ loadLiveScreens: () => new Promise(() => undefined) }));

import { PublicTierContext, type PublicTier } from "@/features/public-shell/publicTier";
import { TemplateLivePreview } from "@/features/make/gallery/TemplateLivePreview";
import { TemplatePackPreview } from "@/features/spaces/public/TemplatePackPreview";

class EagerObserver {
  constructor(private readonly cb: IntersectionObserverCallback) {}
  observe(target: Element) {
    this.cb([{ isIntersecting: true, target } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
  }
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  (globalThis as { IntersectionObserver?: unknown }).IntersectionObserver = EagerObserver;
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  loadPack.mockClear();
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

const PAGES = [{ key: "home", title: "Meal Planner", icon: null, cover: null, settings: { fullWidth: false, smallText: false } }] as unknown as Parameters<
  typeof TemplatePackPreview
>[0]["pages"];

const ISLANDS: Array<{ name: string; render: () => ReactNode }> = [
  {
    name: "Space template (TemplatePackPreview)",
    render: () => <TemplatePackPreview templateKey="spaces-meal-planner" catalogueId="SP0001" pages={PAGES} outlines={{ home: <p>Snapshot</p> }} />,
  },
  {
    name: "table template (TemplateLivePreview)",
    render: () => (
      <TemplateLivePreview spec={{ tables: [], views: [] } as never} today="2026-10-20">
        <p>Snapshot</p>
      </TemplateLivePreview>
    ),
  },
];

function mount(island: () => ReactNode) {
  const requestFull = jest.fn();
  const tier: PublicTier = { full: false, requestFull, FullIslands: null };
  act(() => root.render(<PublicTierContext.Provider value={tier}>{island()}</PublicTierContext.Provider>));
  return requestFull;
}

describe("a live template preview loads the app only when the visitor presses it", () => {
  it.each(ISLANDS)("$name: in the first screen, hovered and focused, it loads nothing", ({ render }) => {
    const requestFull = mount(render);
    const box = host.firstElementChild as HTMLElement;
    act(() => {
      box.dispatchEvent(new MouseEvent("pointerover", { bubbles: true }));
      box.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
      box.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    });
    expect(requestFull).not.toHaveBeenCalled();
    expect(loadPack).not.toHaveBeenCalled();
    // The static snapshot is what shows, with the affordance on it.
    expect(host.textContent).toContain("Snapshot");
    expect(host.querySelector("[data-see-it-live]")?.textContent).toBe("See it live");
  });

  it.each(ISLANDS)("$name: pressing See it live asks for the app tree", ({ render }) => {
    const requestFull = mount(render);
    act(() => (host.querySelector("[data-see-it-live]") as HTMLButtonElement).click());
    expect(requestFull).toHaveBeenCalledTimes(1);
  });

  it.each(ISLANDS)("$name: the press outlives the remount at the full-tier switch (no second press needed)", ({ render }) => {
    mount(render);
    act(() => (host.querySelector("[data-see-it-live]") as HTMLButtonElement).click());
    // The public layout swaps light -> full and the page mounts again.
    act(() => root.unmount());
    root = createRoot(host);
    const requestFull = mount(render);
    expect(requestFull).toHaveBeenCalledTimes(1);
  });
});
