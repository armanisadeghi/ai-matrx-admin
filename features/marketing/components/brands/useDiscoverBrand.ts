"use client";

/**
 * Discover: start (or rejoin) the brand's `brand_discovery` system run — the self-description room and the offering
 * roles, every result saved (aidream `workflows/brand_discovery_v1.py`). Any brand, any time. The server answers a run
 * already going for the brand with that run (`duplicate`), so a double press never pays twice; either way the run's
 * floating window opens, never a spinner.
 */
import { useState } from "react";

import { toast } from "@/lib/toast";
import { useAppDispatch } from "@/lib/redux/hooks";
import { ensureOrgId } from "@/lib/organizations/ensureOrgId";
import { startSystemRun } from "@/lib/workflows/system-runs";
import { useOpenWorkflowRunWindow } from "@/features/overlays/definitions/workflowRunWindow.overlay";

export const BRAND_DISCOVERY_KEY = "brand_discovery";
const RUN_LABEL = "Brand discovery";

export function useDiscoverBrand(brandId: string, organizationId: string) {
  const dispatch = useAppDispatch();
  const openRunWindow = useOpenWorkflowRunWindow();
  const [starting, setStarting] = useState(false);

  const discover = async () => {
    if (starting) return;
    setStarting(true);
    try {
      // The brand's own organization: the run, its points and every row it saves belong there.
      await ensureOrgId(organizationId);
      const { runId, duplicate } = await startSystemRun(
        dispatch,
        BRAND_DISCOVERY_KEY,
        { subject: `brand:${brandId}`, organizationId, sourceFeature: "marketing", inputs: { brand_id: brandId } },
        "Discovery could not start.",
      );
      if (duplicate) toast.info("Discovery is already running for this brand");
      openRunWindow({ runId, workflowName: RUN_LABEL });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Discovery could not start.");
    } finally {
      setStarting(false);
    }
  };

  return { discover, starting };
}
