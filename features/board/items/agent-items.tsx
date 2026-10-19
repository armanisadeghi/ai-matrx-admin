"use client";

/**
 * Agent on a board: the agent itself, as its `/agents/[id]` page shows it.
 *
 * The tile body IS `AgentRecord` (`features/agents/route/AgentRecord.tsx`), the very component the
 * page renders around `AgentViewContent`: instructions and messages, variables, settings, model,
 * tools, context policies, MCP servers, output schema, version, custom fields, copy and export, and
 * "Reset to latest" — with the `matrx-user/agent-record` surface mounted inside it. The page's own
 * header (name, View / Build / Run) is left out; Open goes to the page, where Build and Run live.
 *
 * There is no Start new: making an agent is the Agent Studio / builder flow (`/agents/new/*`, routed
 * pages with their own steps), not a component a tile can hold. Bring in is the platform's one agent
 * picker (`AgentListInlinePicker`), the same one the agent form and chat items use.
 *
 * Pure helpers: ./agent-items.logic.ts.
 */

import { useEffect } from "react";
import { AgentListInlinePicker } from "@ai-matrx/agents/catalog/react";
import { AGENT_ICON } from "@/components/icons/domain-icons";
import { Button } from "@/components/ui/button";
import { AgentRecord } from "@/features/agents/route/AgentRecord";
import { useAgentName } from "@ai-matrx/chat/agents/identity/agent-identity";
import { entityComments, type BoardItemType, type ItemBodyProps, type PickerProps } from "./types";
import { titleToAdopt } from "./feature-items.logic";
import { nameMatches } from "./record-finders";
import { AGENT_ITEM_KEY, agentIdOf, agentRecordHref, agentSource } from "./agent-items.logic";

function AgentPicker({ onPick, onCancel }: PickerProps) {
  return (
    <div className="flex h-[520px] min-h-0 flex-col gap-2">
      <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-border">
        <AgentListInlinePicker
          consumerId="board-agent"
          className="h-full"
          onSelect={(agentId) => onPick([{ title: "Agent", source: agentSource(agentId) }])}
        />
      </div>
      <div className="flex shrink-0 justify-end">
        <Button type="button" variant="quiet" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

/** Renders nothing: the tile takes the agent's name once the store knows it. */
function FollowAgentName({ id, source, title, onSource }: { id: string } & Pick<ItemBodyProps, "source" | "title" | "onSource">) {
  const name = useAgentName(id);
  const next = titleToAdopt(title, name);
  useEffect(() => {
    if (next) onSource(source, next);
  }, [next, source, onSource]);
  return null;
}

function AgentBody({ source, title, onSource }: ItemBodyProps) {
  const id = agentIdOf(source);
  if (!id) return null;
  return (
    <div className="h-full min-h-0 bg-background">
      <FollowAgentName id={id} source={source} title={title} onSource={onSource} />
      <AgentRecord key={id} agentId={id} embedded />
    </div>
  );
}

export const AGENT_ITEMS: readonly BoardItemType[] = [
  {
    key: AGENT_ITEM_KEY,
    surface: { name: "matrx-user/agent-record" },
    comments: entityComments("agent"),
    label: "Agent",
    kindLabel: "agent",
    icon: AGENT_ICON,
    group: "features",
    section: "ai",
    accent: "violet",
    status: { none: "An agent record has no running state; a run is a chat or an agent form." },
    // Stat strip, then the system instruction and message cards: tall.
    defaultSize: { w: 900, h: 1000 },
    matches: (s) => s.kind === "entity" && s.entity === AGENT_ITEM_KEY,
    Body: AgentBody,
    bringIn: { label: "Agent", Picker: AgentPicker },
    record: {
      place: (id, title) => ({ title: title?.trim() || "Agent", source: agentSource(id) }),
      // The agent catalog the one agent picker reads (every agent the person can see), matched on the name.
      find: async (query, limit) => {
        const lookup = (await import("../tools/board-agent-lookup")).catalogAgentLookup();
        await lookup.ensureLoaded();
        return lookup
          .rows()
          .filter((r) => r.isActive && !r.isArchived && nameMatches(query, r.name ?? ""))
          .slice(0, limit)
          .map((r) => ({
            type: AGENT_ITEM_KEY,
            id: r.id,
            title: r.name?.trim() || "Agent",
            updated_at: null,
            ...(r.organizationName ? { snippet: r.organizationName } : {}),
          }));
      },
    },
    href: (s) => {
      const id = agentIdOf(s);
      return id ? agentRecordHref(id) : null;
    },
  },
];
