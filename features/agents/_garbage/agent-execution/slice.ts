"use client";

import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "@/lib/redux/store";
import type {
  AgentExecutionState,
  AgentExecutionInstance,
  AgentExecutionStatus,
  AgentRunMessage,
  CreateAgentInstancePayload,
} from "./types";
import type { VariableDefinition } from "@/features/agents/redux/agent-definition/types";
import type { ContextSlot } from "@/features/agents/types/agent-api-types";

const initialState: AgentExecutionState = {
  instances: {},
  currentInputs: {},
};

const makeEmptyInstance = (
  payload: CreateAgentInstancePayload,
): AgentExecutionInstance => ({
  runId: payload.runId,
  agentId: payload.agentId,
  isVersion: payload.isVersion,
  agentName: payload.agentName ?? "",
  status: "idle",
  error: null,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  messages: [],
  requiresVariableReplacement: true,
  currentTaskId: null,
  streamEnded: false,
  variableDefaults: payload.variableDefaults ?? [],
  variableValues: payload.initialVariableValues ?? {},
  contextSlots: payload.contextSlots ?? [],
  showVariables: (payload.variableDefaults?.length ?? 0) > 0,
  expandedVariable: null,
});

const agentExecutionSlice = createSlice({
  name: "agentExecution",
  initialState,
  reducers: {
    // ── Instance lifecycle ────────────────────────────────────────────────

    createInstance(state, action: PayloadAction<CreateAgentInstancePayload>) {
      const inst = makeEmptyInstance(action.payload);
      state.instances[inst.runId] = inst;
      state.currentInputs[inst.runId] = "";
    },

    clearInstance(state, action: PayloadAction<{ runId: string }>) {
      const { runId } = action.payload;
      delete state.instances[runId];
      delete state.currentInputs[runId];
    },

    clearAllInstances(state) {
      state.instances = {};
      state.currentInputs = {};
    },

    // ── Status & error ────────────────────────────────────────────────────

    setStatus(
      state,
      action: PayloadAction<{ runId: string; status: AgentExecutionStatus }>,
    ) {
      const inst = state.instances[action.payload.runId];
      if (!inst) return;
      inst.status = action.payload.status;
      inst.updatedAt = Date.now();
    },

    setError(state, action: PayloadAction<{ runId: string; error: string }>) {
      const inst = state.instances[action.payload.runId];
      if (!inst) return;
      inst.status = "error";
      inst.error = action.payload.error;
      inst.updatedAt = Date.now();
    },

    clearError(state, action: PayloadAction<{ runId: string }>) {
      const inst = state.instances[action.payload.runId];
      if (!inst) return;
      inst.error = null;
      if (inst.status === "error") inst.status = "idle";
    },

    // ── Task tracking (maps run → streaming task) ─────────────────────────

    setCurrentTaskId(
      state,
      action: PayloadAction<{ runId: string; taskId: string | null }>,
    ) {
      const inst = state.instances[action.payload.runId];
      if (!inst) return;
      inst.currentTaskId = action.payload.taskId;
      inst.streamEnded = false;
    },

    markStreamEnd(state, action: PayloadAction<{ runId: string }>) {
      const inst = state.instances[action.payload.runId];
      if (!inst) return;
      inst.streamEnded = true;
    },

    // ── Messages ──────────────────────────────────────────────────────────

    addUserMessage(
      state,
      action: PayloadAction<{ runId: string; content: string }>,
    ) {
      const inst = state.instances[action.payload.runId];
      if (!inst) return;
      inst.messages.push({
        role: "user",
        content: action.payload.content,
        timestamp: new Date().toISOString(),
      });
      inst.requiresVariableReplacement = false;
      inst.updatedAt = Date.now();
    },

    addAssistantMessage(
      state,
      action: PayloadAction<{
        runId: string;
        content: string;
        taskId?: string;
        metadata?: AgentRunMessage["metadata"];
      }>,
    ) {
      const { runId, content, taskId, metadata } = action.payload;
      const inst = state.instances[runId];
      if (!inst) return;
      inst.messages.push({
        role: "assistant",
        content,
        taskId,
        timestamp: new Date().toISOString(),
        metadata,
      });
      inst.status = "completed";
      inst.streamEnded = true;
      inst.updatedAt = Date.now();
    },

    clearMessages(state, action: PayloadAction<{ runId: string }>) {
      const inst = state.instances[action.payload.runId];
      if (!inst) return;
      inst.messages = [];
      inst.requiresVariableReplacement = true;
      inst.updatedAt = Date.now();
    },

    // ── Variables ─────────────────────────────────────────────────────────

    updateVariableValue(
      state,
      action: PayloadAction<{ runId: string; name: string; value: string }>,
    ) {
      const inst = state.instances[action.payload.runId];
      if (!inst) return;
      inst.variableValues[action.payload.name] = action.payload.value;
    },

    setVariableDefaults(
      state,
      action: PayloadAction<{
        runId: string;
        variableDefaults: VariableDefinition[];
      }>,
    ) {
      const inst = state.instances[action.payload.runId];
      if (!inst) return;
      inst.variableDefaults = action.payload.variableDefaults;
      // Pre-populate values that don't have a user override yet
      for (const v of action.payload.variableDefaults) {
        if (!(v.name in inst.variableValues) && v.defaultValue !== undefined) {
          inst.variableValues[v.name] = String(v.defaultValue ?? "");
        }
      }
    },

    setContextSlots(
      state,
      action: PayloadAction<{ runId: string; contextSlots: ContextSlot[] }>,
    ) {
      const inst = state.instances[action.payload.runId];
      if (!inst) return;
      inst.contextSlots = action.payload.contextSlots;
    },

    // ── UI controls ───────────────────────────────────────────────────────

    setShowVariables(
      state,
      action: PayloadAction<{ runId: string; show: boolean }>,
    ) {
      const inst = state.instances[action.payload.runId];
      if (!inst) return;
      inst.showVariables = action.payload.show;
    },

    toggleShowVariables(state, action: PayloadAction<{ runId: string }>) {
      const inst = state.instances[action.payload.runId];
      if (!inst) return;
      inst.showVariables = !inst.showVariables;
    },

    setExpandedVariable(
      state,
      action: PayloadAction<{ runId: string; variableName: string | null }>,
    ) {
      const inst = state.instances[action.payload.runId];
      if (!inst) return;
      inst.expandedVariable = action.payload.variableName;
    },

    // ── Input (high-frequency — isolated) ────────────────────────────────

    setCurrentInput(
      state,
      action: PayloadAction<{ runId: string; input: string }>,
    ) {
      state.currentInputs[action.payload.runId] = action.payload.input;
    },

    clearCurrentInput(state, action: PayloadAction<{ runId: string }>) {
      state.currentInputs[action.payload.runId] = "";
    },

    // ── Bulk update (e.g. after loading a saved run) ──────────────────────

    loadInstance(
      state,
      action: PayloadAction<
        Partial<AgentExecutionInstance> & { runId: string }
      >,
    ) {
      const { runId, ...updates } = action.payload;
      const inst = state.instances[runId];
      if (!inst) return;
      Object.assign(inst, updates);
      inst.updatedAt = Date.now();
    },
  },
});

export const agentExecutionActions = agentExecutionSlice.actions;
export const {
  createInstance,
  clearInstance,
  clearAllInstances,
  setStatus,
  setError,
  clearError,
  setCurrentTaskId,
  markStreamEnd,
  addUserMessage,
  addAssistantMessage,
  clearMessages,
  updateVariableValue,
  setVariableDefaults,
  setContextSlots,
  setShowVariables,
  toggleShowVariables,
  setExpandedVariable,
  setCurrentInput,
  clearCurrentInput,
  loadInstance,
} = agentExecutionSlice.actions;

export default agentExecutionSlice.reducer;

// ── RootState accessor (forward reference, safe because JS hoists) ────────────
export const selectAgentExecutionRoot = (state: RootState) =>
  state.agentExecution;
