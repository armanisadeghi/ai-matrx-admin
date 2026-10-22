"use client";

// The brand of this design board, chosen with THE brand picker (marketing BrandPicker). Shown on design boards only.

import { BrandPicker } from "@/features/marketing/components/brands/BrandPicker";

export function DesignBoardBrandChip({ brandId, onChange }: { brandId: string | null; onChange: (id: string | null) => void }) {
  return (
    <div className="absolute left-3 top-3 z-30 w-56 rounded-lg border border-border bg-card p-2 shadow-sm" data-testid="design-board-brand">
      <BrandPicker organizationId={null} value={brandId} onChange={onChange} allowAll allLabel="No brand" label="Brand" />
    </div>
  );
}
