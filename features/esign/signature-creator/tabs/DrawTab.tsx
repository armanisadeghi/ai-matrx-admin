"use client";

import { SignaturePad } from "@/features/data-tables/records-ui-host/recordsUiLazy";

export function DrawTab({ drawing, onDrawing }: { drawing: string | null; onDrawing: (v: string | null) => void }) {
  return <SignaturePad value={drawing} onChange={onDrawing} />;
}
