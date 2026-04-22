"use client";

import React, { useMemo, useState } from "react";
import { Lightbulb } from "lucide-react";
import { SectionToolbar } from "../SectionToolbar";
import { GroupSection } from "../GroupSection";
import { ListRow } from "../ListRow";
import { SectionFooter } from "../SectionFooter";
import { SKILL_GROUPS } from "../../data";

export function SkillsSection() {
  const [search, setSearch] = useState("");

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return SKILL_GROUPS;
    return SKILL_GROUPS.map((g) => ({
      ...g,
      items: g.items.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q),
      ),
    })).filter((g) => g.items.length > 0);
  }, [search]);

  return (
    <div className="flex flex-col h-full min-h-0">
      <SectionToolbar
        search={search}
        onSearchChange={setSearch}
        generateLabel="Generate Skill"
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
                icon={Lightbulb}
                title={item.name}
                subtitle={item.description}
              />
            ))}
          </GroupSection>
        ))}
      </div>
      <SectionFooter
        description="Folders of instructions, scripts, and resources that Copilot loads when relevant to perform specialized tasks."
        learnMoreLabel="Learn more about agent skills"
        learnMoreHref="#"
      />
    </div>
  );
}

export default SkillsSection;
