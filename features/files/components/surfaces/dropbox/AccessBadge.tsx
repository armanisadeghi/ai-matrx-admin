/**
 * features/files/components/surfaces/dropbox/AccessBadge.tsx
 *
 * "Only you" / "N members" / "Public" label shown in the Access column of the
 * file table and in the main content header. Tiny, purely presentational.
 */

"use client";

import { Globe, Lock, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Visibility } from "../../../types";

export interface AccessBadgeProps {
  visibility: Visibility;
  /** Number of distinct grantees (only meaningful when visibility === "shared"). */
  memberCount?: number;
  className?: string;
}

export function AccessBadge({
  visibility,
  memberCount,
  className,
}: AccessBadgeProps) {
  const { Icon, label } = describe(visibility, memberCount);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs text-muted-foreground",
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </span>
  );
}

function describe(visibility: Visibility, memberCount?: number) {
  if (visibility === "public") {
    return { Icon: Globe, label: "Public" };
  }
  if (visibility === "shared") {
    const count = Math.max(memberCount ?? 0, 1);
    return {
      Icon: Users,
      label: count === 1 ? "1 member" : `${count} members`,
    };
  }
  return { Icon: Lock, label: "Only you" };
}
