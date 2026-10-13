// features/marketing/applets/StockLayoutCards.tsx — THE STOCK LAYOUTS ON THE APPLET TEMPLATE GALLERY.
//
// The restored agent-apps template modes (CONTRACTS amendment 2.12): six predetermined chat and form layouts a
// person picks with no code. Each card opens /applets/build/layout with that layout chosen, where she picks the
// agent or workflow it runs (signed out → sign in, then back there).

import Link from "next/link";
import { FileText, History, LayoutTemplate, MessageSquare, MessagesSquare, Search, type LucideIcon } from "lucide-react";
import { STOCK_LAYOUTS, type AppletLayoutKind } from "@ai-matrx/applets";

const ICONS: Record<AppletLayoutKind, LucideIcon> = {
  form: FileText,
  form_to_chat: MessagesSquare,
  chat: MessageSquare,
  centered_input: Search,
  chat_with_history: History,
  widget: LayoutTemplate,
};

export const layoutStartHref = (kind: AppletLayoutKind) => `/applets/build/layout?kind=${kind}`;

export function StockLayoutCards() {
  return (
    <section className="flex flex-col gap-3" data-applet-stock-layouts="">
      <h2 className="text-lg font-semibold">Start from a layout</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {STOCK_LAYOUTS.map((layout) => {
          const Icon = ICONS[layout.kind];
          return (
            <Link
              key={layout.kind}
              href={layoutStartHref(layout.kind)}
              data-clickable=""
              data-applet-stock-layout={layout.kind}
              className="flex items-start gap-3 rounded-lg border border-border bg-card p-4 hover:border-primary/50"
            >
              <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Icon className="h-4 w-4" />
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-sm font-medium text-foreground">{layout.label}</span>
                <span className="truncate text-xs text-muted-foreground">{layout.line}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
