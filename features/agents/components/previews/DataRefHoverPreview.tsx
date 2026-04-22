"use client";

/**
 * Lightweight hover preview for a DataRef (db_record / db_query / db_field).
 * Pure presentation — DataRefs are tiny descriptors of what to fetch on the
 * server, not loaded entities, so the preview just shows the descriptor in a
 * readable form. No fetch, no Redux read.
 */

import { useState } from "react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Button } from "@/components/ui/button";
import { Check, Copy, Database, Filter, Hash, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast-service";
import type { DataRef } from "@/features/agents/types/message-types";

function describeRefType(ref: DataRef): string {
  switch (ref.ref_type) {
    case "db_record":
      return "Single record";
    case "db_query":
      return "Filtered query";
    case "db_field":
      return "Single field";
  }
}

function MetaRow({
  Icon,
  label,
  value,
  mono,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-2 py-0.5">
      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground w-20 shrink-0">
        <Icon className="w-2.5 h-2.5" />
        {label}
      </span>
      <span
        className={cn(
          "text-xs text-foreground break-all min-w-0",
          mono && "font-mono",
        )}
      >
        {value}
      </span>
    </div>
  );
}

interface DataRefPreviewContentProps {
  ref: DataRef;
}

export function DataRefPreviewContent({ ref }: DataRefPreviewContentProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(ref, null, 2));
      setCopied(true);
      toast.success("Reference copied as JSON");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-start gap-2">
        <Database className="w-3.5 h-3.5 text-gray-500 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-foreground">
            {ref.label?.trim() || ref.table}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {describeRefType(ref)} · {ref.table}
          </div>
        </div>
      </div>

      <div className="rounded-md bg-muted/40 p-2">
        {ref.ref_type === "db_record" && (
          <>
            <MetaRow Icon={Hash} label="ID" value={ref.id} mono />
            {ref.fields && ref.fields.length > 0 && (
              <MetaRow
                Icon={Tag}
                label="Fields"
                value={ref.fields.join(", ")}
                mono
              />
            )}
          </>
        )}
        {ref.ref_type === "db_field" && (
          <>
            <MetaRow Icon={Hash} label="ID" value={ref.id} mono />
            <MetaRow Icon={Tag} label="Field" value={ref.field_name} mono />
          </>
        )}
        {ref.ref_type === "db_query" && (
          <>
            {ref.filter && Object.keys(ref.filter).length > 0 ? (
              <MetaRow
                Icon={Filter}
                label="Filter"
                value={
                  <pre className="font-mono text-[10px] whitespace-pre-wrap break-all">
                    {JSON.stringify(ref.filter, null, 2)}
                  </pre>
                }
              />
            ) : (
              <MetaRow Icon={Filter} label="Filter" value="—" />
            )}
            {ref.fields && ref.fields.length > 0 && (
              <MetaRow
                Icon={Tag}
                label="Fields"
                value={ref.fields.join(", ")}
                mono
              />
            )}
            {"limit" in ref && typeof ref.limit === "number" && (
              <MetaRow Icon={Hash} label="Limit" value={String(ref.limit)} />
            )}
          </>
        )}
      </div>

      {ref.optional_context && (
        <div className="text-[10px] text-muted-foreground italic">
          Optional context — fetch failures are dropped silently
        </div>
      )}

      <div className="flex items-center gap-1.5 pt-1 border-t border-border">
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs gap-1 ml-auto"
          onClick={handleCopyJson}
        >
          {copied ? <Check className="text-success" /> : <Copy />}
          {copied ? "Copied" : "Copy JSON"}
        </Button>
      </div>
    </div>
  );
}

interface DataRefHoverPreviewProps {
  /** The DataRef descriptor to preview. */
  dataRef: DataRef;
  children: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  openDelay?: number;
  closeDelay?: number;
  className?: string;
}

export function DataRefHoverPreview({
  dataRef,
  children,
  side = "top",
  align = "start",
  openDelay = 250,
  closeDelay = 140,
  className,
}: DataRefHoverPreviewProps) {
  return (
    <HoverCard openDelay={openDelay} closeDelay={closeDelay}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent
        side={side}
        align={align}
        sideOffset={8}
        className={cn(
          "w-80 p-3 bg-card border border-border shadow-lg",
          className,
        )}
      >
        <DataRefPreviewContent ref={dataRef} />
      </HoverCardContent>
    </HoverCard>
  );
}
