"use client";

import { useEffect, useState } from "react";
import { Crown } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { selectIsOverlayOpen, toggleOverlay } from "@ai-matrx/summon/open";

/**
 * Crown affordance in the admin block of the sidebar footer; toggles the
 * global `creatorHub` overlay, matching the admin Bug's toggle semantics.
 *
 * 🚨 THE FOOTER NEVER CHANGES HEIGHT WITH THE PAGE (2026-10-21). It rendered only
 * while `creatorDebug.isCreator` — "you made the agent on screen" — so every chat
 * switch between agents added or removed a 27 px row and moved the whole history
 * list above it. It lives only in the admin block (AdminSidebarSectionImpl), so it
 * is always there for the admin who sees that block.
 */
export default function SidebarCreatorHubToggle() {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((state) =>
    selectIsOverlayOpen(state, "creatorHub"),
  );

  // Post-hydration only, so SSR and the first client commit agree (the sibling
  // admin toggles hydrate the same way); the footer's pre-paint reserve
  // (admin-footer-reserve.ts) holds its measured height, so this never shifts.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);

  if (!hydrated) return null;

  return (
    <button
      type="button"
      onClick={() => dispatch(toggleOverlay({ overlayId: "creatorHub" }))}
      className={`shell-nav-item shell-tactile ${isOpen ? "shell-nav-item-active" : ""}`}
      aria-pressed={isOpen}
      aria-label={isOpen ? "Hide creator hub" : "Show creator hub"}
      title={isOpen ? "Hide Creator Hub" : "Show Creator Hub"}
    >
      <span className="shell-nav-icon">
        <Crown size={18} strokeWidth={1.75} />
      </span>
      <span className="shell-nav-label">
        {isOpen ? "Hide Creator Hub" : "Creator Hub"}
      </span>
    </button>
  );
}
