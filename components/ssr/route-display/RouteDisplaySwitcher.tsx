"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { ChevronDown } from "lucide-react";
import type { RouteDisplayData, RouteDisplayVariant } from "./types";
import { VARIANT_LABELS } from "./types";

const variants: Record<
  RouteDisplayVariant,
  ReturnType<typeof dynamic<{ data: RouteDisplayData }>>
> = {
  "grouped-cards": dynamic(
    () => import("./GroupedCardsDisplay"),
    { ssr: false },
  ),
  "data-table": dynamic(
    () => import("./DataTableDisplay"),
    { ssr: false },
  ),
  "expandable-sections": dynamic(
    () => import("./ExpandableSectionsDisplay"),
    { ssr: false },
  ),
  "flat-list": dynamic(
    () => import("./FlatListDisplay"),
    { ssr: false },
  ),
};

interface RouteDisplaySwitcherProps {
  data: RouteDisplayData;
  defaultVariant?: RouteDisplayVariant;
}

export default function RouteDisplaySwitcher({
  data,
  defaultVariant = "grouped-cards",
}: RouteDisplaySwitcherProps) {
  const [variant, setVariant] = useState<RouteDisplayVariant>(defaultVariant);
  const [open, setOpen] = useState(false);

  const Display = variants[variant];

  return (
    <div>
      <div className="flex justify-end mb-3">
        <div className="relative">
          <button
            onClick={() => setOpen((p) => !p)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2.5 py-1.5 rounded-md border border-border hover:border-border/80 bg-card"
          >
            <span>View: {VARIANT_LABELS[variant]}</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
          </button>

          {open && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
              <div className="absolute right-0 top-full mt-1 z-50 min-w-[180px] bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
                {(Object.keys(VARIANT_LABELS) as RouteDisplayVariant[]).map((key) => (
                  <button
                    key={key}
                    onClick={() => {
                      setVariant(key);
                      setOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                      key === variant
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-foreground hover:bg-accent/50"
                    }`}
                  >
                    {VARIANT_LABELS[key]}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <Display data={data} />
    </div>
  );
}
