"use client";

/**
 * AiTestModeDock — the tab's AI test mode switch (common-docs/policies/ai-test-mode.md).
 *
 * Real (default) · Replay · Stand-in. Shown only when `GET /ai-test-mode/status`
 * says this person may use test modes right now — or when the tab still asks
 * for one the server has stopped honouring, so that is said plainly. Fixed at
 * the bottom right: it never pushes content and measures nothing. Off Real it
 * turns warning-toned so nobody forgets the answers are saved ones.
 *
 * It also applies a `?ai_test_mode=` URL param (the coding-agent door) and
 * strips it from the address bar without a reload.
 */

import { useEffect, useState, useSyncExternalStore } from "react";
import { FlaskConical } from "lucide-react";
import { SegmentedControl } from "@ai-matrx/design-system/controls";
import { useIsMobile } from "@ai-matrx/kit/media-query";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import { cn } from "@/lib/utils";
import {
  captureAiTestModeFromUrl,
  readAiTestMode,
  setAiTestMode,
  subscribeAiTestMode,
  type AiTestMode,
} from "@/lib/api/ai-test-mode";
import { fetchAiTestModeStatus, type AiTestModeStatus } from "./service";

const MODE_OPTIONS = [
  { value: "real", label: "Real", title: "Real AI calls" },
  { value: "replay", label: "Replay", title: "Same inputs → saved answer" },
  { value: "stand_in", label: "Stand-in", title: "Any saved answer for the job" },
] as const;

/** One read per mode per tab session (the dock re-reads on a mode change only). */
const statusCache = new Map<string, AiTestModeStatus | null>();

function serverRefuses(status: AiTestModeStatus): boolean {
  return status.reason.startsWith("server refuses");
}

/** What the dock shows beside the switch: null when the server does what was asked. */
export function aiTestModeNotice(mode: AiTestMode, status: AiTestModeStatus): string | null {
  if (mode === "real" || status.effective === mode) return null;
  if (serverRefuses(status)) return "Off: switch closed";
  return "Off: not allowed";
}

/** The tab's mode and what the server says about it; `status` null = the switch is absent. */
function useAiTestModeState() {
  const userId = useAppSelector(selectUserId);
  const mode = useSyncExternalStore(subscribeAiTestMode, readAiTestMode, () => "real" as AiTestMode);
  const cacheKey = userId ? `${userId}:${mode}` : null;
  const [status, setStatus] = useState<AiTestModeStatus | null>(() =>
    cacheKey ? (statusCache.get(cacheKey) ?? null) : null,
  );


  useEffect(() => {
    if (!cacheKey) {
      setStatus(null);
      return;
    }
    if (statusCache.has(cacheKey)) {
      setStatus(statusCache.get(cacheKey) ?? null);
      return;
    }
    const controller = new AbortController();
    fetchAiTestModeStatus(controller.signal)
      .then((next) => {
        statusCache.set(cacheKey, next);
        setStatus(next);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        // An unreadable status is never permission: the dock stays absent.
        statusCache.set(cacheKey, null);
        setStatus(null);
      });
    return () => controller.abort();
  }, [cacheKey]);

  const stillAsking = status != null && mode !== "real" && serverRefuses(status);
  const shown = status != null && (status.available || stillAsking);
  return { mode, status: shown ? status : null };
}

/**
 * The same switch as a row in the phone ⋮ sheet (HeaderPhoneOverflow): on a
 * phone nothing floats over the page's composer while the mode is Real.
 */
export function AiTestModeSheetRow() {
  const { mode, status } = useAiTestModeState();
  if (!status) return null;
  const notice = aiTestModeNotice(mode, status);
  return (
    <div
      data-ai-test-mode={mode}
      className="flex min-h-12 w-full items-center gap-3 rounded-lg px-3 py-2"
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center text-muted-foreground">
        <FlaskConical className="h-5 w-5" aria-hidden />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-base text-foreground">AI test mode</span>
        {notice ? <span className="type-secondary text-destructive">{notice}</span> : null}
      </span>
      <SegmentedControl<AiTestMode>
        aria-label="AI test mode"
        value={mode}
        onValueChange={(next) => setAiTestMode(next)}
        data={MODE_OPTIONS}
      />
    </div>
  );
}

export default function AiTestModeDock() {
  const { mode, status } = useAiTestModeState();
  const isPhone = useIsMobile();

  // Collapsed it is one small pill (it floats over bottom-anchored content such as a composer);
  // hover, focus or a tap opens the three choices.
  const [open, setOpen] = useState(false);

  useEffect(() => {
    captureAiTestModeFromUrl();
  }, []);

  if (!status) return null;
  const notice = aiTestModeNotice(mode, status);
  const testing = mode !== "real";
  // A phone keeps the switch in the ⋮ sheet (AiTestModeSheetRow). Only a
  // non-Real mode still floats — a warning nobody may forget — and it sits
  // under the header, clear of the composer at the bottom.
  if (isPhone && !testing) return null;

  const current = MODE_OPTIONS.find((o) => o.value === mode)?.label ?? mode;

  return (
    <div
      data-ai-test-mode={mode}
      data-ai-test-mode-effective={status.effective}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
      className={cn(
        "fixed right-3 z-[55] flex items-center gap-1.5 rounded-full border shadow-lg backdrop-blur",
        isPhone
          ? "top-[calc(var(--shell-header-h,2.75rem)+0.25rem)]"
          : "bottom-[calc(0.5rem+var(--page-bottom-dock-h,0px))]",
        open ? "px-1.5 py-1" : "px-0.5 py-0.5",
        testing
          ? "border-amber-500/70 bg-amber-100/95 text-amber-900 dark:bg-amber-950/90 dark:text-amber-100"
          : "border-border bg-card/95 text-muted-foreground",
      )}
      title={`AI test mode · server: ${status.effective} (${status.reason})`}
    >
      {open ? (
        <>
          <FlaskConical className="ml-1 h-3.5 w-3.5 shrink-0" aria-hidden />
          <SegmentedControl<AiTestMode>
            aria-label="AI test mode"
            value={mode}
            onValueChange={(next) => setAiTestMode(next)}
            data={MODE_OPTIONS}
          />
        </>
      ) : (
        <button
          type="button"
          aria-label={`AI test mode: ${current}`}
          onClick={() => setOpen(true)}
          className="flex h-6 items-center gap-1 rounded-full px-1.5 text-[11px] font-medium"
        >
          <FlaskConical className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {testing ? <span>{current}</span> : null}
        </button>
      )}
      {notice ? (
        <span className="pr-2 text-[11px] font-medium text-destructive">{notice}</span>
      ) : null}
    </div>
  );
}
