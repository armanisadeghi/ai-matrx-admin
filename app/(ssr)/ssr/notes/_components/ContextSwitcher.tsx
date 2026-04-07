"use client";

import { Globe, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  selectAppContext,
  clearContext,
} from "@/features/context/redux/appContextSlice";
import { openOverlay } from "@/lib/redux/slices/overlaySlice";

export default function ContextSwitcher() {
  const dispatch = useAppDispatch();
  const ctx = useAppSelector(selectAppContext);

  // Fallback labels since we no longer have the global tree loaded here
  const activeLabel = (() => {
    if (ctx.task_id) return "Task set";
    if (ctx.project_id) return "Project set";
    if (ctx.organization_id) return "Org set";
    return "Set context";
  })();

  const hasContext = Boolean(
    ctx.organization_id || ctx.project_id || ctx.task_id,
  );

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() =>
        dispatch(openOverlay({ overlayId: "contextSwitcherWindow" }))
      }
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          dispatch(openOverlay({ overlayId: "contextSwitcherWindow" }));
        }
      }}
      className={cn(
        "flex items-center gap-1.5 w-full px-2 py-1 text-[0.6875rem] rounded-md cursor-pointer transition-colors [&_svg]:w-3 [&_svg]:h-3",
        hasContext
          ? "text-primary hover:bg-primary/10"
          : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
      )}
    >
      <Globe />
      <span className="flex-1 text-left truncate">{activeLabel}</span>
      {hasContext && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            dispatch(clearContext());
          }}
          className="opacity-40 hover:opacity-100 transition-opacity cursor-pointer text-destructive hover:bg-destructive/10 rounded-sm"
          aria-label="Clear context"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
