import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type {
  AgentDefinition,
  AgentDefinitionRecord,
  AgentDefinitionSliceState,
  AgentFetchStatus,
  FieldSnapshot,
  LoadedFields,
} from "../../types/agent-definition.types";
import { shouldUpgradeFetchStatus } from "../../types/agent-definition.types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEmptyRecord(id: string): AgentDefinitionRecord {
  return {
    id,
    name: "",
    description: null,
    category: null,
    tags: [],
    agentType: "user",

    // Version identity — defaults to live-agent state
    isVersion: false,
    parentAgentId: null,
    versionNumber: null,
    changedAt: null,
    changeNote: null,

    isActive: true,
    isPublic: false,
    isArchived: false,
    isFavorite: false,

    modelId: null,
    messages: [],
    variableDefinitions: null,
    settings: {} as AgentDefinition["settings"],
    tools: [],
    contextSlots: [],
    modelTiers: null,
    outputSchema: null,
    customTools: [],

    userId: null,
    organizationId: null,
    workspaceId: null,
    projectId: null,
    taskId: null,

    sourceAgentId: null,
    sourceSnapshotAt: null,
    createdAt: "",
    updatedAt: "",

    // Access metadata — unknown until fetched via get_agents_list or get_agent_access_level
    isOwner: null,
    accessLevel: null,
    sharedByEmail: null,

    _dirty: false,
    _dirtyFields: new Set(),
    _fieldHistory: {},
    _loadedFields: new Set(),
    _fetchStatus: null,
    _loading: false,
    _error: null,
  };
}

/**
 * Writes incoming fields onto the record AND adds each key to _loadedFields.
 * Never overwrites with undefined. Does not touch runtime flags.
 */
/**
 * Normalizes the messages array from the DB.
 * The canonical TextBlock shape is { type: "text", text: "..." }.
 * If a block arrives with { type: "text", content: "..." } (malformed DB row),
 * we fix it in-place, log an error so developers catch it, and move on.
 * We do NOT change types to accommodate this — it is a data error.
 */
function normalizeMessages(
  messages: AgentDefinition["messages"],
): AgentDefinition["messages"] {
  if (!messages) return messages;
  return messages.map((msg) => ({
    ...msg,
    content: msg.content.map((block) => {
      const raw = block as unknown as Record<string, unknown>;
      if (
        raw.type === "text" &&
        raw.text === undefined &&
        raw.content !== undefined
      ) {
        console.error(
          "[AgentDefinition] Malformed TextBlock: field is 'content' but should be 'text'. " +
            "Fix the database record. Block:",
          raw,
        );
        return { type: "text" as const, text: raw.content as string };
      }
      return block;
    }),
  }));
}

function mergeAndTrack(
  record: AgentDefinitionRecord,
  partial: Partial<AgentDefinition>,
): void {
  const normalized =
    partial.messages !== undefined
      ? { ...partial, messages: normalizeMessages(partial.messages) }
      : partial;
  (Object.keys(normalized) as (keyof AgentDefinition)[]).forEach((key) => {
    if (normalized[key] !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (record as any)[key] = normalized[key];
      record._loadedFields.add(key);
    }
  });
}

/**
 * Applies a user edit with dirty tracking and history capture.
 * Captures the original value ONCE per field per clean cycle.
 * Does NOT add the field to _loadedFields — user edits are not "fetched".
 */
function applyFieldEdit<K extends keyof AgentDefinition>(
  record: AgentDefinitionRecord,
  field: K,
  value: AgentDefinition[K],
): void {
  if (!record._dirtyFields.has(field)) {
    (record._fieldHistory as FieldSnapshot)[field] = record[
      field
    ] as AgentDefinition[K];
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (record as any)[field] = value;
  record._dirtyFields.add(field);
  record._dirty = true;
}

/**
 * Marks a record as clean. Clears dirty state and history.
 * _loadedFields is NOT cleared — fetched state is cumulative.
 */
function markRecordClean(record: AgentDefinitionRecord): void {
  record._dirty = false;
  record._dirtyFields = new Set();
  record._fieldHistory = {};
}

/**
 * Upgrades _fetchStatus if the incoming status has higher precedence.
 * Never downgrades. See shouldUpgradeFetchStatus in types.ts.
 */
function applyFetchStatus(
  record: AgentDefinitionRecord,
  status: AgentFetchStatus,
): void {
  if (shouldUpgradeFetchStatus(record._fetchStatus, status)) {
    record._fetchStatus = status;
  }
}

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

const initialState: AgentDefinitionSliceState = {
  agents: {},
  activeAgentId: null,
  status: "idle",
  error: null,
};

// ---------------------------------------------------------------------------
// Slice
// ---------------------------------------------------------------------------

export const agentDefinitionSlice = createSlice({
  name: "agentDefinition",
  initialState,

  reducers: {
    // ── Full upsert (complete fetch — marks record clean) ────────────────────

    /**
     * Upserts a fully-fetched agent (live or version) and marks it clean.
     * All incoming fields are written and tracked in _loadedFields.
     */
    upsertAgent(state, action: PayloadAction<AgentDefinition>) {
      const data = action.payload;
      const status: AgentFetchStatus = data.isVersion
        ? "versionSnapshot"
        : "full";
      const existing = state.agents[data.id];
      if (existing) {
        mergeAndTrack(existing, data);
        markRecordClean(existing);
        applyFetchStatus(existing, status);
      } else {
        const record = makeEmptyRecord(data.id);
        mergeAndTrack(record, data);
        markRecordClean(record);
        applyFetchStatus(record, status);
        state.agents[data.id] = record;
      }
    },

    /**
     * Merges a partial payload into state.
     * PRESERVES existing fields not in the payload.
     * NEVER clears dirty state — a partial fetch is not a full truth source.
     * New records added via partial are initialised clean (first time we see them).
     * Incoming fields are tracked in _loadedFields.
     *
     * Works identically for live agents and version snapshots.
     * When merging a version, include isVersion: true and parentAgentId.
     */
    mergePartialAgent(
      state,
      action: PayloadAction<Partial<AgentDefinition> & { id: string }>,
    ) {
      const data = action.payload;
      const existing = state.agents[data.id];
      if (existing) {
        mergeAndTrack(existing, data);
      } else {
        const record = makeEmptyRecord(data.id);
        mergeAndTrack(record, data);
        state.agents[data.id] = record;
      }
    },

    // ── User field edits (trigger dirty) ─────────────────────────────────────

    /** Edit any single field by name. For scalars and simple values. */
    setAgentField(
      state,
      action: PayloadAction<{
        id: string;
        field: keyof AgentDefinition;
        value: AgentDefinition[keyof AgentDefinition];
      }>,
    ) {
      const { id, field, value } = action.payload;
      const record = state.agents[id];
      if (!record) return;
      applyFieldEdit(record, field, value as AgentDefinition[typeof field]);
    },

    // ── Dedicated actions for complex fields ──────────────────────────────────

    setAgentMessages(
      state,
      action: PayloadAction<{
        id: string;
        messages: AgentDefinition["messages"];
      }>,
    ) {
      const record = state.agents[action.payload.id];
      if (!record) return;
      applyFieldEdit(record, "messages", action.payload.messages);
    },

    setAgentSettings(
      state,
      action: PayloadAction<{
        id: string;
        settings: AgentDefinition["settings"];
      }>,
    ) {
      const record = state.agents[action.payload.id];
      if (!record) return;
      applyFieldEdit(record, "settings", action.payload.settings);
    },

    setAgentVariableDefinitions(
      state,
      action: PayloadAction<{
        id: string;
        variableDefinitions: AgentDefinition["variableDefinitions"];
      }>,
    ) {
      const record = state.agents[action.payload.id];
      if (!record) return;
      applyFieldEdit(
        record,
        "variableDefinitions",
        action.payload.variableDefinitions,
      );
    },

    setAgentContextSlots(
      state,
      action: PayloadAction<{
        id: string;
        contextSlots: AgentDefinition["contextSlots"];
      }>,
    ) {
      const record = state.agents[action.payload.id];
      if (!record) return;
      applyFieldEdit(record, "contextSlots", action.payload.contextSlots);
    },

    setAgentTools(
      state,
      action: PayloadAction<{ id: string; tools: AgentDefinition["tools"] }>,
    ) {
      const record = state.agents[action.payload.id];
      if (!record) return;
      applyFieldEdit(record, "tools", action.payload.tools);
    },

    setAgentCustomTools(
      state,
      action: PayloadAction<{
        id: string;
        customTools: AgentDefinition["customTools"];
      }>,
    ) {
      const record = state.agents[action.payload.id];
      if (!record) return;
      applyFieldEdit(record, "customTools", action.payload.customTools);
    },

    setAgentModelTiers(
      state,
      action: PayloadAction<{
        id: string;
        modelTiers: AgentDefinition["modelTiers"];
      }>,
    ) {
      const record = state.agents[action.payload.id];
      if (!record) return;
      applyFieldEdit(record, "modelTiers", action.payload.modelTiers);
    },

    setAgentOutputSchema(
      state,
      action: PayloadAction<{
        id: string;
        outputSchema: AgentDefinition["outputSchema"];
      }>,
    ) {
      const record = state.agents[action.payload.id];
      if (!record) return;
      applyFieldEdit(record, "outputSchema", action.payload.outputSchema);
    },

    // ── Dirty / history management ────────────────────────────────────────────

    /** Reset one field to its original value from _fieldHistory. */
    resetAgentField(
      state,
      action: PayloadAction<{ id: string; field: keyof AgentDefinition }>,
    ) {
      const { id, field } = action.payload;
      const record = state.agents[id];
      if (!record || !record._dirtyFields.has(field)) return;

      const original = record._fieldHistory[field];
      if (original !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (record as any)[field] = original;
      }
      record._dirtyFields.delete(field);
      delete record._fieldHistory[field];
      record._dirty = record._dirtyFields.size > 0;
    },

    /** Reset ALL dirty fields to their original values. No refetch needed. */
    resetAllAgentFields(state, action: PayloadAction<{ id: string }>) {
      const record = state.agents[action.payload.id];
      if (!record) return;
      (Object.keys(record._fieldHistory) as (keyof AgentDefinition)[]).forEach(
        (field) => {
          const original = record._fieldHistory[field];
          if (original !== undefined) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (record as any)[field] = original;
          }
        },
      );
      markRecordClean(record);
    },

    /** Called after a successful save. Current values become the new clean baseline. */
    markAgentSaved(state, action: PayloadAction<{ id: string }>) {
      const record = state.agents[action.payload.id];
      if (!record) return;
      markRecordClean(record);
    },

    /** Save failed — restore from the snapshot taken before the optimistic write. */
    rollbackAgentOptimisticUpdate(
      state,
      action: PayloadAction<{ id: string; snapshot: FieldSnapshot }>,
    ) {
      const { id, snapshot } = action.payload;
      const record = state.agents[id];
      if (!record) return;
      (Object.keys(snapshot) as (keyof AgentDefinition)[]).forEach((field) => {
        const value = snapshot[field];
        if (value !== undefined) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (record as any)[field] = value;
        }
      });
      record._dirty = record._dirtyFields.size > 0;
    },

    // ── Explicitly mark fields as loaded (without writing data) ──────────────

    markAgentFieldsLoaded(
      state,
      action: PayloadAction<{ id: string; fields: (keyof AgentDefinition)[] }>,
    ) {
      const record = state.agents[action.payload.id];
      if (!record) return;
      action.payload.fields.forEach((f) => record._loadedFields.add(f));
    },

    // ── Fetch status ──────────────────────────────────────────────────────────

    /**
     * Upgrades the fetch status for a record. Never downgrades.
     * Dispatched by thunks that use mergePartialAgent (list, execution, customExecution).
     * upsertAgent handles full / versionSnapshot automatically.
     */
    setAgentFetchStatus(
      state,
      action: PayloadAction<{ id: string; status: AgentFetchStatus }>,
    ) {
      const record = state.agents[action.payload.id];
      if (!record) return;
      applyFetchStatus(record, action.payload.status);
    },

    // ── Per-record async state ────────────────────────────────────────────────

    setAgentLoading(
      state,
      action: PayloadAction<{ id: string; loading: boolean }>,
    ) {
      const record = state.agents[action.payload.id];
      if (record) record._loading = action.payload.loading;
    },

    setAgentError(
      state,
      action: PayloadAction<{ id: string; error: string | null }>,
    ) {
      const record = state.agents[action.payload.id];
      if (record) record._error = action.payload.error;
    },

    // ── Active agent ──────────────────────────────────────────────────────────

    setActiveAgentId(state, action: PayloadAction<string | null>) {
      state.activeAgentId = action.payload;
    },

    // ── Slice-level status ────────────────────────────────────────────────────

    setAgentsStatus(
      state,
      action: PayloadAction<AgentDefinitionSliceState["status"]>,
    ) {
      state.status = action.payload;
    },

    setAgentsError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },

    // ── Remove ────────────────────────────────────────────────────────────────

    removeAgent(state, action: PayloadAction<string>) {
      delete state.agents[action.payload];
      if (state.activeAgentId === action.payload) {
        state.activeAgentId = null;
      }
    },

    /** Remove all version snapshot records for a given parent agent id. */
    removeVersionsByParentId(state, action: PayloadAction<string>) {
      Object.keys(state.agents).forEach((id) => {
        const record = state.agents[id];
        if (record.isVersion && record.parentAgentId === action.payload) {
          delete state.agents[id];
        }
      });
    },
  },
});

export const {
  upsertAgent,
  mergePartialAgent,
  setAgentField,
  setAgentMessages,
  setAgentSettings,
  setAgentVariableDefinitions,
  setAgentContextSlots,
  setAgentTools,
  setAgentCustomTools,
  setAgentModelTiers,
  setAgentOutputSchema,
  resetAgentField,
  resetAllAgentFields,
  markAgentSaved,
  rollbackAgentOptimisticUpdate,
  markAgentFieldsLoaded,
  setAgentFetchStatus,
  setAgentLoading,
  setAgentError,
  setActiveAgentId,
  setAgentsStatus,
  setAgentsError,
  removeAgent,
  removeVersionsByParentId,
} = agentDefinitionSlice.actions;

export default agentDefinitionSlice.reducer;

export type { LoadedFields };
