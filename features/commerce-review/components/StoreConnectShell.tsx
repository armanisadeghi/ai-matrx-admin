"use client";

/**
 * StoreConnectShell — onboarding + store connect (/commerce/stores/connect).
 * Connect asks aidream `GET /ebay/oauth/connect` for the eBay consent URL and
 * sends the browser there; eBay returns through `/ebay/oauth/callback`, which
 * redirects back here with `?status=connected|declined|expired|error`.
 */

import React, { useEffect, useState } from "react";
import { CheckCircle2, Circle, Loader2, Store } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { callApi } from "@/lib/api/call-api";
import { toast } from "@/lib/toast";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { selectOrganizationId } from "@/lib/redux/slices/appContextSlice";
import { hasConnectedEbayStore } from "@/features/commerce-review/service";

const RETURN_MESSAGES: Record<string, { ok: boolean; text: string }> = {
  connected: { ok: true, text: "eBay store connected" },
  declined: { ok: false, text: "eBay authorization was declined" },
  expired: { ok: false, text: "The eBay sign-in expired. Connect again" },
  error: { ok: false, text: "eBay could not finish connecting. Try again" },
};

const buildSteps = (
  organizationId: string | null,
  storeConnected: boolean,
): {
  title: string;
  detail: string;
  done: boolean;
  href?: string;
}[] => [
  {
    title: organizationId
      ? "Set your organization's configuration"
      : "Choose the organization this store belongs to",
    detail: organizationId
      ? "Hold days, triage mode, cost budgets — every pipeline decision is a setting you control."
      : "No organization is selected, so there is no configuration to open yet — pick one and this step becomes your settings.",
    done: false,
    // The org rung of the ONE scoped-configuration ladder — never a
    // commerce-local settings page (that parallel surface was deleted
    // 2026-08-29 per no-legacy; Arman's ruling).
    href: organizationId
      ? `/organizations/${organizationId}/settings/configuration`
      : "/organizations",
  },
  {
    title: "Connect your eBay store",
    detail:
      "Authorize the store so listings, orders and inventory sync both ways.",
    done: storeConnected,
  },
  {
    title: "Capture your first items",
    detail: "Open the camera-first intake app and shoot your first batch.",
    done: false,
    href: "/commerce/intake",
  },
];

export function StoreConnectShell() {
  // THE ACTIVE ORGANIZATION, NEVER AN "EFFECTIVE" ONE — this read the
  // personal-org fallback, so the configuration step pointed at the PERSONAL
  // workspace's settings while the page talked about "your organization".
  const organizationId = useAppSelector(selectOrganizationId);
  const dispatch = useAppDispatch();
  const returnStatus = useSearchParams().get("status");
  const [connecting, setConnecting] = useState(false);
  const [storeConnected, setStoreConnected] = useState(false);
  const steps = buildSteps(organizationId, storeConnected);

  // The step's check mark is the server's truth, never the return param.
  useEffect(() => {
    if (!organizationId) return;
    let live = true;
    hasConnectedEbayStore(organizationId) // org-filter: server-call onboarding asks whether THIS organization has a store
      .then((connected) => {
        if (live) setStoreConnected(connected);
      })
      .catch((err: unknown) => {
        if (live) toast.error(err instanceof Error ? err.message : String(err));
      });
    return () => {
      live = false;
    };
  }, [organizationId, returnStatus]);

  // Toast the callback's verdict once, then drop it from the URL so a
  // reload or Back never replays it.
  useEffect(() => {
    const message = returnStatus ? RETURN_MESSAGES[returnStatus] : undefined;
    if (!message) return;
    if (message.ok) toast.success(message.text);
    else toast.error(message.text);
    window.history.replaceState(window.history.state, "", window.location.pathname);
  }, [returnStatus]);

  const connectEbay = async () => {
    if (connecting) return;
    setConnecting(true);
    try {
      const result = await dispatch(
        callApi({ path: "/ebay/oauth/connect", method: "GET" }),
      );
      const url = (result.data as { authorization_url?: string } | undefined)
        ?.authorization_url;
      if (result.error || !url) {
        toast.error(result.error?.message ?? "eBay connect is unavailable");
        setConnecting(false);
        return;
      }
      window.location.assign(url);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err));
      setConnecting(false);
    }
  };
  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <Store className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-base font-semibold text-foreground">
            Get your store selling through the pipeline
          </h2>
        </div>
        <ol className="mt-4 space-y-4">
          {steps.map((step) => (
            <li key={step.title} className="flex gap-3">
              {step.done ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
              ) : (
                <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{step.title}</p>
                <p className="text-sm text-muted-foreground">{step.detail}</p>
                {step.href ? (
                  <Button asChild variant="outline" className="mt-1.5">
                    <Link href={step.href}>Open</Link>
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    className="mt-1.5"
                    disabled={connecting}
                    onClick={() => void connectEbay()}
                  >
                    {connecting ? (
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    ) : null}
                    {step.done ? "Connect another store" : "Connect eBay store"}
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>
      <p className="text-xs text-muted-foreground">
        Connecting authorizes only the store you pick, and you can disconnect it
        at any time. Nothing is listed or changed without your review — every
        AI draft waits for your approval in{" "}
        <Link href="/commerce/drafts" className="underline hover:text-foreground">
          Drafts Review
        </Link>
        .
      </p>
    </div>
  );
}
