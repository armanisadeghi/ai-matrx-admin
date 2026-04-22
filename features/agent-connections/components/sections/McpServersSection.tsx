"use client";

import React, { useMemo, useState } from "react";
import { Server } from "lucide-react";
import { SectionToolbar } from "../SectionToolbar";
import { GroupSection } from "../GroupSection";
import { ListRow } from "../ListRow";
import { SectionFooter } from "../SectionFooter";
import { MCP_GROUPS } from "../../data";

export function McpServersSection() {
  const [search, setSearch] = useState("");

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return MCP_GROUPS;
    return MCP_GROUPS.map((g) => ({
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
        browseLabel="Browse Marketplace"
        showAddButton
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
                icon={Server}
                title={item.name}
                subtitle={item.description || undefined}
                status={
                  item.status
                    ? {
                        label:
                          item.status.charAt(0).toUpperCase() +
                          item.status.slice(1),
                        tone: item.status,
                      }
                    : undefined
                }
              />
            ))}
          </GroupSection>
        ))}
      </div>
      <SectionFooter
        description="An open standard that lets AI use external tools and services. MCP servers provide tools for file operations, databases, APIs, and more."
        learnMoreLabel="Learn more about MCP servers"
        learnMoreHref="#"
      />
    </div>
  );
}

export default McpServersSection;
