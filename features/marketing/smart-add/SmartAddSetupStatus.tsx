"use client";

/**
 * A brand's Smart Add setup run, wherever the brand is shown: nothing when the brand never had one
 * or it finished; "Setting up" while it works; and when it stopped (failed, errored, or interrupted
 * by a restart that was never picked back up) a "Resume setup" action that continues the SAME run
 * from its last checkpoint through the workflow system — finished steps are never re-run or re-paid.
 * (An interrupted run — "cancelled" by a restart — is resumed by the platform's recovery sweep.)
 */

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Loader2, RotateCcw } from "lucide-react";
import { Badge, Button } from "@ai-matrx/design-system/controls";
import type { paths } from "@ai-matrx/agents/generated/api-types";
import { useAppDispatch } from "@/lib/redux/hooks";
import { callApi } from "@/lib/api/call-api";
import { ensureOrgId } from "@/lib/organizations/ensureOrgId";
import { extractErrorMessage } from "@/utils/errors";
import { toast } from "@/lib/toast";
import { runHref } from "@/features/workflow-runtime/run-doors";
import { lookupSystemRun } from "@/features/education/kits/systemRuns";

const SETUP_KEY = "smart_add_brand_setup";
const STOPPED = new Set(["failed", "errored", "cancelled", "stopped"]);

export function SmartAddSetupStatus({ brandId, organizationId }: { brandId: string; organizationId: string }) {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const [resuming, setResuming] = useState(false);
  const run = useQuery({
    queryKey: ["marketing", "smart-add-setup", brandId],
    queryFn: () => lookupSystemRun(dispatch, SETUP_KEY, `brand:${brandId}`, organizationId, "Setup status could not be read."),
    refetchInterval: (q) => (q.state.data?.active ? 15_000 : false),
    refetchIntervalInBackground: false,
    staleTime: 10_000,
  });
  const r = run.data;
  if (!r || r.status === "completed") return null;
  const stopped = STOPPED.has(r.status);

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
      toast.error(`Could not resume the setup: ${extractErrorMessage(error)}`);
    } finally {
      setResuming(false);
    }
  };

  return (
    <span className="inline-flex items-center gap-1" data-testid="smart-add-setup-status">
      <Badge tone={stopped ? "warning" : "neutral"}>
        {stopped ? "Setup stopped" : (
          <span className="inline-flex items-center gap-1">
            <Loader2 className="size-3 animate-spin" /> Setting up
          </span>
        )}
      </Badge>
      {r.status === "errored" ? (
        <Button variant="outline" icon={resuming ? <Loader2 className="animate-spin" /> : <RotateCcw />} disabled={resuming} onClick={() => void resume()}>
          Resume setup
        </Button>
      ) : null}
      <a href={runHref(r.runId)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-xs text-primary">
        Watch <ExternalLink className="size-3" />
      </a>
    </span>
  );
}
