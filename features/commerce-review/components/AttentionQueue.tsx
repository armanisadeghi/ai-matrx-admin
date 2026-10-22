"use client";

/**
 * AttentionQueue (/commerce/attention) — the one list of things a human must
 * see NOW: open recall-audit disagreements (the skeptic vs the original),
 * escalations (above the value-delta threshold), and high-impact open
 * unknowns. Every row opens its asset (no dead ends); recall rows take the
 * verdict inline.
 */

import React, { useEffect, useState } from "react";
import { AlertTriangle, ExternalLink, HelpCircle, Hourglass, Inbox, Loader2, Scale } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OrganizationTag } from "./OrganizationTag";
import { toast } from "@/lib/toast";

import type { AttentionItem, RecallVerdict } from "../types";
import { listAttentionQueue, recordRecallVerdict } from "../service";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { SurfaceRuntimeProvider } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import { refuseSurfaceWrite } from "@ai-matrx/chat/surfaces/runtime/surface-writeback";
import {
  COMMERCE_ATTENTION_SURFACE_NAME,
  createCommerceAttentionScope,
} from "@/features/surfaces/manifests/commerce-attention.manifest";
import { attentionSurfaceRow, parseRecallVerdicts } from "../surface-writes";

export function AttentionQueue() {
  const [items, setItems] = useState<AttentionItem[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    // Fresh load (org change / retry): drop stale rows and any prior error.
    setItems(null);
    setLoadError(null);
    listAttentionQueue()
      .then((rows) => {
        if (!cancelled) {
          setItems(rows);
          setLoadError(null);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled)
          setLoadError(
            e instanceof Error ? e.message : "Could not load the queue.",
          );
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const retryLoad = () => {
    setItems(null);
    setLoadError(null);
    setReloadKey((k) => k + 1);
  };

  const verdict = async (item: AttentionItem, v: RecallVerdict) => {
    try {
      await recordRecallVerdict(item.id, v);
      setItems((prev) => (prev ?? []).filter((i) => i.id !== item.id));
      toast.success("Verdict recorded.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not record the verdict.");
    }
  };

  // Surface `matrx-user/commerce-attention`: the rows as shown; verdicts through the buttons' door.
  const getScope = () =>
    createCommerceAttentionScope({
      queue_load_status: loadError ? "failed" : items ? "loaded" : "loading",
      attention_count: items?.length,
      attention_items: items?.map(attentionSurfaceRow),
    });
  const getWriteHandlers = () => ({
    record_verdicts: {
      validate: (value: unknown) => {
        if (!items) refuseSurfaceWrite("The queue has not loaded yet.");
        parseRecallVerdicts(value, items ?? []);
      },
      apply: async (value: unknown) => {
        const plans = parseRecallVerdicts(value, items ?? []);
        const done: string[] = [];
        for (const plan of plans) {
          try {
            await recordRecallVerdict(plan.item.id, plan.verdict);
          } catch (e: unknown) {
            const why = e instanceof Error ? e.message : "the save failed";
            throw new Error(
              `Recorded ${done.length} of ${plans.length}; "${plan.item.title}" failed: ${why}. Not attempted: ${plans.length - done.length - 1}.`,
            );
          }
          done.push(plan.item.id);
          setItems((prev) => (prev ?? []).filter((i) => i.id !== plan.item.id));
        }
        return {
          summary: `Recorded ${done.length} verdict${done.length === 1 ? "" : "s"}; those rows left the queue.`,
          data: plans.map((p) => ({ id: p.item.id, verdict: p.verdict })),
        };
      },
    },
  });
  const withSurface = (node: React.ReactNode) => (
    <SurfaceRuntimeProvider
      surfaceName={COMMERCE_ATTENTION_SURFACE_NAME}
      getScope={getScope}
      getWriteHandlers={getWriteHandlers}
    >
      {node}
    </SurfaceRuntimeProvider>
  );

  if (loadError)
    return withSurface(
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <p className="px-6 text-center text-sm text-destructive">{loadError} <ErrorAlchemyMenu error={loadError} /></p>
        <Button variant="outline" onClick={retryLoad}>
          Try again
        </Button>
      </div>
    );
  if (!items)
    return withSurface(
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  if (items.length === 0)
    return withSurface(
      <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
        <Inbox className="h-8 w-8" />
        <p className="text-sm">Nothing needs attention.</p>
      </div>
    );

  return withSurface(
    <div className="mx-auto max-w-3xl space-y-2 p-3">
      {items.map((item) => (
        <div
          key={`${item.kind}:${item.id}`}
          className="rounded-lg border border-border bg-card p-3"
        >
          <div className="flex flex-wrap items-center gap-2">
            {item.kind === "recall_escalation" ? (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" /> Escalated
              </Badge>
            ) : item.kind === "recall_disagreement" ? (
              <Badge variant="secondary" className="gap-1">
                <Scale className="h-3 w-3" /> Disagreement
              </Badge>
            ) : item.kind === "blocked_asset" ? (
              <Badge variant="outline" className="gap-1">
                <Hourglass className="h-3 w-3" /> Waiting
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1">
                <HelpCircle className="h-3 w-3" /> Open question
              </Badge>
            )}
            <OrganizationTag organizationId={item.organizationId} />
            <span className="text-sm font-medium text-foreground">{item.title}</span>
          </div>
          {item.detail && (
            <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {item.assetId && (
              <Button asChild variant="outline">
                <Link href={`/commerce/intake/assets/${item.assetId}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" /> Open asset
                </Link>
              </Button>
            )}
            {item.kind === "high_impact_unknown" && (
              <Button asChild variant="quiet">
                <Link href="/commerce/intake/answer">Answer queue</Link>
              </Button>
            )}
            {item.audit && (
              <>
                <Button
                  variant="quiet"
                  onClick={() => void verdict(item, "original_correct")}
                >
                  Original was right
                  {item.audit.original_bucket ? ` (${item.audit.original_bucket})` : ""}
                </Button>
                <Button
                  variant="quiet"
                  onClick={() => void verdict(item, "challenge_correct")}
                >
                  Skeptic was right
                  {item.audit.challenge_bucket ? ` (${item.audit.challenge_bucket})` : ""}
                </Button>
                <Button
                  variant="quiet"
                  onClick={() => void verdict(item, "inconclusive")}
                >
                  Inconclusive
                </Button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
