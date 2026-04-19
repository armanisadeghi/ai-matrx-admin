"use client";

import React, { useCallback, useEffect, useState } from "react";
import { RefreshCw, Save, X, Copy } from "lucide-react";
import { WindowPanel } from "@/features/window-panels/WindowPanel";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  selectAgentById,
  selectAgentIsDirty,
  selectAgentName,
} from "@/features/agents/redux/agent-definition/selectors";
import {
  fetchFullAgent,
  saveAgentField,
} from "@/features/agents/redux/agent-definition/thunks";
import {
  AgentSidebar,
  AgentTabs,
} from "@/features/agents/components/settings/AgentSettingsWorkspace";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { ALL_TABS, CompactTabStrip, TabContent } from "./AgentContentWindow";
import type { AgentContentTab } from "./AgentContentWindow";

// ── Props ─────────────────────────────────────────────────────────────────────

interface AgentContentSidebarWindowProps {
  initialAgentId?: string | null;
  initialTab?: AgentContentTab;
  isOpen?: boolean;
  onClose?: () => void;
}

// ── Sidebar Header Actions ─────────────────────────────────────────────────────

interface SidebarHeaderActionsProps {
  agentId: string;
  isDirty: boolean;
}

function SidebarHeaderActions({ agentId, isDirty }: SidebarHeaderActionsProps) {
  const dispatch = useAppDispatch();

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
        onClick={() => dispatch(fetchFullAgent(agentId))}
        title="Refresh agent data"
      >
        <RefreshCw className="h-3 w-3" />
      </Button>
    </div>
  );
}

// ── Sidebar Footer Controls ────────────────────────────────────────────────────

interface SidebarFooterControlsProps {
  agentId: string;
  activeTab: AgentContentTab;
}

function SidebarFooterControls({
  agentId,
  activeTab,
}: SidebarFooterControlsProps) {
  const dispatch = useAppDispatch();
  const agent = useAppSelector((state) => selectAgentById(state, agentId));
  const isDirty = useAppSelector((state) => selectAgentIsDirty(state, agentId));
  const agentName = useAppSelector((state) => selectAgentName(state, agentId));

  const activeTabDef = ALL_TABS.find((t) => t.id === activeTab);
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

// ── Dirty Guard ───────────────────────────────────────────────────────────────

interface DirtyGuardProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function DirtyGuardDesktop({ open, onConfirm, onCancel }: DirtyGuardProps) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onCancel();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
          <AlertDialogDescription>
            You have unsaved changes in this agent. Switching agents will
            discard them. Do you want to continue?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Keep Editing</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Discard & Switch
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function DirtyGuardMobile({ open, onConfirm, onCancel }: DirtyGuardProps) {
  return (
    <Drawer
      open={open}
      onOpenChange={(v) => {
        if (!v) onCancel();
      }}
    >
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Unsaved Changes</DrawerTitle>
          <DrawerDescription>
            You have unsaved changes in this agent. Switching agents will
            discard them. Do you want to continue?
          </DrawerDescription>
        </DrawerHeader>
        <DrawerFooter>
          <Button variant="destructive" onClick={onConfirm}>
            Discard & Switch
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Keep Editing
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function AgentContentSidebarWindow({
  initialAgentId,
  initialTab = "messages",
  isOpen,
  onClose,
}: AgentContentSidebarWindowProps) {
  const dispatch = useAppDispatch();
  const isMobile = useIsMobile();

  // Multi-agent browser-tab state
  const [openedTabIds, setOpenedTabIds] = useState<string[]>(
    initialAgentId ? [initialAgentId] : [],
  );
  const [activeAgentId, setActiveAgentId] = useState<string | null>(
    initialAgentId ?? null,
  );

  // Active content tab within the editor
  const [activeTab, setActiveTab] = useState<AgentContentTab>(initialTab);

  // Dirty guard state
  const [pendingAgentId, setPendingAgentId] = useState<string | null>(null);
  const [showDirtyWarning, setShowDirtyWarning] = useState(false);

  const isDirty = useAppSelector((state) =>
    selectAgentIsDirty(state, activeAgentId ?? ""),
  );
  const agentName = useAppSelector((state) =>
    selectAgentName(state, activeAgentId ?? ""),
  );
  const agent = useAppSelector((state) =>
    selectAgentById(state, activeAgentId ?? ""),
  );
  const isOwner = agent?.isOwner === true;
  const isLoaded = !!agent && !(agent as { _loading?: boolean })._loading;

  // Fetch when agent changes and isn't loaded
  useEffect(() => {
    if (activeAgentId && !isLoaded) {
      dispatch(fetchFullAgent(activeAgentId));
    }
  }, [activeAgentId]);

  const switchToAgent = useCallback(
    (newAgentId: string) => {
      setActiveAgentId(newAgentId);
      if (!openedTabIds.includes(newAgentId)) {
        setOpenedTabIds((prev) => [...prev, newAgentId]);
      }
      dispatch(fetchFullAgent(newAgentId));
    },
    [dispatch, openedTabIds],
  );

  const handleOpenAgent = useCallback(
    (newAgentId: string) => {
      if (newAgentId === activeAgentId) return;
      if (isDirty) {
        setPendingAgentId(newAgentId);
        setShowDirtyWarning(true);
      } else {
        switchToAgent(newAgentId);
      }
    },
    [activeAgentId, isDirty, switchToAgent],
  );

  const handleDirtyConfirm = useCallback(() => {
    if (pendingAgentId) {
      switchToAgent(pendingAgentId);
    }
    setPendingAgentId(null);
    setShowDirtyWarning(false);
  }, [pendingAgentId, switchToAgent]);

  const handleDirtyCancel = useCallback(() => {
    setPendingAgentId(null);
    setShowDirtyWarning(false);
  }, []);

  const handleCloseTab = useCallback(
    (e: React.MouseEvent, tabId: string) => {
      e.stopPropagation();
      const next = openedTabIds.filter((id) => id !== tabId);
      setOpenedTabIds(next);
      if (activeAgentId === tabId) {
        setActiveAgentId(next[next.length - 1] ?? null);
      }
    },
    [activeAgentId, openedTabIds],
  );

  const handleSetActive = useCallback(
    (tabId: string) => {
      handleOpenAgent(tabId);
    },
    [handleOpenAgent],
  );

  const collectData = useCallback(
    (): Record<string, unknown> => ({
      initialAgentId: activeAgentId,
      activeTab,
    }),
    [activeAgentId, activeTab],
  );

  const sidebar = (
    <AgentSidebar
      openedTabIds={openedTabIds}
      activeTabId={activeAgentId}
      onOpenAgent={handleOpenAgent}
    />
  );

  return (
    <>
      <WindowPanel
        id="agent-content-sidebar-window"
        title={activeAgentId ? (agentName ?? "Agent Editor") : "Agent Editor"}
        onClose={onClose}
        width={1200}
        height={760}
        minWidth={760}
        minHeight={520}
        urlSyncKey="agent-content-sidebar"
        urlSyncId="agent-content-sidebar-window"
        urlSyncArgs={{ m: "acs" }}
        overlayId="agentContentSidebarWindow"
        onCollectData={collectData}
        sidebar={sidebar}
        sidebarDefaultSize={200}
        sidebarMinSize={140}
        sidebarExpandsWindow={false}
        actionsRight={
          activeAgentId ? (
            <SidebarHeaderActions agentId={activeAgentId} isDirty={isDirty} />
          ) : undefined
        }
        footerLeft={
          activeAgentId ? (
            <SidebarFooterControls
              agentId={activeAgentId}
              activeTab={activeTab}
            />
          ) : undefined
        }
      >
        <div className="flex flex-col h-full min-h-0 bg-background">
          {/* Multi-agent browser tabs */}
          <AgentTabs
            openedTabIds={openedTabIds}
            activeTabId={activeAgentId}
            onSetActive={handleSetActive}
            onCloseTab={handleCloseTab}
          />

          {activeAgentId ? (
            <>
              <CompactTabStrip
                tabs={ALL_TABS}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                isDirty={isDirty}
              />
              <TabContent
                agentId={activeAgentId}
                activeTab={activeTab}
                isOwner={isOwner}
                agentName={agentName ?? ""}
              />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
              Select an agent from the sidebar to begin editing.
            </div>
          )}
        </div>
      </WindowPanel>

      {/* Dirty guard — desktop uses AlertDialog, mobile uses Drawer */}
      {isMobile ? (
        <DirtyGuardMobile
          open={showDirtyWarning}
          onConfirm={handleDirtyConfirm}
          onCancel={handleDirtyCancel}
        />
      ) : (
        <DirtyGuardDesktop
          open={showDirtyWarning}
          onConfirm={handleDirtyConfirm}
          onCancel={handleDirtyCancel}
        />
      )}
    </>
  );
}
