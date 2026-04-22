"use client";

import React, { useMemo, useState } from "react";
import { Zap } from "lucide-react";
import { SectionToolbar } from "../SectionToolbar";
import { GroupSection } from "../GroupSection";
import { ListRow } from "../ListRow";
import { SectionFooter } from "../SectionFooter";
import { HOOK_GROUPS } from "../../data";

export function HooksSection() {
  const [search, setSearch] = useState("");

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return HOOK_GROUPS;
    return HOOK_GROUPS.map((g) => ({
      ...g,
      items: g.items.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.filename.toLowerCase().includes(q),
      ),
    })).filter((g) => g.items.length > 0);
  }, [search]);

  return (
    <div className="flex flex-col h-full min-h-0">
      <SectionToolbar
        search={search}
        onSearchChange={setSearch}
        generateLabel="Generate Hook"
      />
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {filteredGroups.map((group) => (
          <GroupSection
            key={group.key}
            label={group.label}
            count={group.items.length}
          >
            {group.items.map((item) => (
              <ListRow
                key={item.id}
                icon={Zap}
                title={item.name}
                subtitle={item.filename}
              />
            ))}
          </GroupSection>
        ))}
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
