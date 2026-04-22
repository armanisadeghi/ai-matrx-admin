"use client";

import React, { useState } from "react";
import { BookOpen } from "lucide-react";
import { SectionToolbar } from "../SectionToolbar";
import { SectionFooter } from "../SectionFooter";

export function InstructionsSection() {
  const [search, setSearch] = useState("");
  return (
    <div className="flex flex-col h-full min-h-0">
      <SectionToolbar
        search={search}
        onSearchChange={setSearch}
        generateLabel="Generate Instructions"
      />
      <div className="flex-1 overflow-y-auto scrollbar-thin flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-center max-w-sm px-8 py-12">
          <BookOpen className="h-10 w-10 text-muted-foreground/50" />
          <h3 className="text-sm font-semibold text-foreground mt-2">
            No instructions yet
          </h3>
          <p className="text-sm text-muted-foreground">
            Set always-on instructions that guide AI behavior across your
            workspace or user profile.
          </p>
        </div>
      </div>
      <SectionFooter
        description="Instructions are injected into every agent conversation so behavior stays consistent across projects."
        learnMoreLabel="Learn more about instructions"
        learnMoreHref="#"
      />
    </div>
  );
}

export default InstructionsSection;
