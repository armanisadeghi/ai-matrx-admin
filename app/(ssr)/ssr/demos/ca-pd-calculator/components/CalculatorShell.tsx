"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface CalculatorShellProps {
  title: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  inputs: React.ReactNode;
  result: React.ReactNode;
  className?: string;
}

export function CalculatorShell({
  title,
  description,
  icon: Icon,
  inputs,
  result,
  className,
}: CalculatorShellProps) {
  return (
    <div
      className={cn(
        "grid gap-4 lg:gap-6",
        "grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]",
        className,
      )}
    >
      <section
        className={cn(
          "rounded-2xl border border-border bg-card",
          "p-6 sm:p-7",
          "shadow-sm",
        )}
      >
        <div className="flex items-start gap-3 mb-6">
          <div className="rounded-lg bg-primary/10 p-2 ring-1 ring-primary/15">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-foreground tracking-tight">
              {title}
            </h2>
            {description && (
              <p className="mt-0.5 text-sm text-muted-foreground">
                {description}
              </p>
            )}
          </div>
        </div>
        {inputs}
      </section>

      <section
        className={cn(
          "relative overflow-hidden rounded-2xl border border-border",
          "bg-gradient-to-br from-primary/[0.04] via-card to-secondary/[0.04]",
          "dark:from-primary/[0.08] dark:via-card dark:to-secondary/[0.08]",
          "p-6 sm:p-7",
          "shadow-sm",
        )}
      >
        <div
          className="pointer-events-none absolute -top-24 -right-24 h-48 w-48 rounded-full bg-primary/10 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-secondary/10 blur-3xl"
          aria-hidden
        />
        <div className="relative">{result}</div>
      </section>
    </div>
  );
}
