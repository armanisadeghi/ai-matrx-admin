"use client";

import React, { useMemo, useState } from "react";
import { Hexagon, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionToolbar } from "../SectionToolbar";
import { ListRow } from "../ListRow";
import { AGENT_ENTRIES, AGENT_FILE_PREVIEW } from "../../data";
import type { AgentEntry } from "../../types";

export function AgentsSection() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<AgentEntry | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return AGENT_ENTRIES;
    return AGENT_ENTRIES.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        (a.description ?? "").toLowerCase().includes(q),
    );
  }, [search]);

  if (selected) {
    return <AgentDetail agent={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <SectionToolbar
        search={search}
        onSearchChange={setSearch}
        generateLabel="Generate Agent"
      />
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {filtered.map((agent) => (
          <ListRow
            key={agent.id}
            icon={Hexagon}
            title={agent.name}
            subtitle={agent.description ?? agent.filename}
            onClick={() => setSelected(agent)}
          />
        ))}
        {filtered.length === 0 && (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">
            No agents match your search.
          </div>
        )}
      </div>
    </div>
  );
}

function AgentDetail({
  agent,
  onBack,
}: {
  agent: AgentEntry;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center gap-3 px-4 py-3 shrink-0 border-b border-border/40">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className={cn(
            "inline-flex items-center justify-center h-8 w-8 rounded-md",
            "text-muted-foreground hover:bg-muted hover:text-foreground transition-colors",
          )}
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex flex-col min-w-0">
          <div className="text-sm font-semibold text-foreground truncate">
            {agent.name}
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {agent.filename}
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-auto scrollbar-thin bg-background">
        <pre className="text-[13px] leading-relaxed font-mono px-4 py-3 text-foreground/90 whitespace-pre">
          {numberedLines(AGENT_FILE_PREVIEW)}
        </pre>
      </div>
    </div>
  );
}

function numberedLines(source: string): React.ReactNode {
  const lines = source.split("\n");
  const width = String(lines.length).length;
  return lines.map((line, idx) => (
    <div key={idx} className="flex">
      <span
        aria-hidden
        className="inline-block shrink-0 pr-4 text-right text-muted-foreground/60 select-none tabular-nums"
        style={{ minWidth: `${width + 1}ch` }}
      >
        {idx + 1}
      </span>
      <span className="flex-1">{line || "\u00A0"}</span>
    </div>
  ));
}

export default AgentsSection;
