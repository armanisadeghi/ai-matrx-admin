"use client";

// The support window's countdown. Renders only in a browser that redeemed a support link (it holds
// SUPPORT_SESSION_COOKIE), so nobody else pays a request. The database is the clock: it is asked on
// mount and every minute (an admin may end the session from the console), and at zero the session
// is closed there and this window signs out. Floats over the page; never moves content.

import { useEffect, useState } from "react";
import { Clock, LifeBuoy, Loader2, Plus, X } from "lucide-react";
import { Button } from "@ai-matrx/design-system/controls";
import { confirm } from "@/components/dialogs/confirm/ConfirmDialogHost";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { performLocalSignOut } from "@/features/shell/auth/useSignOut";
import {
  SUPPORT_SESSION_ENDED_PATH,
  SUPPORT_SESSION_EXTEND_MINUTES,
  clearSupportSessionCookie,
  currentSupportSession,
  endSupportSession,
  extendSupportSession,
  hasSupportSessionCookie,
  type CurrentSupportSession,
} from "./service";

const RECHECK_MS = 60_000;
const ENDING_SOON_SECONDS = 120;

function formatLeft(seconds: number): string {
  const s = Math.max(0, seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(h > 0 ? 2 : 1, "0");
  return `${h > 0 ? `${h}:` : ""}${mm}:${String(sec).padStart(2, "0")}`;
}

async function leave(why: "ended" | "expired") {
  clearSupportSessionCookie();
  await performLocalSignOut(`${SUPPORT_SESSION_ENDED_PATH}?why=${why}`);
}

export default function SupportSessionPill() {
  const [session, setSession] = useState<CurrentSupportSession | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState<"extend" | "end" | null>(null);

  // Ask the database on mount and every minute.
  useEffect(() => {
    if (!hasSupportSessionCookie()) return;
    let active = true;
    const check = async () => {
      try {
        const current = await currentSupportSession();
        if (!active) return;
        if (!current) {
          // This sign-in is not a support session (the cookie outlived it): nothing to show.
          clearSupportSessionCookie();
          setSession(null);
          return;
        }
        if (current.status !== "active") {
          const ranOut = current.expires_at !== null && new Date(current.expires_at).getTime() <= Date.now();
          await leave(ranOut ? "expired" : "ended");
          return;
        }
        setSession(current);
      } catch (error) {
        console.error("[support-session] status check failed:", error);
      }
    };
    void check();
    const timer = window.setInterval(() => void check(), RECHECK_MS);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  // The visible second hand.
  useEffect(() => {
    if (!session) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [session]);

  const secondsLeft = session?.expires_at
    ? Math.round((new Date(session.expires_at).getTime() - now) / 1000)
    : null;

  // At zero the database closes it (support_session_current ends an expired session) and we leave.
  useEffect(() => {
    if (secondsLeft === null || secondsLeft > 0) return;
    void currentSupportSession()
      .catch((error) => console.error("[support-session] closing at zero failed:", error))
      .finally(() => void leave("expired"));
  }, [secondsLeft]);

  if (!session || secondsLeft === null) return null;

  const endingSoon = secondsLeft <= ENDING_SOON_SECONDS;

  const extend = async () => {
    setBusy("extend");
    try {
      const expiresAt = await extendSupportSession(session.id, SUPPORT_SESSION_EXTEND_MINUTES);
      setSession({ ...session, expires_at: expiresAt });
      toast.success(`Added ${SUPPORT_SESSION_EXTEND_MINUTES} minutes`);
    } catch (error) {
      toast.error(`Could not add time: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setBusy(null);
    }
  };

  const end = async () => {
    const ok = await confirm({
      title: "End support session?",
      description: "This window signs out now.",
      confirmLabel: "End session",
      variant: "destructive",
    });
    if (!ok) return;
    setBusy("end");
    try {
      await endSupportSession(session.id);
      await leave("ended");
    } catch (error) {
      setBusy(null);
      toast.error(`Could not end the session: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-2 z-[70] flex justify-center px-4"
      data-support-session={session.id}
    >
      <div
        className={cn(
          "pointer-events-auto flex items-center gap-2 rounded-full border py-1 pl-3 pr-1 shadow-lg",
          endingSoon
            ? "border-destructive bg-destructive text-destructive-foreground"
            : "border-warning bg-warning text-warning-foreground",
        )}
        title={`Started by ${session.admin_email ?? "a super admin"} · ${session.reason}`}
      >
        <LifeBuoy className="h-4 w-4 shrink-0" aria-hidden />
        <span className="text-sm font-medium">Support session</span>
        <span className="max-w-48 truncate text-sm">as {session.target_email}</span>
        <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="font-mono text-sm tabular-nums" aria-live="polite">
          {formatLeft(secondsLeft)}
        </span>
        <Button
          variant="outline"
          icon={busy === "extend" ? <Loader2 className="animate-spin" /> : <Plus />}
          disabled={busy !== null}
          onClick={() => void extend()}
        >
          {SUPPORT_SESSION_EXTEND_MINUTES} min
        </Button>
        <Button
          variant="outline"
          icon={busy === "end" ? <Loader2 className="animate-spin" /> : <X />}
          disabled={busy !== null}
          onClick={() => void end()}
        >
          End
        </Button>
      </div>
    </div>
  );
}
