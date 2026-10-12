"use client";

/**
 * A brand's Smart Add setup run, wherever the brand is shown: nothing when the brand never had one
 * or it finished; "Setting up" while it works; and when it stopped (failed, errored, or interrupted
 * by a restart that was never picked back up) a "Resume setup" action that continues the SAME run
 * from its last checkpoint through the workflow system — finished steps are never re-run or re-paid.
 * (An interrupted run — "cancelled" by a restart — is resumed by the platform's recovery sweep.)
 * When a run can NOT continue (its steps were replaced, or the resume is refused) or the brand's sites
 * were never crawled, "Run setup again" starts a fresh setup from what is already confirmed on the
 * brand: its tracked accounts get their post history, sites with no crawled pages get the crawl;
 * images already saved are not saved again.
 */

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Loader2, RotateCcw } from "lucide-react";
import { Badge, Button } from "@ai-matrx/design-system/controls";
import type { paths } from "@ai-matrx/api/types";
import { useAppDispatch } from "@/lib/redux/hooks";
import { callApi } from "@/lib/api/call-api";
import { ensureOrgId } from "@/lib/organizations/ensureOrgId";
import { extractErrorMessage } from "@/utils/errors";
import { toast } from "@/lib/toast";
import { runHref } from "@/features/workflow-runtime/run-doors";
import { HumanGatePanel } from "@/features/workflow-runtime/interrupt/HumanGatePanel";
import { lookupSystemRun, startSystemRun } from "@/features/education/kits/systemRuns";
import { countSitePages, listBrandProperties, listBrandSites } from "@/features/marketing/data/service";
import { initializeSite } from "@/features/marketing/crawler/direct-client";
import { useSessionKnob } from "@/lib/scoped-config/sessionKnob";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";

const SETUP_KEY = "smart_add_brand_setup";
const STOPPED = new Set(["failed", "errored", "cancelled", "stopped"]);

function useSetupRun(brandId: string, organizationId: string) {
  const dispatch = useAppDispatch();
  return useQuery({
    queryKey: ["marketing", "smart-add-setup", brandId],
    queryFn: () => lookupSystemRun(dispatch, SETUP_KEY, `brand:${brandId}`, organizationId, "Setup status could not be read."),
    refetchInterval: (q) => (q.state.data?.active ? 15_000 : false),
    refetchIntervalInBackground: false,
    staleTime: 10_000,
  });
}

/**
 * THE HUMAN GATE for a new brand: once setup has landed the images and the history, the run
 * waits for "Confirm your brand profile basics". Nothing after it (the brand intake, research,
 * any AI) can start until it is answered — the engine holds the run, this only shows the panel.
 */
export function SmartAddBasicsGate({ brandId }: { brandId: string; organizationId?: string }) {
  const queryClient = useQueryClient();
  return (
    <div className="basis-full empty:hidden">
      <HumanGatePanel
        entityType="web_brand"
        entityId={brandId}
        onAnswered={() => void queryClient.invalidateQueries({ queryKey: ["marketing", "smart-add-setup", brandId] })}
      />
    </div>
  );
}

export function SmartAddSetupStatus({ brandId, organizationId }: { brandId: string; organizationId: string }) {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const [resuming, setResuming] = useState(false);
  const [resumeRefused, setResumeRefused] = useState(false);
  const [rerunning, setRerunning] = useState(false);
  const postsKnob = Number(useSessionKnob("social.smart_add_posts_default"));
  const maxPosts = Number.isFinite(postsKnob) && postsKnob >= 0 ? postsKnob : 30;
  const sites = useQuery({
    queryKey: ["marketing", "smart-add-setup-sites", brandId],
    queryFn: async () => {
      const list = await listBrandSites(brandId);
      const pages = await countSitePages(list.map((x) => x.id));
      return list.map((x) => ({ id: x.id, pages: pages[x.id] ?? 0 }));
    },
    staleTime: 60_000,
  });
  const run = useSetupRun(brandId, organizationId);
  const r = run.data;
  const uncrawled = (sites.data ?? []).filter((x) => x.pages === 0);
  if (!r) return null;
  const stopped = STOPPED.has(r.status);
  const canRunAgain = (stopped && (r.status !== "errored" || resumeRefused)) || (r.status === "completed" && uncrawled.length > 0);
  if (r.status === "completed" && !canRunAgain) return null;

  const runAgain = async () => {
    setRerunning(true);
    try {
      await ensureOrgId(organizationId);
      const properties = await listBrandProperties(brandId);
      const accounts = properties
        .filter((p) => p.kind !== "website" && (p.url || p.handle))
        .map((p) => ({ handle_or_url: p.url ?? p.handle ?? "", platform: p.kind, property_id: p.id }));
      for (const site of uncrawled) void initializeSite(site.id).catch(() => undefined);
      if (accounts.length) {
        await startSystemRun(
          dispatch,
          SETUP_KEY,
          {
            subject: `brand:${brandId}`,
            organizationId,
            sourceFeature: "marketing",
            // Images already saved are not saved again; accounts re-link (no duplicates) then fetch history.
            inputs: { brand_id: brandId, images: [], accounts, max_posts: maxPosts },
          },
          "The setup could not start again.",
        );
      }
      toast.success(
        `Setup started again${uncrawled.length ? ` · crawling ${uncrawled.length} site${uncrawled.length === 1 ? "" : "s"}` : ""}`,
      );
      setResumeRefused(false);
      await queryClient.invalidateQueries({ queryKey: ["marketing", "smart-add-setup", brandId] });
      await queryClient.invalidateQueries({ queryKey: ["marketing", "smart-add-setup-sites", brandId] });
    } catch (error) {
      toast.error(`Could not run the setup again: ${extractErrorMessage(error)}`);
    } finally {
      setRerunning(false);
    }
  };

  const resume = async () => {
    setResuming(true);
    try {
      await ensureOrgId(organizationId);
      // The workflow system's own checkpoint resume: the same run continues at its frontier.
      const result = await dispatch(
        callApi({
          path: "/runs/{run_id}/resume-errored" as keyof paths,
          method: "POST",
          pathParams: { run_id: r.runId } as never,
          scopeOverrides: { organization_id: organizationId },
          stream: true,
          consumeStream: async (response: Response) => {
            await response.text();
          },
        } as never),
      );
      if (result.error) throw new Error(result.error.message ?? "The setup could not be resumed.");
      toast.success("Setup resumed");
      await queryClient.invalidateQueries({ queryKey: ["marketing", "smart-add-setup", brandId] });
    } catch (error) {
      // The run cannot continue (e.g. its steps were replaced): offer a fresh setup instead.
      setResumeRefused(true);
      toast.error(`Could not resume the setup: ${extractErrorMessage(error)}`);
    } finally {
      setResuming(false);
    }
  };

  return (
    <span className="inline-flex items-center gap-1" data-testid="smart-add-setup-status">
      <Badge tone={stopped ? "warning" : r.status === "interrupted" ? "primary" : "neutral"}>
        {r.status === "completed" ? "Site not crawled" : stopped ? "Setup stopped" : r.status === "interrupted" ? "Waiting for you" : (
          <span className="inline-flex items-center gap-1">
            <Loader2 className="size-3 animate-spin" /> Setting up
          </span>
        )}
      </Badge>
      {r.status === "errored" && !resumeRefused ? (
        <Button variant="outline" icon={resuming ? <Loader2 className="animate-spin" /> : <RotateCcw />} disabled={resuming} onClick={() => void resume()}>
          Resume setup
        </Button>
      ) : null}
      {canRunAgain ? (
        <Button variant="outline" icon={rerunning ? <Loader2 className="animate-spin" /> : <RotateCcw />} disabled={rerunning} onClick={() => void runAgain()}>
          Run setup again
        </Button>
      ) : null}
      <OutboundLink href={runHref(r.runId)} className="inline-flex items-center gap-0.5 text-xs text-primary">
        Watch <ExternalLink className="size-3" />
      </OutboundLink>
    </span>
  );
}
