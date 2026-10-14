"use client";

// AdminSidebarSection — the admin-only block in the desktop sidebar footer.
//
// Lives in the footer (outside the route-flipping nav) so it stays visible on
// every route, including ones with a route-specific menu (e.g. /chat).
//
// Renders ONLY for admins (any tier) via `selectIsAdmin`. Wrapped in top + bottom
// borders so it reads as a distinct section; new admin chrome can be dropped in
// here. Contains:
//   - Admin Launchpad (the one door into administration; opens a new tab so the current work stays)
//   - Builder (window panel: everything the current page published; lights up when it has entries)
//   - Watch AI (self-gates to debug mode)
//   - Error Inspector
//   - Creator Hub toggle (window panel; self-gates to creators)
//   - Debug mode switch (self-gates to super-admin)
//   - Localhost / Production server toggle + its menu (incl. the admin indicator; self-gates to admin)

import { useEffect, useRef } from "react";
import { rememberAdminFooterHeight } from "./admin-footer-reserve";
import AppLink from "@/components/navigation/AppLink";
import { ADMIN_LAUNCHPAD_PATH } from "@/features/admin/constants/admin-categories";
import { useIsMounted } from "@/hooks/use-is-mounted";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectAuthReady, selectIsAdminPerson } from "@/lib/redux/selectors/userSelectors";
import SidebarBuilderToggle from "../../controls/SidebarBuilderToggle";
import SidebarWatchAiToggle from "../../controls/SidebarWatchAiToggle";
import SidebarCreatorHubToggle from "../../controls/SidebarCreatorHubToggle";
import SidebarDebugModeToggle from "../../controls/SidebarDebugModeToggle";
import SidebarEnvToggle from "../../controls/SidebarEnvToggle";
import SidebarErrorInspectorToggle from "../../controls/SidebarErrorInspectorToggle";
import ShellIcon from "../../ShellIcon";

export default function AdminSidebarSection() {
  // ADMIN IDENTITY: this section is the way INTO the admin section, so it
  // shows on user pages too. Every tool inside it gates itself on admin
  // POWER and is absent outside /administration (utils/supabase/adminLane.ts).
  const isAdmin = useAppSelector(selectIsAdminPerson);
  const authReady = useAppSelector(selectAuthReady);
  const hydrated = useIsMounted();
  const sectionRef = useRef<HTMLDivElement>(null);

  // Keep the footer's settled height for the next load's pre-paint reserve (admin-footer-reserve.ts).
  // Skipped under /administration, where the admin menu is absent and the footer reads shorter.
  useEffect(() => {
    if (!authReady) return undefined;
    if (!isAdmin) {
      rememberAdminFooterHeight(null);
      return undefined;
    }
    const footer = sectionRef.current?.closest<HTMLElement>(".shell-sidebar-footer");
    if (!footer) return undefined;
    const save = () => {
      if (window.location.pathname.startsWith("/administration")) return;
      // The content's own height, not the footer's: the reserve itself holds a min-height.
      const style = window.getComputedStyle(footer);
      const content = Array.from(footer.children).reduce((sum, el) => sum + (el as HTMLElement).offsetHeight, 0);
      rememberAdminFooterHeight(content + parseFloat(style.paddingTop) + parseFloat(style.paddingBottom));
    };
    const observer = new ResizeObserver(save);
    observer.observe(footer);
    return () => observer.disconnect();
  }, [authReady, isAdmin, hydrated]);

  // Marks the sidebar while the admin block is mounted, so an open domain panel gives
  // the footer the panel's full width with labels (styles/shell.css § THE DOMAIN PANEL).
  useEffect(() => {
    const sidebar = sectionRef.current?.closest<HTMLElement>(".shell-sidebar");
    if (!sidebar) return undefined;
    sidebar.setAttribute("data-admin-footer", "");
    return () => sidebar.removeAttribute("data-admin-footer");
  }, [isAdmin, hydrated]);

  if (!hydrated || !isAdmin) return null;

  return (
    <div ref={sectionRef} className="shell-admin-section">
      <AppLink
        href={ADMIN_LAUNCHPAD_PATH}
        target="_blank"
        rel="noopener noreferrer"
        title="Admin Launchpad"
        className="shell-nav-item shell-tactile-subtle"
      >
        <span className="shell-nav-icon">
          <ShellIcon name="ShieldCheck" size={18} strokeWidth={1.75} />
        </span>
        <span className="shell-nav-label">Admin Launchpad</span>
        <span className="shell-nav-external">
          <ShellIcon name="ArrowUpRight" size={14} strokeWidth={1.75} />
        </span>
      </AppLink>
      <SidebarBuilderToggle />
      <SidebarWatchAiToggle />
      <SidebarErrorInspectorToggle />
      <SidebarCreatorHubToggle />
      <SidebarDebugModeToggle />
      <SidebarEnvToggle />
    </div>
  );
}
