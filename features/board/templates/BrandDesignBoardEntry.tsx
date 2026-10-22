"use client";

// THE BRAND'S DOOR TO A DESIGN BOARD (brand discovery plan, 2026-10-22): on the brand's page, one card that opens the
// existing board template gallery straight at the design-system start with this brand chosen. No second dialog:
// the gallery and `DesignBoardStartDialog` make the board and link it (board -> web_brand, role design_system).

import dynamic from "next/dynamic";
import { LayoutTemplate } from "lucide-react";
import { useState } from "react";

import { Card } from "@/components/ui/card";

const BoardTemplateGallery = dynamic(
  () => import("@/features/board/templates/BoardTemplateGallery").then((m) => m.BoardTemplateGallery),
  { ssr: false },
);

export function BrandDesignBoardEntry({ brandId }: { brandId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Card className="p-0">
        <button
          type="button"
          onClick={() => setOpen(true)}
          data-testid="brand-design-board"
          className="flex h-full w-full flex-col gap-2 rounded-xl p-4 text-left transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <span className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary-ink">
              <LayoutTemplate className="h-4 w-4" aria-hidden />
            </span>
            <span className="min-w-0 truncate text-sm font-medium text-foreground">Design board</span>
          </span>
          <span className="text-xs leading-relaxed text-muted-foreground">Colors, type and components for this brand.</span>
        </button>
      </Card>
      {open ? <BoardTemplateGallery open={open} onOpenChange={setOpen} designBrandId={brandId} /> : null}
    </>
  );
}
