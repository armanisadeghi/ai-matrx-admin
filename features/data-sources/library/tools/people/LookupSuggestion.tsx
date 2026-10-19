"use client";

/**
 * The one box does the job when it can (lane L12b). Type a website, an email, a phone number, or a
 * name and the company's website, and the home offers the lookup itself, above the list
 * of Tools. No table to set up, no Tool to find first: the Clay waterfall without the table. Nothing
 * runs until the press; the Tool opens with the box filled and the answer starts there.
 */

import { Search } from "lucide-react";
import { Button } from "@ai-matrx/design-system/controls";

import { useToolRunForm } from "../useToolRunForm";
import type { LookupPlan } from "./lookupPlan";

export function LookupSuggestion({ plan, onLookup }: { plan: LookupPlan; onLookup: (plan: LookupPlan) => void }) {
  const form = useToolRunForm(plan.jobKey);
  return (
    <div
      className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/40 bg-primary/5 px-4 py-3"
      data-lookup-suggestion={plan.jobKey}
    >
      <Search className="h-4 w-4 shrink-0 text-primary" aria-hidden />
      <span className="min-w-0 flex-1 text-sm font-medium text-foreground">{plan.label}</span>
      <Button onClick={() => onLookup(plan)} disabled={form.isLoading || !form.data} data-lookup-go="">
        {form.data?.facts.submitLabel || "Look it up"}
      </Button>
    </div>
  );
}
