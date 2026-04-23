"use client";

import React, { useState } from "react";
import { Zap } from "lucide-react";
import { SectionToolbar } from "../SectionToolbar";
import { SectionFooter } from "../SectionFooter";

export function HooksSection() {
  const [search, setSearch] = useState("");
  return (
    <div className="flex flex-col h-full min-h-0">
      <SectionToolbar
        search={search}
        onSearchChange={setSearch}
        generateLabel="Generate Hook"
      />
      <div className="flex-1 overflow-y-auto scrollbar-thin flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-center max-w-sm px-8 py-12">
          <Zap className="h-10 w-10 text-muted-foreground/50" />
          <h3 className="text-sm font-semibold text-foreground mt-2">
            No hooks yet
          </h3>
          <p className="text-sm text-muted-foreground">
            Automated actions triggered at specific points in the agentic
            lifecycle — coming soon.
          </p>
        </div>
      </div>
      <SectionFooter
        description="Prompts executed at specific points during an agentic lifecycle."
        learnMoreLabel="Learn more about hooks"
        learnMoreHref="#"
      />
    </div>
  );
}

export default HooksSection;
