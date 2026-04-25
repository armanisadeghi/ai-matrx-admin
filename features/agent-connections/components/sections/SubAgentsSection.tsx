"use client";

import React, { useState } from "react";
import { Bot } from "lucide-react";
import { SectionToolbar } from "../SectionToolbar";
import { SectionFooter } from "../SectionFooter";

/**
 * Sub-agents are agent_definition rows where `kind = 'subagent'` — invoked by
 * another agent rather than directly by the user. Empty state until the
 * `kind` column migration lands.
 */
export function SubAgentsSection() {
  const [search, setSearch] = useState("");
  return (
    <div className="flex flex-col h-full min-h-0">
      <SectionToolbar
        search={search}
        onSearchChange={setSearch}
        generateLabel="Generate Sub-agent"
        browseLabel="Browse Marketplace"
      />
      <div className="flex-1 overflow-y-auto scrollbar-thin flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-center max-w-md px-8 py-12">
          <Bot className="h-10 w-10 text-muted-foreground/50" />
          <h3 className="text-sm font-semibold text-foreground mt-2">
            Sub-agents coming soon
          </h3>
          <p className="text-sm text-muted-foreground">
            Specialist agents that another agent can hand work to — like a code
            reviewer, performance optimizer, or migration helper. Once the
            <code className="mx-1 px-1.5 py-0.5 rounded bg-muted text-xs">
              agent_definition.kind
            </code>
            column lands, they&apos;ll show up here filtered out from the main
            Agents list.
          </p>
        </div>
      </div>
      <SectionFooter
        description="Lightweight specialists invoked by other agents. Same shape as a top-level agent, but scoped to a focused job."
        learnMoreLabel="Learn more about sub-agents"
        learnMoreHref="#"
      />
    </div>
  );
}

export default SubAgentsSection;
