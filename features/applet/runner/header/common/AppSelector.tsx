"use client";

import React from "react";
import { Check, Grid } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/lib/redux/hooks";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { selectActiveAppletAccentColor, selectAppletRuntimeAccentColor, selectAppletRuntimeActiveAppletId } from "@/lib/redux/app-runner/slices/customAppletRuntimeSlice";

interface AppSelectorProps {
  className?: string;
}

export function AppSelector({ className }: AppSelectorProps) {
  const appId = useAppSelector(state => selectAppletRuntimeActiveAppletId(state));
  const accentColor = useAppSelector(state => selectActiveAppletAccentColor(state));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button 
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100", 
            className
          )}
          aria-label="Select App"
        >
          <Grid size={18} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[180px]">
        {appSelectOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            className={cn(
              "flex items-center justify-between py-1.5 cursor-pointer",
              appId === option.value && "bg-zinc-100 dark:bg-zinc-800"
            )}
            onClick={() => setAppId(option.value)}
          >
            <span className="text-sm">{option.label}</span>
            {appId === option.value && (
              <Check 
                size={14} 
                style={{ color: accentColor }}
              />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default AppSelector; 