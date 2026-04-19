import React from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";

export function UninitializedShell({
  sendBtnClass,
  singleRow,
}: {
  sendBtnClass: string;
  singleRow: boolean;
}) {
  if (singleRow) {
    return (
      <div className="flex items-center gap-1 bg-card rounded-full border border-border px-2 py-1 w-full">
        <textarea
          disabled
          placeholder="Initializing..."
          className="flex-1 bg-transparent border-none outline-none text-xs text-muted-foreground/50 placeholder:text-muted-foreground/40 resize-none leading-5"
          style={{ minHeight: 20, maxHeight: 20 }}
          rows={1}
        />
        <Button disabled className={sendBtnClass}>
          <ArrowUp className="w-3.5 h-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <div className="px-2 pt-1.5">
        <textarea
          disabled
          placeholder="Initializing..."
          className="w-full bg-transparent border-none outline-none text-base md:text-xs text-muted-foreground/50 placeholder:text-muted-foreground/40 resize-none"
          style={{ minHeight: 40, maxHeight: 200 }}
          rows={1}
        />
      </div>
      <div className="flex items-center justify-end px-2 pb-1.5">
        <Button disabled className={sendBtnClass}>
          <ArrowUp className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
