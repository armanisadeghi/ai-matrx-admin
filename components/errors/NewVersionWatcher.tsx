"use client";

// NewVersionWatcher — the consent-based "a new version is available" prompt.
//
// Mounted once in app/layout.tsx. Three prompt paths, one quiet corner toast
// (Supabase-style: message + "Not now" / "Refresh"), and — non-negotiable —
// it NEVER refreshes on its own. The user decides. See components/errors/FEATURE.md.
//
//   1. Proactive: this deployment's id is baked in server-side as a prop; we
//      ask /api/version (custom fetches are not pinned by Vercel Skew
//      Protection, so it always answers from the latest deployment) and prompt
//      when the ids diverge. NEVER on mount (owner rule, 2026-10-16): the first
//      check (and the min-supported-version read) runs once the page has fully
//      settled (lib/boot/lateIdle); after that only when the person comes back
//      to the tab (shown / focus) or presses in it, at most every
//      POLL_INTERVAL_MS. No background interval.
//   2. Reactive: the "matrx:chunk-load-error" window event (from the boot script's
//      global listeners or notifyChunkLoadError) means a required module fetch
//      failed — prompt immediately with firmer, cause-neutral copy.
//   3. Directed: the "matrx:refresh-required" window event means the PLATFORM
//      asked this session to consider refreshing — a `refresh_required`
//      directive off the server bus (lib/client-directives/). It carries optional
//      operator copy. It is still an ASK: the same toast, the same buttons,
//      the same never-on-its-own law. See components/errors/refresh-directive.ts.
//
// It also raises the __MATRX_APP_BOOTED__ flag that forbids the pre-hydration
// boot script from ever reloading a live session.

import { useEffect, useRef } from "react";
import { whenEngagedLate } from "@/lib/boot/engagedLate";
import { noteHardNavigationReason } from "@/lib/diagnostics/hardNavigationTrace";
import { toast } from "@/lib/toast";
import { readAppConfigKey } from "@/lib/config-attestation/appConfig";
import { APP_VERSION_META } from "@/lib/config-attestation/meta";
import { configAttestationCounters, noteConfigMissing } from "@/lib/config-attestation/readLedger";
import {
  APP_BOOTED_FLAG,
  CHUNK_LOAD_ERROR_EVENT,
} from "@ai-matrx/kit/chunk-load-recovery";
import {
  REFRESH_REQUIRED_EVENT,
  type RefreshRequiredDetail,
} from "@/components/errors/refresh-directive";

const POLL_INTERVAL_MS = 5 * 60_000;

/** Numeric dotted-version compare: -1 / 0 / 1. Non-numeric parts compare as 0. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map((x) => Number.parseInt(x, 10) || 0);
  const pb = b.split(".").map((x) => Number.parseInt(x, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d < 0 ? -1 : 1;
  }
  return 0;
}
/** After "Not now", stay quiet this long (chunk errors re-prompt sooner). */
const SNOOZE_MS = 30 * 60_000;
const TOAST_ID = "matrx-new-version";

interface NewVersionWatcherProps {
  /** This deployment's id, read server-side from VERCEL_DEPLOYMENT_ID.
   *  Null locally / self-hosted → polling disabled (chunk-error path stays). */
  deploymentId: string | null;
}

export function NewVersionWatcher({ deploymentId }: NewVersionWatcherProps) {
  const snoozedUntilRef = useRef(0);
  const lastCheckRef = useRef(0);
  const promptedRef = useRef(false);

  useEffect(() => {
    (window as unknown as Record<string, boolean>)[APP_BOOTED_FLAG] = true;

    const showPrompt = (
      kind: "deploy" | "chunk" | "directive",
      copy?: { title?: string | null; body?: string | null },
    ) => {
      // A chunk error means the page is actively degrading — it overrides a
      // "Not now" snooze from the gentler deploy prompt. A platform directive
      // is deliberate and rare, so it overrides the snooze too.
      if (kind === "deploy" && Date.now() < snoozedUntilRef.current) return;
      promptedRef.current = true;
      const title =
        kind === "chunk"
          ? "Part of this page failed to load"
          : (copy?.title ?? "A new version is available");
      const description =
        kind === "chunk"
          ? "Refresh to retry. Unsaved work is kept until you do."
          : (copy?.body ?? "Refresh to see the latest changes.");
      toast(
        title,
        {
          id: TOAST_ID,
          description,
          duration: Infinity,
          action: {
            label: "Refresh",
            onClick: () => {
              noteHardNavigationReason(`new-version-refresh:${kind}`);
              window.location.reload();
            },
          },
          cancel: {
            label: "Not now",
            onClick: () => {
              snoozedUntilRef.current = Date.now() + SNOOZE_MS;
              // Resume polling so the prompt can return after the snooze.
              promptedRef.current = false;
            },
          },
        },
      );
    };

    const onChunkLoadError = () => showPrompt("chunk");
    window.addEventListener(CHUNK_LOAD_ERROR_EVENT, onChunkLoadError);

    // The platform directive door. Unlike the two detection paths above it is
    // not a guess — something on the platform decided this session should be
    // asked — so it works with or without a deployment id (i.e. locally too).
    const onRefreshRequired = (event: Event) => {
      const detail = (event as CustomEvent<RefreshRequiredDetail>).detail;
      showPrompt("directive", { title: detail?.title, body: detail?.body });
    };
    window.addEventListener(REFRESH_REQUIRED_EVENT, onRefreshRequired);

    // MINIMUM SUPPORTED VERSION (config attestation, 2026-10-15): the `ai-matrx` row's
    // `min_supported_app_version`, read through the one app-config door (counted), compared with
    // the version this page was served as. Older → the same consent prompt, never a forced reload.
    const checkMinimumVersion = async () => {
      performance.mark("load:lazy:minimum-version check"); // LOAD MARKER (lazy) — page-load trace, no import
      const current = document.querySelector<HTMLMetaElement>(`meta[name="${APP_VERSION_META}"]`)?.content ?? "";
      const { value: minimum, error, skipped } = await readAppConfigKey<string>("min_supported_app_version");
      // A guest has no session, so there is no row to read: not a failed check.
      if (skipped) return;
      if (error) {
        console.error("[new-version] min_supported_app_version could not be read", error);
        return;
      }
      if (!minimum || !current) {
        // Nothing fails silently: a check that cannot run is a counted error, not a warning.
        configAttestationCounters.version_check_unusable += 1;
        if (!minimum) noteConfigMissing("app_config", null, "min_supported_app_version");
        console.error("[new-version] minimum-version check could not run", { minimum: minimum ?? null, current: current || null });
        return;
      }
      if (compareVersions(current, minimum) < 0) {
        console.warn("[new-version] this page is older than the minimum supported version", { current, minimum });
        showPrompt("directive", {
          title: "This version is no longer supported",
          body: `Refresh to load the current version (this page is ${current}; ${minimum} or newer is required).`,
        });
      }
    };
    const settle = new AbortController();
    // Nothing is read on mount: the first checks wait for the page to settle AND be engaged (2026-10-17).
    lastCheckRef.current = Date.now();
    const settled = whenEngagedLate(undefined, settle.signal);
    void settled.then((ok) => {
      if (ok) void checkMinimumVersion();
    });

    if (!deploymentId) {
      return () => {
        settle.abort();
        window.removeEventListener(CHUNK_LOAD_ERROR_EVENT, onChunkLoadError);
        window.removeEventListener(REFRESH_REQUIRED_EVENT, onRefreshRequired);
      };
    }

    let cancelled = false;
    const check = async () => {
      if (cancelled || promptedRef.current || document.hidden) return;
      lastCheckRef.current = Date.now();
      performance.mark("load:lazy:new-version check"); // LOAD MARKER (lazy) — page-load trace, no import
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { deploymentId?: string | null };
        if (data.deploymentId && data.deploymentId !== deploymentId) {
          showPrompt("deploy");
        }
      } catch {
        // Offline / transient network failure — never surface, just retry on
        // the next tick. This watcher must be invisible until it has news.
      }
    };

    let ready = false;
    void settled.then((ok) => {
      if (!ok) return;
      ready = true;
      void check();
    });
    const onVisible = () => {
      if (!ready || document.hidden) return;
      if (Date.now() - lastCheckRef.current < POLL_INTERVAL_MS) return;
      void check();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    window.addEventListener("pointerdown", onVisible, { capture: true, passive: true });

    return () => {
      cancelled = true;
      settle.abort();
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      window.removeEventListener("pointerdown", onVisible, { capture: true });
      window.removeEventListener(CHUNK_LOAD_ERROR_EVENT, onChunkLoadError);
      window.removeEventListener(REFRESH_REQUIRED_EVENT, onRefreshRequired);
    };
  }, [deploymentId]);

  return null;
}
