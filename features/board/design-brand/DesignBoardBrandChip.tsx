"use client";

// The brand of this design board, chosen with THE brand picker (marketing BrandPicker). Shown on design boards only.
//
// It rides INSIDE the board's tool strip (UserBoard passes it in the ToolBar's leading slot, after Add), never as
// its own floating card: a separate card at the strip's corner sat on top of the first tools (2026-10-22 walk,
// desktop and 390px). Inside the strip it takes its own slot and the strip's own phone layout handles the width.

import { BrandPicker } from "@/features/marketing/components/brands/BrandPicker";

export function DesignBoardBrandChip({ brandId, onChange }: { brandId: string | null; onChange: (id: string | null) => void }) {
  return (
    <div className="w-40 shrink-0 max-sm:w-28" data-testid="design-board-brand">
      <BrandPicker organizationId={null} value={brandId} onChange={onChange} allowAll allLabel="No brand" label="Brand" labelHidden />
    </div>
  );
}
