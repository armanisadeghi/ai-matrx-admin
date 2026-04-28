"use client";

/**
 * Auth Session Watcher — heavy body (Impl).
 *
 * Renders the full-screen "Session Expired" overlay (lucide + Button +
 * router). Lazy-loaded by `AuthSessionWatcher.tsx` ONLY when the auth
 * listener fires `SIGNED_OUT`, so the modal's dep graph never enters the
 * static graph of any route.
 */

import { useRouter } from "next/navigation";
import { LogIn, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AuthSessionWatcherImpl() {
  const router = useRouter();
  const handleSignIn = () => {
    router.push("/login");
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-6 max-w-sm w-full mx-4 p-8 rounded-2xl border border-border bg-card shadow-2xl text-center">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-warning/10">
          <AlertTriangle className="w-8 h-8 text-warning" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">
            Session Expired
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your session has timed out. Please sign in again to continue — your
            work is saved.
          </p>
        </div>

        <Button onClick={handleSignIn} className="w-full gap-2" size="lg">
          <LogIn className="w-4 h-4" />
          Sign In Again
        </Button>
      </div>
    </div>
  );
}
