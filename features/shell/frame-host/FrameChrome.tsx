"use client";

// FrameChrome — the matrx-frontend HOST ADAPTER for the new app frame (ROLLOUT-PLAN blocking
// change #1, chrome parity). The frame (`features/shell/frame/`) is host-agnostic and only offers
// slots; this file fills them with the LIVE shell's own components, so the frame is a usable
// shell the day the (core) switch lands:
//
//   headerTools    THE HEADER CONTROL SET (`headerControls` — Search, Intelligence, Messages,
//                  Notifications, the person's own header buttons through `ShellHeaderButtons`).
//                  Canvas is dropped: the frame owns its canvas and side chat toggles. For an
//                  admin, ONE admin icon (`FrameAdminMenu`) opens the classic sidebar footer's
//                  admin block and Windows control, the same components, loaded on first open.
//   phoneTools     the same set as data for the phone header ("…" items; Search stays visible),
//                  from the same hooks HeaderPhoneOverflow uses; the admin item opens a sheet.
//   sidebarFooter  THE ACCOUNT RAIL: `ShellSettingsMenu`, `ShellOrgSwitcher` (the one active
//                  organization control), and the person's menu (`UserMenuPanel`, whose Sign Out
//                  is `useSignOut` through `SignOutMenuItem`) — the `frame` variants draw
//                  design-system rows with no `.shell-*` class and no `.shell-root` checkbox.
//   appearance     the person's look and accent from the same selectors AppShell's stamp and
//                  ShellLayoutSync read, so a save or preview re-stamps the frame in place.
//
// Nothing imports this file outside the frame host: `check:shell-eager-graph` blocks it (and
// AppFrame) from the classic eager set. Live (core) pages are untouched until the switch.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, ChevronRight, Lightbulb, LogIn, MessageSquare, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@ai-matrx/design-system";
import { Tile } from "@ai-matrx/design-system/controls";
import { useOpenAuthGateDialog } from "@ai-matrx/chat/host/window-openers";
import {
  AGENTS_AUTH_GATE,
  SurfaceAgentsPanelImpl,
} from "@ai-matrx/chat/surfaces/components/chrome/SurfaceAgentsHeaderButton";
import { AppFrame } from "@/features/shell/frame/AppFrame";
import type { AppFrameProps, FrameAppearance } from "@/features/shell/frame/AppFrame";
import type { FrameHeaderTool } from "@/features/shell/frame/types";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import AppLink from "@/components/navigation/AppLink";
import { INTELLIGENCE_ICON } from "@/components/icons/domain-icons";
import { useAppSelector } from "@/lib/redux/hooks";
import { openFromNotice } from "@/lib/notice-open/openFromNotice";
import { useLoginHref } from "@/hooks/auth/useLoginHref";
import type { UserData } from "@/utils/userDataMapper";
import { headerControls } from "@/features/shell/components/header/headerControls";
import { ShellHeaderButtons, useRunHeaderButton } from "@/features/shell/components/header/ShellHeaderButtons";
import { ShellSettingsMenu } from "@/features/shell/components/account-rail/ShellSettingsMenu";
import { ShellOrgSwitcher } from "@/features/shell/components/account-rail/ShellOrgSwitcher";
import { RailUserAvatar } from "@/features/shell/components/user-block/RailUserAvatar";
import UserMenuPanel from "@/features/shell/components/header/header-right-menu/UserMenuPanel";
import { MenuCheckboxIdProvider } from "@/features/shell/components/header/header-right-menu/menuCheckboxId";
import { USER_MENU_PANEL_CLASS } from "@/features/shell/components/header/header-right-menu/menuItemClass";
import { useResolvedShellLayout, selectShellAccent, selectShellLook } from "@/features/shell/shell-layout/useResolvedShellLayout";
import { STANDARD_SHELL_LOOK } from "@/features/shell/shell-layout/looks";
import { shellIconComponents, resolveShellIconName } from "@/features/shell/shellIconMap";
import { useOpenBarOrGate } from "@/features/knowledge/command-bar/OpenCommandBarButtons";
import { INBOX_AUTH_GATE } from "@/features/notifications/components/InboxHeaderButton";
import { MESSAGES_AUTH_GATE } from "@/features/messaging/components/shell/MessagesHeaderButton";
import { useMessagesToggle } from "@/features/messaging/canvas/messagesKind";
import { useNotificationsToggle } from "@/features/notifications/canvas/notificationsKind";
import { openAssistsInbox, useAssistsInboxCount } from "@/features/assists/mobileInbox";
import { ASSISTS_MANAGER_HREF } from "@/features/assists/constants";
import { openOutbound } from "@ai-matrx/kit/outbound";
import {
  FRAME_ADMIN_MENU_LABEL,
  FrameAdminIcon,
  FrameAdminMenu,
  FrameAdminMenuContent,
  FrameBuilderRecorder,
  keepOpenForWindowManager,
  useFrameAdminGate,
} from "./FrameAdminMenu";

/** The profile menu's close checkbox inside the frame (AppShell's is `shell-user-menu`). */
export const FRAME_USER_MENU_ID = "frame-user-menu";

type ChromeSlots = "headerTools" | "phoneTools" | "sidebarFooter" | "appearance";

export type FrameChromeProps = Omit<AppFrameProps, ChromeSlots> & {
  userData: UserData;
  isAuthenticated: boolean;
};

/** The frame with the live shell's chrome in its slots. */
export function FrameChrome({ userData, isAuthenticated, ...frame }: FrameChromeProps) {
  const [agentsOpen, setAgentsOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const phoneTools = useFramePhoneTools(isAuthenticated, () => setAgentsOpen(true), () => setAdminOpen(true));
  const appearance = useFrameAppearance();
  return (
    <>
      <AppFrame
        {...frame}
        headerTools={<FrameHeaderTools isAuthenticated={isAuthenticated} />}
        phoneTools={phoneTools}
        sidebarFooter={<FrameSidebarFooter userData={userData} isAuthenticated={isAuthenticated} />}
        appearance={appearance}
      />
      <FrameBuilderRecorder />
      {/* Phone: Intelligence opens the page's agents panel in a sheet, as HeaderPhoneOverflow does. */}
      <Drawer open={agentsOpen} onOpenChange={setAgentsOpen}>
        <DrawerContent className="bg-textured pb-safe max-h-[85dvh]">
          <DrawerHeader className="px-3 py-2 text-left">
            <DrawerTitle className="text-base">Intelligence</DrawerTitle>
          </DrawerHeader>
          <div className="overflow-y-auto px-1 pb-4">
            {agentsOpen ? <SurfaceAgentsPanelImpl onRequestClose={() => setAgentsOpen(false)} /> : null}
          </div>
        </DrawerContent>
      </Drawer>
      {/* Phone: the admin item opens the same admin tools the header icon does, in a sheet. */}
      <Drawer open={adminOpen} onOpenChange={setAdminOpen}>
        <DrawerContent
          className="bg-textured pb-safe max-h-[85dvh]"
          onPointerDownOutside={keepOpenForWindowManager}
          onInteractOutside={keepOpenForWindowManager}
        >
          <DrawerHeader className="px-3 py-2 text-left">
            <DrawerTitle className="text-base">{FRAME_ADMIN_MENU_LABEL}</DrawerTitle>
          </DrawerHeader>
          <div className="overflow-y-auto px-2 pb-4">{adminOpen ? <FrameAdminMenuContent /> : null}</div>
        </DrawerContent>
      </Drawer>
    </>
  );
}

/** The look and accent AppShell stamps on `.shell-root`, as the frame's appearance. */
export function useFrameAppearance(): FrameAppearance {
  const look = useAppSelector(selectShellLook);
  const accent = useAppSelector(selectShellAccent);
  return {
    look: look && look !== STANDARD_SHELL_LOOK ? look : null,
    accent: accent ? ("hex" in accent ? accent.hex : accent.id) : null,
  };
}

/** The header's right group: the live control set, the person's own buttons (canvas excluded), the admin icon. */
export function FrameHeaderTools({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <>
      <ShellHeaderButtons controls={{ ...headerControls(isAuthenticated), canvas: null }} />
      <FrameAdminMenu />
    </>
  );
}

/** The same set on a phone, as the frame's data: Search stays in the header, the rest are "…" items. */
export function useFramePhoneTools(
  isAuthenticated: boolean,
  openAgents: () => void,
  openAdmin: () => void,
): FrameHeaderTool[] {
  const showAdmin = useFrameAdminGate();
  const openSearch = useOpenBarOrGate(isAuthenticated);
  const openAuthGate = useOpenAuthGateDialog();
  const messages = useMessagesToggle();
  const notifications = useNotificationsToggle();
  const assists = useAssistsInboxCount();
  const layout = useResolvedShellLayout();
  const runButton = useRunHeaderButton();
  const router = useRouter();

  const tools: FrameHeaderTool[] = [
    { id: "search", label: "Search", icon: Search, phone: "show", onSelect: openSearch },
    {
      id: "intelligence",
      label: "Intelligence",
      icon: INTELLIGENCE_ICON,
      onSelect: () => (isAuthenticated ? openAgents() : openAuthGate(AGENTS_AUTH_GATE)),
    },
    {
      id: "messages",
      label: "Messages",
      icon: MessageSquare,
      onSelect: () => (isAuthenticated ? messages.toggle() : openAuthGate(MESSAGES_AUTH_GATE)),
    },
    {
      id: "notifications",
      label: "Notifications",
      icon: Bell,
      onSelect: () => (isAuthenticated ? notifications.toggle() : openAuthGate(INBOX_AUTH_GATE)),
    },
  ];
  if (!isAuthenticated) return tools;
  for (const button of layout.header) {
    if (button.kind === "control") continue;
    tools.push({
      id: `custom-${button.id}`,
      label: button.label,
      icon: shellIconComponents[resolveShellIconName(button.iconName)],
      onSelect: () => {
        if (button.kind === "destination" && !button.tileId) {
          if (button.external || button.openInNewTab) openOutbound(button.href, "_blank", "noopener");
          else router.push(button.href);
          return;
        }
        runButton(button);
      },
    });
  }
  tools.push({
    id: "assists",
    label: assists > 0 ? `Assists (${assists})` : "Assists",
    icon: Lightbulb,
    onSelect: () => (assists > 0 ? openAssistsInbox() : openFromNotice(ASSISTS_MANAGER_HREF)),
  });
  if (showAdmin) tools.push({ id: "admin", label: FRAME_ADMIN_MENU_LABEL, icon: FrameAdminIcon, onSelect: openAdmin });
  return tools;
}

/** The account rail at the bottom of the product sidebar: Settings, the organization, the person. */
export function FrameSidebarFooter({ userData, isAuthenticated }: { userData: UserData; isAuthenticated: boolean }) {
  // A guest (anonymous session) has no account, so no organization control — as ShellUserBlock.
  const hasAccount = isAuthenticated && !userData.isAnonymous;
  return (
    <>
      <ShellSettingsMenu variant="frame" />
      {hasAccount ? <ShellOrgSwitcher variant="frame" /> : null}
      {isAuthenticated ? <FrameUserMenu userData={userData} /> : <FrameSignIn />}
    </>
  );
}

function FrameSignIn() {
  const loginHref = useLoginHref();
  return (
    <Tile asChild dense variant="quiet" className="w-full" title="Sign in" icon={<LogIn aria-hidden />}>
      <AppLink href={loginHref} prefetch={false} />
    </Tile>
  );
}

/**
 * The person's menu: the live `UserMenuPanel` in a popover. Its items close the menu through a
 * checkbox (`MenuItemCloseLabel`, built for AppShell's CSS toggle); here that checkbox mirrors the
 * popover's open state, so a label's change event — or an item clearing it directly — closes it.
 */
function FrameUserMenu({ userData }: { userData: UserData }) {
  const [open, setOpen] = useState(false);
  const displayName = userData.userMetadata?.name ?? userData.email ?? "Your account";
  const closeIfCleared = () => {
    const box = document.getElementById(FRAME_USER_MENU_ID);
    if (box instanceof HTMLInputElement && !box.checked) setOpen(false);
  };
  return (
    <>
      <input
        type="checkbox"
        id={FRAME_USER_MENU_ID}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        checked={open}
        onChange={(e) => setOpen(e.target.checked)}
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Tile
            dense
            variant="quiet"
            className="w-full"
            aria-label="Account menu"
            title={displayName}
            icon={
              <RailUserAvatar
                id={userData.id}
                name={userData.userMetadata?.name}
                avatarUrl={userData.userMetadata?.avatarUrl}
                displayName={displayName}
              />
            }
            end={<ChevronRight className="size-3.5 text-muted-foreground" aria-hidden="true" />}
            data-shell-user-trigger=""
          />
        </PopoverTrigger>
        <PopoverContent
          side="top"
          align="start"
          sideOffset={8}
          className={USER_MENU_PANEL_CLASS}
          // After an item's own close (MenuItemCloseLabel clears the checkbox), close the popover.
          onClick={closeIfCleared}
        >
          <MenuCheckboxIdProvider id={FRAME_USER_MENU_ID}>
            <UserMenuPanel userData={userData} menuCheckboxId={FRAME_USER_MENU_ID} bare />
          </MenuCheckboxIdProvider>
        </PopoverContent>
      </Popover>
    </>
  );
}

/** Every AppFrame slot this adapter fills (the parity test checks each is filled). */
export const FRAME_CHROME_SLOTS: readonly ChromeSlots[] = ["headerTools", "phoneTools", "sidebarFooter", "appearance"];
