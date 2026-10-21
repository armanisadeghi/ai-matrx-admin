"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";
import { UserData } from "@/utils/userDataMapper";
import { useResetMenuGroupsOnOpen } from "./useResetMenuGroupsOnOpen";
import { OverlayMenuItem } from "./OverlayMenuItem";
import { CanvasToolMenuItem } from "./CanvasToolMenuItem";
import { LinkMenuItem } from "./LinkMenuItem";
import { CopyShortLinkMenuItem } from "./CopyShortLinkMenuItem";
import { SignOutMenuItem } from "./SignOutMenuItem";
import { UserProfileHeader } from "./UserProfileHeader";
import { MenuGroup, MenuGroupSkeleton } from "./MenuGroup";
import {
  QUICK_ACCESS_ITEMS,
  COMMUNICATION_ITEMS,
} from "./userMenuItems.constants";
import { USER_MENU_PANEL_CLASS } from "./menuItemClass";

// The Admin group's items load only for an admin: the boolean below is the whole
// gate, and the group sits behind this ONE edge (Arman, 2026-10-15).
const loadAdminMenuGroup = () => import("./AdminMenuGroupImpl");

const divider = (
  <div className="h-px my-1 mx-2 bg-[var(--matrx-glass-border-color)]" />
);

// While the chunk loads, the group's divider + header row hold its exact height,
// so Copy link / Sign out never move when it arrives (no layout shift).
const AdminMenuGroup = dynamic(loadAdminMenuGroup, {
  ssr: false,
  loading: () => (
    <>
      {divider}
      <MenuGroupSkeleton label="Admin" />
    </>
  ),
});

/** Start the admin chunk when the account trigger is hovered, focused or pressed. */
function useAdminGroupPreload(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return undefined;
    const trigger = document.querySelector<HTMLElement>("[data-shell-user-trigger]");
    if (!trigger) return undefined;
    const preload = () => void loadAdminMenuGroup();
    const events = ["pointerenter", "pointerdown", "focus"] as const;
    for (const e of events) trigger.addEventListener(e, preload, { once: true });
    return () => {
      for (const e of events) trigger.removeEventListener(e, preload);
    };
  }, [enabled]);
}

interface UserMenuPanelProps {
  userData: UserData;
  menuCheckboxId?: string;
  /**
   * The host's popover already draws the menu's box (`USER_MENU_PANEL_CLASS` on its content — the
   * app frame's account menu): the panel draws none of its own. Default false (AppShell's CSS
   * panel needs the box).
   */
  bare?: boolean;
}

/**
 * Authenticated-only user menu: identity, quick access, admin, sign out.
 * `ShellUserBlock` mounts it only for a signed-in person (a guest gets the
 * Sign in row), so there is no guest fallback here.
 */
export default function UserMenuPanel({
  userData,
  menuCheckboxId = "shell-user-menu",
  bare = false,
}: UserMenuPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  useResetMenuGroupsOnOpen(panelRef, menuCheckboxId);
  useAdminGroupPreload(Boolean(userData.isAdmin));

  return (
    <div ref={panelRef} className={bare ? undefined : USER_MENU_PANEL_CLASS}>
      <UserProfileHeader userData={userData} />

      {divider}

      <LinkMenuItem href="/intelligence" icon="Intelligence" label="Intelligence" />
      {/* What my activity has cost so far: Plan & usage (features/entitlements/usage-history/MyCostSoFar). */}
      <LinkMenuItem href="/user-settings/plan" icon="Gauge" label="Usage & cost" />
      {/* The studios and building blocks, reopened any time (the sign-up welcome shows it first). */}
      <LinkMenuItem href="/meet-matrx" icon="Compass" label="Meet Matrx" />

      {divider}

      <MenuGroup id="quick" icon="Rocket" label="Quick Access">
        {QUICK_ACCESS_ITEMS.map((item) =>
          "canvasTool" in item ? (
            <CanvasToolMenuItem key={item.canvasTool} {...item} />
          ) : (
            <OverlayMenuItem key={item.overlayId} {...item} />
          ),
        )}
      </MenuGroup>

      {divider}

      {COMMUNICATION_ITEMS.map((item) => (
        <OverlayMenuItem key={item.overlayId} {...item} />
      ))}

      {userData.isAdmin && <AdminMenuGroup divider={divider} />}

      {divider}

      {/* Theme, Media and Preferences live in the rail's Settings slot
          (ShellSettingsMenu); the organization in its own slot. */}
      <CopyShortLinkMenuItem />

      {divider}

      <SignOutMenuItem />
    </div>
  );
}
