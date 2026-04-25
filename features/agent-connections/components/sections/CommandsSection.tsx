"use client";

import React, { useState } from "react";
import { TerminalSquare } from "lucide-react";
import { SectionToolbar } from "../SectionToolbar";
import { SectionFooter } from "../SectionFooter";

export function CommandsSection() {
  const [search, setSearch] = useState("");
  return (
    <div className="flex flex-col h-full min-h-0">
      <SectionToolbar
        search={search}
        onSearchChange={setSearch}
        generateLabel="Generate Command"
        browseLabel="Browse Marketplace"
      />
      <div className="flex-1 overflow-y-auto scrollbar-thin flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-center max-w-md px-8 py-12">
          <TerminalSquare className="h-10 w-10 text-muted-foreground/50" />
          <h3 className="text-sm font-semibold text-foreground mt-2">
            No commands yet
          </h3>
          <p className="text-sm text-muted-foreground">
            Slash commands wrap a prompt, tool list, and model preference behind
            a single keyword like <code className="mx-1 px-1.5 py-0.5 rounded bg-muted text-xs">/review</code>.
            Will install from connected registries.
          </p>
        </div>
      </div>
      <SectionFooter
        description="Reusable workflows you can invoke by slash command from any agent conversation."
        learnMoreLabel="Learn more about commands"
        learnMoreHref="#"
      />
    </div>
  );
}

export default CommandsSection;
