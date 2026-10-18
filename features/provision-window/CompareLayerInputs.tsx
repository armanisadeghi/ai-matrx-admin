"use client";

/**
 * Compare AI layers (Provision window) — one row per call point of a finished comparison run:
 * `compare.facts_pass` (layer 1) and `compare.validator` (layer 2), aidream `services/comparison/ai_layers.py`.
 * Capture builds every value the step would receive for THIS run, on demand, and opens the window (copy all /
 * Copy for AI there). Values stay on the server: the row renders only for an admin with debug mode on.
 */
import { useState } from "react";
import { Button } from "@ai-matrx/design-system/controls";
import { ErrorNotice, displayId } from "@ai-matrx/design-system";
import { extractErrorMessage } from "@/utils/errors";
import { useOpenProvisionWindow } from "@/features/overlays/definitions/provisionWindow.overlay";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { selectIsDebugMode } from "@/lib/redux/preferences/adminDebugSlice";
import { selectAdminFeature } from "@/lib/redux/selectors/userSelectors";
import { captureProvision } from "./data";
import { ProvisionCaptures } from "./ProvisionCaptures";

export const COMPARE_LAYER_POINTS = {
  "compare.facts_pass": "Facts pass inputs",
  "compare.validator": "Validator inputs",
} as const;
export type CompareLayerPoint = keyof typeof COMPARE_LAYER_POINTS;

function PointRow({ pointKey, runId, organizationId }: { pointKey: CompareLayerPoint; runId: string; organizationId: string }) {
  const dispatch = useAppDispatch();
  const open = useOpenProvisionWindow();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [captured, setCaptured] = useState(0);
  const title = `${COMPARE_LAYER_POINTS[pointKey]}: run ${displayId(runId)}`;
  const capture = async () => {
    setBusy(true);
    setError(null);
    try {
      const snap = await captureProvision(dispatch, pointKey, runId, organizationId, "manual");
      setCaptured((n) => n + 1);
      open(snap.id, title);
    } catch (e) {
      setError(extractErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex h-7 items-center gap-1" data-testid={`compare-layer-inputs-${pointKey}`}>
      <span className="mr-1 font-semibold">{COMPARE_LAYER_POINTS[pointKey]}</span>
      <Button variant="outline" onClick={capture} disabled={busy}>
        {busy ? "Capturing" : "Capture"}
      </Button>
      <ProvisionCaptures pointKey={pointKey} subjectId={runId} title={title} refreshKey={captured} limit={3} />
      {error ? <ErrorNotice message={error} /> : null}
    </div>
  );
}

export function CompareLayerInputs({ runId, organizationId }: { runId: string; organizationId: string }) {
  const canSee = useAppSelector(
    (s) => selectAdminFeature(s, "provision.open-any-snapshot") && Boolean(selectIsDebugMode(s)),
  );
  if (!canSee) return null;
  return (
    <div className="flex flex-row flex-wrap items-center gap-x-4 text-xs" data-testid="compare-layer-inputs">
      {(Object.keys(COMPARE_LAYER_POINTS) as CompareLayerPoint[]).map((p) => (
        <PointRow key={p} pointKey={p} runId={runId} organizationId={organizationId} />
      ))}
    </div>
  );
}
