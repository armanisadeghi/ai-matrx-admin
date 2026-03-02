"use client";

// UserMenuIsland — Client island for the user dropdown menu.
// Renders hamburger + avatar trigger (lightweight, instant).
// Dropdown panel is lazy-loaded via dynamic import — zero cost until opened.

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";

const UserMenuPanel = dynamic(() => import("./UserMenuPanel"), {
  ssr: false,
  loading: () => null,
});

export interface UserMenuUser {
  name: string;
  email?: string;
  avatarUrl?: string;
}

interface UserMenuIslandProps {
  user: UserMenuUser | null;
  isAdmin: boolean;
}

export default function UserMenuIsland({ user, isAdmin }: UserMenuIslandProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      {/* Transparent 44px tap target wrapper */}
      <div className="flex items-center justify-center w-[60px] h-11">
      <button
        className={cn(
          "shell-auth-island shell-glass shell-tactile cursor-pointer",
          open && "!bg-[var(--shell-glass-bg-active)]",
        )}
        onClick={() => setOpen(!open)}
        aria-label="User menu"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {/* Mini hamburger */}
        <span className="flex flex-col items-center justify-center w-4 h-4 gap-[2.5px]">
          <span
            className={cn(
              "w-2.5 h-[1.5px] rounded-sm transition-transform duration-200",
              open ? "translate-y-[4px] rotate-45" : "",
            )}
            style={{ background: "var(--shell-nav-icon-hover)" }}
          />
          <span
            className={cn(
              "w-2.5 h-[1.5px] rounded-sm transition-opacity duration-150",
              open ? "opacity-0" : "",
            )}
            style={{ background: "var(--shell-nav-icon-hover)" }}
          />
          <span
            className={cn(
              "w-2.5 h-[1.5px] rounded-sm transition-transform duration-200",
              open ? "-translate-y-[4px] -rotate-45" : "",
            )}
            style={{ background: "var(--shell-nav-icon-hover)" }}
          />
        </span>

        {/* Avatar */}
        {user?.avatarUrl ? (
          <Image
            src={user.avatarUrl}
            alt={user.name}
            width={22}
            height={22}
            className="w-[22px] h-[22px] rounded-full object-cover"
          />
        ) : (
          <span
            className="w-[22px] h-[22px] rounded-full bg-[var(--shell-glass-bg-active)] flex items-center justify-center text-[10px] font-semibold text-[var(--shell-nav-text)]"
          >
            {user?.name?.charAt(0)?.toUpperCase() ?? "?"}
          </span>
        )}
      </button>
      </div>

      {/* Dropdown panel — lazy loaded */}
      {open && (
        <UserMenuPanel
          user={user}
          isAdmin={isAdmin}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
