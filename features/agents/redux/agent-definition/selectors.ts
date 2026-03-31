"use client";

import { createSelector } from "reselect";
import type { RootState } from "@/lib/redux/store";
import type { AgentDefinition, AgentDefinitionRecord } from "./types";

// ---------------------------------------------------------------------------
// Slice root
// ---------------------------------------------------------------------------

const selectAgentDefinitionSlice = (state: RootState) => state.agentDefinition;

// ---------------------------------------------------------------------------
// Registry & active id
// ---------------------------------------------------------------------------

export const selectAllAgents = createSelector(
  [selectAgentDefinitionSlice],
  (slice) => slice.agents,
);

export const selectActiveAgentId = createSelector(
  [selectAgentDefinitionSlice],
  (slice) => slice.activeAgentId,
);

export const selectAgentsSliceStatus = createSelector(
  [selectAgentDefinitionSlice],
  (slice) => slice.status,
);

export const selectAgentsSliceError = createSelector(
  [selectAgentDefinitionSlice],
  (slice) => slice.error,
);

// ---------------------------------------------------------------------------
// Single record by id (works for live agents AND version snapshots)
// ---------------------------------------------------------------------------

/** Returns the full record (including runtime flags) or undefined. */
export const selectAgentById = createSelector(
  [selectAllAgents, (_state: RootState, id: string) => id],
  (agents, id): AgentDefinitionRecord | undefined => agents[id],
);

/** Returns the pure domain fields (no _ prefixed runtime flags). */
export const selectAgentDefinition = createSelector(
  [selectAgentById],
  (record): AgentDefinition | undefined => {
    if (!record) return undefined;
    const {
      _dirty,
      _dirtyFields,
      _fieldHistory,
      _loadedFields,
      _loading,
      _error,
      ...definition
    } = record;
    return definition;
  },
);

// ---------------------------------------------------------------------------
// Execution readiness
// ---------------------------------------------------------------------------

/**
 * Returns true if the record has the fields needed for execution
 * AND those fields have been explicitly fetched (not just defaulted to empty).
 */
export const selectAgentCanExecute = createSelector(
  [selectAgentById],
  (record): boolean => {
    if (!record) return false;
    return (
      record._loadedFields.has("variableDefinitions") &&
      record._loadedFields.has("contextSlots")
    );
  },
);

/**
 * Minimal execution payload.
 * Works for both live agents (isVersion = false) and version snapshots (isVersion = true).
 * The backend uses resolvedId + isVersion to know which table to query.
 * isReady: false → thunk must call get_agent_execution_minimal first.
 */
export const selectAgentExecutionPayload = createSelector(
  [selectAgentById],
  (record) => {
    if (!record) {
      return {
        isReady: false as const,
        resolvedId: null,
        isVersion: false as const,
        variableDefinitions: null,
        contextSlots: [],
      };
    }
    const isReady =
      record._loadedFields.has("variableDefinitions") &&
      record._loadedFields.has("contextSlots");
    return {
      isReady,
      resolvedId: record.id,
      isVersion: record.isVersion,
      variableDefinitions: record.variableDefinitions,
      contextSlots: record.contextSlots,
    };
  },
);

/**
 * Custom execution payload — adds settings, tools, model for pre-run overrides.
 * Works for both live agents and version snapshots.
 * isReady: false → thunk must call get_agent_execution_full first.
 */
export const selectAgentCustomExecutionPayload = createSelector(
  [selectAgentById],
  (record) => {
    const required: (keyof AgentDefinition)[] = [
      "variableDefinitions",
      "contextSlots",
      "settings",
      "tools",
      "customTools",
      "modelId",
    ];
    if (!record) {
      return {
        isReady: false as const,
        resolvedId: null,
        isVersion: false as const,
        variableDefinitions: null,
        contextSlots: [],
        settings: null,
        tools: [],
        customTools: [],
        modelId: null,
      };
    }
    const isReady = required.every((f) => record._loadedFields.has(f));
    return {
      isReady,
      resolvedId: record.id,
      isVersion: record.isVersion,
      variableDefinitions: record.variableDefinitions,
      contextSlots: record.contextSlots,
      settings: record.settings,
      tools: record.tools,
      customTools: record.customTools,
      modelId: record.modelId,
    };
  },
);

// ---------------------------------------------------------------------------
// Individual fields
// ---------------------------------------------------------------------------

export const selectAgentName = createSelector(
  [selectAgentById],
  (record) => record?.name ?? null,
);

export const selectAgentDescription = createSelector(
  [selectAgentById],
  (record) => record?.description ?? null,
);

export const selectAgentType = createSelector(
  [selectAgentById],
  (record) => record?.agentType ?? null,
);

export const selectAgentModelId = createSelector(
  [selectAgentById],
  (record) => record?.modelId ?? null,
);

export const selectAgentMessages = createSelector(
  [selectAgentById],
  (record) => record?.messages ?? [],
);

export const selectAgentVariableDefinitions = createSelector(
  [selectAgentById],
  (record) => record?.variableDefinitions ?? null,
);

export const selectAgentContextSlots = createSelector(
  [selectAgentById],
  (record) => record?.contextSlots ?? [],
);

export const selectAgentSettings = createSelector(
  [selectAgentById],
  (record) => record?.settings ?? null,
);

export const selectAgentTools = createSelector(
  [selectAgentById],
  (record) => record?.tools,
);

export const selectAgentCustomTools = createSelector(
  [selectAgentById],
  (record) => record?.customTools,
);

export const selectAgentModelTiers = createSelector(
  [selectAgentById],
  (record) => record?.modelTiers ?? null,
);

export const selectAgentOutputSchema = createSelector(
  [selectAgentById],
  (record) => record?.outputSchema ?? null,
);

export const selectAgentTags = createSelector(
  [selectAgentById],
  (record) => record?.tags ?? [],
);

export const selectAgentCategory = createSelector(
  [selectAgentById],
  (record) => record?.category ?? null,
);

// Version-specific fields (only meaningful when record.isVersion = true)
export const selectAgentIsVersion = createSelector(
  [selectAgentById],
  (record): boolean => record?.isVersion ?? false,
);

export const selectAgentParentAgentId = createSelector(
  [selectAgentById],
  (record) => record?.parentAgentId ?? null,
);

export const selectAgentVersionNumber = createSelector(
  [selectAgentById],
  (record) => record?.versionNumber ?? null,
);

export const selectAgentChangeNote = createSelector(
  [selectAgentById],
  (record) => record?.changeNote ?? null,
);

// ---------------------------------------------------------------------------
// Status flags
// ---------------------------------------------------------------------------

export const selectAgentIsDirty = createSelector(
  [selectAgentById],
  (record): boolean => record?._dirty ?? false,
);

export const selectAgentDirtyFields = createSelector(
  [selectAgentById],
  (record): Set<keyof AgentDefinition> => record?._dirtyFields ?? new Set(),
);

export const selectAgentFieldHistory = createSelector(
  [selectAgentById],
  (record) => record?._fieldHistory ?? {},
);

export const selectAgentLoadedFields = createSelector(
  [selectAgentById],
  (record): Set<keyof AgentDefinition> => record?._loadedFields ?? new Set(),
);

export const selectAgentIsLoading = createSelector(
  [selectAgentById],
  (record): boolean => record?._loading ?? false,
);

export const selectAgentError = createSelector(
  [selectAgentById],
  (record): string | null => record?._error ?? null,
);

export const selectAgentIsActive = createSelector(
  [selectAgentById],
  (record): boolean => record?.isActive ?? false,
);

export const selectAgentIsPublic = createSelector(
  [selectAgentById],
  (record): boolean => record?.isPublic ?? false,
);

export const selectAgentIsArchived = createSelector(
  [selectAgentById],
  (record): boolean => record?.isArchived ?? false,
);

export const selectAgentIsFavorite = createSelector(
  [selectAgentById],
  (record): boolean => record?.isFavorite ?? false,
);

/** Returns the original (pre-edit) value for a single dirty field. */
export const selectAgentFieldOriginalValue = createSelector(
  [
    selectAgentById,
    (_state: RootState, _id: string, field: keyof AgentDefinition) => field,
  ],
  (record, field) => record?._fieldHistory[field] ?? undefined,
);

/** True if a specific field has been fetched. */
export const selectAgentFieldIsLoaded = createSelector(
  [
    selectAgentById,
    (_state: RootState, _id: string, field: keyof AgentDefinition) => field,
  ],
  (record, field): boolean => record?._loadedFields.has(field) ?? false,
);

// ---------------------------------------------------------------------------
// Lineage / metadata
// ---------------------------------------------------------------------------

export const selectAgentSourceId = createSelector(
  [selectAgentById],
  (record) => record?.sourceAgentId ?? null,
);

export const selectAgentIsForked = createSelector(
  [selectAgentById],
  (record): boolean => record?.sourceAgentId != null,
);

// ---------------------------------------------------------------------------
// Access metadata (populated by fetchAgentsList / fetchAgentAccessLevel)
// null = not yet fetched — do not infer permissions from null
// ---------------------------------------------------------------------------

export const selectAgentIsOwner = createSelector(
  [selectAgentById],
  (record) => record?.isOwner ?? null,
);

export const selectAgentAccessLevel = createSelector(
  [selectAgentById],
  (record) => record?.accessLevel ?? null,
);

export const selectAgentSharedByEmail = createSelector(
  [selectAgentById],
  (record) => record?.sharedByEmail ?? null,
);

/** True only when we've confirmed the current user owns the agent. */
export const selectAgentIsConfirmedOwner = createSelector(
  [selectAgentById],
  (record): boolean => record?.isOwner === true,
);

/** True when we know the user can edit (owner, admin, or editor). */
export const selectAgentIsEditable = createSelector(
  [selectAgentById],
  (record): boolean => {
    const level = record?.accessLevel;
    return level === "owner" || level === "admin" || level === "editor";
  },
);

/** True when we know the user is at least a viewer (any known access). */
export const selectAgentIsAccessible = createSelector(
  [selectAgentById],
  (record): boolean => record?.accessLevel != null,
);

// ---------------------------------------------------------------------------
// List-level selectors (all records)
// ---------------------------------------------------------------------------

export const selectAllAgentIds = createSelector(
  [selectAllAgents],
  (agents): string[] => Object.keys(agents),
);

export const selectAllAgentsArray = createSelector(
  [selectAllAgents],
  (agents): AgentDefinitionRecord[] => Object.values(agents),
);

/** Live agents only (isVersion = false). */
export const selectLiveAgents = createSelector(
  [selectAllAgentsArray],
  (agents) => agents.filter((a) => !a.isVersion),
);

/** Version snapshot records only (isVersion = true). */
export const selectAllVersionRecords = createSelector(
  [selectAllAgentsArray],
  (agents) => agents.filter((a) => a.isVersion),
);

/** All version snapshots for a given parent agent id, sorted oldest → newest. */
export const selectVersionsByParentAgentId = createSelector(
  [
    selectAllAgentsArray,
    (_state: RootState, parentAgentId: string) => parentAgentId,
  ],
  (agents, parentAgentId) =>
    agents
      .filter((a) => a.isVersion && a.parentAgentId === parentAgentId)
      .sort((a, b) => (a.versionNumber ?? 0) - (b.versionNumber ?? 0)),
);

export const selectUserAgents = createSelector([selectLiveAgents], (agents) =>
  agents.filter((a) => a.agentType === "user"),
);

/** Builtin/system agents — only present after fetchAgentsListFull(). */
export const selectBuiltinAgents = createSelector(
  [selectLiveAgents],
  (agents) => agents.filter((a) => a.agentType === "builtin"),
);

/** Alias for selectBuiltinAgents — matches the access_level = 'system' label. */
export const selectSystemAgents = selectBuiltinAgents;

export const selectActiveAgents = createSelector([selectLiveAgents], (agents) =>
  agents.filter((a) => a.isActive && !a.isArchived),
);

export const selectFavoriteAgents = createSelector(
  [selectLiveAgents],
  (agents) => agents.filter((a) => a.isFavorite),
);

export const selectDirtyAgents = createSelector(
  [selectAllAgentsArray],
  (agents) => agents.filter((a) => a._dirty),
);

/** Live agents the current user owns. */
export const selectOwnedAgents = createSelector([selectLiveAgents], (agents) =>
  agents.filter((a) => a.isOwner === true),
);

/** Live agents shared with the current user (not owned). */
export const selectSharedWithMeAgents = createSelector(
  [selectLiveAgents],
  (agents) =>
    agents.filter((a) => a.isOwner === false && a.accessLevel != null),
);

/** Live agents the current user can edit (owner / admin / editor). */
export const selectEditableAgents = createSelector(
  [selectLiveAgents],
  (agents) =>
    agents.filter(
      (a) =>
        a.accessLevel === "owner" ||
        a.accessLevel === "admin" ||
        a.accessLevel === "editor",
    ),
);

export const selectAgentsByCategory = createSelector(
  [selectAllAgentsArray, (_state: RootState, category: string) => category],
  (agents, category) => agents.filter((a) => a.category === category),
);

// ---------------------------------------------------------------------------
// Active agent (shorthand — requires activeAgentId to be set)
// ---------------------------------------------------------------------------

export const selectActiveAgent = createSelector(
  [selectAllAgents, selectActiveAgentId],
  (agents, id): AgentDefinitionRecord | undefined =>
    id != null ? agents[id] : undefined,
);

export const selectActiveAgentIsDirty = createSelector(
  [selectActiveAgent],
  (record): boolean => record?._dirty ?? false,
);

export const selectActiveAgentIsLoading = createSelector(
  [selectActiveAgent],
  (record): boolean => record?._loading ?? false,
);

export const selectActiveAgentCanExecute = createSelector(
  [selectActiveAgent],
  (record): boolean => {
    if (!record) return false;
    return (
      record._loadedFields.has("variableDefinitions") &&
      record._loadedFields.has("contextSlots")
    );
  },
);

/** Active agent execution payload — same shape as selectAgentExecutionPayload. */
export const selectActiveAgentExecutionPayload = createSelector(
  [selectActiveAgent],
  (record) => {
    if (!record) {
      return {
        isReady: false as const,
        resolvedId: null,
        isVersion: false as const,
        variableDefinitions: null,
        contextSlots: [],
      };
    }
    const isReady =
      record._loadedFields.has("variableDefinitions") &&
      record._loadedFields.has("contextSlots");
    return {
      isReady,
      resolvedId: record.id,
      isVersion: record.isVersion,
      variableDefinitions: record.variableDefinitions,
      contextSlots: record.contextSlots,
    };
  },
);
