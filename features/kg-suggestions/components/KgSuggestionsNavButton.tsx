// features/kg-suggestions/components/KgSuggestionsNavButton.tsx
//
// A reusable "open the global suggestion inbox" button with a live count
// badge. Opens the inbox as a canvas tab (canvas/kgSuggestionsKind.tsx). Drop this into
// any nav / hub surface that should expose the global inbox. Self-fetches the
// global pending count so the badge stays in sync with accept/reject/defer
// from any other surface.

"use client";

import { Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useKgSuggestions } from "@/features/kg-suggestions/hooks/useKgSuggestions";
import { useOpenKgSuggestions } from "@/features/kg-suggestions/canvas/kgSuggestionsKind";
import type { KgGlobalFilter } from "@/features/kg-suggestions/types";

export interface KgSuggestionsNavButtonProps {
  className?: string;
  variant?: "primary" | "outline" | "quiet";
  /** Hide entirely when there are no pending suggestions. Default false. */
  hideWhenEmpty?: boolean;
  label?: string;
}

export function KgSuggestionsNavButton({
  className,
  variant = "outline",
  hideWhenEmpty = false,
  label = "Suggestions",
}: KgSuggestionsNavButtonProps) {
  const filter: KgGlobalFilter = { global: true, status: "pending" };
  const { count } = useKgSuggestions(filter);
  const openInbox = useOpenKgSuggestions();

  if (hideWhenEmpty && count <= 0) return null;

  return (
    <Button
      type="button"
      variant={variant}
      icon={<Lightbulb />}
      // read-gate-exempt: badge renders only when count is above 0, so a failed read hides it rather than saying 0
      badge={count > 0 ? count : undefined}
      onClick={() => openInbox()}
      className={className}
    >
      {label}
    </Button>
  );
}

export default KgSuggestionsNavButton;
