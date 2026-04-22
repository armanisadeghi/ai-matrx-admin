"use client";

import React, { useState } from "react";
import { Plug } from "lucide-react";
import { SectionToolbar } from "../SectionToolbar";
import { SectionFooter } from "../SectionFooter";

export function PluginsSection() {
  const [search, setSearch] = useState("");
  return (
    <div className="flex flex-col h-full min-h-0">
      <SectionToolbar
        search={search}
        onSearchChange={setSearch}
        browseLabel="Browse Marketplace"
        showAddButton
      />
      <div className="flex-1 overflow-y-auto scrollbar-thin flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-center max-w-sm px-8 py-12">
          <Plug className="h-10 w-10 text-muted-foreground/50" />
          <h3 className="text-sm font-semibold text-foreground mt-2">
            No plugins installed
          </h3>
          <p className="text-sm text-muted-foreground">
            Install and manage agent plugins that add additional tools, skills,
            and integrations.
          </p>
        </div>
      </div>
      <SectionFooter
        description="Plugins extend the agent with additional tools, skills, and integrations."
        learnMoreLabel="Learn more about plugins"
        learnMoreHref="#"
      />
    </div>
  );
}

export default PluginsSection;
