"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";
import { BillingToggle } from "./BillingToggle";
import { PlanCard } from "./PlanCard";
import {
  PLANS,
  PLAN_CATEGORIES,
  type BillingCycle,
  type Plan,
  type PlanCategory,
} from "@/features/pricing/data";

interface PricingGridProps {
  initialCycle?: BillingCycle;
  initialCategory?: PlanCategory;
  onSelect?: (plan: Plan) => void;
  showHeader?: boolean;
  showCategoryTabs?: boolean;
  density?: "comfortable" | "compact";
  className?: string;
}

const CATEGORY_ORDER: PlanCategory[] = [
  "free",
  "individual",
  "company",
  "enterprise",
];

export function PricingGrid({
  initialCycle = "annual",
  initialCategory = "individual",
  onSelect,
  showHeader = true,
  showCategoryTabs = true,
  className,
}: PricingGridProps) {
  const [cycle, setCycle] = useState<BillingCycle>(initialCycle);
  const [category, setCategory] = useState<PlanCategory>(initialCategory);

  const visiblePlans = PLANS.filter((p) =>
    category === "individual"
      ? p.category === "individual" || p.category === "free"
      : p.category === category,
  );

  return (
    <div className={cn("flex flex-col gap-8", className)}>
      {showHeader && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col items-center text-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/40 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              14-day trial on every paid plan
            </span>
            <h2 className="text-balance text-3xl font-semibold tracking-tight md:text-5xl">
              Pricing for the harness, <br className="hidden sm:block" />
              not the model.
            </h2>
            <p className="max-w-xl text-pretty text-muted-foreground md:text-base">
              Frontier models are extraordinary. Wrapped in AI Matrx, they
              compound. Pick the plan that matches the load — graduate when you
              outgrow it.
            </p>
          </div>

          <div className="mx-auto flex flex-col items-center gap-4">
            <BillingToggle value={cycle} onChange={setCycle} />
            {showCategoryTabs && (
              <div className="inline-flex flex-wrap justify-center gap-1 rounded-full border border-border/60 bg-card/40 p-1 text-sm">
                {CATEGORY_ORDER.map((c) => {
                  const active = c === category;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCategory(c)}
                      className={cn(
                        "rounded-full px-4 py-1.5 font-medium transition-colors",
                        active
                          ? "bg-foreground text-background"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {PLAN_CATEGORIES[c].label}
                    </button>
                  );
                })}
              </div>
            )}
            <p className="text-xs text-muted-foreground/80">
              {PLAN_CATEGORIES[category].description}
            </p>
          </div>
        </div>
      )}

      <div
        className={cn(
          "grid gap-4",
          visiblePlans.length === 1 && "max-w-md mx-auto",
          visiblePlans.length === 2 && "sm:grid-cols-2 max-w-3xl mx-auto",
          visiblePlans.length === 3 && "sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto",
          visiblePlans.length === 4 && "sm:grid-cols-2 lg:grid-cols-4",
          visiblePlans.length >= 5 && "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
        )}
      >
        {visiblePlans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} cycle={cycle} onSelect={onSelect} />
        ))}
      </div>

      <div className="flex flex-col items-center gap-1.5 text-center">
        <p className="text-sm text-muted-foreground">
          Need 20+ seats, custom redlines, or self-hosted?
        </p>
        <button
          type="button"
          onClick={() => onSelect?.(PLANS.find((p) => p.id === "enterprise")!)}
          className="inline-flex items-center gap-1 text-sm font-medium underline-offset-4 hover:underline"
        >
          Talk to enterprise
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
