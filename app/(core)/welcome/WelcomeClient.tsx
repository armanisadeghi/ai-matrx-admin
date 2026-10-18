"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Webhook,
  MessageCircle,
  NotebookPen,
  FolderOpen,
  Mic,
  FileSpreadsheet,
  FileText,
  ArrowRight,
  LayoutGrid,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { supabase } from "@/utils/supabase/client";
import { ONBOARDING_METADATA_KEY } from "@/utils/onboarding";
import { Button } from "@ai-matrx/design-system/controls";
import { WelcomeDoor } from "@/features/marketing/smart-add/welcome/WelcomeDoor";
import { MeetMatrx } from "@/features/onboarding/meet-matrx/meetMatrx";
import { WelcomeAgeStep, ageStillNeeded } from "@/features/onboarding/welcome-steps/WelcomeAgeStep";
import {
  MEET_MATRX_SEEN_KEY,
  firstStep,
  nextStep,
  type WelcomeStep,
} from "@/features/onboarding/welcome-steps/welcomeSteps";

interface WelcomeOption {
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
  /** Tailwind gradient stops for the icon tile. */
  gradient: string;
}

const OPTIONS: WelcomeOption[] = [
  {
    label: "Make something",
    description: "Forms, tables, booking pages and more",
    href: "/make",
    icon: LayoutGrid,
    gradient: "from-cyan-500 to-cyan-700",
  },
  {
    label: "Organization",
    description: "Set up your team and shared workspace",
    href: "/organizations",
    icon: Building2,
    gradient: "from-sky-500 to-sky-700",
  },
  {
    label: "Agents",
    description: "Browse and run AI agents built for your work",
    href: "/agents/all",
    icon: Webhook,
    gradient: "from-blue-500 to-blue-700",
  },
  {
    label: "Chat",
    description: "Start a conversation with an AI assistant",
    href: "/chat/new",
    icon: MessageCircle,
    gradient: "from-violet-500 to-violet-700",
  },
  {
    label: "Notes",
    description: "Capture ideas and keep them organized",
    href: "/notes",
    icon: NotebookPen,
    gradient: "from-amber-500 to-amber-700",
  },
  {
    label: "Files",
    description: "Browse and manage your files and documents",
    href: "/files/all",
    icon: FolderOpen,
    gradient: "from-cyan-500 to-cyan-700",
  },
  {
    label: "Transcripts",
    description: "Record, transcribe, and manage audio",
    href: "/transcripts",
    icon: Mic,
    gradient: "from-orange-500 to-orange-700",
  },
  {
    label: "Sheets",
    description: "Spreadsheets your agents can read and fill",
    href: "/workbooks",
    icon: FileSpreadsheet,
    gradient: "from-emerald-500 to-emerald-700",
  },
  {
    label: "Docs",
    description: "Create and collaborate on documents",
    href: "/documents",
    icon: FileText,
    gradient: "from-rose-500 to-rose-700",
  },
];

export function WelcomeClient({
  firstName,
  newUser,
  foundAsked = false,
  meetSeen,
}: {
  firstName: string | null;
  newUser: boolean;
  /** `/welcome?found=1`: the "here's what we found" step, only when asked for (it never blocks the way in). */
  foundAsked?: boolean;
  meetSeen: boolean;
}) {
  const router = useRouter();
  // One step on screen at a time. The server already knows the start (new account / met Matrx), so there is no flash.
  const [step, setStep] = useState<WelcomeStep>(() => firstStep({ newUser, meetSeen, foundAsked }));
  const [met, setMet] = useState(meetSeen);
  // Whether the age question is still owed: read while the identity step is on screen, so the age step is already
  // decided when it is reached. Only a new account is ever walked through it here.
  const [ageNeeded, setAgeNeeded] = useState<boolean | null>(null);
  useEffect(() => {
    if (!newUser) return;
    let live = true;
    void ageStillNeeded().then((n) => live && setAgeNeeded(n));
    return () => {
      live = false;
    };
  }, [newUser]);
  const afterAge = useCallback(() => setStep(nextStep("age", met)), [met]);

  /**
   * Remembered for this person on the server (their account record), not this browser. The server reads the
   * signed token's claims, so the session is refreshed at once: the next page load already carries the new value.
   */
  async function rememberMet() {
    const { error } = await supabase.auth.updateUser({ data: { [MEET_MATRX_SEEN_KEY]: true } });
    if (error) {
      toast.error(`Could not save your progress: ${error.message}`);
      return;
    }
    await supabase.auth.refreshSession();
  }

  /** Leaving Meet Matrx, either way, is remembered. */
  async function leaveMeet() {
    setMet(true);
    setStep("start");
    await rememberMet();
  }
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);
  const [isNavPending, startNav] = useTransition();
  const [finishing, setFinishing] = useState(false);

  const busy = isNavPending || finishing;

  /**
   * Picking a place to start IS finishing the welcome: the flag is written first, so /dashboard never funnels the
   * person back here (until 2026-10-18 no tile wrote it — every new account that later opened /dashboard landed on
   * /welcome again). A failed write still takes them where they asked; it only says so.
   */
  async function go(href: string) {
    if (busy) return;
    setNavigatingTo(href);
    setFinishing(true);
    try {
      const { error } = await supabase.auth.updateUser({ data: { [ONBOARDING_METADATA_KEY]: true } });
      if (error) toast.error(`Could not save your progress: ${error.message}`);
      else await supabase.auth.refreshSession();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save your progress.");
    }
    startNav(() => {
      router.push(href);
    });
  }

  return (
    <div className="h-full overflow-hidden bg-textured pt-[var(--shell-header-h)]">
      <div className="h-full overflow-y-auto">
        <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col justify-center px-5 py-12 sm:py-16">
          {step === "identity" ? (
            // A new account: "here's what we found" (or one name field) from the login alone. Its Skip / Looks right
            // moves on; a name the login already gives is never asked for.
            <WelcomeDoor showDoor onFinished={() => setStep(nextStep("identity", met, ageNeeded))} />
          ) : null}
          {step === "age" ? <WelcomeAgeStep needed={ageNeeded} onDone={afterAge} /> : null}
          {step === "meet" ? (
            <div
              className="flex flex-col gap-8"
              data-welcome-step="meet"
              // Opening one of the pieces also counts as having met Matrx: it is remembered, the step is left behind.
              onClickCapture={(e) => {
                if (!met && (e.target as HTMLElement).closest("[data-intro-item]")) {
                  setMet(true);
                  void rememberMet();
                }
              }}
            >
              <MeetMatrx eyebrow={firstName ? `Welcome, ${firstName}` : "Welcome to AI Matrx"} />
              <div className="sticky bottom-0 z-10 -mx-5 flex items-center justify-center gap-2 bg-gradient-to-t from-background via-background/90 to-transparent px-5 pb-4 pt-6" data-testid="meet-actions">
                <Button variant="primary" hero icon={<ArrowRight aria-hidden />} onClick={() => void leaveMeet()} data-testid="meet-continue">
                  Continue
                </Button>
                <Button variant="quiet" onClick={() => void leaveMeet()} data-testid="meet-later">
                  Later
                </Button>
              </div>
            </div>
          ) : null}
          {step === "start" ? (
          <div className="mx-auto w-full max-w-3xl" data-welcome-step="start">
          <header className="text-center">
            <h1 className="text-xl font-semibold text-foreground">Pick a place to start</h1>
          </header>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {OPTIONS.map((option) => {
              const Icon = option.icon;
              const isTarget = navigatingTo === option.href && busy;
              return (
                <button
                  key={option.href}
                  type="button"
                  onClick={() => void go(option.href)}
                  disabled={busy}
                  className="group relative flex cursor-pointer items-center gap-4 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[22%] bg-gradient-to-br ${option.gradient} text-white shadow-sm ring-1 ring-white/10`}
                  >
                    {isTarget ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      <Icon className="h-6 w-6" strokeWidth={1.75} />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-foreground">
                      {option.label}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {option.description}
                    </span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                </button>
              );
            })}
          </div>
          </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
