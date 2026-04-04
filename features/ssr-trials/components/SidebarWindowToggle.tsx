"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  AppWindow,
  Eye,
  EyeOff,
  Minimize2,
  Maximize2,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  toggleWindowsHidden,
  minimizeAll,
  restoreAll,
  restoreWindow,
  focusWindow,
  selectWindowsHidden,
  selectAllWindows,
  selectAllMinimized,
  type WindowState,
} from "@/lib/redux/slices/windowManagerSlice";

// ─── State dot colours ────────────────────────────────────────────────────────

const STATE_DOT: Record<WindowState, string> = {
  windowed: "bg-emerald-400",
  minimized: "bg-amber-400",
  maximized: "bg-blue-400",
};

const STATE_LABEL: Record<WindowState, string> = {
  windowed: "Open",
  minimized: "Minimized",
  maximized: "Maximized",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function SidebarWindowToggle() {
  const dispatch = useAppDispatch();
  const hidden = useAppSelector(selectWindowsHidden);
  const allMinimized = useAppSelector(selectAllMinimized);
  const windows = useAppSelector(selectAllWindows);
  const hasWindows = windows.length > 0;

  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ x: 0, bottom: 0 });
  const [mounted, setMounted] = useState(false);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Measure trigger and open/close
  const handleToggle = useCallback(() => {
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      // Place menu to the right of the button, growing upward from the button's bottom edge
      setPos({ x: r.right + 8, bottom: window.innerHeight - r.bottom });
    }
    setOpen((v) => !v);
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (
        triggerRef.current?.contains(e.target as Node) ||
        menuRef.current?.contains(e.target as Node)
      )
        return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const act = useCallback((fn: () => void) => {
    fn();
    setOpen(false);
  }, []);

  return (
    <>
      {/* ── Trigger ──────────────────────────────────────────────────────── */}
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        className={cn(
          "shell-nav-item shell-tactile",
          (open || hidden) && "shell-nav-item-active",
        )}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Manage floating windows"
        title="Windows"
      >
        <span className="shell-nav-icon">
          <AppWindow size={18} strokeWidth={1.75} />
        </span>
        <span className="shell-nav-label flex items-center gap-1">
          Windows
          {hasWindows && (
            <span className="ml-1 text-[10px] font-semibold text-muted-foreground/60">
              {windows.length}
            </span>
          )}
        </span>
      </button>

      {/* ── Menu portal — escapes sidebar overflow/transform ─────────────── */}
      {mounted &&
        open &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            className={cn(
              "fixed z-[10000]",
              "w-60 rounded-xl overflow-hidden",
              "bg-card/97 backdrop-blur-xl border border-border shadow-2xl",
              "py-1 text-sm",
            )}
            style={{ left: pos.x, bottom: pos.bottom }}
          >
            {/* ── Visibility ───────────────────────────────────────────────── */}
            <MenuSection label="Visibility" />
            <MenuItem
              icon={
                hidden ? (
                  <Eye className="w-3.5 h-3.5" />
                ) : (
                  <EyeOff className="w-3.5 h-3.5" />
                )
              }
              label={hidden ? "Show All Windows" : "Hide All Windows"}
              description={
                hidden
                  ? "Make all windows visible again"
                  : "Keep windows running, hide from view"
              }
              onClick={() => act(() => dispatch(toggleWindowsHidden()))}
              disabled={!hasWindows}
            />

            {/* ── Arrange ──────────────────────────────────────────────────── */}
            <MenuDivider />
            <MenuSection label="Arrange" />
            <MenuItem
              icon={<Minimize2 className="w-3.5 h-3.5" />}
              label="Minimize All"
              description="Collapse all open windows to the tray"
              onClick={() =>
                act(() =>
                  dispatch(
                    minimizeAll({
                      viewportWidth: window.innerWidth,
                      viewportHeight: window.innerHeight,
                    }),
                  ),
                )
              }
              disabled={!hasWindows || allMinimized}
            />
            <MenuItem
              icon={<Maximize2 className="w-3.5 h-3.5" />}
              label="Restore All"
              description="Return all windows to their last size"
              onClick={() => act(() => dispatch(restoreAll()))}
              disabled={!hasWindows || !allMinimized}
            />

            {/* ── Per-window list ───────────────────────────────────────────── */}
            {hasWindows ? (
              <>
                <MenuDivider />
                <MenuSection label="Windows" />
                {windows.map((win) => (
                  <button
                    key={win.id}
                    type="button"
                    role="menuitem"
                    className="flex items-center gap-2.5 w-full px-3 py-1.5 hover:bg-accent transition-colors text-left text-foreground/80"
                    onClick={() =>
                      act(() => {
                        if (win.state === "minimized")
                          dispatch(restoreWindow(win.id));
                        dispatch(focusWindow(win.id));
                        if (hidden) dispatch(toggleWindowsHidden());
                      })
                    }
                  >
                    <span
                      className={cn(
                        "w-2 h-2 rounded-full shrink-0",
                        STATE_DOT[win.state],
                      )}
                      title={STATE_LABEL[win.state]}
                    />
                    <span className="flex-1 truncate text-xs font-medium">
                      {win.title}
                    </span>
                    <span className="text-[10px] text-muted-foreground/50 shrink-0">
                      {STATE_LABEL[win.state]}
                    </span>
                    <ChevronRight className="w-3 h-3 text-muted-foreground/30 shrink-0" />
                  </button>
                ))}
              </>
            ) : (
              <p className="px-3 py-2 text-xs text-muted-foreground/50 italic">
                No windows open
              </p>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}

// ─── Menu primitives ──────────────────────────────────────────────────────────

function MenuSection({ label }: { label: string }) {
  return (
    <div className="px-3 pt-1.5 pb-0.5 text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider">
      {label}
    </div>
  );
}

function MenuDivider() {
  return <div className="border-t border-border/50 my-1" />;
}

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  description?: string;
  onClick: () => void;
  disabled?: boolean;
}

function MenuItem({
  icon,
  label,
  description,
  onClick,
  disabled,
}: MenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      className={cn(
        "flex items-start gap-2.5 w-full px-3 py-1.5 transition-colors text-left",
        disabled
          ? "opacity-40 cursor-not-allowed"
          : "hover:bg-accent cursor-pointer text-foreground/80",
      )}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
    >
      <span className="mt-0.5 shrink-0 text-muted-foreground">{icon}</span>
      <span className="flex flex-col min-w-0">
        <span className="text-xs font-medium leading-tight">{label}</span>
        {description && (
          <span className="text-[10px] text-muted-foreground/60 leading-tight mt-0.5">
            {description}
          </span>
        )}
      </span>
    </button>
  );
}
