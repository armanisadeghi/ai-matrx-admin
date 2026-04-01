"use client";

import React, { useEffect, useState } from "react";
import { Columns2, GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type LayoutVariant = "split" | "tree";

const STORAGE_KEY = "lists-layout-variant";

interface LayoutToggleProps {
  value: LayoutVariant;
  onChange: (v: LayoutVariant) => void;
}

export function LayoutToggle({ value, onChange }: LayoutToggleProps) {
  return (
    <div className="flex items-center gap-0.5 bg-muted rounded-md p-0.5">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 w-7 p-0 rounded-sm",
              value === "split" && "bg-background shadow-sm",
            )}
            onClick={() => onChange("split")}
            aria-label="Split view"
          >
            <Columns2 className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Split view</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 w-7 p-0 rounded-sm",
              value === "tree" && "bg-background shadow-sm",
            )}
            onClick={() => onChange("tree")}
            aria-label="Tree view"
          >
            <GitBranch className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Tree view</TooltipContent>
      </Tooltip>
    </div>
  );
}

/** Reads the stored variant preference; returns null on server */
export function useLayoutVariant(): [
  LayoutVariant,
  (v: LayoutVariant) => void,
] {
  const [variant, setVariant] = useState<LayoutVariant>("split");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as LayoutVariant | null;
    if (stored === "split" || stored === "tree") setVariant(stored);
  }, []);

  const handleChange = (v: LayoutVariant) => {
    setVariant(v);
    localStorage.setItem(STORAGE_KEY, v);
  };

  return [variant, handleChange];
}
