"use client";

/**
 * THE SLOT for the admin layer (another lane builds the component and mounts it here). Shown only to an
 * admin with debug mode on (the platform's admin debug mode); a member sees nothing, not even a gap. The layer gets
 * where it is mounted and, on a Tool page, which Tool. Until the component lands the slot renders only its
 * own marker, so the mount point is findable and honest.
 */

import type { ReactNode } from "react";

import { useAdminDebugView } from "@/hooks/useAdminDebugView";

/** True for an admin with the platform's admin debug mode on. Members are never true. */
export function useToolsAdminView(): boolean {
  return useAdminDebugView();
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
