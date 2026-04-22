"use client";

/**
 * AgentShortcutQuickCreateWindow
 *
 * Floating window that wraps `ShortcutQuickCreateBody`. Lets the user create
 * a shortcut pointing at a specific agent (or link an existing one) without
 * leaving the agent they were working on.
 *
 * This replaces the previous `AgentAdminShortcutWindow` placeholder. Both
 * the overlay id (`agentAdminShortcutWindow`) and the registry slug
 * (`agent-admin-shortcut-window`) are preserved so existing dispatchers
 * (`openAgentAdminShortcutWindow`) and the menu wiring continue to work.
 */

import { useCallback, useState } from "react";
import { Link2 } from "lucide-react";
import { WindowPanel } from "@/features/window-panels/WindowPanel";
import { AgentComingSoonContent } from "@/features/agents/components/coming-soon/AgentComingSoonContent";
import {
  ShortcutQuickCreateBody,
  type QuickCreateTab,
} from "@/features/agent-shortcuts/components/ShortcutQuickCreateBody";

interface AgentShortcutQuickCreateWindowProps {
  isOpen: boolean;
  onClose: () => void;
  agentId?: string | null;
  /** Initial tab to open on, restored from `window_sessions.data.activeTab`. */
  initialActiveTab?: QuickCreateTab;
}

const WINDOW_ID = "agent-admin-shortcut-window";
const OVERLAY_ID = "agentAdminShortcutWindow";
const VALID_TABS: ReadonlyArray<QuickCreateTab> = [
  "essentials",
  "variables",
  "details",
  "advanced",
  "link",
];

function coerceTab(value: unknown): QuickCreateTab {
  return typeof value === "string" &&
    (VALID_TABS as readonly string[]).includes(value)
    ? (value as QuickCreateTab)
    : "essentials";
}

export default function AgentShortcutQuickCreateWindow({
  isOpen,
  onClose,
  agentId,
  initialActiveTab,
}: AgentShortcutQuickCreateWindowProps) {
  if (!isOpen) return null;
  return (
    <AgentShortcutQuickCreateWindowInner
      onClose={onClose}
      agentId={agentId ?? null}
      initialActiveTab={coerceTab(initialActiveTab)}
    />
  );
}

function AgentShortcutQuickCreateWindowInner({
  onClose,
  agentId,
  initialActiveTab,
}: {
  onClose: () => void;
  agentId: string | null;
  initialActiveTab: QuickCreateTab;
}) {
  const [activeTab, setActiveTab] = useState<QuickCreateTab>(initialActiveTab);

  // Collect only serializable state for session persistence. Geometry is
  // handled by WindowPanel automatically; we add the currently active tab
  // plus the agentId so the window reopens on the same agent + tab.
  const collectData = useCallback(
    (): Record<string, unknown> => ({
      agentId,
      activeTab,
    }),
    [agentId, activeTab],
  );

  // No agent id means the window was opened in an invalid state (e.g. from a
  // stale URL hydrator). Render a clear placeholder instead of crashing.
  if (!agentId) {
    return (
      <WindowPanel
        id={WINDOW_ID}
        title="Create Shortcut"
        onClose={onClose}
        width={520}
        height={360}
        minWidth={420}
        minHeight={300}
        overlayId={OVERLAY_ID}
      >
        <AgentComingSoonContent
          icon={Link2}
          title="No agent selected"
          description="Open this window from an agent's actions menu to create or link a shortcut."
          agentId={null}
        />
      </WindowPanel>
    );
  }

  return (
    <WindowPanel
      id={WINDOW_ID}
      title="Create Shortcut"
      onClose={onClose}
      width={640}
      height={600}
      minWidth={480}
      minHeight={460}
      overlayId={OVERLAY_ID}
      onCollectData={collectData}
      bodyClassName="p-0"
    >
      <ShortcutQuickCreateBody
        agentId={agentId}
        activeTab={activeTab}
        onActiveTabChange={setActiveTab}
        onClose={onClose}
      />
    </WindowPanel>
  );
}
