"use client";

/**
 * "Capture in the cloud" — offered in the hub's "couldn't read" state when the platform has a
 * cloud recipe. The person picks one of their saved logins (or is sent to the Vault to add one);
 * the cloud browser signs in as them, captures the page, and the result lands on the account.
 * Status is inline: Queued → Starting browser → Signing in → (Waiting for you) → Capturing → Done.
 */

import { useEffect, useState } from "react";
import { Cloud } from "lucide-react";

import { Button, Select } from "@ai-matrx/design-system/controls";

import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { openOverlay, selectIsOverlayOpen } from "@ai-matrx/summon";
import type { CaptureHandoff } from "@/features/capture-ladder/types";

import type { GuidedCaptureTarget } from "./guidedApi";
import { useGuidedJob } from "./useGuidedJob";
import { cloudRefusal, getCloudReadiness, startCloudCapture } from "./cloudCapture";
import { profileUrlFor } from "../link";
import { SOCIAL_PLATFORMS, type SocialPlatform } from "../types";
import { cloudView, type CloudReadiness } from "./cloudJob";

export function CloudCaptureButton({
  organizationId,
  target,
  onCaptured,
}: {
  organizationId: string;
  target: GuidedCaptureTarget;
  onCaptured?: () => void;
}) {
  const platform = target.platform ?? "";
  const [ready, setReady] = useState<CloudReadiness | null>(null);
  const [itemId, setItemId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [job, setJob] = useState<CaptureHandoff | null>(null);
  const [line, setLine] = useState<string | null>(null);
  const dispatch = useAppDispatch();
  const vaultOpen = useAppSelector((s) => selectIsOverlayOpen(s, "credentialVaultWindow"));
  const [addingLogin, setAddingLogin] = useState(false);
  const [readyTick, setReadyTick] = useState(0);
  const { row } = useGuidedJob(job?.id ?? null, job);
  const view = cloudView(row);

  useEffect(() => {
    if (!platform) return;
    const abort = new AbortController();
    getCloudReadiness(platform, organizationId, abort.signal)
      .then((r) => {
        setReady(r);
        setItemId((current) => (r.logins.some((l) => l.itemId === current) ? current : (r.logins[0]?.itemId ?? "")));
      })
      .catch((err: unknown) => {
        if (!abort.signal.aborted) setLine(cloudRefusal(err));
      });
    return () => abort.abort();
  }, [platform, organizationId, readyTick]);

  // The login is added in the Vault window; when it closes, read the saved logins again.
  useEffect(() => {
    if (addingLogin && !vaultOpen) {
      setAddingLogin(false);
      setReadyTick((n) => n + 1);
    }
  }, [addingLogin, vaultOpen]);

  useEffect(() => {
    if (view?.stage === "done") onCaptured?.();
  }, [view?.stage, onCaptured]);

  // No recipe for this platform, or turned off for the workspace: the option is absent.
  if (!ready || !ready.supported || !ready.enabled) {
    return line ? <p className="text-xs text-destructive">{line}</p> : null;
  }

  async function start() {
    setBusy(true);
    setLine(null);
    try {
      setJob(await startCloudCapture(target, organizationId, itemId || null));
    } catch (err) {
      setLine(cloudRefusal(err));
    } finally {
      setBusy(false);
    }
  }

  const running = view !== null && !view.terminal;
  const name = ready.platformName;

  const known = SOCIAL_PLATFORMS.find((p) => p === platform) as SocialPlatform | undefined;
  const loginUrl = known ? new URL(profileUrlFor(known, "x")).origin + "/" : "";
  // The Vault's own new-login flow in its window, over this page (no navigation).
  const addLogin = () => {
    const location = new URLSearchParams({ mode: "new", kind: "website_login" });
    if (loginUrl) location.set("url", loginUrl);
    dispatch(
      openOverlay({
        overlayId: "credentialVaultWindow",
        instanceId: "default",
        data: { selectedItemId: null, location: location.toString() },
      }),
    );
    setAddingLogin(true);
  };

  if (ready.logins.length === 0) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={addLogin}>
          Add {name} login
        </Button>
        <span className="text-xs text-muted-foreground">Then capture it in the cloud</span>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        {ready.logins.length > 1 ? (
          <Select
            value={itemId}
            options={ready.logins.map((l) => ({ value: l.itemId, label: l.name }))}
            onValueChange={setItemId}
            aria-label={`${name} login`}
            className="w-48"
          />
        ) : null}
        <Button className="shrink-0" variant="outline" icon={<Cloud />} onClick={() => void start()} disabled={busy || running}>
          {busy ? "Starting…" : "Capture in the cloud"}
        </Button>
        {view ? (
          <span
            role="status"
            aria-live="polite"
            className={`truncate text-xs ${view.failed ? "text-destructive" : "text-muted-foreground"}`}
          >
            {view.label}
          </span>
        ) : null}
      </div>
      {view?.note ? (
        <p className={`text-xs ${view.failed ? "text-destructive" : "text-muted-foreground"}`}>{view.note}</p>
      ) : null}
      {line ? <p className="text-xs text-destructive">{line}</p> : null}
    </div>
  );
}
