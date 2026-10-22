/**
 * THE FRAME'S ADMIN ICON (Arman, 2026-10-22: "I've lost all of my admin options … only a single icon
 * that then leads me to the other admin options").
 *
 *   1. a non-admin sees no admin icon in the frame header, and no admin item on a phone;
 *   2. an admin sees ONE admin icon; opening it shows EVERY control of the classic sidebar footer's
 *      admin block — the list is read by rendering that block itself (`AdminSidebarSection`, the
 *      footer's gate), so a control added there is expected here too — plus the footer's Windows;
 *
 * The classic controls are stand-ins that record their label (each real one self-gates on Redux);
 * the wiring under test is the gate, the one icon, the lazy body and the shared block.
 *
 * The icon's place in the header and the phone item are cases in frame-chrome.test.tsx.
 *
 * PROVEN FAILING BEFORE PASSING (2026-10-22): with the menu rendering only the Windows control (no
 * AdminSidebarSection) case 2 was RED (the classic list missing from the menu); without
 * `<FrameAdminMenu />` in FrameHeaderTools and the phone push, both frame-chrome admin cases were RED.
 */
import React, { act, Suspense, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
class NoopResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= NoopResizeObserver;

const auth = { isAdmin: false };

jest.mock("next/dynamic", () => {
  const { lazy, Suspense: S } = jest.requireActual("react");
  return (loader: () => Promise<{ default: React.ComponentType }>) => {
    const Lazy = lazy(loader);
    return function Dynamic(props: object) {
      return (
        <S fallback={null}>
          <Lazy {...props} />
        </S>
      );
    };
  };
});
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("@/lib/redux/hooks", () => ({
  useAppSelector: (select: (s: unknown) => unknown) => select({ userAuth: auth }),
}));

// The classic admin block's leaves, as labelled stand-ins.
function mockLeaf(label: string) {
  return {
    __esModule: true,
    default: () => (
      <button type="button" className="shell-nav-item" data-admin-control={label}>
        <span className="shell-nav-label">{label}</span>
      </button>
    ),
  };
}
jest.mock("@/features/shell/components/controls/SidebarBuilderToggle", () => mockLeaf("Builder"));
jest.mock("@/features/shell/components/controls/SidebarWatchAiToggle", () => mockLeaf("Watch AI"));
jest.mock("@/features/shell/components/controls/SidebarErrorInspectorToggle", () => mockLeaf("Error Inspector"));
jest.mock("@/features/shell/components/controls/SidebarCreatorHubToggle", () => mockLeaf("Creator Hub"));
jest.mock("@/features/shell/components/controls/SidebarDebugModeToggle", () => mockLeaf("Debug mode"));
jest.mock("@/features/shell/components/controls/SidebarEnvToggle", () => mockLeaf("Production"));
jest.mock("@/features/window-panels/components/SidebarWindowToggle", () => ({
  __esModule: true,
  default: ({ placement }: { placement?: string }) => (
    <button type="button" data-admin-control="Windows" data-placement={placement}>
      Windows
    </button>
  ),
}));
jest.mock("@/components/navigation/NavLink", () => ({
  __esModule: true,
  default: ({ children, href, title }: { children?: ReactNode; href: string; title?: string }) => (
    <a href={href} data-admin-control={title}>
      {children}
    </a>
  ),
}));
jest.mock("@/features/shell/components/ShellIcon", () => ({ __esModule: true, default: () => <span /> }));
jest.mock("@/features/admin/constants/admin-categories", () => ({ ADMIN_LAUNCHPAD_PATH: "/administration/launchpad" }));

import AdminSidebarSection from "@/features/shell/components/sidebar/admin-menu/AdminSidebarSection";
import { FrameAdminMenu, FRAME_ADMIN_MENU_LABEL } from "../FrameAdminMenu";

let host: HTMLElement;
let root: Root;

async function render(node: ReactNode) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => root.render(<Suspense fallback={null}>{node}</Suspense>));
}

const controls = (scope: ParentNode) =>
  [...scope.querySelectorAll("[data-admin-control]")].map((el) => el.getAttribute("data-admin-control"));

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  document.body.innerHTML = "";
  auth.isAdmin = false;
});

/** The classic footer's admin block, rendered on its own: the list the menu must carry. */
async function classicAdminControls(): Promise<(string | null)[]> {
  auth.isAdmin = true;
  await render(<AdminSidebarSection />);
  await act(async () => {});
  const list = controls(host);
  act(() => root.unmount());
  host.remove();
  return list;
}

describe("the app frame's admin icon", () => {
  it("1. a non-admin sees no admin icon", async () => {
    await render(<FrameAdminMenu />);
    expect(document.body.querySelector(`[aria-label="${FRAME_ADMIN_MENU_LABEL}"]`)).toBeNull();
  });

  it("2. an admin sees one icon that opens every classic admin control plus Windows", async () => {
    const classic = await classicAdminControls();
    expect(classic).toEqual([
      "Admin Launchpad",
      "Builder",
      "Watch AI",
      "Error Inspector",
      "Creator Hub",
      "Debug mode",
      "Production",
    ]);

    auth.isAdmin = true;
    await render(<FrameAdminMenu />);
    const triggers = document.body.querySelectorAll(`[aria-label="${FRAME_ADMIN_MENU_LABEL}"]`);
    expect(triggers).toHaveLength(1);
    // Nothing of the menu is loaded before it is opened.
    expect(document.body.querySelector("[data-admin-control]")).toBeNull();

    const trigger = triggers[0] as HTMLButtonElement;
    await act(async () => {
      trigger.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, button: 0, ctrlKey: false }));
      trigger.click();
    });
    await act(async () => {});
    const menu = document.body.querySelector('[data-testid="frame-admin-menu"]')!;
    expect(menu).not.toBeNull();
    expect(controls(menu)).toEqual([...classic, "Windows"]);
    expect(menu.querySelector('[data-admin-control="Windows"]')!.getAttribute("data-placement")).toBe("trigger");
    // The classic rows' labels are shown inside the menu (legacy-contracts.css keys on this marker).
    expect(menu.querySelector("[data-matrx-frame-admin-menu] .shell-nav-label")).not.toBeNull();
  });
});
