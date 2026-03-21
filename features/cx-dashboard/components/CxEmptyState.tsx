"use client";

import { Inbox } from "lucide-react";

type Props = {
  title?: string;
  description?: string;
};

export function CxEmptyState({
  title = "No data found",
  description = "Try adjusting your filters or timeframe.",
}: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
      <Inbox className="w-10 h-10 opacity-40" />
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs">{description}</p>
    </div>
  );
}
