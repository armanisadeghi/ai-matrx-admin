"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import {
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
import { useAppSelector } from "@/lib/redux/hooks";
import { selectUser, selectIsAdmin } from "@/lib/redux/slices/userSlice";

const FeedbackDialog = dynamic(() => import("./FeedbackDialog"), {
  ssr: false,
  loading: () => null,
});

function closeMenu() {
  const cb = document.getElementById("shell-user-menu") as HTMLInputElement | null;
  if (cb) cb.checked = false;
}

export default function UserMenuPanel() {
  const reduxUser = useAppSelector(selectUser);
  const isAdmin = useAppSelector(selectIsAdmin) ?? false;

  const user = reduxUser?.id ? {
    name: reduxUser.userMetadata?.name || reduxUser.email?.split("@")[0] || "User",
    email: reduxUser.email ?? undefined,
    avatarUrl: reduxUser.userMetadata?.avatarUrl ?? undefined,
  } : null;

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
    "flex items-center gap-2.5 w-full px-3 py-1.5 text-sm text-foreground rounded-full cursor-pointer transition-colors hover:bg-[var(--shell-glass-bg-hover)] [&_svg]:w-4 [&_svg]:h-4 [&_svg]:text-foreground [&_svg]:shrink-0";

  if (!user) {
    return (
      <div className="matrx-glass-core w-52 p-1.5 rounded-xl shadow-2xl">
        <Link href="/login" className={itemClass} onClick={closeMenu}>
          <LogOut /> Sign In
        </Link>
      </div>
    );
  }

  return (
    <div
      className="matrx-glass-core w-60 max-lg:w-auto p-1.5 rounded-xl max-lg:rounded-2xl max-lg:p-2 shadow-2xl"
    >
      <Link
        href="/ssr/settings"
        className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[var(--shell-glass-bg-hover)] transition-colors"
        onClick={closeMenu}
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
          <span className="text-base font-medium text-foreground truncate">
            {user.name}
          </span>
          {user.email && (
            <span className="text-xs text-foreground truncate">
              {user.email}
            </span>
          )}
        </span>
      </Link>

      <div className="h-px my-1 mx-2 bg-[var(--shell-glass-border)]" />

      <Link href="/ssr/chat" className={itemClass} onClick={closeMenu}>
        <Zap /> Quick Actions
      </Link>
      <Link href="/ssr/messages" className={itemClass} onClick={closeMenu}>
        <MessageSquare /> Direct Messages
      </Link>
      <button className={itemClass} onClick={closeMenu}>
        <Bell /> Notifications
      </button>
      <button
        className={itemClass}
        onClick={() => {
          closeMenu();
          setShowFeedback(true);
        }}
      >
        <Bug /> Submit Feedback
      </button>

      {showFeedback && (
        <FeedbackDialog onClose={() => setShowFeedback(false)} />
      )}

      {isAdmin && (
        <>
          <div className="h-px my-1 mx-2 bg-[var(--shell-glass-border)]" />
          <Link
            href="/ssr/admin"
            className={cn(itemClass, "[&_svg]:text-amber-500")}
            onClick={closeMenu}
          >
            <Shield /> Admin Dashboard
          </Link>
        </>
      )}

      <div className="h-px my-1 mx-2 bg-[var(--shell-glass-border)]" />

      <button className={itemClass} onClick={toggleTheme}>
        {isDark ? <Sun /> : <Moon />}
        {isDark ? "Light Mode" : "Dark Mode"}
      </button>

      <Link href="/ssr/settings" className={itemClass} onClick={closeMenu}>
        <Settings /> Preferences
      </Link>

      <div className="h-px my-1 mx-2 bg-[var(--shell-glass-border)]" />

      <button
        className={cn(itemClass, "text-destructive [&_svg]:text-destructive")}
        onClick={signOut}
      >
        <LogOut /> Sign Out
      </button>
    </div>
  );
}
