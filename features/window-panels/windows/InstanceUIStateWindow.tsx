"use client";

import React, { useCallback, useState } from "react";
import { LayoutDashboard, X, Code2, Copy, Check } from "lucide-react";
import { WindowPanel } from "../WindowPanel";
import { InstanceUIStateList } from "@/features/agents/redux/execution-system/instance-ui-state/components/InstanceUIStateList";
import { InstanceUIStateCore } from "@/features/agents/redux/execution-system/instance-ui-state/components/InstanceUIStateCore";
import { useAppSelector } from "@/lib/redux/hooks";
import {
  selectFullInstanceUIStateSlice,
  selectInstanceTitle,
  selectAllUIStateConversationIds,
} from "@/features/agents/redux/execution-system/instance-ui-state/instance-ui-state.selectors";
import { cn } from "@/lib/utils";
import { formatJson } from "@/utils/json/json-cleaner-utility";

// ─── Types ────────────────────────────────────────────────────────────────────

type TabId = string;

// ─── Copy helper ──────────────────────────────────────────────────────────────

function useCopyText(text: string) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return { copied, copy };
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────

function TabBar({
  openTabIds,
  activeTabId,
  onActivate,
  onClose,
}: {
  openTabIds: TabId[];
  activeTabId: TabId | null;
  onActivate: (id: TabId) => void;
  onClose: (id: TabId) => void;
}) {
  if (openTabIds.length === 0) return null;

  return (
    <div className="flex items-end h-8 border-b border-border bg-muted/20 px-1 shrink-0 overflow-x-auto no-scrollbar">
      {openTabIds.map((id) => (
        <TabItem
          key={id}
          tabId={id}
          isActive={id === activeTabId}
          onActivate={() => onActivate(id)}
          onClose={() => onClose(id)}
        />
      ))}
    </div>
  );
}

function TabItem({
  tabId,
  isActive,
  onActivate,
  onClose,
}: {
  tabId: TabId;
  isActive: boolean;
  onActivate: () => void;
  onClose: () => void;
}) {
  const instanceTitle = useAppSelector(selectInstanceTitle(tabId));
  const label = instanceTitle ?? tabId.slice(0, 8) + "…";

  return (
    <div
      onClick={onActivate}
      className={cn(
        "group flex items-center h-full border border-b-0 rounded-t pl-2.5 pr-1 cursor-pointer select-none transition-colors shrink-0",
        "min-w-[80px] max-w-[180px]",
        isActive
          ? "bg-background border-border text-foreground z-10 font-medium pb-px translate-y-px"
          : "bg-muted/20 border-border/40 text-muted-foreground hover:bg-muted/40 hover:text-foreground hover:border-border/70",
      )}
    >
      <span className="text-xs truncate flex-1">{label}</span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className={cn(
          "w-4 h-4 ml-1 rounded-sm flex items-center justify-center transition-colors shrink-0",
          isActive
            ? "text-muted-foreground hover:bg-muted"
            : "opacity-0 group-hover:opacity-100 text-muted-foreground hover:bg-muted/80",
        )}
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

// ─── Full slice JSON view ─────────────────────────────────────────────────────

function FullSliceView() {
  const sliceState = useAppSelector(selectFullInstanceUIStateSlice);
  const json = formatJson(sliceState, 2);
  const { copied, copy } = useCopyText(json);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border shrink-0">
        <Code2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex-1">
          instanceUIState — full slice
        </span>
        <span className="text-xs text-muted-foreground">
          {Object.keys(sliceState.byConversationId).length} instances
        </span>
        <button
          type="button"
          onClick={copy}
          className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          title="Copy full JSON"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        <pre className="p-3 text-xs font-mono text-foreground whitespace-pre-wrap leading-relaxed">
          {json}
        </pre>
      </div>
    </div>
  );
}

// ─── Window inner ─────────────────────────────────────────────────────────────

function InstanceUIStateWindowInner({
  onClose,
  initialConversationId,
}: {
  onClose: () => void;
  initialConversationId: string | null;
}) {
  const sliceState = useAppSelector(selectFullInstanceUIStateSlice);
  const allIds = useAppSelector(selectAllUIStateConversationIds);

  const firstId = initialConversationId ?? allIds[0] ?? null;

  const [openTabIds, setOpenTabIds] = useState<TabId[]>(
    firstId ? [firstId] : [],
  );
  const [activeTabId, setActiveTabId] = useState<TabId | null>(firstId);
  const [showFullSlice, setShowFullSlice] = useState(() => !firstId);

  const openTab = useCallback((id: TabId) => {
    setOpenTabIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setActiveTabId(id);
    setShowFullSlice(false);
  }, []);

  const closeTab = useCallback(
    (id: TabId) => {
      setOpenTabIds((prev) => {
        const next = prev.filter((t) => t !== id);
        if (activeTabId === id) {
          setActiveTabId(next.length > 0 ? next[next.length - 1] : null);
        }
        return next;
      });
    },
    [activeTabId],
  );

  const collectData = useCallback(
    (): Record<string, unknown> => ({
      selectedConversationId: activeTabId ?? null,
    }),
    [activeTabId],
  );

  const instanceCount = Object.keys(sliceState.byConversationId).length;
  const sliceJson = formatJson(sliceState, 2);
  const { copied: sliceCopied, copy: copySlice } = useCopyText(sliceJson);

  return (
    <WindowPanel
      id="instance-ui-state-window"
      title="Instance UI State"
      onClose={onClose}
      width={900}
      height={640}
      minWidth={520}
      minHeight={360}
      overlayId="instanceUIStateWindow"
      onCollectData={collectData}
      sidebar={
        <InstanceUIStateList
          openTabIds={openTabIds}
          selectedConversationId={activeTabId}
          onSelect={openTab}
        />
      }
      sidebarDefaultSize={220}
      sidebarMinSize={150}
      defaultSidebarOpen
    >
      <div className="flex flex-col h-full min-h-0">
        {/* Tab bar — hidden when full slice is toggled on */}
        {!showFullSlice && (
          <TabBar
            openTabIds={openTabIds}
            activeTabId={activeTabId}
            onActivate={setActiveTabId}
            onClose={closeTab}
          />
        )}

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {showFullSlice ? (
            <FullSliceView />
          ) : activeTabId ? (
            <InstanceUIStateCore
              conversationId={activeTabId}
              className="h-full"
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center text-muted-foreground">
              <LayoutDashboard className="h-10 w-10 opacity-15" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  No instance selected
                </p>
                <p className="text-xs opacity-60">
                  Select an instance from the sidebar to inspect its UI state.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 px-3 py-1.5 border-t border-border bg-muted/10 shrink-0">
          <span className="text-[11px] text-muted-foreground flex-1">
            {instanceCount} instance{instanceCount !== 1 ? "s" : ""} in slice
          </span>
          <button
            type="button"
            onClick={copySlice}
            className="flex items-center gap-1 h-6 px-2 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="Copy full slice JSON"
          >
            {sliceCopied ? (
              <Check className="h-3 w-3 text-emerald-500" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
            <span>Copy slice</span>
          </button>
          <button
            type="button"
            onClick={() => setShowFullSlice((v) => !v)}
            className={cn(
              "flex items-center gap-1 h-6 px-2 rounded text-xs transition-colors",
              showFullSlice
                ? "bg-primary/10 text-primary border border-primary/20"
                : "text-muted-foreground hover:text-foreground hover:bg-accent",
            )}
          >
            <Code2 className="h-3 w-3" />
            <span>Full Slice JSON</span>
          </button>
        </div>
      </div>
    </WindowPanel>
  );
}

// ─── Window shell ─────────────────────────────────────────────────────────────

interface InstanceUIStateWindowProps {
  isOpen: boolean;
  onClose: () => void;
  initialConversationId?: string | null;
}

export default function InstanceUIStateWindow({
  isOpen,
  onClose,
  initialConversationId,
}: InstanceUIStateWindowProps) {
  if (!isOpen) return null;
  return (
    <InstanceUIStateWindowInner
      onClose={onClose}
      initialConversationId={initialConversationId ?? null}
    />
  );
}
