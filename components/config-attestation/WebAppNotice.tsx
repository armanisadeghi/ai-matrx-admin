"use client";

// The web app's announcement (`notice` on the `ai-matrx` app_config row) — the same notice every
// other app shows its users. Read through the one app-config door so config attestation sees it.
// Dismissal is per notice text, kept in this browser.
import { useEffect } from "react";
import { toast } from "@/lib/toast";
import { readAppConfigKey } from "@/lib/config-attestation/appConfig";
import { whenEngagedLate } from "@/lib/boot/engagedLate";
import { noticeSchema } from "@/features/admin/applications/config/schema";
import { defineClientKeyFamily } from "@/lib/sync/client-storage";
import { openOutbound } from "@ai-matrx/kit/outbound";

const dismissed = defineClientKeyFamily({
  id: "web-app-notice.dismissed.v1",
  area: "local",
  kind: "device",
  reason: "Which app notices this browser dismissed, keyed by the notice's text.",
});

export function WebAppNotice() {
  useEffect(() => {
    let cancelled = false;
    // First-paint contract (2026-10-16): the notice is a toast, never part of the first paint —
    // it is read once the page has settled AND been engaged (2026-10-17), beside the minimum-version check.
    const settle = new AbortController();
    void whenEngagedLate(undefined, settle.signal).then((ok) => (ok && !cancelled ? readAppConfigKey("notice") : null)).then((result) => {
      if (!result) return;
      const { value, error } = result;
      if (cancelled) return;
      if (error) {
        console.error("[app-notice] the app notice could not be read", error);
        return;
      }
      if (value === null || value === undefined) return;
      const parsed = noticeSchema.safeParse(value);
      if (!parsed.success) {
        console.error("[app-notice] the stored notice is malformed and is not shown", parsed.error.issues);
        return;
      }
      const n = parsed.data;
      const id = `${n.level}:${n.title}:${n.body}`.slice(0, 200);
      if (dismissed.get(id) !== null) return;
      const show = n.level === "critical" ? toast.error : n.level === "warning" ? toast.warning : toast;
      show(n.title, {
        id: "web-app-notice",
        description: n.body,
        duration: Infinity,
        action: n.url ? { label: "Open", onClick: () => openOutbound(n.url, "_blank", "noopener") } : undefined,
        cancel: { label: "Dismiss", onClick: () => dismissed.set(id, new Date().toISOString()) },
      });
    });
    return () => {
      cancelled = true;
      settle.abort();
    };
  }, []);
  return null;
}
