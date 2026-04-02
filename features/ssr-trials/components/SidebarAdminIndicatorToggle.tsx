"use client";

import { Bug } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { selectIsAdmin } from "@/lib/redux/slices/userSlice";
import {
  selectIsOverlayOpen,
  toggleOverlay,
} from "@/lib/redux/slices/overlaySlice";

export default function SidebarAdminIndicatorToggle() {
  const dispatch = useAppDispatch();
  const isAdmin = useAppSelector(selectIsAdmin) ?? false;
  const isIndicatorOpen = useAppSelector((state) =>
    selectIsOverlayOpen(state, "adminIndicator"),
  );

  if (!isAdmin) return null;

  return (
    <button
      type="button"
      onClick={() => dispatch(toggleOverlay({ overlayId: "adminIndicator" }))}
      className={`shell-nav-item shell-tactile ${isIndicatorOpen ? "shell-nav-item-active" : ""}`}
      aria-pressed={isIndicatorOpen}
      aria-label={
        isIndicatorOpen ? "Hide admin indicator" : "Show admin indicator"
      }
      title={isIndicatorOpen ? "Hide Admin Indicator" : "Show Admin Indicator"}
    >
      <span className="shell-nav-icon">
        <Bug size={18} strokeWidth={1.75} />
      </span>
      <span className="shell-nav-label">
        {isIndicatorOpen ? "Hide Indicator" : "Show Indicator"}
      </span>
    </button>
  );
}
