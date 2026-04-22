"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  MessageSquare,
  Settings,
  Cpu,
  Variable,
  Wrench,
  Layers,
  Info,
  Share2,
  RefreshCw,
  Save,
  X,
  Copy,
  Circle,
  Search,
  Play,
  GitBranch,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { WindowPanel } from "@/features/window-panels/WindowPanel";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  selectAgentById,
  selectAgentIsDirty,
  selectAgentName,
} from "@/features/agents/redux/agent-definition/selectors";
import {
  fetchFullAgent,
  initializeChatAgents,
  saveAgentField,
} from "@/features/agents/redux/agent-definition/thunks";
import { makeSelectFilteredAgents } from "@/features/agents/redux/agent-consumers/selectors";
import { useAgentConsumer } from "@/features/agents/hooks/useAgentConsumer";
import { Messages } from "@/features/agents/components/builder/message-builders/Messages";
import { SystemMessage } from "@/features/agents/components/builder/message-builders/system-instructions/SystemMessage";
import { AgentVariablesPanel } from "@/features/agents/components/variables-management/AgentVariablesPanel";
import { AgentToolsManager } from "@/features/agents/components/tools-management/AgentToolsManager";
import { AgentContextSlotsManager } from "@/features/agents/components/context-slots-management/AgentContextSlotsManager";
import { AgentSettingsForm } from "@/features/agents/components/settings/AgentSettingsForm";
import { AgentModelPanel } from "@/features/agents/components/model/AgentModelPanel";
import { AgentSharePanel } from "@/features/agents/components/sharing/AgentSharePanel";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { useMemo } from "react";
import { AgentRunWrapper } from "@/features/agents/components/smart/AgentRunWrapper";
import { SourceFeature } from "@/features/agents/types";
import { AgentVersionsWorkspace } from "@/features/agents/route/AgentVersionsWorkspace";

// ── Types ─────────────────────────────────────────────────────────────────────

export type AgentContentTab =
  | "messages"
  | "system"
  | "settings"
  | "variables"
  | "tools"
  | "context"
  | "overview"
  | "share"
  | "run"
  | "history"
  | "versions";

interface TabDefinition {
  id: AgentContentTab;
  label: string;
  icon: React.ElementType;
  /** When true, footer save/cancel controls are hidden (tab has inline saves) */
  inlineSave?: boolean;
}

export const ALL_TABS: TabDefinition[] = [
  { id: "overview", label: "Overview", icon: Info },
  {
    id: "system",
    label: "System Instructions",
    icon: Settings,
    inlineSave: true,
  },
  { id: "messages", label: "Messages", icon: MessageSquare, inlineSave: true },
  { id: "settings", label: "Settings", icon: Cpu },
  { id: "variables", label: "Variables", icon: Variable, inlineSave: true },
  { id: "tools", label: "Tools", icon: Wrench, inlineSave: true },
  { id: "context", label: "Context", icon: Layers, inlineSave: true },
  { id: "share", label: "Share", icon: Share2, inlineSave: true },
  { id: "run", label: "Run", icon: Play, inlineSave: true },
  { id: "history", label: "History", icon: Clock, inlineSave: true },
  { id: "versions", label: "Versions", icon: GitBranch, inlineSave: true },
];

// ── Props ─────────────────────────────────────────────────────────────────────

interface AgentContentWindowProps {
  initialAgentId?: string | null;
  initialTab?: AgentContentTab;
  tabs?: AgentContentTab[];
  isOpen?: boolean;
  onClose?: () => void;
}

// ── Compact Tab Strip ─────────────────────────────────────────────────────────

interface CompactTabStripProps {
  tabs: TabDefinition[];
  activeTab: AgentContentTab;
  onTabChange: (tab: AgentContentTab) => void;
  isDirty: boolean;
}

export function CompactTabStrip({
  tabs,
  activeTab,
  onTabChange,
  isDirty,
}: CompactTabStripProps) {
  return (
    <div className="flex items-end border-b border-border bg-muted/20 shrink-0 overflow-x-auto scrollbar-hide">
      {tabs.map((tab) => {
        const Icon = tab.icon as React.FC<React.SVGProps<SVGSVGElement>>;
        const isActive = tab.id === activeTab;
        const showDirty = isDirty && tab.id === activeTab;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium whitespace-nowrap border-b-2 transition-all duration-150 shrink-0 relative",
              isActive
                ? "border-primary text-foreground bg-background"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/40",
            )}
          >
            <Icon className="h-3 w-3 shrink-0" />
            <span>{tab.label}</span>
            {showDirty && (
              <Circle className="h-1.5 w-1.5 fill-amber-500 text-amber-500 shrink-0" />
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Header Actions ────────────────────────────────────────────────────────────

interface HeaderActionsProps {
  agentId: string;
  isDirty: boolean;
}

function HeaderActions({ agentId, isDirty }: HeaderActionsProps) {
  const dispatch = useAppDispatch();

  const handleRefresh = () => {
    dispatch(fetchFullAgent(agentId));
  };

  return (
    <div className="flex items-center gap-1">
      {isDirty && (
        <span className="text-[10px] text-amber-500 font-medium px-1">
          unsaved
        </span>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={handleRefresh}
        title="Refresh agent data"
      >
        <RefreshCw className="h-3 w-3" />
      </Button>
    </div>
  );
}

// ── Footer Controls ───────────────────────────────────────────────────────────

interface FooterControlsProps {
  agentId: string;
  activeTab: AgentContentTab;
  activeTabs: TabDefinition[];
}

function FooterControls({
  agentId,
  activeTab,
  activeTabs,
}: FooterControlsProps) {
  const dispatch = useAppDispatch();
  const agent = useAppSelector((state) => selectAgentById(state, agentId));
  const isDirty = useAppSelector((state) => selectAgentIsDirty(state, agentId));
  const agentName = useAppSelector((state) => selectAgentName(state, agentId));

  const activeTabDef = activeTabs.find((t) => t.id === activeTab);
  const showSaveControls = !activeTabDef?.inlineSave && isDirty;

  const handleSave = () => {
    if (!agent) return;
    const dirtyFields = agent._dirtyFields;
    if (!dirtyFields) return;
    for (const field of Object.keys(
      dirtyFields,
    ) as (keyof import("@/features/agents/types/agent-definition.types").AgentDefinition)[]) {
      dispatch(
        saveAgentField({ agentId, field, value: agent[field] as never }),
      );
    }
  };

  const handleCancel = () => {
    dispatch(fetchFullAgent(agentId));
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(agentId);
  };

  return (
    <div className="flex items-center justify-between px-3 py-1">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-xs font-medium text-foreground truncate max-w-[160px]">
          {agentName || "Agent"}
        </span>
        <button
          onClick={handleCopyId}
          className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted/60 hover:bg-muted text-[10px] font-mono text-muted-foreground hover:text-foreground transition-colors shrink-0"
          title="Copy agent ID"
        >
          <span className="truncate max-w-[80px]">{agentId.slice(0, 8)}…</span>
          <Copy className="h-2.5 w-2.5 shrink-0" />
        </button>
      </div>

      {showSaveControls && (
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-muted-foreground"
            onClick={handleCancel}
          >
            <X className="h-3 w-3 mr-1" />
            Cancel
          </Button>
          <Button
            variant="default"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={handleSave}
          >
            <Save className="h-3 w-3 mr-1" />
            Save
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Agent Picker Fallback ─────────────────────────────────────────────────────

const PICKER_CONSUMER_ID = "agent-advanced-editor-window-picker";

interface AgentPickerFallbackProps {
  onSelect: (agentId: string) => void;
}

function AgentPickerFallback({ onSelect }: AgentPickerFallbackProps) {
  const dispatch = useAppDispatch();
  const [search, setSearch] = useState("");
  const consumer = useAgentConsumer(PICKER_CONSUMER_ID, {
    unregisterOnUnmount: true,
  });
  const selectFiltered = useMemo(
    () => makeSelectFilteredAgents(PICKER_CONSUMER_ID),
    [],
  );
  const agents = useAppSelector(selectFiltered);

  useEffect(() => {
    dispatch(initializeChatAgents());
  }, [dispatch]);

  const filtered = useMemo(() => {
    if (!search.trim()) return agents;
    const q = search.toLowerCase();
    return agents.filter((a) => a.name?.toLowerCase().includes(q));
  }, [agents, search]);

  const handleSelect = (agentId: string) => {
    dispatch(fetchFullAgent(agentId));
    onSelect(agentId);
  };

  return (
    <div className="flex flex-col h-full min-h-0 p-4">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-foreground mb-1">
          Select an Agent
        </h2>
        <p className="text-xs text-muted-foreground">
          Choose an agent to open in the editor.
        </p>
      </div>
      <div className="relative mb-3">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search agents…"
          className="h-8 pl-8 text-xs"
        />
      </div>
      <ScrollArea className="flex-1">
        <div className="space-y-1">
          {filtered.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-6">
              No agents found.
            </p>
          )}
          {filtered.map((agent) => (
            <button
              key={agent.id}
              onClick={() => handleSelect(agent.id)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-left hover:bg-accent transition-colors"
            >
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground truncate">
                  {agent.name || "Untitled"}
                </p>
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

// ── Tab Content Router ────────────────────────────────────────────────────────

interface TabContentProps {
  agentId: string;
  activeTab: AgentContentTab;
  isOwner: boolean;
  agentName: string;
}

export function TabContent({
  agentId,
  activeTab,
  isOwner,
  agentName,
}: TabContentProps) {
  return (
    <div className="flex-1 min-h-0 overflow-hidden">
      {activeTab === "system" && (
        <ScrollArea className="h-full">
          <div className="p-3">
            <SystemMessage agentId={agentId} />
          </div>
        </ScrollArea>
      )}
      {activeTab === "messages" && (
        <ScrollArea className="h-full">
          <div className="p-3">
            <Messages agentId={agentId} />
          </div>
        </ScrollArea>
      )}

      {activeTab === "settings" && <AgentModelPanel agentId={agentId} />}

      {activeTab === "variables" && <AgentVariablesPanel agentId={agentId} />}

      {activeTab === "tools" && <AgentToolsManager agentId={agentId} />}

      {activeTab === "context" && (
        <ScrollArea className="h-full">
          <div className="p-3">
            <AgentContextSlotsManager agentId={agentId} />
          </div>
        </ScrollArea>
      )}

      {activeTab === "overview" && <AgentSettingsForm agentId={agentId} />}

      {activeTab === "share" && (
        <AgentSharePanel
          agentId={agentId}
          isOwner={isOwner}
          agentName={agentName}
        />
      )}

      {/* {activeTab === "history" && <AgentRunHistoryPanel agentId={agentId} />} */}

      {activeTab === "versions" && <AgentVersionsWorkspace agentId={agentId} />}

      {activeTab === "run" && (
        <AgentRunWrapper
          agentId={agentId}
          sourceFeature="agent-advanced-editor-window"
        />
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function AgentContentWindow({
  initialAgentId,
  initialTab = "messages",
  tabs,
  isOpen,
  onClose,
}: AgentContentWindowProps) {
  const dispatch = useAppDispatch();
  dispatch(fetchFullAgent(initialAgentId));

  const [localAgentId, setLocalAgentId] = useState<string | null>(
    initialAgentId ?? null,
  );
  const agentId = localAgentId;

  const [activeTab, setActiveTab] = useState<AgentContentTab>(initialTab);

  // Resolve the active tab list — custom order/subset or all 8
  const activeTabs = useMemo(() => {
    if (tabs && tabs.length > 0) {
      return ALL_TABS.filter((t) => tabs.includes(t.id)).sort(
        (a, b) => tabs.indexOf(a.id) - tabs.indexOf(b.id),
      );
    }
    return ALL_TABS;
  }, [tabs]);

  const isDirty = useAppSelector((state) =>
    selectAgentIsDirty(state, agentId ?? ""),
  );
  const agentName = useAppSelector((state) =>
    selectAgentName(state, agentId ?? ""),
  );
  const agent = useAppSelector((state) =>
    selectAgentById(state, agentId ?? ""),
  );
  const isOwner = agent?.isOwner === true;
  const isLoaded = !!agent && !(agent as { _loading?: boolean })._loading;

  // Mount-fetch guard — dispatch fetchFullAgent when agentId is set but not loaded
  useEffect(() => {
    if (agentId && !isLoaded) {
      dispatch(fetchFullAgent(agentId));
    }
  }, [agentId]); // only run when agentId changes

  // Ensure activeTab is in the available tab list
  useEffect(() => {
    if (
      agentId &&
      activeTabs.length > 0 &&
      !activeTabs.find((t) => t.id === activeTab)
    ) {
      setActiveTab(activeTabs[0].id);
    }
  }, [activeTabs, agentId]);

  const collectData = useCallback(
    (): Record<string, unknown> => ({ initialAgentId: agentId, activeTab }),
    [agentId, activeTab],
  );

  return (
    <WindowPanel
      id="agent-advanced-editor-window"
      title="Agent Advanced Editor"
      onClose={onClose}
      width={1050}
      height={760}
      minWidth={640}
      minHeight={520}
      urlSyncKey="agent-advanced-editor"
      urlSyncId="agent-advanced-editor-window"
      urlSyncArgs={{ m: "ac" }}
      overlayId="agentAdvancedEditorWindow"
      onCollectData={collectData}
      actionsRight={
        agentId ? (
          <HeaderActions agentId={agentId} isDirty={isDirty} />
        ) : undefined
      }
      footerLeft={
        agentId ? (
          <FooterControls
            agentId={agentId}
            activeTab={activeTab}
            activeTabs={activeTabs}
          />
        ) : undefined
      }
    >
      <div className="flex flex-col h-full min-h-0 bg-background">
        {!agentId ? (
          <AgentPickerFallback onSelect={setLocalAgentId} />
        ) : (
          <>
            <CompactTabStrip
              tabs={activeTabs}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              isDirty={isDirty}
            />
            <TabContent
              agentId={agentId}
              activeTab={activeTab}
              isOwner={isOwner}
              agentName={agentName ?? ""}
            />
          </>
        )}
      </div>
    </WindowPanel>
  );
}
