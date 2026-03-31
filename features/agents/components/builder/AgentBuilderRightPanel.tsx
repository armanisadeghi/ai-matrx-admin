"use client";

/**
 * AgentBuilderRightPanel
 *
 * The test/preview panel on the right side of the agent builder.
 * Renders the conversation display + run input for the builder's test run.
 * Reads status from agentExecution slice directly.
 */

import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import {
  selectActiveAgentId,
  selectAgentById,
} from "@/features/agents/redux/agent-definition/selectors";
import {
  createInstance,
  clearInstance,
} from "@/features/agents/redux/agent-execution/slice";
import { selectAgentExecutionPayload } from "@/features/agents/redux/agent-definition/selectors";
import { AgentConversationDisplay } from "../run/AgentConversationDisplay";
import { AgentRunInput } from "../run/AgentRunInput";
import { AgentVariableInputForm } from "../run/AgentVariableInputForm";
import { RotateCcw, TestTube } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { VariableDefinition } from "@/features/agents/redux/agent-definition/types";

const BUILDER_TEST_RUN_ID_PREFIX = "builder-test-";

export function AgentBuilderRightPanel() {
  const dispatch = useAppDispatch();
  const agentId = useAppSelector(selectActiveAgentId);
  const record = useAppSelector((state) => selectAgentById(state, agentId));
  const payload = useAppSelector((state) =>
    selectAgentExecutionPayload(state, agentId),
  );

  const [runId] = useState(() => `${BUILDER_TEST_RUN_ID_PREFIX}${uuidv4()}`);

  useEffect(() => {
    if (!agentId) return;
    dispatch(
      createInstance({
        runId,
        agentId,
        isVersion: false,
        agentName: record?.name ?? "Agent Test",
        variableDefaults: (payload?.variableDefinitions ??
          []) as VariableDefinition[],
        contextSlots: payload?.contextSlots ?? [],
      }),
    );
    return () => {
      dispatch(clearInstance({ runId }));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId]);

  const handleReset = () => {
    if (!agentId) return;
    dispatch(clearInstance({ runId }));
    dispatch(
      createInstance({
        runId,
        agentId,
        isVersion: false,
        agentName: record?.name ?? "Agent Test",
        variableDefaults: (payload?.variableDefinitions ??
          []) as VariableDefinition[],
        contextSlots: payload?.contextSlots ?? [],
      }),
    );
  };

  if (!agentId) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p className="text-sm">No agent selected.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full border border-border rounded-lg overflow-hidden bg-card">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <TestTube className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Test Run</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={handleReset}
        >
          <RotateCcw className="w-3 h-3" />
          Reset
        </Button>
      </div>

      {/* Conversation */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <AgentConversationDisplay runId={runId} />
      </div>

      {/* Variables */}
      <div className="px-3 py-2 border-t border-border">
        <AgentVariableInputForm runId={runId} />
      </div>

      {/* Input */}
      <AgentRunInput runId={runId} />
    </div>
  );
}
