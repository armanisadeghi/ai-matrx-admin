"use client";

import React, { useTransition, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Globe, Lock, Users, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserList } from "../types";
import { getListVisibility } from "../types";

interface ListCardProps {
  list: UserList;
  isActive: boolean;
  isAnyNavigating: boolean;
  onNavigate: (id: string) => void;
}

const VISIBILITY_CONFIG = {
  public: {
    label: "Public",
    icon: Globe,
    className:
      "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
  },
  authenticated: {
    label: "Users",
    icon: Users,
    className:
      "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  private: {
    label: "Private",
    icon: Lock,
    className:
      "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
};

function formatRelativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export function ListCard({
  list,
  isActive,
  isAnyNavigating,
  onNavigate,
}: ListCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const visibility = getListVisibility(list);
  const visConfig = VISIBILITY_CONFIG[visibility];
  const VisIcon = visConfig.icon;
  const isDisabled = isAnyNavigating;

  const handleClick = (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey) return;
    e.preventDefault();
    if (isDisabled) return;
    onNavigate(list.id);
    startTransition(() => router.push(`/lists/${list.id}`));
  };

  return (
    <Link
      href={`/lists/${list.id}`}
      onClick={handleClick}
      className={cn(
        "relative flex flex-col gap-1 px-3 py-2.5 rounded-lg cursor-pointer select-none",
        "transition-colors duration-150",
        "border border-transparent",
        isActive
          ? "bg-accent/60 border-l-2 border-l-primary border-r-0 border-t-0 border-b-0 rounded-l-none"
          : "hover:bg-accent/30",
        isDisabled && !isPending && "opacity-60 pointer-events-none",
      )}
      aria-current={isActive ? "page" : undefined}
    >
      {isPending && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/40 rounded-lg z-10">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        </div>
      )}

      <div className="flex items-center justify-between gap-2 min-w-0">
        <span
          className={cn(
            "text-sm font-medium truncate",
            isActive ? "text-foreground" : "text-foreground/80",
          )}
        >
          {list.list_name}
        </span>
        {list.item_count !== undefined && (
          <span className="flex-shrink-0 text-xs bg-muted text-muted-foreground rounded-full px-2 py-0.5 font-mono tabular-nums">
            {list.item_count}
          </span>
        )}
      </div>

      {list.description && (
        <p className="text-xs text-muted-foreground truncate leading-relaxed">
          {list.description}
        </p>
      )}

      <div className="flex items-center justify-between gap-2 mt-0.5">
        <span
          className={cn(
            "inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border",
            visConfig.className,
          )}
        >
          <VisIcon className="h-2.5 w-2.5" />
          {visConfig.label}
        </span>
        <span className="text-[10px] text-muted-foreground/70">
          {formatRelativeTime(list.updated_at ?? list.created_at)}
        </span>
      </div>
    </Link>
  );
}
