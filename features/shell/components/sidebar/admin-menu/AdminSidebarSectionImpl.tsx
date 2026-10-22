"use client";

// AdminSidebarSectionImpl — the body of the admin block in the desktop sidebar
// footer. Loaded ONLY through AdminSidebarSection (the admin gate + the one
// dynamic edge), so a non-admin downloads none of these toggles and runs none
// of these effects. Never import this file anywhere else. The app frame's admin
// menu (features/shell/frame-host/FrameAdminMenu) renders it through that gate too.
//
// Contains:
//   - Admin Launchpad (the one door into administration; opens a new tab so the current work stays)
//   - Builder (window panel: everything the current page published; lights up when it has entries)
//   - Watch AI (self-gates to debug mode)
//   - Error Inspector
//   - Creator Hub toggle (window panel; self-gates to creators)
//   - Debug mode switch (self-gates to super-admin)
//   - Localhost / Production server toggle + its menu (incl. the admin indicator; self-gates to admin)

import { useEffect, useRef } from "react";
import { rememberAdminFooterHeight } from "./admin-footer-reserve";
import NavLink from "@/components/navigation/NavLink";
import { ADMIN_LAUNCHPAD_PATH } from "@/features/admin/constants/admin-categories";
import SidebarBuilderToggle from "../../controls/SidebarBuilderToggle";
import SidebarWatchAiToggle from "../../controls/SidebarWatchAiToggle";
import SidebarCreatorHubToggle from "../../controls/SidebarCreatorHubToggle";
import SidebarDebugModeToggle from "../../controls/SidebarDebugModeToggle";
import SidebarEnvToggle from "../../controls/SidebarEnvToggle";
import SidebarErrorInspectorToggle from "../../controls/SidebarErrorInspectorToggle";
import ShellIcon from "../../ShellIcon";

export default function AdminSidebarSectionImpl() {
  const sectionRef = useRef<HTMLDivElement>(null);

  // Keep the footer's settled height for the next load's pre-paint reserve (admin-footer-reserve.ts).
  // Skipped under /administration, where the admin menu is absent and the footer reads shorter.
  useEffect(() => {
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
  }, []);

  return (
    <div ref={sectionRef} className="shell-admin-section">
      <NavLink
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
      </NavLink>
      <SidebarBuilderToggle />
      <SidebarWatchAiToggle />
      <SidebarErrorInspectorToggle />
      <SidebarCreatorHubToggle />
      <SidebarDebugModeToggle />
      <SidebarEnvToggle />
    </div>
  );
}
