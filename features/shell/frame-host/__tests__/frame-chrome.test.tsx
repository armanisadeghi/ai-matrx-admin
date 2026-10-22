/**
 * CHROME PARITY — the app frame, hosted by FrameChrome, carries the LIVE shell's chrome
 * (ROLLOUT-PLAN blocking change #1). The frame itself is real; the live leaves are stand-ins that
 * record what the adapter hands them, so each assertion is about the WIRING:
 *
 *   1. the header's right group is THE HEADER CONTROL SET (`headerControls`) in its order, canvas
 *      excluded, then the frame's own side chat and canvas toggles — one canvas door, not two;
 *   2. the product sidebar ends in the account rail: Settings, the organization, the person —
 *      each in its `frame` variant (no `.shell-*` class, no `.shell-root` checkbox);
 *   3. the person's menu is the live UserMenuPanel on its own close checkbox: an item's
 *      MenuItemCloseLabel (the real one) closes the popover;
 *   4. the person's look and accent are stamped on the frame root as AppShell stamps them;
 *   5. on a phone the set is data: Search stays, the rest are "…" items.
 *
 * PROVEN FAILING BEFORE PASSING (2026-10-21): dropping `canvas: null` in FrameHeaderTools turned
 * case 1 RED (two "Canvas" doors); removing `onClick={closeIfCleared}` turned case 3 RED.
 */
import React, { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { PRODUCTS, PRODUCT_FAMILIES } from "@/features/shell/frame/products";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
class NoopResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= NoopResizeObserver;
Element.prototype.scrollIntoView ??= function scrollIntoView() {};

const variants: Record<string, string | undefined> = {};

jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }));
// The admin boolean the frame's admin icon reads (selectIsAdminPerson); a member unless a case sets it.
const mockAuth = { isAdmin: false };
jest.mock("@/lib/redux/hooks", () => ({
  useAppSelector: (select: (s: unknown) => unknown) => select({ userAuth: mockAuth }),
}));
jest.mock("@/features/shell/shell-layout/useResolvedShellLayout", () => ({
  selectShellLook: () => "meet-matrx",
  selectShellAccent: () => ({ hex: "#7c3aed" }),
  useResolvedShellLayout: () => ({
    header: [
      { kind: "control", id: "search", control: "search" },
      { kind: "destination", id: "d1", label: "Reports", iconName: "Telescope", href: "/reports" },
    ],
  }),
}));
jest.mock("@/features/shell/shell-layout/looks", () => ({ STANDARD_SHELL_LOOK: "standard" }));
jest.mock("@/features/shell/components/header/headerControls", () => ({
  headerControls: () => ({
    search: <button type="button" aria-label="Search" data-live="search" />,
    intelligence: <button type="button" aria-label="Intelligence" data-live="intelligence" />,
    messages: <button type="button" aria-label="Messages" data-live="messages" />,
    notifications: <button type="button" aria-label="Notifications" data-live="notifications" />,
    canvas: <button type="button" aria-label="Canvas" data-live="canvas" />,
  }),
}));
// The live ShellHeaderButtons in its default order (no saved layout).
jest.mock("@/features/shell/components/header/ShellHeaderButtons", () => ({
  ShellHeaderButtons: ({ controls }: { controls: Record<string, ReactNode> }) => (
    <>
      {(["search", "intelligence", "messages", "notifications", "canvas"] as const).map((id) => (
        <React.Fragment key={id}>{controls[id]}</React.Fragment>
      ))}
    </>
  ),
  useRunHeaderButton: () => jest.fn(),
}));
jest.mock("@/features/shell/components/account-rail/ShellSettingsMenu", () => ({
  ShellSettingsMenu: ({ variant }: { variant?: string }) => {
    variants.settings = variant;
    return <span data-live="settings" />;
  },
}));
jest.mock("@/features/shell/components/account-rail/ShellOrgSwitcher", () => ({
  ShellOrgSwitcher: ({ variant }: { variant?: string }) => {
    variants.org = variant;
    return <span data-live="org" />;
  },
}));
jest.mock("@/features/shell/components/user-block/RailUserAvatar", () => ({ RailUserAvatar: () => <span /> }));
jest.mock("@/features/shell/components/header/header-right-menu/UserMenuPanel", () => {
  // The real close wrapper every live menu item sits in.
  const { MenuItemCloseLabel, useMenuCheckboxId } = jest.requireActual(
    "@/features/shell/components/header/header-right-menu/menuCheckboxId",
  );
  function UserMenuPanelStandIn({ menuCheckboxId, bare }: { menuCheckboxId?: string; bare?: boolean }) {
    const fromContext = useMenuCheckboxId();
      return (
        <div data-live="user-menu" data-checkbox={menuCheckboxId} data-context={fromContext} data-bare={String(bare)}>
          <MenuItemCloseLabel>
            <button type="button" data-testid="sign-out">
              Sign Out
            </button>
          </MenuItemCloseLabel>
        </div>
      );
  }
  return { __esModule: true, default: UserMenuPanelStandIn };
});
jest.mock("@ai-matrx/chat/host/window-openers", () => ({ useOpenAuthGateDialog: () => jest.fn() }));
jest.mock("@ai-matrx/chat/surfaces/components/chrome/SurfaceAgentsHeaderButton", () => ({
  AGENTS_AUTH_GATE: {},
  SurfaceAgentsPanelImpl: () => <div data-live="agents-panel" />,
}));
jest.mock("@/components/ui/drawer", () => ({
  Drawer: ({ open, children }: { open: boolean; children: ReactNode }) => (open ? <div>{children}</div> : null),
  DrawerContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DrawerHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DrawerTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));
jest.mock("@/components/navigation/AppLink", () => ({
  __esModule: true,
  default: ({ children, href, prefetch: _p, ...rest }: { children?: ReactNode; href: string; prefetch?: boolean }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
jest.mock("@/hooks/auth/useLoginHref", () => ({ useLoginHref: () => "/login" }));
jest.mock("@/lib/notice-open/openFromNotice", () => ({ openFromNotice: jest.fn() }));
jest.mock("@/features/knowledge/command-bar/OpenCommandBarButtons", () => ({ useOpenBarOrGate: () => jest.fn() }));
jest.mock("@/features/notifications/components/InboxHeaderButton", () => ({ INBOX_AUTH_GATE: {} }));
jest.mock("@/features/messaging/components/shell/MessagesHeaderButton", () => ({ MESSAGES_AUTH_GATE: {} }));
jest.mock("@/features/messaging/canvas/messagesKind", () => ({ useMessagesToggle: () => ({ toggle: jest.fn() }) }));
jest.mock("@/features/notifications/canvas/notificationsKind", () => ({
  useNotificationsToggle: () => ({ toggle: jest.fn() }),
}));
jest.mock("@/features/assists/mobileInbox", () => ({ openAssistsInbox: jest.fn(), useAssistsInboxCount: () => 2 }));
jest.mock("@/features/assists/constants", () => ({ ASSISTS_MANAGER_HREF: "/assists" }));

import { FrameChrome, FRAME_USER_MENU_ID } from "../FrameChrome";
import type { FrameChromeProps } from "../FrameChrome";
import type { UserData } from "@/utils/userDataMapper";

const chat = PRODUCTS.find((p) => p.id === "chat")!;
const user = { id: "u1", email: "admin@admin.com", isAdmin: true, isAnonymous: false, userMetadata: { name: "Test Admin" } } as unknown as UserData;

let host: HTMLElement;
let root: Root;
const q = <T extends Element = HTMLElement>(sel: string) => document.body.querySelector<T>(sel);

function mount(overrides: Partial<FrameChromeProps> = {}) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  const props: FrameChromeProps = {
    userData: user,
    isAuthenticated: true,
    products: PRODUCTS,
    families: PRODUCT_FAMILIES,
    product: chat,
    favorites: [],
    onFavoritesChange: () => {},
    crumbs: [{ id: "chat", label: "Chat" }],
    actions: [],
    variant: "record",
    children: <p>Body</p>,
    ...overrides,
  };
  act(() => root.render(<FrameChrome {...props} />));
}

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  document.body.innerHTML = "";
  mockAuth.isAdmin = false;
});

describe("FrameChrome fills every frame slot with the live chrome", () => {
  it("1. the right group is the live control set, canvas excluded, then the frame's two toggles", () => {
    mount({ form: "desktop" });
    const group = q('header [data-mf-region="header-tools"]')!;
    const labels = [...group.querySelectorAll("button")].map((b) => b.getAttribute("aria-label"));
    expect(labels).toEqual(["Search", "Intelligence", "Messages", "Notifications", "Side chat", "Canvas"]);
    expect(group.querySelector('[data-live="canvas"]')).toBeNull();
  });

  it("2. the sidebar ends in the account rail, every control in its frame variant", () => {
    mount({ form: "desktop" });
    const footer = q('[data-mf-region="sidebar"] [data-mf-region="sidebar-footer"]')!;
    expect(footer.querySelector('[data-live="settings"]')).not.toBeNull();
    expect(footer.querySelector('[data-live="org"]')).not.toBeNull();
    expect(footer.querySelector('[aria-label="Account menu"][data-shell-user-trigger]')).not.toBeNull();
    expect(variants).toEqual({ settings: "frame", org: "frame" });
    expect(footer.querySelector('[class*="shell-"]')).toBeNull();
  });

  it("a guest gets no organization control and a Sign in row", () => {
    mount({ form: "desktop", isAuthenticated: false });
    const footer = q('[data-mf-region="sidebar"] [data-mf-region="sidebar-footer"]')!;
    expect(footer.querySelector('[data-live="org"]')).toBeNull();
    expect(footer.querySelector('a[href="/login"]')).not.toBeNull();
  });

  it("3. the person's menu is the live panel on its own checkbox; an item's close label closes it", async () => {
    mount({ form: "desktop" });
    const trigger = q<HTMLButtonElement>('[aria-label="Account menu"]')!;
    await act(async () => {
      trigger.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, button: 0, ctrlKey: false }));
      trigger.click();
    });
    const panel = q('[data-live="user-menu"]')!;
    expect(panel).not.toBeNull();
    expect(panel.getAttribute("data-checkbox")).toBe(FRAME_USER_MENU_ID);
    expect(panel.getAttribute("data-context")).toBe(FRAME_USER_MENU_ID);
    expect(panel.getAttribute("data-bare")).toBe("true");
    expect(q<HTMLInputElement>(`#${FRAME_USER_MENU_ID}`)!.checked).toBe(true);
    await act(async () => q<HTMLButtonElement>('[data-testid="sign-out"]')!.click());
    expect(q('[data-live="user-menu"]')).toBeNull();
  });

  it("4. the person's look and accent are on the frame root, as AppShell stamps .shell-root", () => {
    mount({ form: "desktop" });
    const frame = q("[data-matrx-frame]")!;
    expect(frame.getAttribute("data-shell-look")).toBe("meet-matrx");
    expect(frame.getAttribute("data-matrx-accent")).toBe("custom");
    expect(frame.style.getPropertyValue("--matrx-accent-primary")).not.toBe("");
  });

  it("5. on a phone: Search stays in the header, the rest of the set are '…' items", () => {
    mount({ form: "phone" });
    const header = q("header")!;
    expect(header.querySelector('[aria-label="Search"]')).not.toBeNull();
    expect(header.querySelector('[data-live="intelligence"]')).toBeNull();
  });
});

describe("the phone set is the live set as data", () => {
  it("covers Intelligence, Messages, Notifications, the person's buttons and Assists", async () => {
    const { useFramePhoneTools } = await import("../FrameChrome");
    let tools: { id: string; label: string; phone?: string }[] = [];
    function Probe() {
      tools = useFramePhoneTools(true, () => {}, () => {});
      return null;
    }
    host = document.createElement("div");
    root = createRoot(host);
    act(() => root.render(<Probe />));
    expect(tools.map((t) => t.id)).toEqual(["search", "intelligence", "messages", "notifications", "custom-d1", "assists"]);
    expect(tools.filter((t) => t.phone === "show").map((t) => t.id)).toEqual(["search"]);
    expect(tools.find((t) => t.id === "assists")!.label).toBe("Assists (2)");
  });
});

describe("the admin icon (Arman, 2026-10-22: one icon leads to every admin option)", () => {
  it("a member's header has no admin icon; an admin's has ONE, after the control set", () => {
    mount({ form: "desktop" });
    expect(q('[aria-label="Admin tools"]')).toBeNull();
    act(() => root.unmount());
    host.remove();

    mockAuth.isAdmin = true;
    mount({ form: "desktop" });
    const group = q('header [data-mf-region="header-tools"]')!;
    const labels = [...group.querySelectorAll("button")].map((b) => b.getAttribute("aria-label"));
    expect(labels).toEqual(["Search", "Intelligence", "Messages", "Notifications", "Admin tools", "Side chat", "Canvas"]);
  });

  it("on a phone the admin item is the last '…' item, for admins only", async () => {
    const { useFramePhoneTools } = await import("../FrameChrome");
    const openAdmin = jest.fn();
    let tools: { id: string; label: string; onSelect?: () => void }[] = [];
    function Probe() {
      tools = useFramePhoneTools(true, () => {}, openAdmin);
      return null;
    }
    host = document.createElement("div");
    root = createRoot(host);
    act(() => root.render(<Probe />));
    expect(tools.some((t) => t.id === "admin")).toBe(false);

    mockAuth.isAdmin = true;
    act(() => root.render(<Probe key="admin" />));
    expect(tools.at(-1)!.id).toBe("admin");
    expect(tools.at(-1)!.label).toBe("Admin tools");
    tools.at(-1)!.onSelect!();
    expect(openAdmin).toHaveBeenCalledTimes(1);
  });
});
