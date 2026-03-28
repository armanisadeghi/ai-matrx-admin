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
  MessageSquare,
  Bell,
  Bug,
  Shield,
  Eye,
  EyeOff,
  StickyNote,
  CheckSquare,
  Database,
  LayoutGrid,
  FolderOpen,
  Sparkles,
  Megaphone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import { selectUser, selectIsAdmin } from "@/lib/redux/slices/userSlice";
import {
  selectIsOverlayOpen,
  toggleOverlay,
  openOverlay,
  openUserPreferences,
  openAnnouncements,
} from "@/lib/redux/slices/overlaySlice";

const FeedbackDialog = dynamic(() => import("./FeedbackDialog"), {
  ssr: false,
  loading: () => null,
});

function closeMenu() {
  const cb = document.getElementById(
    "shell-user-menu",
  ) as HTMLInputElement | null;
  if (cb) cb.checked = false;
}

export default function UserMenuPanel() {
  const dispatch = useAppDispatch();
  const reduxUser = useAppSelector(selectUser);
  const isAdmin = useAppSelector(selectIsAdmin) ?? false;
  const isAdminIndicatorOpen = useAppSelector((state) =>
    selectIsOverlayOpen(state, "adminIndicator"),
  );

  const openQuickNotes = useCallback(() => {
    dispatch(openOverlay({ overlayId: "quickNotes" }));
    closeMenu();
  }, [dispatch]);

  const openQuickTasks = useCallback(() => {
    dispatch(openOverlay({ overlayId: "quickTasks" }));
    closeMenu();
  }, [dispatch]);

  const openQuickChat = useCallback(() => {
    dispatch(openOverlay({ overlayId: "quickChat" }));
    closeMenu();
  }, [dispatch]);

  const openQuickData = useCallback(() => {
    dispatch(openOverlay({ overlayId: "quickData" }));
    closeMenu();
  }, [dispatch]);

  const openQuickFiles = useCallback(() => {
    dispatch(openOverlay({ overlayId: "quickFiles" }));
    closeMenu();
  }, [dispatch]);

  const openQuickUtilities = useCallback(() => {
    dispatch(openOverlay({ overlayId: "quickUtilities" }));
    closeMenu();
  }, [dispatch]);

  const openQuickAIResults = useCallback(() => {
    dispatch(openOverlay({ overlayId: "quickAIResults" }));
    closeMenu();
  }, [dispatch]);

  const handleOpenPreferences = useCallback(() => {
    dispatch(openUserPreferences());
    closeMenu();
  }, [dispatch]);

  const handleOpenAnnouncements = useCallback(() => {
    dispatch(openAnnouncements());
    closeMenu();
  }, [dispatch]);

  const user = reduxUser?.id
    ? {
        name:
          reduxUser.userMetadata?.name ||
          reduxUser.email?.split("@")[0] ||
          "User",
        email: reduxUser.email ?? undefined,
        avatarUrl: reduxUser.userMetadata?.avatarUrl ?? undefined,
      }
    : null;

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
    <div className="matrx-glass-core w-60 max-lg:w-auto p-1.5 rounded-xl max-lg:rounded-2xl max-lg:p-2 shadow-2xl">
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

      <button className={itemClass} onClick={openQuickNotes}>
        <StickyNote /> Quick Note
      </button>
      <button className={itemClass} onClick={openQuickTasks}>
        <CheckSquare /> Quick Task
      </button>
      <button className={itemClass} onClick={openQuickChat}>
        <MessageSquare /> Quick Chat
      </button>
      <button className={itemClass} onClick={openQuickData}>
        <Database /> Quick Data
      </button>
      <button className={itemClass} onClick={openQuickFiles}>
        <FolderOpen /> Quick Files
      </button>
      <button className={itemClass} onClick={openQuickAIResults}>
        <Sparkles /> AI Results
      </button>
      <button className={itemClass} onClick={openQuickUtilities}>
        <LayoutGrid /> Utilities Hub
      </button>

      <div className="h-px my-1 mx-2 bg-[var(--shell-glass-border)]" />

      <Link href="/messages" className={itemClass} onClick={closeMenu}>
        <MessageSquare /> Direct Messages
      </Link>
      <button className={itemClass} onClick={closeMenu}>
        <Bell /> Notifications
      </button>
      <button className={itemClass} onClick={handleOpenAnnouncements}>
        <Megaphone /> Announcements
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
            href="/administration"
            className={cn(itemClass, "[&_svg]:text-amber-500")}
            onClick={closeMenu}
          >
            <Shield /> Admin Dashboard
          </Link>
          <button
            className={cn(itemClass, "[&_svg]:text-amber-500")}
            onClick={() => {
              dispatch(toggleOverlay({ overlayId: "adminIndicator" }));
              closeMenu();
            }}
          >
            {isAdminIndicatorOpen ? <EyeOff /> : <Eye />}
            {isAdminIndicatorOpen ? "Hide" : "Show"} Admin Indicator
          </button>
        </>
      )}

      <div className="h-px my-1 mx-2 bg-[var(--shell-glass-border)]" />

      <button className={itemClass} onClick={toggleTheme}>
        {isDark ? <Sun /> : <Moon />}
        {isDark ? "Light Mode" : "Dark Mode"}
      </button>

      <button className={itemClass} onClick={handleOpenPreferences}>
        <Settings /> Preferences
      </button>

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
