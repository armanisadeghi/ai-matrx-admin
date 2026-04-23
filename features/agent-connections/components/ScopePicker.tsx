"use client";

import React from "react";
import { User, Building2, FolderGit2, ListChecks } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { selectViewScope, setViewScope } from "../redux/ui";
import type { Scope } from "../types";

const SCOPE_META: Record<Scope, { label: string; icon: typeof User }> = {
  user: { label: "User", icon: User },
  organization: { label: "Organization", icon: Building2 },
  project: { label: "Project", icon: FolderGit2 },
  task: { label: "Task", icon: ListChecks },
};

const ORDER: Scope[] = ["user", "organization", "project", "task"];

export function ScopePicker() {
  const dispatch = useAppDispatch();
  const scope = useAppSelector(selectViewScope);
  const active = SCOPE_META[scope];
  const ActiveIcon = active.icon;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "inline-flex items-center gap-1.5 h-6 px-2 rounded-md text-xs",
          "border border-border/70 bg-background/60 text-foreground/90",
          "hover:bg-accent/60 transition-colors",
        )}
      >
        <ActiveIcon className="h-3 w-3" />
        {active.label}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[160px]">
        {ORDER.map((value) => {
          const meta = SCOPE_META[value];
          const Icon = meta.icon;
          return (
            <DropdownMenuItem
              key={value}
              onSelect={() => dispatch(setViewScope(value))}
              className={cn(
                "flex items-center gap-2 text-xs",
                value === scope && "bg-accent/40",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {meta.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default ScopePicker;
