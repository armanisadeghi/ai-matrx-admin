"use client";

/** The brand Identity page's row of brand-analysis input captures (Provision window, point brand_intake.smart_add_create). */
import { ProvisionCaptures } from "./ProvisionCaptures";

export function BrandAnalysisInputs({ brandId, brandName }: { brandId: string; brandName: string }) {
  return (
    // Fixed height: the row fills in after load without moving the page below it.
    <div className="flex h-9 items-center text-xs" data-testid="brand-analysis-inputs">
      <ProvisionCaptures
        label="Brand analysis inputs"
        pointKey="brand_intake.smart_add_create"
        subjectId={brandId}
        title={`Brand analysis inputs: ${brandName}`}
      />
    </div>
  );
}
