"use client";

// HeaderActions — Responsive action system.
//
// Desktop (lg+): Renders each action as an inline glass icon button.
// Mobile (<lg): Collapses all actions behind a single ⋯ glass button
//               that opens a BottomSheet.
//
// Responsive switching is CSS-driven (hidden/flex with lg: breakpoints)
// so there's zero JS media-query listeners.
//
// Usage:
//   <HeaderActions
//     actions={[
//       { icon: "Plus", label: "New Item", onPress: () => {} },
//       { icon: "SlidersHorizontal", label: "Filter", onPress: () => {} },
//     ]}
//   />

import { useState } from "react";
import GlassButton from "./GlassButton";
import BottomSheet from "./BottomSheet";
import GlassDropdown from "./GlassDropdown";
import type { HeaderAction } from "../types";

interface HeaderActionsProps {
  actions: HeaderAction[];
  /** Max icons to show inline on desktop before collapsing to overflow. Default: 3 */
  maxInline?: number;
  /** Title shown on the mobile bottom sheet */
  sheetTitle?: string;
}

export default function HeaderActions({
  actions,
  maxInline = 3,
  sheetTitle,
}: HeaderActionsProps) {
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [desktopOverflowOpen, setDesktopOverflowOpen] = useState(false);

  if (!actions.length) return null;

  // Desktop: split inline vs overflow
  const inlineActions = actions.slice(0, maxInline);
  const overflowActions = actions.slice(maxInline);

  return (
    <>
      {/* ─── Desktop: inline glass buttons ─── */}
      <div className="hdr-actions-desktop hidden lg:flex">
        {inlineActions.map((action) => (
          <GlassButton
            key={action.label}
            icon={action.icon}
            onClick={action.onPress}
            ariaLabel={action.label}
          />
        ))}

        {/* Desktop overflow (if > maxInline) */}
        {overflowActions.length > 0 && (
          <div className="hdr-actions-overflow-anchor">
            <GlassButton
              icon="Ellipsis"
              onClick={() => setDesktopOverflowOpen((v) => !v)}
              ariaLabel="More actions"
            />
            <GlassDropdown
              mode="actions"
              actions={overflowActions}
              open={desktopOverflowOpen}
              onClose={() => setDesktopOverflowOpen(false)}
              align="right"
            />
          </div>
        )}
      </div>

      {/* ─── Mobile: single overflow button ─── */}
      <div className="hdr-actions-mobile flex lg:hidden">
        <GlassButton
          icon="EllipsisVertical"
          onClick={() => setMobileSheetOpen(true)}
          ariaLabel="Actions"
        />
      </div>

      {/* ─── Mobile bottom sheet ─── */}
      <BottomSheet
        open={mobileSheetOpen}
        onClose={() => setMobileSheetOpen(false)}
        actions={actions}
        title={sheetTitle}
      />
    </>
  );
}
