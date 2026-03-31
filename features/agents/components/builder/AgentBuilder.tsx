"use client";

/**
 * AgentBuilder
 *
 * Main orchestrator for the agent edit page.
 * - Sets activeAgentId on mount / clears on unmount.
 * - Fetches full agent data if not already loaded.
 * - Dispatches saveAgent on explicit save.
 * - Renders AgentBuilderDesktop or AgentBuilderMobile based on viewport.
 * - Enables useAgentAutoSave for localStorage backup.
 *
 * Props surface:
 *   agentId      — resolved from URL params by the route
 *   models       — fetched server-side (model list)
 *   availableTools — fetched server-side (tool registry)
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, ChevronLeft, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  selectAgentById,
  selectActiveAgentId,
} from "@/features/agents/redux/agent-definition/selectors";
import { setActiveAgentId } from "@/features/agents/redux/agent-definition/slice";
import {
  fetchFullAgent,
  saveAgent,
} from "@/features/agents/redux/agent-definition/thunks";
import { useAgentAutoSave } from "@/features/agents/hooks/useAgentAutoSave";
import { useIsMobile } from "@/hooks/use-mobile";
import { AgentBuilderDesktop } from "./AgentBuilderDesktop";
import { AgentBuilderMobile } from "./AgentBuilderMobile";
import { toast } from "@/lib/toast-service";
import { cn } from "@/lib/utils";

interface AgentBuilderProps {
  agentId: string;
  models: Array<{ id: string; name?: string; [key: string]: unknown }>;
  availableTools?: Array<{
    name: string;
    description?: string;
    [key: string]: unknown;
  }>;
}

export function AgentBuilder({
  agentId,
  models,
  availableTools = [],
}: AgentBuilderProps) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const isMobile = useIsMobile();

  const record = useAppSelector((state) => selectAgentById(state, agentId));
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingFull, setIsLoadingFull] = useState(false);

  // Enable auto-save
  useAgentAutoSave(agentId);

  // Set active agent on mount, clear on unmount
  useEffect(() => {
    dispatch(setActiveAgentId(agentId));
    return () => {
      dispatch(setActiveAgentId(null));
    };
  }, [agentId, dispatch]);

  // Fetch full data if not yet loaded
  useEffect(() => {
    if (!record?._loadedFields?.has("messages")) {
      setIsLoadingFull(true);
      dispatch(fetchFullAgent(agentId)).finally(() => setIsLoadingFull(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId]);

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await dispatch(saveAgent(agentId)).unwrap();
      toast.success("Agent saved!");
    } catch (err) {
      console.error("Save error:", err);
      toast.error("Failed to save agent.");
    } finally {
      setIsSaving(false);
    }
  };

  const agentName = record?.name ?? "Agent";
  const isDirty = record?._dirty ?? false;

  if (isLoadingFull && !record?._loadedFields?.has("messages")) {
    return (
      <div className="flex items-center justify-center h-full gap-3 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <span className="text-sm">Loading agent...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-background shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/ai/agents")}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Agents</span>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center">
              <Bot className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="text-sm font-medium truncate max-w-[200px]">
              {agentName}
            </span>
            {isDirty && (
              <span className="text-[10px] text-amber-500 font-medium px-1.5 py-0.5 rounded bg-amber-500/10">
                Unsaved
              </span>
            )}
          </div>
        </div>

        <Button
          size="sm"
          onClick={handleSave}
          disabled={isSaving || !isDirty}
          className={cn("h-8 gap-1.5", !isDirty && "opacity-50")}
        >
          {isSaving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </div>

      {/* Builder content */}
      <div className="flex-1 overflow-hidden p-4">
        {isMobile ? (
          <AgentBuilderMobile models={models} availableTools={availableTools} />
        ) : (
          <AgentBuilderDesktop
            models={models}
            availableTools={availableTools}
          />
        )}
      </div>
    </div>
  );
}
