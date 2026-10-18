/**
 * @jest-environment jsdom
 */
// THE PAGE KEEPS ITS PLACE WHEN THE PHONE CHECK ANSWERS (lane SPACES-REDRAW, 2026-10-17).
//
// The server cannot know the window's width: it renders Spaces for a wide screen unless the request says
// "phone". The phone check answers in the browser right after hydration. The frame used to return a
// different tree for a phone (the drawer first, the page second) than for a wide screen (the sidebar first),
// so when the check answered "phone" React unmounted the whole page and drew it again from scratch — at 375 px
// the page body vanished and reappeared ~2 s after load (CLS 1.55). The frame is now one tree at every width
// (CSS hides the sidebar on a phone); this hydrates the wide-screen HTML in a phone-width window and checks the
// page is still the very same element afterwards.

import { act } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("../../state/SpacesProvider", () => ({
  SpacesProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useSpaces: () => ({ sidebarCollapsed: false, setSidebarCollapsed: () => undefined, mobileSidebarOpen: false, setMobileSidebarOpen: () => undefined }),
}));
jest.mock("../../sidebar/SpacesSidebar", () => ({ SpacesSidebarContent: () => <nav className="sidebar-content">pages</nav> }));
jest.mock("../../nav/QuickFind", () => ({ QuickFind: () => null }));
jest.mock("../../ai/DatabaseDesigner", () => ({ DatabaseDesignerHost: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
jest.mock("../../ai/MoveIn", () => ({ MoveInHost: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
jest.mock("../../io/NotionImport", () => ({ NotionImportHost: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
jest.mock("../../ai/SpaceBuilder", () => ({ SpaceBuilderHost: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
jest.mock("@/lib/redux/hooks", () => ({ useAppSelector: () => null }));
jest.mock("@/components/ui/drawer", () => ({
  Drawer: ({ open, children }: { open: boolean; children: React.ReactNode }) => (open ? <>{children}</> : null),
  DrawerContent: ({ children }: { children: React.ReactNode }) => <div className="drawer">{children}</div>,
  DrawerTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

import { SpacesFrame } from "../SpacesWorkspace";

function phoneWindow(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (query: string) => ({ matches, media: query, addEventListener: () => undefined, removeEventListener: () => undefined, addListener: () => undefined, removeListener: () => undefined }),
  });
}

it("hydrating the wide-screen HTML in a phone-width window keeps the page element (never remounted)", async () => {
  const page = (
    <SpacesFrame>
      <article className="page-body">Fundraising CRM</article>
    </SpacesFrame>
  );
  // The server render: no window, so the phone check answers its server snapshot (wide screen).
  const html = renderToString(page);
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.appendChild(host);
  const body = host.querySelector(".page-body");
  const main = host.querySelector("main");
  expect(body).not.toBeNull();

  phoneWindow(true);
  const errors: string[] = [];
  const spy = jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => void errors.push(args.map(String).join(" ")));
  let root!: ReturnType<typeof hydrateRoot>;
  await act(async () => {
    root = hydrateRoot(host, page, { onRecoverableError: (e) => errors.push(`recoverable: ${String(e)}`) });
  });

  expect(host.querySelector(".page-body")).toBe(body);
  expect(host.querySelector("main")).toBe(main);
  // On a phone the (CSS-hidden) sidebar takes no input.
  expect(host.querySelector("aside")?.hasAttribute("inert")).toBe(true);
  await act(async () => root.unmount());
  host.remove();
  spy.mockRestore();
  expect(errors).toEqual([]);
});
