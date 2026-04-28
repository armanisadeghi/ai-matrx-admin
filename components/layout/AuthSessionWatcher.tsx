"use client";

/**
 * Auth Session Watcher — thin client shell.
 *
 * Subscribes to `supabase.auth.onAuthStateChange` immediately on mount
 * (the listener has to be active before the user can sign out). Only
 * the lightweight Supabase client + listener setup live in this file.
 *
 * The full-screen "Session Expired" overlay (lucide icons, Button, the
 * dialog markup) lives in `AuthSessionWatcherImpl.tsx` and is
 * `next/dynamic`-loaded ONLY on `SIGNED_OUT` — i.e. nearly never — so
 * the modal's dep graph never enters the static graph of any route.
 */

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { supabase } from "@/utils/supabase/client";

const AuthSessionWatcherImpl = dynamic(
  () => import("./AuthSessionWatcherImpl"),
  { ssr: false, loading: () => null },
);

export default function AuthSessionWatcher() {
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setSessionExpired(true);
      }
      if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        setSessionExpired(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  if (!sessionExpired) return null;
  return <AuthSessionWatcherImpl />;
}
