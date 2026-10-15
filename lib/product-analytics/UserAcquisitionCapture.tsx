"use client";

import { useEffect } from "react";
import { whenPageIdle } from "@ai-matrx/kit/idle-scheduler";
import { getFingerprint } from "@/lib/services/fingerprint-service";
import {
  ACQUISITION_STORAGE_KEY,
  ACQUISITION_VISITOR_COOKIE,
  FirstTouchPayloadSchema,
  isLocalAcquisitionHost,
  isLocalAcquisitionReferrer,
  isRetryableAcquisitionTransportFailure,
  safeObservedUrl,
  type FirstTouchPayload,
} from "./user-acquisition";
import { defineClientKey, defineClientKeyFamily } from "@/lib/sync/client-storage";

const firstTouchKey = defineClientKey({
  id: "acquisition.first-touch.v1",
  area: "local",
  kind: "handoff",
  reason: "A guest's first landing, carried until it is filed with the server on sign-up.",
  legacyKey: ACQUISITION_STORAGE_KEY,
});

const enrichedVisitors = defineClientKeyFamily({
  id: "acquisition.first-touch-filed",
  area: "session",
  kind: "handoff",
  reason: "This tab already filed the first touch for a visitor; a repeat is harmless but wasted.",
});

function readStored(): FirstTouchPayload | null {
  try {
    const parsed: unknown = firstTouchKey.getJSON();
    if (parsed === null) return null;
    const result = FirstTouchPayloadSchema.safeParse(parsed);
    if (result.success) return result.data;
  } catch (error) {
    console.error("[user-acquisition] Could not read first-touch state", error);
  }
  return null;
}

function acquisitionVisitorId(): string | null {
  const prefix = `${ACQUISITION_VISITOR_COOKIE}=`;
  return (
    document.cookie
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(prefix))
      ?.slice(prefix.length) ?? null
  );
}

/** Where the person landed and from where — read at mount, before any client navigation. */
type LandingSnapshot = { href: string; referrer: string };

function buildPayload(
  visitorId: string,
  guestFingerprint: string,
  landing: LandingSnapshot,
): FirstTouchPayload {
  const url = new URL(landing.href);
  const referrer = safeObservedUrl(landing.referrer);
  let referrerHost: string | null = null;
  if (referrer) {
    try {
      referrerHost = new URL(referrer).host;
    } catch {
      referrerHost = null;
    }
  }
  const value = (key: string) =>
    url.searchParams.get(key)?.slice(0, 500) ?? null;
  return {
    fingerprint: visitorId,
    guest_fingerprint: guestFingerprint,
    captured_at: new Date().toISOString(),
    landing_host: url.host.slice(0, 255),
    landing_path: url.pathname.slice(0, 1000),
    referrer,
    utm_source: value("utm_source"),
    utm_medium: value("utm_medium"),
    utm_campaign: value("utm_campaign"),
    utm_content: value("utm_content"),
    utm_term: value("utm_term"),
    timezone:
      Intl.DateTimeFormat().resolvedOptions().timeZone?.slice(0, 100) ?? null,
    language: navigator.language?.slice(0, 50) ?? null,
    screen: `${window.screen.width}x${window.screen.height}`,
    capture_source: "browser_enrichment",
    referrer_state:
      isLocalAcquisitionHost(url.host) ||
      isLocalAcquisitionReferrer(landing.referrer)
        ? "local_test"
        : !referrer
          ? "direct_or_withheld"
          : referrerHost === url.host
            ? "internal"
            : "external",
    sec_fetch_site: null,
  };
}

export function UserAcquisitionCapture() {
  useEffect(() => {
    if (
      window.location.pathname.startsWith("/administration") ||
      window.location.pathname.startsWith("/auth") ||
      window.location.pathname.startsWith("/login")
    ) {
      return;
    }

    let cancelled = false;
    const retryDelaysMs = [750, 2_500];
    // The landing URL (its UTM parameters) and referrer are read NOW; the fingerprint and the
    // first-touch POST wait for the page's idle flush — analytics never competes with paint.
    const landing: LandingSnapshot = { href: window.location.href, referrer: document.referrer };
    const controller = new AbortController();
    void (async () => {
      if (!(await whenPageIdle(controller.signal)) || cancelled) return;
      const guestFingerprint = await getFingerprint();
      if (cancelled) return;
      const visitorId = acquisitionVisitorId() ?? guestFingerprint;
      // Privacy-restricted browsers can disable session storage. The atomic
      // database function makes a repeat enrichment harmless.
      if (enrichedVisitors.get(visitorId)) return;
      const stored = readStored();
      const observed = buildPayload(visitorId, guestFingerprint, landing);
      const payload: FirstTouchPayload = stored
        ? {
            ...observed,
            ...stored,
            fingerprint: visitorId,
            guest_fingerprint: guestFingerprint,
            timezone: observed.timezone,
            language: observed.language,
            screen: observed.screen,
            capture_source: "browser_enrichment",
          }
        : observed;
      // Persistence is an optimization; the request still carries the data.
      firstTouchKey.setJSON(payload);

      let response: Response | null = null;
      for (let attempt = 0; attempt <= retryDelaysMs.length; attempt += 1) {
        try {
          response = await fetch("/api/acquisition/first-touch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            keepalive: true,
          });
          break;
        } catch (error) {
          if (!isRetryableAcquisitionTransportFailure(error)) throw error;
          if (attempt === retryDelaysMs.length) {
            console.warn(
              "[user-acquisition] Browser enrichment deferred after transport loss; server first-touch capture remains authoritative",
            );
            return;
          }
          await new Promise((resolve) =>
            window.setTimeout(resolve, retryDelaysMs[attempt]),
          );
          if (cancelled) return;
        }
      }
      if (!response) return;
      if (!response.ok) {
        console.error(
          "[user-acquisition] First-touch persistence failed",
          response.status,
          await response.text(),
        );
      } else {
        enrichedVisitors.set(visitorId, "1");
      }
    })().catch((error: unknown) => {
      console.error("[user-acquisition] First-touch capture failed", error);
    });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  return null;
}
