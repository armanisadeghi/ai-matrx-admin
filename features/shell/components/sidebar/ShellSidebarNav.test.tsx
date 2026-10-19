/**
 * The uncustomized sidebar is TODAY's sidebar (custom-experience §5.3): with no saved layout,
 * `ShellSidebarNav` renders exactly the markup the old server map rendered (the same NavItem /
 * NavFlyoutGroup rows over `navItemsForViewer(primaryNavItems)`), for a signed-in person and a guest.
 * A saved layout renders the person's rows instead, a tile row is a button that never navigates, and a
 * reserved column (customized + late seed) is the fixed-height skeleton, not the default.
 */
import React, { forwardRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";

jest.mock("next/navigation", () => ({ usePathname: () => "/notes", useRouter: () => ({ push: () => undefined }) }));
jest.mock("../../navigation/navActions", () => ({ useNavActions: () => ({}) }));
jest.mock("../../navigation/navPanelActions", () => ({
  useNavPanelActions: () => ({}),
  useRunNavTile: () => () => undefined,
}));
jest.mock("@/components/navigation/AppLink", () => ({
  __esModule: true,
  default: forwardRef<HTMLAnchorElement, React.AnchorHTMLAttributes<HTMLAnchorElement> & { prefetch?: boolean }>(
    function AppLink({ prefetch: _prefetch, ...props }, ref) {
      return <a ref={ref} {...props} />;
    },
  ),
}));

/* eslint-disable @typescript-eslint/no-require-imports */
const { navItemsForViewer, primaryNavItems, settingsItem } = require("../../constants/nav-data") as typeof import("../../constants/nav-data");
const NavItem = (require("./NavItem") as typeof import("./NavItem")).default;
const NavFlyoutGroup = (require("./NavFlyoutGroup") as typeof import("./NavFlyoutGroup")).default;
const ShellSidebarNav = (require("./ShellSidebarNav") as typeof import("./ShellSidebarNav")).default;
const shellLayout = require("@/features/shell/shell-layout/shellLayoutSlice") as typeof import("@/features/shell/shell-layout/shellLayoutSlice");
const contract = require("@/features/shell/shell-layout/contract") as typeof import("@/features/shell/shell-layout/contract");
const { serializeShellLayoutBody } = require("@/features/shell/shell-layout/validate") as typeof import("@/features/shell/shell-layout/validate");
/* eslint-enable @typescript-eslint/no-require-imports */

type SliceState = import("@/features/shell/shell-layout/shellLayoutSlice").ShellLayoutState;

function storeWith(shell: SliceState, userId: string | null, isAdmin: boolean) {
  return configureStore({
    reducer: {
      shellLayout: shellLayout.default,
      userAuth: (state: { id: string | null; isAdmin: boolean } = { id: userId, isAdmin }) => state,
    },
    preloadedState: { shellLayout: shell, userAuth: { id: userId, isAdmin } },
  });
}

// Most Tools-grid tiles are admin-gated: the tile row is rendered for an admin viewer.
function render(shell: SliceState, isAuthenticated: boolean, isAdmin = false): string {
  const store = storeWith(shell, isAuthenticated ? "user-1" : null, isAdmin);
  return renderToStaticMarkup(
    <Provider store={store}>
      <ShellSidebarNav isAuthenticated={isAuthenticated} />
    </Provider>,
  );
}

/** The old server map in Sidebar.tsx, verbatim in shape. */
function today(isAuthenticated: boolean): string {
  const visible = navItemsForViewer(primaryNavItems, isAuthenticated);
  return renderToStaticMarkup(
    <>
      {visible.map((item) =>
        item.children ? (
          <NavFlyoutGroup key={item.label} item={item} candidates={[...visible, settingsItem]} />
        ) : (
          <NavItem key={item.label} item={item} />
        ),
      )}
    </>,
  );
}

const seeded = (extra: Partial<SliceState> = {}): SliceState =>
  shellLayout.seedShellLayoutState({ seed: null, seedLanded: true, organizationId: null, standardView: false, reserved: false, ...extra } as Parameters<typeof shellLayout.seedShellLayoutState>[0]);

describe("ShellSidebarNav", () => {
  it("with no layout, renders exactly today's sidebar (signed in and guest)", () => {
    expect(render(seeded(), true)).toBe(today(true));
    expect(render(seeded(), false)).toBe(today(false));
    // Outside (core) the slice is never seeded: same markup.
    expect(render(shellLayout.initialShellLayoutState, true)).toBe(today(true));
  });

  it("renders the person's saved rows on the first render, and a tile row as a button", () => {
    const body = serializeShellLayoutBody({
      schemaVersion: contract.SHELL_LAYOUT_SCHEMA_VERSION,
      basedOnCatalogVersion: 1,
      sidebar: [
        { kind: "link", id: "mine.docs", label: "My docs", icon: "FileText", href: "/docs" },
        { kind: "nav", id: "tile", ref: "tile.transcript-studio" },
      ],
    });
    const state = { ...seeded(), person: { recordId: "r", organizationId: "o", version: 1, updatedAt: "", body } };
    const html = render(state, true, true);
    expect(html).toContain("My docs");
    expect(html).toContain('href="/docs"');
    expect(html).toMatch(/<button type="button" title="[^"]+" class="shell-nav-item/);
    expect(html).not.toContain('href="#tile.transcript-studio"');
    expect(html).not.toBe(today(true));
  });

  it("a reserved column is the skeleton, never the default", () => {
    const html = render({ ...seeded(), status: "unknown", reserved: true }, true);
    expect(html).toContain("data-shell-layout-reserve");
    expect(html).not.toContain("shell-nav-item");
  });
});
