"use client";

// FrameAdminMenu — the app frame's ONE admin icon (header right group) and its phone twin
// (Arman, 2026-10-22: "only a single icon that then leads me to the other admin options").
//
// What it opens is the classic sidebar footer itself, through the footer's own front doors:
// `AdminSidebarSection` (the admin gate + one dynamic edge to AdminSidebarSectionImpl: Admin
// Launchpad, Builder, Watch AI, Error Inspector, Creator Hub, Debug mode, the API server switch with
// its admin-indicator item) and `SidebarWindowToggleIsland` (one dynamic edge to the Windows control,
// here opening below its trigger). Nothing is a copy: each row keeps its gate, state and window.
//
// THE EARLY BOOLEAN (Arman, 2026-10-15): the icon shows only for `selectIsAdminPerson` (the footer's
// gate), and both edges render only while the menu is open, so a non-admin — and an admin who never
// opens it — downloads none of the admin tools.

import { useState } from "react";
import dynamic from "next/dynamic";
import { ShieldCheck } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@ai-matrx/design-system";
import { Button } from "@ai-matrx/design-system/controls";
import { useIsMounted } from "@ai-matrx/kit/hooks";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectIsAdminPerson } from "@/lib/redux/selectors/userSelectors";
import { selectBuilderRecording } from "@/features/builder-panel/hooks/useBuilderRecording";
import AdminSidebarSection from "@/features/shell/components/sidebar/admin-menu/AdminSidebarSection";
import SidebarWindowToggleIsland from "@/features/shell/components/sidebar/SidebarWindowToggleIsland";

// The Builder's recorder alone (renders nothing). One edge, loaded only behind the gate below.
const BuilderRecorder = dynamic(() => import("@/features/builder-panel/components/BuilderRecorder"), {
  ssr: false,
  loading: () => null,
});

/**
 * Keeps the Builder recording while the admin menu is closed (the classic footer's Builder button is
 * always mounted; the frame's is not). Same gate as classic: an admin debugger with debug mode on —
 * anyone else loads nothing.
 */
export function FrameBuilderRecorder() {
  const recording = useAppSelector(selectBuilderRecording);
  const mounted = useIsMounted();
  return mounted && recording ? <BuilderRecorder /> : null;
}

export const FRAME_ADMIN_MENU_LABEL = "Admin tools";
export const FrameAdminIcon = ShieldCheck;

/** True once mounted for an admin — the classic admin footer's gate. */
export function useFrameAdminGate(): boolean {
  const isAdmin = useAppSelector(selectIsAdminPerson);
  const mounted = useIsMounted();
  return mounted && Boolean(isAdmin);
}

/**
 * Keeps a host popover or sheet open while the Windows menu (portaled to the body, outside it) is
 * used, so the Windows trigger inside it does not unmount under the pointer.
 */
export function keepOpenForWindowManager(event: { target: EventTarget | null; preventDefault: () => void }) {
  const target = event.target;
  if (target instanceof Element && target.closest("[data-window-manager-menu]")) event.preventDefault();
}

/** The admin tools themselves (both lazy); render only while open. */
export function FrameAdminMenuContent() {
  return (
    // legacy-contracts.css shows the classic rows' labels under this marker.
    <div data-matrx-frame-admin-menu="" className="flex flex-col gap-0.5">
      <AdminSidebarSection />
      <SidebarWindowToggleIsland placement="trigger" />
    </div>
  );
}

/** The header's admin icon: one button, a popover holding every classic admin control. */
export function FrameAdminMenu() {
  const show = useFrameAdminGate();
  const [open, setOpen] = useState(false);
  if (!show) return null;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={open ? "outline" : "quiet"}
          icon={<FrameAdminIcon />}
          aria-label={FRAME_ADMIN_MENU_LABEL}
          title={FRAME_ADMIN_MENU_LABEL}
          data-testid="frame-admin-menu-trigger"
        />
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={6}
        width="sm"
        padding="xs"
        onInteractOutside={keepOpenForWindowManager}
        data-testid="frame-admin-menu"
      >
        {open ? <FrameAdminMenuContent /> : null}
      </PopoverContent>
    </Popover>
  );
}
