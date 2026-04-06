// MobileSideSheet — Server component for off-canvas mobile navigation.
//
// All links carry data-nav-href. Active state is driven entirely by CSS:
//   .shell-root[data-pathname^="/ssr/chat"] [data-nav-href="/ssr/chat"] { ... }
//
// NavActiveSync keeps .shell-root[data-pathname] live after client navigation.
// This component has zero knowledge of routing.

import ShellIcon from "../ShellIcon";
import { primaryNavItems, settingsItem } from "../../constants/nav-data";
import MobileSheetNavLink from "./MobileSheetNavLink";

export default function MobileSideSheet() {
  return (
    <div className="shell-mobile-sheet-wrapper">
      {/* Backdrop — clicking closes the sheet */}
      <label
        htmlFor="shell-mobile-menu"
        className="shell-mobile-sheet-backdrop"
        aria-label="Close navigation menu"
      />

      {/* Sheet panel */}
      <div className="shell-mobile-sheet shell-glass-sheet">
        {/* Close button — absolutely positioned relative to the sheet */}
        <label
          htmlFor="shell-mobile-menu"
          className="shell-mobile-sheet-close"
          aria-label="Close navigation menu"
        >
          <ShellIcon name="X" size={18} strokeWidth={2} />
        </label>

        {/* Brand */}
        <div className="shell-mobile-sheet-brand">
          <ShellIcon name="LayoutDashboard" size={22} strokeWidth={1.75} />
          <span className="shell-mobile-sheet-brand-text">AI Matrx</span>
        </div>

        {/* Primary navigation */}
        <nav aria-label="Mobile navigation">
          {primaryNavItems.map((item) => (
            <MobileSheetNavLink
              key={item.href}
              href={item.href}
              iconName={item.iconName}
              label={item.label}
            />
          ))}

          {/* Settings */}
          <div className="shell-mobile-section-divider" />
          <MobileSheetNavLink
            href={settingsItem.href}
            iconName={settingsItem.iconName}
            label={settingsItem.label}
          />

          {/* Admin section — injected by AdminNavInjector (client component) */}
          <div id="admin-nav-mobile-slot" />
        </nav>
      </div>
    </div>
  );
}
