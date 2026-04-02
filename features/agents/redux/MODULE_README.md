# `features.agents.redux` — Module Overview

> This document is partially auto-generated. Sections tagged `<!-- AUTO:id -->` are refreshed by the generator.
> Everything else is yours to edit freely and will never be overwritten.

<!-- AUTO:meta -->
## About This Document

This file is **partially auto-generated**. Sections wrapped in `<!-- AUTO:id -->` tags
are overwritten each time the generator runs. Everything else is yours to edit freely.

| Field | Value |
|-------|-------|
| Module | `features/agents/redux` |
| Last generated | 2026-04-01 16:29 |
| Output file | `features/agents/redux/MODULE_README.md` |
| Signature mode | `signatures` |

**To refresh auto-sections:**
```bash
python utils/code_context/generate_module_readme.py features/agents/redux --mode signatures
```

**To add permanent notes:** Write anywhere outside the `<!-- AUTO:... -->` blocks.
<!-- /AUTO:meta -->

<!-- HUMAN-EDITABLE: This section is yours. Agents & Humans can edit this section freely — it will not be overwritten. -->

## Architecture

> **Fill this in.** Describe the execution flow and layer map for this module.
> See `utils/code_context/MODULE_README_SPEC.md` for the recommended format.
>
> Suggested structure:
>
> ### Layers
> | File | Role |
> |------|------|
> | `entry.py` | Public entry point — receives requests, returns results |
> | `engine.py` | Core dispatch logic |
> | `models.py` | Shared data types |
>
> ### Call Flow (happy path)
> ```
> entry_function() → engine.dispatch() → implementation()
> ```


<!-- AUTO:tree -->
## Directory Tree

> Auto-generated. 49 files across 16 directories.

```
features/agents/redux/
├── agent-consumers/
│   ├── selectors.ts
│   ├── slice.ts
├── agent-definition/
│   ├── converters.ts
│   ├── selectors.ts
│   ├── slice.ts
│   ├── thunks.ts
│   ├── types.ts
├── agent-shortcuts/
│   ├── converters.ts
│   ├── selectors.ts
│   ├── slice.ts
│   ├── thunks.ts
│   ├── types.ts
├── execution-system/
│   ├── active-requests/
│   │   ├── active-requests.selectors.ts
│   │   ├── active-requests.slice.ts
│   │   ├── index.ts
│   ├── execution-instances/
│   │   ├── execution-instances.selectors.ts
│   │   ├── execution-instances.slice.ts
│   │   ├── index.ts
│   ├── instance-client-tools/
│   │   ├── index.ts
│   │   ├── instance-client-tools.selectors.ts
│   │   ├── instance-client-tools.slice.ts
│   ├── instance-context/
│   │   ├── index.ts
│   │   ├── instance-context.selectors.ts
│   │   ├── instance-context.slice.ts
│   ├── instance-conversation-history/
│   │   ├── index.ts
│   │   ├── instance-conversation-history.selectors.ts
│   │   ├── instance-conversation-history.slice.ts
│   ├── instance-model-overrides/
│   │   ├── index.ts
│   │   ├── instance-model-overrides.selectors.ts
│   │   ├── instance-model-overrides.slice.ts
│   ├── instance-resources/
│   │   ├── index.ts
│   │   ├── instance-resources.selectors.ts
│   │   ├── instance-resources.slice.ts
│   ├── instance-ui-state/
│   │   ├── index.ts
│   │   ├── instance-ui-state.selectors.ts
│   │   ├── instance-ui-state.slice.ts
│   ├── instance-user-input/
│   │   ├── index.ts
│   │   ├── instance-user-input.selectors.ts
│   │   ├── instance-user-input.slice.ts
│   ├── instance-variable-values/
│   │   ├── index.ts
│   │   ├── instance-variable-values.selectors.ts
│   │   ├── instance-variable-values.slice.ts
│   ├── selectors/
│   │   ├── aggregate.selectors.ts
│   │   ├── instance-model-overrides.selectors.ts
│   ├── thunks/
│   │   ├── create-instance.thunk.ts
│   │   ├── execute-instance.thunk.ts
│   ├── utils/
│   │   ├── ids.ts
│   │   ├── index.ts
│   │   ├── source-slice-helpers.ts
# excluded: 1 .txt
```
<!-- /AUTO:tree -->

<!-- AUTO:signatures -->
## API Signatures

> Auto-generated via `output_mode="signatures"`. ~5-10% token cost vs full source.
> For full source, open the individual files directly.

```
---
Filepath: features/agents/redux/execution-system/instance-model-overrides/instance-model-overrides.slice.ts  [typescript]

  # Interfaces
    export interface InstanceModelOverridesState
    # byInstanceId: Record<string, InstanceModelOverrideState>
  # Redux (slices / thunks / selectors)
    const instanceModelOverridesSlice = createSlice(...)


---
Filepath: features/agents/redux/execution-system/instance-model-overrides/instance-model-overrides.selectors.ts  [typescript]

  # Redux (slices / thunks / selectors)
    export const selectInstanceOverrideState
    export const selectCurrentSettings
    export const selectSettingsOverridesForApi
    export const selectHasOverrides
    export const selectOverriddenKeys


---
Filepath: features/agents/redux/execution-system/instance-model-overrides/index.ts  [typescript]



---
Filepath: features/agents/redux/execution-system/instance-variable-values/instance-variable-values.selectors.ts  [typescript]

  # Redux (slices / thunks / selectors)
    export const selectInstanceVariableDefinitions
    export const selectUserVariableValues
    export const selectScopeVariableValues
    export const selectResolvedVariables
    export const selectMissingRequiredVariables
    export const selectVariableProvenance


---
Filepath: features/agents/redux/execution-system/instance-variable-values/instance-variable-values.slice.ts  [typescript]

  # Interfaces
    export interface InstanceVariableValuesEntry
    # instanceId: string
    # /**
    # definitions: VariableDefinition[]
    # /** Values explicitly set by the user */
    # userValues: Record<string, unknown>
    # /** Values auto-populated from scope/context at creation time */
    # scopeValues: Record<string, unknown>
    export interface InstanceVariableValuesState
    # byInstanceId: Record<string, InstanceVariableValuesEntry>
  # Redux (slices / thunks / selectors)
    const instanceVariableValuesSlice = createSlice(...)


---
Filepath: features/agents/redux/execution-system/instance-variable-values/index.ts  [typescript]



---
Filepath: features/agents/redux/execution-system/instance-user-input/instance-user-input.selectors.ts  [typescript]

  # Redux (slices / thunks / selectors)
    export const selectUserInputText
    export const selectUserInputContentBlocks
    export const selectHasUserInput


---
Filepath: features/agents/redux/execution-system/instance-user-input/index.ts  [typescript]



---
Filepath: features/agents/redux/execution-system/instance-user-input/instance-user-input.slice.ts  [typescript]

  # Interfaces
    export interface InstanceUserInputSliceState
    # byInstanceId: Record<string, InstanceUserInputState>
  # Redux (slices / thunks / selectors)
    const instanceUserInputSlice = createSlice(...)


---
Filepath: features/agents/redux/execution-system/instance-conversation-history/instance-conversation-history.selectors.ts  [typescript]

  # Interfaces
    export interface AggregateStats
    # /** Total turns in the session (user + assistant) */
    # turnCount: number
    # /** Number of completed assistant turns (= number of requests) */
    # requestCount: number
    # /** Sum of all input tokens across all assistant turns */
    # totalInputTokens: number
    # /** Sum of all output tokens across all assistant turns */
    # totalOutputTokens: number
    # ... 8 more fields
    export interface AggregateClientMetrics
    # totalRequests: number
    # totalEvents: number
    # totalChunkEvents: number
    # totalDataEvents: number
    # totalToolEvents: number
    # totalPayloadBytes: number
    # totalTextBytes: number
    # avgTtftMs: number | null
    # ... 2 more fields
  # Redux (slices / thunks / selectors)
    export const selectConversationTurns
    export const selectConversationMode
    export const selectStoredConversationId
    export const selectTurnCount
    export const selectHasConversationHistory
    export const selectLoadedFromHistory
    export const selectLatestCompletionStats
    export const selectAggregateStats
    export const selectLatestClientMetrics
    export const selectAggregateClientMetrics


---
Filepath: features/agents/redux/execution-system/instance-conversation-history/index.ts  [typescript]



---
Filepath: features/agents/redux/execution-system/instance-conversation-history/instance-conversation-history.slice.ts  [typescript]

  # Types
    export type ConversationMode = "agent" | "conversation" | "chat"
  # Interfaces
    export interface TokenUsage
    # input: number
    # output: number
    # total: number
    export interface ConversationTurn
    # /** Client-generated UUID for this turn */
    # turnId: string
    # /** Role — determines bubble style in the UI */
    # role: "user" | "assistant" | "system"
    # /** The text content of this turn */
    # content: string
    # /** Optional multimodal content blocks (images, files, etc.) */
    # contentBlocks?: Array<Record<string, unknown>>
    # ... 19 more fields
    export interface InstanceConversationHistoryEntry
    # instanceId: string
    # /**
    # mode: ConversationMode
    # /** The server-assigned conversation ID (set after first response) */
    # conversationId: string | null
    # /** Ordered turn history */
    # turns: ConversationTurn[]
    # /** True if turns were loaded from a previous session (Supabase fetch) */
    # ... 4 more fields
    export interface InstanceConversationHistoryState
    # byInstanceId: Record<string, InstanceConversationHistoryEntry>
  # Redux (slices / thunks / selectors)
    const instanceConversationHistorySlice = createSlice(...)


---
Filepath: features/agents/redux/execution-system/execution-instances/execution-instances.selectors.ts  [typescript]

  # Redux (slices / thunks / selectors)
    export const selectInstance
    export const selectAllInstanceIds
    export const selectInstancesByAgent
    export const selectInstanceStatus
    export const selectRunningInstances


---
Filepath: features/agents/redux/execution-system/execution-instances/execution-instances.slice.ts  [typescript]

  # Interfaces
    export interface ExecutionInstancesState
    # byInstanceId: Record<string, ExecutionInstance>
    # allInstanceIds: string[]
  # Redux (slices / thunks / selectors)
    const executionInstancesSlice = createSlice(...)


---
Filepath: features/agents/redux/execution-system/execution-instances/index.ts  [typescript]



---
Filepath: features/agents/redux/execution-system/thunks/create-instance.thunk.ts  [typescript]

  # Redux (slices / thunks / selectors)
    const createManualInstance = createAsyncThunk(...)
    const createInstanceFromShortcut = createAsyncThunk(...)
    const createTestInstance = createAsyncThunk(...)
    const createManualInstanceNoAgent = createAsyncThunk(...)
    const reInstanceAndExecute = createAsyncThunk(...)


---
Filepath: features/agents/redux/execution-system/thunks/execute-instance.thunk.ts  [typescript]

  # Redux (slices / thunks / selectors)
    const executeInstance = createAsyncThunk(...)
    const clearAfterSend = createAsyncThunk(...)
    const submitToolResults = createAsyncThunk(...)
  # Functions
    export function assembleRequest(state: RootState, instanceId: string,): AssembledAgentStartRequest | null


---
Filepath: features/agents/redux/execution-system/active-requests/active-requests.selectors.ts  [typescript]

  # Redux (slices / thunks / selectors)
    export const selectRequest
    export const selectRequestsForInstance
    export const selectPrimaryRequest
    export const selectRequestStatus
    export const selectAccumulatedText
    export const selectRequestConversationId
    export const selectUnresolvedToolCalls
    export const selectConversationTree
    export const selectHasActiveRequests


---
Filepath: features/agents/redux/execution-system/active-requests/active-requests.slice.ts  [typescript]

  # Interfaces
    export interface ActiveRequestsState
    # byRequestId: Record<string, ActiveRequest>
    # /** Map instanceId → requestIds for quick lookup */
    # byInstanceId: Record<string, string[]>
  # Redux (slices / thunks / selectors)
    const activeRequestsSlice = createSlice(...)


---
Filepath: features/agents/redux/execution-system/active-requests/index.ts  [typescript]



---
Filepath: features/agents/redux/execution-system/instance-client-tools/instance-client-tools.slice.ts  [typescript]

  # Interfaces
    export interface InstanceClientToolsState
    # byInstanceId: Record<string, string[]>
  # Redux (slices / thunks / selectors)
    const instanceClientToolsSlice = createSlice(...)


---
Filepath: features/agents/redux/execution-system/instance-client-tools/instance-client-tools.selectors.ts  [typescript]

  # Redux (slices / thunks / selectors)
    export const selectInstanceClientTools


---
Filepath: features/agents/redux/execution-system/instance-client-tools/index.ts  [typescript]



---
Filepath: features/agents/redux/execution-system/utils/source-slice-helpers.ts  [typescript]

  # Functions
    export function createSourceInitialState(): SourceSliceState<T>
    export function upsertEntity(state: Draft<SourceSliceState<T>>, id: string, data: T,): void
    export function removeEntity(state: Draft<SourceSliceState<T>>, id: string,): void
    export function markDirty(state: Draft<SourceSliceState<T>>, id: string,): void
    export function clearDirty(state: Draft<SourceSliceState<T>>, id: string,): void
    export function createAsyncHandlers()


---
Filepath: features/agents/redux/execution-system/utils/ids.ts  [typescript]

  # Functions
    export const generateInstanceId = (): string =>
    export const generateResourceId = (): string =>
    export const generateRequestId = (): string =>
    export const generateScopeId = (): string =>


---
Filepath: features/agents/redux/execution-system/utils/index.ts  [typescript]



---
Filepath: features/agents/redux/execution-system/instance-context/instance-context.selectors.ts  [typescript]

  # Redux (slices / thunks / selectors)
    export const selectInstanceContextEntries
    export const selectInstanceContextEntry
    export const selectSlotMatchedContext
    export const selectAdHocContext
    export const selectContextPayload


---
Filepath: features/agents/redux/execution-system/instance-context/instance-context.slice.ts  [typescript]

  # Interfaces
    export interface InstanceContextState
    # byInstanceId: Record<string, Record<string, InstanceContextEntry>>
  # Redux (slices / thunks / selectors)
    const instanceContextSlice = createSlice(...)


---
Filepath: features/agents/redux/execution-system/instance-context/index.ts  [typescript]



---
Filepath: features/agents/redux/execution-system/instance-resources/instance-resources.selectors.ts  [typescript]

  # Redux (slices / thunks / selectors)
    export const selectInstanceResources
    export const selectResource
    export const selectReadyResources
    export const selectPendingResources
    export const selectAllResourcesResolved
    export const selectResourcePayloads


---
Filepath: features/agents/redux/execution-system/instance-resources/index.ts  [typescript]



---
Filepath: features/agents/redux/execution-system/instance-resources/instance-resources.slice.ts  [typescript]

  # Interfaces
    export interface InstanceResourcesState
    # byInstanceId: Record<string, Record<string, ManagedResource>>
  # Redux (slices / thunks / selectors)
    const instanceResourcesSlice = createSlice(...)


---
Filepath: features/agents/redux/execution-system/instance-ui-state/instance-ui-state.selectors.ts  [typescript]

  # Redux (slices / thunks / selectors)
    export const selectInstanceUIState
    export const selectDisplayMode
    export const selectIsModalFull
    export const selectIsModalCompact
    export const selectIsChatBubble
    export const selectIsInline
    export const selectIsPanel
    export const selectIsToast
    export const selectIsAnyModal
    export const selectAllowChat
    export const selectShowVariablePanel
    export const selectSubmitOnEnter
    export const selectIsCreator
    export const selectShowCreatorDebug
    export const selectExpandedVariableId
    export const selectAutoClearConversation
    export const selectIsExpanded
    export const selectModeState
    export const selectInstanceIdsByMode
    export const selectModalInstanceIds
    export const selectPersistentInstanceIds


---
Filepath: features/agents/redux/execution-system/instance-ui-state/index.ts  [typescript]



---
Filepath: features/agents/redux/execution-system/instance-ui-state/instance-ui-state.slice.ts  [typescript]

  # Interfaces
    export interface InstanceUIStateSlice
    # byInstanceId: Record<string, InstanceUIState>
  # Redux (slices / thunks / selectors)
    const instanceUIStateSlice = createSlice(...)


---
Filepath: features/agents/redux/execution-system/selectors/aggregate.selectors.ts  [typescript]

  # Redux (slices / thunks / selectors)
    export const selectIsExecuting
    export const selectIsStreaming
    export const selectIsAwaitingTools
    export const selectLatestAccumulatedText
    export const selectLatestConversationId
    export const selectConversationMode
    export const selectLatestRequestId
    export const selectLatestRequestStatus
    export const selectIsConnecting
    export const selectIsWaitingForFirstToken
    export const selectLatestRequestStartedAt
    export const selectLatestError
    export const selectPendingToolCallsForInstance
    export const selectHasAnyContent
    export const selectIsInstanceReady
    export const selectAssembledRequest
    export const selectInstanceSummary
    export const selectActiveInstancesByDisplayMode
    export const selectActiveModalInstanceIds
    export const selectActivePanelInstanceIds
    export const selectAvailableShortcuts
  # Functions
    export const makeSelectInstanceDisplaySnapshot = () =>


---
Filepath: features/agents/redux/execution-system/selectors/instance-model-overrides.selectors.ts  [typescript]

  # Redux (slices / thunks / selectors)
    export const selectInstanceOverrideState
    export const selectCurrentSettings
    export const selectSettingsOverridesForApi
    export const selectHasOverrides
    export const selectOverriddenKeys


---
Filepath: features/agents/redux/agent-shortcuts/converters.ts  [typescript]

  # Functions
    export function dbRowToAgentShortcut(row: ShortcutRow): AgentShortcut
    export function agentShortcutToInsert(shortcut: AgentShortcut): ShortcutInsert
    export function agentShortcutToUpdate(partial: Partial<AgentShortcut>,): ShortcutUpdate


---
Filepath: features/agents/redux/agent-shortcuts/thunks.ts  [typescript]

  # Redux (slices / thunks / selectors)
    const buildAgentShortcutMenu = createAsyncThunk(...)
    const fetchShortcutsForContext = createAsyncThunk(...)
    const fetchFullShortcut = createAsyncThunk(...)
    const saveShortcut = createAsyncThunk(...)
    const saveShortcutField = createAsyncThunk(...)
    const createShortcut = createAsyncThunk(...)
    const deleteShortcut = createAsyncThunk(...)
    const fetchUserShortcuts = createAsyncThunk(...)
    const duplicateShortcut = createAsyncThunk(...)
    const createShortcutForAgent = createAsyncThunk(...)
    const syncUserShortcutToSlice = createAsyncThunk(...)


---
Filepath: features/agents/redux/agent-shortcuts/types.ts  [typescript]

  # Types
    export type ShortcutFieldSnapshot = {
    export type ShortcutLoadedFields = Set<keyof AgentShortcut>
  # Interfaces
    export interface AgentShortcut
    # id: string
    # categoryId: string
    # label: string
    # description: string | null
    # iconName: string | null
    # keyboardShortcut: string | null
    # sortOrder: number
    # agentId: string | null; // FK → agents (stable identity / display)
    # ... 18 more fields
    export interface AgentShortcutInitialRow
    # shortcut_id: string
    # category_id: string
    # label: string
    # description: string | null
    # icon_name: string | null
    # keyboard_shortcut: string | null
    # sort_order: number
    # resolved_id: string | null; // single uuid for execution
    # ... 19 more fields
    export interface AgentShortcutContextRow extends AgentShortcutInitialRow
    # shortcut_workspace_id: string | null
    # shortcut_project_id: string | null
    # shortcut_task_id: string | null
    export interface AgentShortcutMenuResult
    # placement_type: string
    # menu_data: AgentShortcutCategory[]
    export interface AgentShortcutCategory
    # category: {
    # id: string
    # label: string
    # description: string | null
    # icon_name: string | null
    # color: string | null
    # sort_order: number
    # parent_category_id: string | null
    # ... 3 more fields
    export interface AgentShortcutMenuItem
    # id: string
    # label: string
    # description: string | null
    # icon_name: string | null
    # keyboard_shortcut: string | null
    # sort_order: number
    # resolved_id: string | null
    # is_version: boolean
    # ... 16 more fields
    export interface UserShortcutItem
    # id: string
    # label: string
    # description: string | null
    # icon_name: string | null
    # keyboard_shortcut: string | null
    # sort_order: number
    # category_id: string
    # category_label: string
    # ... 28 more fields
    export interface CreateShortcutForAgentParams
    # p_agent_id: string
    # p_label: string
    # p_category_id: string
    # p_user_id?: string | null
    # p_organization_id?: string | null
    # p_workspace_id?: string | null
    # p_project_id?: string | null
    # p_task_id?: string | null
    # ... 1 more fields
    export interface AgentShortcutRecord extends AgentShortcut
    # _dirty: boolean
    # _dirtyFields: Set<keyof AgentShortcut>
    # _fieldHistory: ShortcutFieldSnapshot
    # _loadedFields: ShortcutLoadedFields
    # _loading: boolean
    # _error: string | null
    export interface AgentShortcutSliceState
    # shortcuts: Record<string, AgentShortcutRecord>
    # activeShortcutId: string | null
    # initialLoaded: boolean
    # contextLoaded: Record<string, boolean>; // key = "workspace:{id}" | "project:{id}" | "task:{id}"
    # status: "idle" | "loading" | "succeeded" | "failed"
    # error: string | null


---
Filepath: features/agents/redux/agent-shortcuts/selectors.ts  [typescript]

  # Redux (slices / thunks / selectors)
    export const selectAllShortcuts
    export const selectActiveShortcutId
    export const selectShortcutsInitialLoaded
    export const selectShortcutsContextLoaded
    export const selectIsContextLoaded
    export const selectShortcutsSliceStatus
    export const selectShortcutsSliceError
    export const selectShortcutById
    export const selectShortcutDefinition
    export const selectShortcutAgentId
    export const selectShortcutVersionRef
    export const selectShortcutExecutionConfig
    export const selectShortcutLabel
    export const selectShortcutDescription
    export const selectShortcutIconName
    export const selectShortcutKeyboardShortcut
    export const selectShortcutEnabledContexts
    export const selectShortcutScopeMappings
    export const selectShortcutCategoryId
    export const selectShortcutSortOrder
    export const selectShortcutIsDirty
    export const selectShortcutDirtyFields
    export const selectShortcutFieldHistory
    export const selectShortcutLoadedFields
    export const selectShortcutIsLoading
    export const selectShortcutError
    export const selectShortcutIsActive
    export const selectShortcutFieldIsLoaded
    export const selectShortcutFieldOriginalValue
    export const selectShortcutIsSystem
    export const selectShortcutIsOwnedByUser
    export const selectAllShortcutIds
    export const selectAllShortcutsArray
    export const selectSystemShortcuts
    export const selectUserOwnedShortcuts
    export const selectOrgShortcuts
    export const selectActiveShortcuts
    export const selectShortcutsForContext
    export const selectShortcutsByAgentId
    export const selectShortcutsByVersionId
    export const selectLatestShortcuts
    export const selectPinnedShortcuts
    export const selectDirtyShortcuts
    export const selectShortcutsGroupedByCategory
    export const selectActiveShortcut
    export const selectActiveShortcutIsDirty
    export const selectActiveShortcutIsLoading
    export const selectActiveShortcutAgentId


---
Filepath: features/agents/redux/agent-shortcuts/slice.ts  [typescript]

  # Redux (slices / thunks / selectors)
    const agentShortcutSlice = createSlice(...)


---
Filepath: features/agents/redux/agent-consumers/selectors.ts  [typescript]

  # Redux (slices / thunks / selectors)
    export const selectAllAgentCategories
    export const selectAllAgentTags
    export const selectTotalUserAgentsCount
    export const selectTotalOwnedAgentsCount
    export const selectTotalSharedAgentsCount
    export const selectTotalBuiltinAgentsCount
    export const selectTotalFavoriteAgentsCount
  # Functions
    export function computeAgentSearchScore(agent: AgentDefinitionRecord, query: string,): number
    export function agentMatchesSearch(agent: AgentDefinitionRecord, query: string,): boolean
    export function applyAgentSortComparator(a: AgentDefinitionRecord, b: AgentDefinitionRecord, sortBy: AgentSortOption,): number
    export const makeSelectFilteredAgents = (consumerId: string) =>
    export const makeSelectFilteredBuiltinAgents = (consumerId: string) =>
    export const makeSelectAgentCards = (consumerId: string, isMobile: boolean) =>
    export const makeSelectAgentListItems = (consumerId: string, isMobile: boolean,) =>
    export const makeSelectFilteredAgentsCount = (consumerId: string) =>
    export const makeSelectFilteredBuiltinAgentsCount = (consumerId: string) =>
    export const makeSelectAgentConsumerHasActiveFilters = (consumerId: string) =>
    export const makeSelectAgentSearchTerm = (consumerId: string) =>
    export const makeSelectAgentSortBy = (consumerId: string) =>
    export const makeSelectAgentTab = (consumerId: string) =>


---
Filepath: features/agents/redux/agent-consumers/slice.ts  [typescript]

  # Types
    export type AgentSortOption = | "updated-desc"
    export type AgentTab = "mine" | "shared" | "all" | "system"
    export type AgentFavFilter = "all" | "yes" | "no"
    export type AgentArchFilter = "active" | "archived" | "both"
    export type AgentAccessFilter = "any" | "owned" | "shared" | "editable"
  # Interfaces
    export interface AgentConsumerState
    # tab: AgentTab
    # sortBy: AgentSortOption
    # searchTerm: string
    # /** INCLUSION model: empty = show all; non-empty = only matching. */
    # includedCats: string[]
    # /** INCLUSION model: empty = show all; non-empty = only matching. */
    # includedTags: string[]
    # favFilter: AgentFavFilter
    # ... 7 more fields
    export interface AgentConsumersState
    # consumers: Record<string, AgentConsumerState>
  # Redux (slices / thunks / selectors)
    const agentConsumersSlice = createSlice(...)
    export const selectAgentConsumer
    export const selectAllAgentConsumers


---
Filepath: features/agents/redux/agent-definition/converters.ts  [typescript]

  # Functions
    export function dbRowToAgentDefinition(row: AgentRow): AgentDefinition
    export function agentDefinitionToInsert(agent: AgentDefinition): AgentInsert
    export function agentDefinitionToUpdate(partial: Partial<AgentDefinition>,): AgentUpdate


---
Filepath: features/agents/redux/agent-definition/thunks.ts  [typescript]

  # Interfaces
    export interface AgentVersionHistoryItem
    # version_id: string
    # version_number: number
    # name: string
    # changed_at: string
    # change_note: string | null
    export interface AgentVersionSnapshot
    # version_id: string
    # version_number: number
    # agent_type: string
    # name: string
    # description: string | null
    # messages: AgentDefinition["messages"]
    # variable_definitions: AgentDefinition["variableDefinitions"]
    # model_id: string | null
    # ... 11 more fields
    export interface SharedAgentItem
    # id: string
    # name: string
    # description: string | null
    # agent_type: "user" | "builtin"
    # category: string | null
    # tags: string[]
    # owner_id: string | null
    # owner_email: string | null
    # ... 3 more fields
    export interface SharedAgentForChat
    # id: string
    # name: string
    # permission_level: string
    # owner_email: string | null
    export interface AgentAccessLevel
    # agent_id: string
    # agent_name: string
    # owner_id: string | null
    # owner_email: string | null
    # access_level: "owner" | "admin" | "editor" | "viewer" | "public" | "none"
    # is_owner: boolean
    export interface PurgeVersionsResult
    # success: boolean
    # error?: string
    # deleted_count?: number
    # kept_count?: number
  # Redux (slices / thunks / selectors)
    const fetchAgentsList = createAsyncThunk(...)
    const fetchAgentsListFull = createAsyncThunk(...)
    const fetchAgentExecutionMinimal = createAsyncThunk(...)
    const fetchAgentExecutionFull = createAsyncThunk(...)
    const fetchFullAgent = createAsyncThunk(...)
    const fetchAgentVersionHistory = createAsyncThunk(...)
    const fetchAgentVersionSnapshot = createAsyncThunk(...)
    const saveAgentField = createAsyncThunk(...)
    const saveAgent = createAsyncThunk(...)
    const createAgent = createAsyncThunk(...)
    const deleteAgent = createAsyncThunk(...)
    const duplicateAgent = createAsyncThunk(...)
    const promoteAgentVersion = createAsyncThunk(...)
    const fetchSharedAgents = createAsyncThunk(...)
    const fetchSharedAgentsForChat = createAsyncThunk(...)
    const fetchAgentAccessLevel = createAsyncThunk(...)
    const checkAgentDrift = createAsyncThunk(...)
    const checkAgentReferences = createAsyncThunk(...)
    const purgeAgentVersions = createAsyncThunk(...)
    const acceptAgentVersion = createAsyncThunk(...)
    const initializeChatAgents = createAsyncThunk(...)
    const updateAgentFromSource = createAsyncThunk(...)
  # Functions
    export function isChatListFresh(): boolean
    export function isChatListStale(): boolean


---
Filepath: features/agents/redux/agent-definition/types.ts  [typescript]

  # Types
    export type AgentType = "user" | "builtin"
    export type VariableComponentType = | "textarea" // Default — multi-line text
    export type AccessLevel = | "owner"
    export type DuplicateAgentResult = string
    export type AgentFetchStatus = | "list"
    export type FieldSnapshot = {
    export type LoadedFields = Set<keyof AgentDefinition>
  # Interfaces
    export interface VariableCustomComponent
    # type: VariableComponentType
    # options?: string[]
    # allowOther?: boolean
    # toggleValues?: [string, string]
    # min?: number
    # max?: number
    # step?: number
    export interface VariableDefinition
    # name: string
    # defaultValue: unknown
    # helpText?: string
    # required?: boolean
    # /** Custom UI input component for collecting this variable's value. */
    # customComponent?: VariableCustomComponent
    export interface ModelTier
    # modelId: string
    # label?: string
    export interface ModelTiers
    # default: string
    # flexible?: boolean
    # tiers?: Record<string, ModelTier>
    export interface AgentDefinition
    # id: string; // agents.id for live agents; agent_versions.id for snapshots
    # name: string
    # description: string | null
    # category: string | null
    # tags: string[]
    # agentType: AgentType
    # isVersion: boolean; // true = this record is from agent_versions
    # parentAgentId: string | null; // FK → agents.id, only set when isVersion = true
    # ... 28 more fields
    export interface AgentListRow
    # id: string
    # name: string
    # description: string | null
    # category: string | null
    # tags: string[]
    # agent_type: AgentType
    # model_id: string | null
    # is_active: boolean
    # ... 13 more fields
    export interface DuplicateAgentParams
    # agent_id: string
    export interface PromoteVersionParams
    # agent_id: string
    # version_number: number
    export interface PromoteVersionResult
    # success: boolean
    # error?: string
    # promoted_version?: number
    # agent_id?: string
    export interface AgentExecutionMinimal
    # id: string
    # variable_definitions: VariableDefinition[] | null
    # context_slots: ContextSlot[] | null
    export interface AgentExecutionFull
    # id: string
    # variable_definitions: VariableDefinition[] | null
    # model_id: string | null
    # settings: LLMParams
    # tools: string[]
    # custom_tools: CustomToolDefinition[]
    # context_slots: ContextSlot[] | null
    export interface AgentDriftItem
    # reference_type: "shortcut" | "app" | "derived_agent"
    # reference_id: string
    # reference_name: string
    # agent_id: string
    # agent_name: string
    # version_pinned_to: number
    # current_version: number
    # versions_behind: number
    export interface AgentReference
    # reference_type: "shortcut" | "app" | "derived_agent"
    # reference_id: string
    # reference_name: string
    # use_latest: boolean
    # is_behind: boolean
    export interface AcceptVersionResult
    # success: boolean
    # error?: string
    # reference_type?: string
    # reference_id?: string
    # accepted_version?: number
    export interface UpdateFromSourceResult
    # success: boolean
    # error?: string
    # source_version?: number
    # agent_name?: string
    export interface AgentDefinitionRecord extends AgentDefinition
    # _dirty: boolean
    # _dirtyFields: Set<keyof AgentDefinition>
    # _fieldHistory: FieldSnapshot
    # _loadedFields: LoadedFields
    # _fetchStatus: AgentFetchStatus | null
    # _loading: boolean
    # _error: string | null
    export interface AgentDefinitionSliceState
    # agents: Record<string, AgentDefinitionRecord>
    # activeAgentId: string | null
    # status: "idle" | "loading" | "succeeded" | "failed"
    # error: string | null
  # Functions
    export function shouldUpgradeFetchStatus(current: AgentFetchStatus | null, incoming: AgentFetchStatus,): boolean


---
Filepath: features/agents/redux/agent-definition/selectors.ts  [typescript]

  # Redux (slices / thunks / selectors)
    export const selectAllAgents
    export const selectActiveAgentId
    export const selectAgentsSliceStatus
    export const selectAgentsSliceError
    export const selectAgentById
    export const selectAgentFetchStatus
    export const selectAgentDefinition
    export const selectAgentReadyForDisplay
    export const selectAgentReadyForExecution
    export const selectAgentReadyForCustomExecution
    export const selectAgentReadyForBuilder
    export const selectAgentReadyForVersionDisplay
    export const selectAgentCanExecute
    export const selectAgentExecutionPayload
    export const selectAgentCustomExecutionPayload
    export const selectAgentName
    export const selectAgentDescription
    export const selectAgentType
    export const selectAgentModelId
    export const selectAgentMessages
    export const selectAgentMessageAtIndex
    export const selectAgentSystemMessage
    export const selectAgentConversationMessageIndices
    export const selectAgentVariableDefinitions
    export const selectAgentContextSlots
    export const selectAgentSettings
    export const selectAgentTools
    export const selectAgentCustomTools
    export const selectAgentModelTiers
    export const selectAgentOutputSchema
    export const selectAgentTags
    export const selectAgentCategory
    export const selectAgentIsVersion
    export const selectAgentParentAgentId
    export const selectAgentVersionNumber
    export const selectAgentChangeNote
    export const selectAgentIsDirty
    export const selectAgentDirtyFields
    export const selectAgentFieldHistory
    export const selectAgentLoadedFields
    export const selectAgentIsLoading
    export const selectAgentError
    export const selectAgentIsActive
    export const selectAgentIsPublic
    export const selectAgentIsArchived
    export const selectAgentIsFavorite
    export const selectAgentFieldOriginalValue
    export const selectAgentFieldIsLoaded
    export const selectAgentSourceId
    export const selectAgentIsForked
    export const selectAgentIsOwner
    export const selectAgentAccessLevel
    export const selectAgentSharedByEmail
    export const selectAgentIsConfirmedOwner
    export const selectAgentIsEditable
    export const selectAgentIsAccessible
    export const selectAllAgentIds
    export const selectAllAgentsArray
    export const selectLiveAgents
    export const selectAllVersionRecords
    export const selectVersionsByParentAgentId
    export const selectUserAgents
    export const selectBuiltinAgents
    export const selectSystemAgents
    export const selectActiveAgents
    export const selectFavoriteAgents
    export const selectDirtyAgents
    export const selectOwnedAgents
    export const selectSharedWithMeAgents
    export const selectEditableAgents
    export const selectAgentsByCategory
    export const selectActiveAgent
    export const selectActiveAgentIsDirty
    export const selectActiveAgentIsLoading
    export const selectActiveAgentCanExecute
    export const selectActiveAgentExecutionPayload


---
Filepath: features/agents/redux/agent-definition/slice.ts  [typescript]

  # Redux (slices / thunks / selectors)
    const agentDefinitionSlice = createSlice(...)
```
<!-- /AUTO:signatures -->

<!-- AUTO:config -->
## Generation Config

> Auto-managed. Contains the exact parameters used to generate this README.
> Used by parent modules to auto-refresh this file when it is stale.
> Do not edit manually — changes will be overwritten on the next run.

```json
{
  "subdirectory": "features/agents/redux",
  "mode": "signatures",
  "scope": null,
  "project_noise": null,
  "include_call_graph": true,
  "entry_points": null,
  "call_graph_exclude": [
    "tests"
  ]
}
```
<!-- /AUTO:config -->
