"use client";

import { useRef, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAgentListCore } from "@/features/agents/components/agent-listings/useAgentListCore";
import { AgentListDropdown } from "@/features/agents/components/agent-listings/AgentListDropdown";
import {
  AgentListContent,
  AgentDetailCard,
  AgentRow,
  AgentFilterBar,
} from "@/features/agents/components/agent-listings/core";
import type { RightPanel } from "@/features/agents/components/agent-listings/core";
import type { AgentDefinitionRecord } from "@/features/agents/types/agent-definition.types";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";

// ---------------------------------------------------------------------------
// 1. Dropdown with custom trigger
// ---------------------------------------------------------------------------

function DropdownCustomTriggerDemo() {
  const [selectedName, setSelectedName] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          Dropdown - Custom Trigger
          <Badge variant="secondary" className="text-[9px] h-4">AgentListDropdown</Badge>
        </CardTitle>
        <p className="text-[10px] text-muted-foreground">
          Same full-featured dropdown with a completely different trigger button style.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <AgentListDropdown
          onSelect={(id) => setSelectedName(id)}
          label={selectedName ? `Selected: ${selectedName.slice(0, 8)}...` : "Pick an agent"}
          triggerSlot={
            <button className="inline-flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
              <span>{selectedName ? `Agent: ${selectedName.slice(0, 8)}...` : "Choose Agent"}</span>
              <ChevronDown className="w-4 h-4" />
            </button>
          }
        />
        <SelectedDebug label="selected ID" value={selectedName} />
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// 2. Default dropdown (no custom trigger)
// ---------------------------------------------------------------------------

function DropdownDefaultDemo() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          Dropdown - Default Trigger
          <Badge variant="secondary" className="text-[9px] h-4">AgentListDropdown</Badge>
        </CardTitle>
        <p className="text-[10px] text-muted-foreground">
          Out-of-the-box dropdown with built-in trigger, search, filters, hover preview.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <AgentListDropdown
          onSelect={setSelectedId}
          label="Agents"
        />
        <SelectedDebug label="selected ID" value={selectedId} />
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// 3. Sidebar list (embedded, no popover)
// ---------------------------------------------------------------------------

function SidebarListDemo() {
  const isMobile = useIsMobile();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rightPanel, setRightPanel] = useState<RightPanel>(null);

  const {
    agents,
    isLoading,
    activeAgentId,
    allCategories,
    allTags,
    consumer,
    activeFilterCount,
    hoveredAgent,
    ensureLoaded,
    handleSelectAgent,
    handleAgentHover,
    handleAgentHoverEnd,
  } = useAgentListCore({
    consumerId: "demo-sidebar",
    onSelect: (id) => setSelectedId(id),
  });

  // Ensure data is loaded on mount
  useState(() => { ensureLoaded(); });

  const onFilterChipClick = (panel: "sort" | "categories" | "tags") => {
    setRightPanel(rightPanel === panel ? null : panel);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          Sidebar List
          <Badge variant="secondary" className="text-[9px] h-4">AgentListContent</Badge>
        </CardTitle>
        <p className="text-[10px] text-muted-foreground">
          Full list content embedded directly — no popover, no drawer. Use for sidebars, panels, or full pages.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="h-[320px] border border-border rounded-lg overflow-hidden">
          <AgentListContent
            agents={agents}
            isLoading={isLoading}
            consumer={consumer}
            activeAgentId={selectedId}
            allCategories={allCategories}
            allTags={allTags}
            inputRef={inputRef}
            onSelectAgent={handleSelectAgent}
            onReset={consumer.resetFilters}
            activeFilterCount={activeFilterCount}
            isMobile={isMobile}
            hoveredAgent={hoveredAgent}
            onAgentHover={(a) => handleAgentHover(a, false)}
            onAgentHoverEnd={(a) => handleAgentHoverEnd(a, () => {})}
            onDetailPress={() => {}}
            onFilterChipClick={onFilterChipClick}
            rightPanel={rightPanel}
          />
        </div>
        <SelectedDebug label="selected ID" value={selectedId} />
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// 4. Card grid (using useAgentListCore + custom rendering)
// ---------------------------------------------------------------------------

function CardGridDemo() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const {
    agents,
    isLoading,
    allCategories,
    allTags,
    consumer,
    activeFilterCount,
    ensureLoaded,
  } = useAgentListCore({
    consumerId: "demo-cards",
    onSelect: (id) => setSelectedId(id),
  });

  useState(() => { ensureLoaded(); });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          Card Grid
          <Badge variant="secondary" className="text-[9px] h-4">useAgentListCore + AgentFilterBar</Badge>
        </CardTitle>
        <p className="text-[10px] text-muted-foreground">
          Hook provides data, filter bar handles filtering, cards are custom. Mix and match any pieces.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <AgentFilterBar
          consumer={consumer}
          allCategories={allCategories}
          allTags={allTags}
          activeFilterCount={activeFilterCount}
          isMobile={false}
          rightPanel={null}
          onFilterChipClick={() => {}}
          onReset={consumer.resetFilters}
        />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-[240px] overflow-y-auto">
          {isLoading ? (
            <p className="col-span-full text-xs text-muted-foreground text-center py-8">Loading...</p>
          ) : agents.length === 0 ? (
            <p className="col-span-full text-xs text-muted-foreground text-center py-8">No agents found</p>
          ) : (
            agents.slice(0, 12).map((agent) => (
              <button
                key={agent.id}
                onClick={() => setSelectedId(agent.id)}
                className={cn(
                  "p-3 rounded-lg border text-left transition-all",
                  "hover:border-primary/30 hover:shadow-sm",
                  selectedId === agent.id
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card",
                )}
              >
                <p className="text-xs font-medium truncate">{agent.name || "Untitled"}</p>
                {agent.category && (
                  <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{agent.category}</p>
                )}
              </button>
            ))
          )}
        </div>
        <SelectedDebug label="selected ID" value={selectedId} />
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// 5. Inline detail card preview
// ---------------------------------------------------------------------------

function DetailCardDemo() {
  const [selectedAgent, setSelectedAgent] = useState<AgentDefinitionRecord | null>(null);

  const {
    agents,
    ensureLoaded,
  } = useAgentListCore({
    consumerId: "demo-detail",
    onSelect: () => {},
  });

  useState(() => { ensureLoaded(); });

  const previewAgent = selectedAgent ?? agents[0] ?? null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          Detail Card
          <Badge variant="secondary" className="text-[9px] h-4">AgentDetailCard</Badge>
        </CardTitle>
        <p className="text-[10px] text-muted-foreground">
          Standalone detail card — use anywhere: hover preview, sidebar detail, modal content.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2 flex-wrap">
          {agents.slice(0, 5).map((a) => (
            <button
              key={a.id}
              onClick={() => setSelectedAgent(a)}
              className={cn(
                "text-[11px] px-2 py-1 rounded-md border transition-colors",
                selectedAgent?.id === a.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:bg-muted/50",
              )}
            >
              {a.name?.slice(0, 15) || "Untitled"}
            </button>
          ))}
        </div>
        {previewAgent && (
          <div className="h-[300px] border border-border rounded-lg overflow-hidden">
            <AgentDetailCard
              agent={previewAgent}
              onSelect={() => {}}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// 6. Navigate-on-select (link mode)
// ---------------------------------------------------------------------------

function NavigateModeDemo() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          Navigate Mode
          <Badge variant="secondary" className="text-[9px] h-4">navigateTo</Badge>
        </CardTitle>
        <p className="text-[10px] text-muted-foreground">
          Instead of onSelect callback, navigates to a URL pattern on selection.
          Uses <code className="text-[10px] bg-muted px-1 rounded">navigateTo="/agents/&#123;id&#125;/run"</code>.
        </p>
      </CardHeader>
      <CardContent>
        <AgentListDropdown
          navigateTo="/agents/{id}/run"
          label="Select & Navigate"
        />
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Debug helper
// ---------------------------------------------------------------------------

function SelectedDebug({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="p-2 bg-muted/30 rounded-md border border-border/50">
      <p className="text-[9px] font-mono text-muted-foreground">
        {label}: {value ? (
          <span className="text-foreground">{value}</span>
        ) : (
          <span className="italic">none</span>
        )}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AgentSelectorDemoPage() {
  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-8">
      <div>
        <h1 className="text-xl font-bold">Agent Selector System</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Composable agent list components extracted from <code className="text-[11px] bg-muted px-1 rounded">AgentListDropdown</code>.
          All variants share the same <code className="text-[11px] bg-muted px-1 rounded">useAgentListCore</code> hook
          and <code className="text-[11px] bg-muted px-1 rounded">useAgentConsumer</code> Redux state.
        </p>
      </div>

      <Separator />

      {/* Dropdown variants */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold">Dropdown Variants</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <DropdownDefaultDemo />
          <DropdownCustomTriggerDemo />
          <NavigateModeDemo />
        </div>
      </section>

      <Separator />

      {/* Embedded variants */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold">Embedded Variants</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SidebarListDemo />
          <CardGridDemo />
        </div>
      </section>

      <Separator />

      {/* Detail card */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold">Standalone Components</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DetailCardDemo />
        </div>
      </section>
    </div>
  );
}
