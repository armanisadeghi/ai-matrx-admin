"use client";

// features/make/gallery/TemplateLivePreviewImpl.tsx — what TemplateLivePreview loads when the visitor reaches it
// (GALLERY-PERF-2, 2026-10-19). Everything heavy the live screens need sits behind the ONE import() of this module:
// the records-ui front door (through its own lazy edge), the in-memory store's refusal text and this app's booking
// page. Before, BookingPicker and the records-ui loader were static imports of TemplateLivePreview, which every
// gallery card reaches (TemplateCards -> TemplateShowcase), so each public gallery page shipped them on first load.

import type { ComponentType, ReactNode } from "react";

import type { TemplatePreviewProps } from "@ai-matrx/records-ui";
import { loadRecordsUi } from "@/features/data-tables/records-ui-host/recordsUiLazy";

import { BookingPicker } from "@/features/booking/BookingPicker";
import type { PublicBooking } from "@/features/booking/service";

export type LiveScreens = {
  Preview: ComponentType<TemplatePreviewProps>;
  booking: (page: unknown) => ReactNode;
};

export async function loadLiveScreens(): Promise<LiveScreens> {
  const [ui, memory] = await Promise.all([loadRecordsUi("TemplateLivePreview"), import("@ai-matrx/records/memory")]);
  const refusal = memory.PREVIEW_REFUSAL.message;
  return {
    Preview: ui.TemplatePreview,
    booking: (page) => <BookingPicker page={page as PublicBooking} preview={refusal} />,
  };
}
