"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface ResultDisplayProps {
  label: string;
  value: string;
  caption?: string;
  stats?: Array<{ label: string; value: string }>;
  emphasized?: boolean;
}

export function ResultDisplay({
  label,
  value,
  caption,
  stats,
  emphasized = true,
}: ResultDisplayProps) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p
          className={cn(
            "mt-2 font-mono tracking-tight tabular-nums text-foreground",
            emphasized
              ? "text-4xl sm:text-5xl font-semibold"
              : "text-3xl font-semibold",
          )}
        >
          {value}
        </p>
        {caption && (
          <p className="mt-1.5 text-sm text-muted-foreground">{caption}</p>
        )}
      </div>

      {stats && stats.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4 border-t border-border/60">
          {stats.map((stat) => (
            <div key={stat.label} className="min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {stat.label}
              </p>
              <p className="mt-1 font-mono tabular-nums text-base font-medium text-foreground truncate">
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface DualResultDisplayProps {
  primary: { label: string; value: string };
  secondary: { label: string; value: string };
}

export function DualResultDisplay({
  primary,
  secondary,
}: DualResultDisplayProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {primary.label}
        </p>
        <p className="mt-2 font-mono tracking-tight tabular-nums text-3xl sm:text-4xl font-semibold text-foreground">
          {primary.value}
        </p>
      </div>
      <div className="sm:border-l sm:border-border/60 sm:pl-6">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {secondary.label}
        </p>
        <p className="mt-2 font-mono tracking-tight tabular-nums text-3xl sm:text-4xl font-semibold text-primary">
          {secondary.value}
        </p>
      </div>
    </div>
  );
}
