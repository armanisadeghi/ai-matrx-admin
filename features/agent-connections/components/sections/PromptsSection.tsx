"use client";

import React, { useState } from "react";
import { Bookmark } from "lucide-react";
import { SectionToolbar } from "../SectionToolbar";
import { GroupSection } from "../GroupSection";
import { ListRow } from "../ListRow";
import { SectionFooter } from "../SectionFooter";

const SAMPLE_PROMPT = {
  id: "commit-message",
  name: "Commit Message",
  description: "Write a Conventional-Commits style message for staged changes.",
};

export function PromptsSection() {
  const [search, setSearch] = useState("");
  const matches =
    !search.trim() ||
    SAMPLE_PROMPT.name.toLowerCase().includes(search.trim().toLowerCase()) ||
    SAMPLE_PROMPT.description
      .toLowerCase()
      .includes(search.trim().toLowerCase());

  return (
    <div className="flex flex-col h-full min-h-0">
      <SectionToolbar
        search={search}
        onSearchChange={setSearch}
        generateLabel="Generate Prompt"
      />
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {matches && (
          <GroupSection label="User" count={1}>
            <ListRow
              icon={Bookmark}
              title={SAMPLE_PROMPT.name}
              subtitle={SAMPLE_PROMPT.description}
            />
          </GroupSection>
        )}
      </div>
      <SectionFooter
        description="Reusable prompts you can invoke by name from any agent conversation."
        learnMoreLabel="Learn more about prompts"
        learnMoreHref="#"
      />
    </div>
  );
}

export default PromptsSection;
