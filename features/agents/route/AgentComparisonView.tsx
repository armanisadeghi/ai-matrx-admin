"use client";

import { useRef, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AgentDefinition } from "@/features/agents/types/agent-definition.types";

interface AgentComparisonViewProps {
  liveAgent: AgentDefinition;
  snapshot: AgentDefinition;
}

type ComparedField = {
  key: string;
  label: string;
  current: unknown;
  version: unknown;
  changed: boolean;
};

const COMPARED_FIELDS: { key: keyof AgentDefinition; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "description", label: "Description" },
  { key: "modelId", label: "Model" },
  { key: "messages", label: "Messages" },
  { key: "variableDefinitions", label: "Variables" },
  { key: "settings", label: "Settings" },
  { key: "tools", label: "Tools" },
  { key: "customTools", label: "Custom Tools" },
  { key: "contextSlots", label: "Context Slots" },
  { key: "modelTiers", label: "Model Tiers" },
  { key: "outputSchema", label: "Output Schema" },
];

function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return "—";
  if (typeof val === "string") return val || "—";
  if (Array.isArray(val))
    return `${val.length} item${val.length !== 1 ? "s" : ""}`;
  if (typeof val === "object") return JSON.stringify(val, null, 2);
  return String(val);
}

export function AgentComparisonView({
  liveAgent,
  snapshot,
}: AgentComparisonViewProps) {
  const panelRefs = [
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
  ];
  const isScrolling = useRef(false);

  const handleScroll = useCallback(
    (sourceIndex: number) => {
      if (isScrolling.current) return;
      isScrolling.current = true;
      const source = panelRefs[sourceIndex].current;
      if (!source) {
        isScrolling.current = false;
        return;
      }
      panelRefs.forEach((ref, i) => {
        if (i !== sourceIndex && ref.current) {
          ref.current.scrollTop = source.scrollTop;
        }
      });
      requestAnimationFrame(() => {
        isScrolling.current = false;
      });
    },
    [panelRefs],
  );

  const fields: ComparedField[] = COMPARED_FIELDS.map(({ key, label }) => ({
    key,
    label,
    current: liveAgent[key],
    version: snapshot[key],
    changed: !deepEqual(liveAgent[key], snapshot[key]),
  }));

  const changedCount = fields.filter((f) => f.changed).length;
  const changedNames = fields
    .filter((f) => f.changed)
    .map((f) => f.label)
    .join(", ");

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Change summary bar */}
      <div className="shrink-0 px-4 py-2 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2 text-sm">
          <Badge variant={changedCount > 0 ? "default" : "secondary"}>
            {changedCount} field{changedCount !== 1 ? "s" : ""} changed
          </Badge>
          {changedCount > 0 && (
            <span className="text-muted-foreground truncate">
              {changedNames}
            </span>
          )}
        </div>
      </div>

      {/* Three-panel comparison */}
      <div className="flex-1 grid grid-cols-3 divide-x divide-border overflow-hidden">
        {/* Current */}
        <div className="flex flex-col overflow-hidden">
          <div className="shrink-0 px-3 py-2 border-b border-border bg-muted/20 text-xs font-semibold uppercase tracking-wider">
            Current
          </div>
          <div
            ref={panelRefs[0]}
            onScroll={() => handleScroll(0)}
            className="flex-1 overflow-y-auto"
          >
            {fields.map((f) => (
              <FieldRow
                key={f.key}
                label={f.label}
                value={f.current}
                changed={f.changed}
                side="current"
              />
            ))}
          </div>
        </div>

        {/* Version */}
        <div className="flex flex-col overflow-hidden">
          <div className="shrink-0 px-3 py-2 border-b border-border bg-muted/20 text-xs font-semibold uppercase tracking-wider">
            Version {snapshot.versionNumber}
          </div>
          <div
            ref={panelRefs[1]}
            onScroll={() => handleScroll(1)}
            className="flex-1 overflow-y-auto"
          >
            {fields.map((f) => (
              <FieldRow
                key={f.key}
                label={f.label}
                value={f.version}
                changed={f.changed}
                side="version"
              />
            ))}
          </div>
        </div>

        {/* Diff */}
        <div className="flex flex-col overflow-hidden">
          <div className="shrink-0 px-3 py-2 border-b border-border bg-muted/20 text-xs font-semibold uppercase tracking-wider">
            Diff
          </div>
          <div
            ref={panelRefs[2]}
            onScroll={() => handleScroll(2)}
            className="flex-1 overflow-y-auto"
          >
            {fields.map((f) => (
              <DiffRow key={f.key} field={f} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function FieldRow({
  label,
  value,
  changed,
  side,
}: {
  label: string;
  value: unknown;
  changed: boolean;
  side: "current" | "version";
}) {
  return (
    <div
      className={cn(
        "px-3 py-2.5 border-b border-border/50 min-h-[2.5rem]",
        changed && side === "current" && "bg-green-500/5",
        changed && side === "version" && "bg-amber-500/5",
        !changed && "opacity-60",
      )}
    >
      <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">
        {label}
      </div>
      <div className="text-sm whitespace-pre-wrap break-all">
        {formatValue(value)}
      </div>
    </div>
  );
}

function DiffRow({ field }: { field: ComparedField }) {
  return (
    <div
      className={cn(
        "px-3 py-2.5 border-b border-border/50 min-h-[2.5rem]",
        field.changed ? "bg-primary/5" : "opacity-40",
      )}
    >
      <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">
        {field.label}
      </div>
      {field.changed ? (
        <div className="text-sm">
          <span className="inline-block px-1 rounded bg-destructive/10 text-destructive line-through mr-1">
            {truncateForDiff(field.version)}
          </span>
          <span className="inline-block px-1 rounded bg-green-500/10 text-green-600 dark:text-green-400">
            {truncateForDiff(field.current)}
          </span>
        </div>
      ) : (
        <div className="text-xs text-muted-foreground">No change</div>
      )}
    </div>
  );
}

function truncateForDiff(val: unknown): string {
  const str = formatValue(val);
  return str.length > 80 ? str.slice(0, 80) + "…" : str;
}
