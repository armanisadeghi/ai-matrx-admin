"use client";

/**
 * /work/connections — "Connections and sync". Tables, never cards (owner, 2026-10-16): the same
 * Instances and Accounts tables as Matrx 2's Code › Desktop apps (read from the person's computer
 * over the relay), then what has been synced into AI Matrx, which organization each coding project
 * saves to. Whether messages reach each Claude account's cloud
 * sessions is a column and an action on that account's own row, never a second list. Every table sorts and filters on every
 * column; everything else about a row is in its details panel.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Play, RefreshCw } from "lucide-react";
import { StaleDataNotice } from "@ai-matrx/design-system";
import { RowGroup, SettingRow } from "@ai-matrx/design-system/controls";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";

import { Button } from "@/components/ui/button";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectOrganizationId } from "@/lib/redux/slices/appContextSlice";
import { OrganizationRequiredNotice } from "@/features/organizations/components/OrganizationRequiredNotice";
import { readHostedCapacity, type SandboxCapacityRefusal } from "@/features/ai-work/lib/ownPlan";
import {
  INITIAL_BRIDGE_CAPABILITY,
  readBridgeCapability,
  type CodingBridgeCapability,
} from "@/features/ai-work/lib/codingBridgeCapability";
import { destinationAvailability } from "@/features/ai-work/compose/destinations";
import { useCodingSessions } from "@/features/agent-connections/coding-sessions/useCodingSessions";
import { captureGapVerdict } from "@/features/agent-connections/coding-sessions/captureGap";
import { CaptureGapAlert } from "@/features/agent-connections/coding-sessions/CaptureGapAlert";
import { deliveryHistory, newestDeliveryAt } from "@/features/ai-work/conversations/bindingPlurality";
import { SyncStatePanel } from "@/features/ai-work/conversations/components/SyncStatePanel";
import { MATRX_LOCAL_DOWNLOAD_PATH } from "@/features/matrx-local-download/release";
import { CodingProjectOrganizations } from "@/features/ai-work/components/CodingProjectOrganizations";
import { CodingAppsSection } from "@/features/ai-work/components/connections/CodingAppsSection";
import { useClaudeCloudDelivery } from "@/features/ai-work/components/connections/ClaudeCloudDelivery";
import { CursorAccountsPanel } from "./CursorAccountsPanel";
import { SandboxCapacityList } from "./SandboxCapacityList";

export function AiWorkConnections() {
  const { sessions, loading, error, checkedAtMs, refresh } = useCodingSessions();
  // Claude cloud delivery lives ON the Claude account rows (Coding apps › Accounts), one place.
  const cloud = useClaudeCloudDelivery();

  // Derived from the bindings this page already loaded — no second read, and
  // no chance of disagreeing with the delivery facts rendered below.
  const captureGap = captureGapVerdict({
    // The newest DELIVERY, never the first row: an unclaimed handoff offer has
    // delivered nothing and sorts first once its `last_seen_at` is null.
    lastSeenAt: newestDeliveryAt(sessions),
    history: deliveryHistory(sessions),
    readSucceeded: checkedAtMs === 0 ? null : error === null,
    nowMs: checkedAtMs,
  });
  // The hosted-runtime verdict comes from the coding session bridge
  // (`claude_code × matrx_sandbox`) — the SAME reader `/work/new` uses, so the
  // two surfaces cannot disagree about whether a sandbox can be started.
  const [capability, setCapability] = useState<CodingBridgeCapability>(
    INITIAL_BRIDGE_CAPABILITY,
  );
  const organizationId = useAppSelector(selectOrganizationId);

  // ONE decider, shared with the composer's destination gate: this card and
  // `/work/new` can never disagree about whether a hosted run can start, and
  // the refusal sentence is the server's own either way.
  const hostedStart = destinationAvailability(
    "claude-code-hosted",
    capability,
  );

  // When the per-person sandbox cap is what refuses, the readiness read names
  // the boxes holding the slots; list them with Stop instead of a bare sentence.
  const [capacityFull, setCapacityFull] = useState<SandboxCapacityRefusal | null>(null);
  useEffect(() => {
    if (capability.state === "loading" || hostedStart.selectable) {
      setCapacityFull(null);
      return;
    }
    let cancelled = false;
    void readHostedCapacity().then(
      (next) => {
        if (!cancelled) setCapacityFull(next);
      },
      () => {
        if (!cancelled) setCapacityFull(null);
      },
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capability.state, hostedStart.selectable, organizationId]);

  const refreshHostedCapability = () => {
    setCapability(INITIAL_BRIDGE_CAPABILITY);
    void readBridgeCapability("claude_code", "matrx_sandbox").then(
      setCapability,
    );
  };

  // Keyed on the active organization so choosing one in the inline notice
  // re-runs the read instead of leaving a dead card. The bridge verdict is per
  // user AND per organization, so this is not an optimization.
  useEffect(() => {
    let cancelled = false;
    setCapability(INITIAL_BRIDGE_CAPABILITY);
    void readBridgeCapability("claude_code", "matrx_sandbox").then((next) => {
      if (!cancelled) setCapability(next);
    });
    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  return (
    <div className="h-full overflow-y-auto px-4 py-5 scrollbar-thin sm:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-lg font-semibold text-foreground">Connections and sync</h1>
          <Button asChild variant="outline">
            <Link href="/agent-connections/plugins" target="_blank" rel="noopener noreferrer">
              Technical diagnostics
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </section>

        {error ? (
          <StaleDataNotice
            hasData={sessions.length > 0}
            what="your coding-session delivery state"
            onRetry={refresh}
            retrying={loading}
            detail={error}
          />
        ) : null}

        {/*
          Above every table on purpose. "Session delivery" is the one connection fact that fails
          silently — Claude treats a failed hook as non-blocking — so it gets the top of the page.
        */}
        <CaptureGapAlert
          verdict={captureGap}
          lastSeenAt={newestDeliveryAt(sessions)}
          onRefresh={refresh}
          refreshing={loading}
        />

        {/* The same Instances and Accounts tables as Matrx 2's Code › Desktop apps. */}
        <CodingAppsSection cloud={cloud} />

        {/* What has actually been delivered into AI Matrx, per provider account. */}
        <SyncStatePanel />

        <CodingProjectOrganizations />

        <CursorAccountsPanel />

        <section aria-label="Hosted sessions and history" className="space-y-2">
          <RowGroup title="Hosted sessions and history">
            <SettingRow
              label="Hosted Claude Code"
              line={
                capability.organizationRequired
                  ? "Create an organization first"
                  : capability.state === "loading"
                    ? "Checking whether a sandbox can start for you…"
                    : hostedStart.selectable
                      ? "Runs in a Matrx Sandbox; start it from Start work"
                      : `Not available: ${hostedStart.reason}`
              }
            >
              <Button
                variant="quiet"
                icon={<RefreshCw className={capability.state === "loading" ? "animate-spin" : undefined} />}
                aria-label="Check the hosted Claude Code capability again"
                onClick={refreshHostedCapability}
                disabled={capability.state === "loading"}
              />
              {hostedStart.selectable ? (
                <Button asChild variant="outline" icon={<Play />}>
                  <Link href="/work/new">Start</Link>
                </Button>
              ) : (
                <Button variant="outline" icon={<Play />} disabled title={hostedStart.reason ?? "Not available yet"}>
                  Start
                </Button>
              )}
            </SettingRow>
            <SettingRow label="Claude Code history import" line="Runs in Matrx Local: open Claude History in its sidebar">
              <Button asChild variant="outline">
                <OutboundLink href={MATRX_LOCAL_DOWNLOAD_PATH}>
                  Get Matrx Local
                  <ExternalLink className="h-3.5 w-3.5" />
                </OutboundLink>
              </Button>
            </SettingRow>
            <SettingRow label="ChatGPT and Claude.ai web history" line="Not available: no supported way to read it yet" />
          </RowGroup>
          {capability.organizationRequired ? (
            <OrganizationRequiredNotice
              compact
              description="Starting a hosted Claude Code session needs to know which organization to work in. Pick one below and this checks again automatically."
            />
          ) : null}
          {capacityFull && !hostedStart.selectable ? (
            <SandboxCapacityList capacity={capacityFull} onStopped={() => refreshHostedCapability()} />
          ) : null}
        </section>
      </div>
    </div>
  );
}
