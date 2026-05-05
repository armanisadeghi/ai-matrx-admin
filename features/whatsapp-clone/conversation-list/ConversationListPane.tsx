"use client";

import { useMemo, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ConversationListHeader } from "./ConversationListHeader";
import { ConversationSearch } from "./ConversationSearch";
import {
  ConversationFilterChips,
  type FilterKey,
} from "./ConversationFilterChips";
import { ConversationRow } from "./ConversationRow";
import type { WAConversation } from "../types";

interface ConversationListPaneProps {
  conversations: WAConversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function ConversationListPane({
  conversations,
  selectedId,
  onSelect,
}: ConversationListPaneProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");

  const filtered = useMemo(() => {
    let list = conversations;
    if (filter === "unread") list = list.filter((c) => c.unreadCount > 0);
    if (filter === "favorites") list = list.filter((c) => c.isFavorite);
    if (filter === "groups") list = list.filter((c) => c.isGroup);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.lastMessagePreview ?? "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [conversations, filter, search]);

  return (
    <div className="flex h-full flex-col bg-[#111b21]">
      <ConversationListHeader />
      <ConversationSearch value={search} onChange={setSearch} />
      <ConversationFilterChips active={filter} onChange={setFilter} />
      <ScrollArea className="flex-1">
        <div className="flex flex-col">
          {filtered.map((c) => (
            <ConversationRow
              key={c.id}
              conversation={c}
              selected={selectedId === c.id}
              onSelect={() => onSelect(c.id)}
            />
          ))}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-[13px] text-[#8696a0]">
              <span>No chats match your filter.</span>
            </div>
          ) : null}
        </div>
      </ScrollArea>
    </div>
  );
}
