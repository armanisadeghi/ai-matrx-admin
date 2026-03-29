"use client";

import { ChevronLeft } from "lucide-react";
import { useMemo } from "react";
import { RESPONSE_MODE_AGENT_MAP } from "@/features/cx-chat/components/agent/local-agents";

// ── Reverse map: agentId → modeId ────────────────────────────────────────────
const AGENT_TO_MODE: Record<string, string> = {};
for (const [modeId, agentId] of Object.entries(RESPONSE_MODE_AGENT_MAP)) {
  if (agentId && !AGENT_TO_MODE[agentId]) {
    AGENT_TO_MODE[agentId] = modeId;
  }
}

// ── Response Mode Buttons ─────────────────────────────────────────────────────

interface ResponseModeButtonsProps {
  disabled?: boolean;
  selectedAgentId?: string | null;
  onModeSelect?: (modeId: string, agentId: string | null) => void;
}

export function ResponseModeButtons({
  disabled,
  selectedAgentId,
  onModeSelect,
}: ResponseModeButtonsProps) {
  const activeMode = useMemo(() => {
    if (!selectedAgentId) return "text";
    return AGENT_TO_MODE[selectedAgentId] || null;
  }, [selectedAgentId]);

  const handleSelect = (modeId: string) => {
    if (disabled) return;
    const agentId = RESPONSE_MODE_AGENT_MAP[modeId];
    if (agentId) {
      onModeSelect?.(modeId, agentId);
    }
  };

  return (
    <div className="flex flex-wrap justify-center gap-1 md:gap-1.5">
      {Object.keys(RESPONSE_MODE_AGENT_MAP).map((modeId) => {
        const agentId = RESPONSE_MODE_AGENT_MAP[modeId];
        const isActive = activeMode === modeId;
        const isMapped = agentId !== null;
        return (
          <button
            key={modeId}
            onClick={() => handleSelect(modeId)}
            disabled={disabled || !isMapped}
            className={`py-1 px-2.5 rounded-full flex items-center gap-1 border text-xs transition-colors ${
              isActive
                ? "bg-zinc-300 dark:bg-zinc-600 text-gray-800 dark:text-gray-200 border-zinc-300 dark:border-zinc-700"
                : isMapped
                  ? "text-gray-800 dark:text-gray-300 hover:bg-zinc-300 dark:hover:bg-zinc-700 border-zinc-300 dark:border-zinc-700"
                  : "text-gray-400 dark:text-gray-600 border-zinc-200 dark:border-zinc-800 cursor-not-allowed"
            } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <span className="pr-0.5">{modeId}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── Back To Start Button ──────────────────────────────────────────────────────

interface BackToStartButtonProps {
  onBack: () => void;
  agentName?: string;
}

export function BackToStartButton({
  onBack,
  agentName,
}: BackToStartButtonProps) {
  return (
    <button
      onClick={onBack}
      className="flex items-center gap-1 px-2 py-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors text-xs"
      title="Back to agent selection"
    >
      <ChevronLeft size={14} />
      <span className="hidden md:inline">{agentName || "Back"}</span>
    </button>
  );
}
