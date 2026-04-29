"use client";

/**
 * menuPrimitives — small shared building blocks used by both `ToolsGrid`
 * and the window-manager tabs inside `SidebarWindowToggle`.
 *
 * Extracted from the original monolithic `SidebarWindowToggle.tsx` so the
 * auto-derived Tools grid (`ToolsGrid.tsx`) can render MenuGridItem tiles
 * without pulling the entire toggle's 1,400-line surface area.
 */
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function MenuSection({ label }: { label: string }) {
  return (
    <div className="px-3 pt-1.5 pb-0.5 text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider">
      {label}
    </div>
  );
}

export function MenuDivider() {
  return <div className="border-t border-border/50 my-1" />;
}

interface MenuItemProps {
  icon: ReactNode;
  label: string;
  description?: string;
  onClick: () => void;
  disabled?: boolean;
  /** When true, prefixes the label with "*" and renders it in destructive red. */
  deprecated?: boolean;
}

export function MenuItem({
  icon,
  label,
  description,
  onClick,
  disabled,
  deprecated,
}: MenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      className={cn(
        "flex items-start gap-2.5 w-full px-3 py-1.5 transition-colors text-left",
        disabled
          ? "opacity-40 cursor-not-allowed"
          : "hover:bg-accent cursor-pointer text-foreground/80",
      )}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
    >
      <span className="mt-0.5 shrink-0 text-muted-foreground">{icon}</span>
      <span className="flex flex-col min-w-0">
        <span
          className={cn(
            "text-xs font-medium leading-tight",
            deprecated && "text-destructive",
          )}
        >
          {deprecated ? `* ${label}` : label}
        </span>
        {description && (
          <span className="text-[10px] text-muted-foreground/60 leading-tight mt-0.5">
            {description}
          </span>
        )}
      </span>
    </button>
  );
}

export function MenuGridItem({
  icon,
  label,
  onClick,
  disabled,
  deprecated,
}: Omit<MenuItemProps, "description">) {
  return (
    <button
      type="button"
      role="menuitem"
      className={cn(
        "flex items-center justify-start gap-1.5 px-1 py-1.5 transition-colors text-left border rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.05)]",
        disabled
          ? "opacity-40 cursor-not-allowed border-border/20 bg-background/50"
          : "cursor-pointer border-border/40 bg-card hover:bg-accent hover:border-border/60 hover:shadow-md text-foreground/80",
      )}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      title={deprecated ? `${label} (deprecated)` : label}
    >
      <span className="shrink-0 text-muted-foreground">{icon}</span>
      <span
        className={cn(
          "text-[11px] font-medium leading-none truncate max-w-full",
          deprecated && "text-destructive",
        )}
      >
        {deprecated ? `* ${label}` : label}
      </span>
    </button>
  );
}
