"use client";

/**
 * Brand guide inputs (Provision window) — one row per brand-guide call point on the Identity pages:
 * `brand_guide.voice` · `.messaging` · `.audience` · `.words` (aidream services/brand_guide/provision.py).
 * Capture builds every value the drafted mandate would receive for this brand, on demand, and opens the window
 * (Copy / Copy for AI there). Values stay on the server: the row renders only for an admin with debug mode on.
 */
import { useState } from "react";
import { Button } from "@ai-matrx/design-system/controls";
import { extractErrorMessage } from "@/utils/errors";
import { useOpenProvisionWindow } from "@/features/overlays/definitions/provisionWindow.overlay";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { selectIsDebugMode } from "@/lib/redux/preferences/adminDebugSlice";
import { selectAdminFeature } from "@/lib/redux/selectors/userSelectors";
import { captureProvision } from "./data";
import { ProvisionCaptures } from "./ProvisionCaptures";

export const BRAND_GUIDE_POINTS = {
  voice: "Voice inputs",
  messaging: "Messaging inputs",
  audience: "Audience inputs",
  words: "Words inputs",
} as const;
export type BrandGuidePoint = keyof typeof BRAND_GUIDE_POINTS;

function PointRow({
  point,
  brandId,
  brandName,
  organizationId,
}: {
  point: BrandGuidePoint;
  brandId: string;
  brandName: string;
  organizationId: string;
}) {
  const dispatch = useAppDispatch();
  const open = useOpenProvisionWindow();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [captured, setCaptured] = useState(0);
  const pointKey = `brand_guide.${point}`;
  const title = `Brand guide ${point}: ${brandName}`;
  const capture = async () => {
    setBusy(true);
    setError(null);
    try {
      const snap = await captureProvision(dispatch, pointKey, brandId, organizationId, "manual");
      setCaptured((n) => n + 1);
      open(snap.id, title);
    } catch (e) {
      setError(extractErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    // One line, never wrapping: the chips sit in the page title row, which scrolls sideways instead of growing.
    <div className="flex h-7 shrink-0 items-center gap-1 whitespace-nowrap" data-testid={`brand-guide-inputs-${point}`}>
      <span className="mr-1 type-label">{BRAND_GUIDE_POINTS[point]}</span>
      <Button variant="outline" onClick={capture} disabled={busy}>
        {busy ? "Capturing" : "Capture"}
      </Button>
      <span className="flex shrink-0 items-center whitespace-nowrap type-meta">
        <ProvisionCaptures pointKey={pointKey} subjectId={brandId} title={title} refreshKey={captured} limit={3} />
      </span>
      {error ? <span className="type-meta text-destructive" title={error}>Capture failed</span> : null}
    </div>
  );
}

export function BrandGuideInputs({
  brandId,
  brandName,
  organizationId,
  points = ["voice", "messaging", "audience", "words"],
}: {
  brandId: string;
  brandName: string;
  organizationId: string;
  points?: BrandGuidePoint[];
}) {
  const canSee = useAppSelector(
    (s) => selectAdminFeature(s, "provision.open-any-snapshot") && Boolean(selectIsDebugMode(s)),
  );
  if (!canSee) return null;
  return (
    <div className="flex shrink-0 flex-row flex-nowrap items-center gap-x-4" data-testid="brand-guide-inputs">
      {points.map((p) => (
        <PointRow key={p} point={p} brandId={brandId} brandName={brandName} organizationId={organizationId} />
      ))}
    </div>
  );
}
