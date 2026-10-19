"use client";

/**
 * THE SLOT for the admin layer (another lane builds the component and mounts it here). Shown only to an
 * admin who switched the admin view on (`?admin=1`); a member sees nothing, not even a gap. The layer gets
 * where it is mounted and, on a Tool page, which Tool. Until the component lands the slot renders only its
 * own marker, so the mount point is findable and honest.
 */

import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

import { useAppSelector } from "@/lib/redux/hooks";
import { selectIsAdminDebugger } from "@/lib/redux/selectors/userSelectors";

/** True for an admin who turned the admin view on. Members are never true. */
export function useToolsAdminView(): boolean {
  const isAdmin = useAppSelector(selectIsAdminDebugger);
  const params = useSearchParams();
  return isAdmin && params.get("admin") === "1";
}

/** Mount the admin layer component as `children` (or replace this file's body when it lands). */
export function ToolsAdminSlot({ where, toolId, children }: { where: "home" | "tool"; toolId?: string; children?: ReactNode }) {
  const on = useToolsAdminView();
  if (!on) return null;
  return (
    <div data-tools-admin-slot={where} data-tool-id={toolId} className="empty:hidden">
      {children}
    </div>
  );
}
