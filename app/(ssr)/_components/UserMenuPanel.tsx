"use client";

// UserMenuPanel — Lazy-loaded dropdown panel for the user menu.
// Only downloads when user opens the menu. Includes: user info, quick actions,
// notifications, feedback (lazy FeedbackDialog), theme toggle, preferences, and sign out.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import {
  User,
  Settings,
  LogOut,
  Sun,
  Moon,
  Zap,
  MessageSquare,
  Bell,
  Bug,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserMenuUser } from "./UserMenuIsland";

const FeedbackDialog = dynamic(() => import("./FeedbackDialog"), {
  ssr: false,
  loading: () => null,
});

interface UserMenuPanelProps {
  user: UserMenuUser | null;
  isAdmin: boolean;
  onClose: () => void;
}

export default function UserMenuPanel({ user, isAdmin, onClose }: UserMenuPanelProps) {
  const [isDark, setIsDark] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggleTheme = useCallback(() => {
    const html = document.documentElement;
    const newDark = !html.classList.contains("dark");
    html.classList.toggle("dark", newDark);
    localStorage.setItem("theme", newDark ? "dark" : "light");
    document.cookie = `theme=${newDark ? "dark" : "light"};path=/;max-age=31536000`;
    setIsDark(newDark);
  }, []);

  const signOut = useCallback(async () => {
    const { supabase } = await import("@/utils/supabase/client");
    await supabase.auth.signOut();
    window.location.href = "/login";
  }, []);

  const itemClass =
    "flex items-center gap-2.5 w-full px-3 py-1.5 text-[0.8125rem] text-foreground rounded-lg cursor-pointer transition-colors hover:bg-[var(--shell-glass-bg-hover)] [&_svg]:w-4 [&_svg]:h-4 [&_svg]:text-muted-foreground [&_svg]:shrink-0";

  if (!user) {
    return (
      <div className="absolute right-0 top-full mt-1.5 w-52 p-1.5 rounded-xl shadow-lg z-50 bg-[var(--shell-glass-bg)] backdrop-blur-[20px] saturate-[1.5] border border-[var(--shell-glass-border)]">
        <Link href="/login" className={itemClass} onClick={onClose}>
          <LogOut /> Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className={cn(
      "absolute right-0 top-full mt-1.5 w-60 p-1.5 rounded-xl shadow-2xl z-50",
      "bg-[var(--shell-glass-bg)] backdrop-blur-[20px] saturate-[1.5] border border-[var(--shell-glass-border)]",
      "max-lg:fixed max-lg:inset-x-3 max-lg:top-auto max-lg:right-3 max-lg:w-auto",
      "max-lg:bottom-[calc(var(--shell-dock-h)+var(--shell-dock-bottom)+env(safe-area-inset-bottom,0px)+0.5rem)]",
      "max-lg:rounded-2xl max-lg:p-2",
    )}>
      {/* User info */}
      <Link
        href="/ssr/settings"
        className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[var(--shell-glass-bg-hover)] transition-colors"
        onClick={onClose}
      >
        {user.avatarUrl ? (
          <Image
            src={user.avatarUrl}
            alt={user.name}
            width={28}
            height={28}
            className="w-7 h-7 rounded-full object-cover shrink-0"
          />
        ) : (
          <span className="w-7 h-7 rounded-full bg-[var(--shell-glass-bg-active)] flex items-center justify-center text-xs font-semibold text-[var(--shell-nav-text)] shrink-0">
            {user.name.charAt(0).toUpperCase()}
          </span>
        )}
        <span className="flex flex-col min-w-0">
          <span className="text-sm font-medium text-foreground truncate">{user.name}</span>
          {user.email && (
            <span className="text-[0.6875rem] text-muted-foreground truncate">{user.email}</span>
          )}
        </span>
      </Link>

      <div className="h-px my-1 mx-2 bg-[var(--shell-glass-border)]" />

      {/* Quick Actions */}
      <Link href="/ssr/chat" className={itemClass} onClick={onClose}>
        <Zap /> Quick Actions
      </Link>
      <Link href="/ssr/messages" className={itemClass} onClick={onClose}>
        <MessageSquare /> Direct Messages
      </Link>
      <button className={itemClass} onClick={onClose}>
        <Bell /> Notifications
      </button>
      <button
        className={itemClass}
        onClick={() => {
          onClose();
          setShowFeedback(true);
        }}
      >
        <Bug /> Submit Feedback
      </button>

      {/* Feedback dialog — lazy loaded, renders as portal-like overlay */}
      {showFeedback && (
        <FeedbackDialog onClose={() => setShowFeedback(false)} />
      )}

      {isAdmin && (
        <>
          <div className="h-px my-1 mx-2 bg-[var(--shell-glass-border)]" />
          <Link
            href="/ssr/admin"
            className={cn(itemClass, "[&_svg]:text-amber-500")}
            onClick={onClose}
          >
            <Shield /> Admin Dashboard
          </Link>
        </>
      )}

      <div className="h-px my-1 mx-2 bg-[var(--shell-glass-border)]" />

      {/* Theme toggle */}
      <button className={itemClass} onClick={toggleTheme}>
        {isDark ? <Sun /> : <Moon />}
        {isDark ? "Light Mode" : "Dark Mode"}
      </button>

      <Link href="/ssr/settings" className={itemClass} onClick={onClose}>
        <Settings /> Preferences
      </Link>

      <div className="h-px my-1 mx-2 bg-[var(--shell-glass-border)]" />

      {/* Sign out */}
      <button
        className={cn(itemClass, "text-destructive [&_svg]:text-destructive")}
        onClick={signOut}
      >
        <LogOut /> Sign Out
      </button>
    </div>
  );
}
