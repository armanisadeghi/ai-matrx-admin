"use client";

// features/capture/useWarmOfflineCode.ts — A CAPTURE PAGE FETCHES ALL OF ITS CODE WHILE IT STILL HAS A SIGNAL.
//
// A crew member opens /capture/<sheet> at the gate with a signal and then walks into a basement. Every chunk
// the page might ask for later must already be on the phone, because offline there is nobody to ask. The shell's
// dialog hosts are the one lazy body the page reaches by merely typing (`DialogHosts` opens on the first
// pointer/key); left lazy, that first key fetched a chunk that could not arrive (AT-FIX-I, 2026-10-19).
// Opening the latch on mount fetches it NOW, online. `ChunkTolerant` is the second layer for any other
// extra that still cannot arrive.
//
// CAPTURE-OFFLINE-SHELL (2026-10-19): the same hook also makes a RELOAD offline work. It registers the platform's
// one service worker (the capture page is the second place that asks for it, besides the first cloud-file fetch)
// and tells it which page and which chunks this phone has loaded, so the worker keeps the page's shell and its
// sheet definition. The worker is `features/files/cache/service-worker/src/sw.ts`; never a second one.

import { useEffect } from "react";
import { requestDialogHosts } from "@/components/dialogs/host/dialogHostsLatch";
import { registerBlobCacheServiceWorker } from "@/features/files/cache/register-service-worker";
import { resolveBaseUrl } from "@/lib/python-client";
import { useRecordsDataSource, type RecordsDataSource } from "@/features/data-tables/records-ui-host/recordsDataSource";

/** The `/_next/static/` files this page has loaded so far (they arrived before the worker controlled it). */
export function loadedStaticAssets(): string[] {
  if (typeof performance === "undefined") return [];
  const out = new Set<string>();
  for (const entry of performance.getEntriesByType("resource")) {
    try {
      const u = new URL(entry.name, window.location.href);
      if (u.origin === window.location.origin && u.pathname.startsWith("/_next/static/")) {
        out.add(u.pathname + u.search);
      }
    } catch {
      // not a URL — skip
    }
  }
  return [...out];
}

/**
 * The sheet's definition is asked once by the page (before the worker controlled it, on a first visit), so it is
 * asked ONCE MORE here, through the worker, which keeps the answer. Same two doors the page and `CaptureRun` use.
 */
async function askDefinitionAgain(dataSource: Pick<RecordsDataSource, "rpc">, sheetId: string): Promise<void> {
  const where = (await dataSource.rpc("where_id_opens", { p_id: sheetId }, { schema: "custom" })) as {
    data: { organization_id?: string } | null;
  };
  const organizationId = where.data?.organization_id;
  if (typeof organizationId !== "string") return;
  await dataSource.rpc("capture_open", { p_organization_id: organizationId, p_sheet_id: sheetId }, { schema: "custom" });
}

/** Ask the worker to keep this capture page. Safe to call anywhere: a no-op without a worker. */
export async function keepCapturePageOffline(
  userId: string | null,
  sheetId: string,
  dataSource: Pick<RecordsDataSource, "rpc">,
): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  let backendUrl = "";
  try {
    backendUrl = resolveBaseUrl();
  } catch {
    // The worker's blob cache needs it; the capture shell does not.
  }
  await registerBlobCacheServiceWorker({ backendUrl, userId: userId ?? "" });
  const worker = (await navigator.serviceWorker.ready).active;
  worker?.postMessage({
    kind: "capture-warm",
    path: window.location.pathname,
    assets: loadedStaticAssets(),
  });
  // A page opened before the worker controlled it is controlled once the worker claims it.
  if (!navigator.serviceWorker.controller) {
    await new Promise<void>((resolve) => {
      navigator.serviceWorker.addEventListener("controllerchange", () => resolve(), { once: true });
      window.setTimeout(resolve, 4000);
    });
  }
  await askDefinitionAgain(dataSource, sheetId);
}

export function useWarmOfflineCode(userId: string | null = null, sheetId: string | null = null): void {
  const dataSource = useRecordsDataSource();
  useEffect(() => {
    requestDialogHosts();
  }, []);
  useEffect(() => {
    if (!sheetId) return;
    // After the page has settled, so keeping it never competes with showing it.
    const id = window.setTimeout(
      () => void keepCapturePageOffline(userId, sheetId, dataSource).catch(() => undefined),
      3000,
    );
    return () => window.clearTimeout(id);
  }, [userId, sheetId, dataSource]);
}
