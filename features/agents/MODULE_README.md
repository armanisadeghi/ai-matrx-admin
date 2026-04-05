# `features.agents` — Module Overview

> This document is partially auto-generated. Sections tagged `<!-- AUTO:id -->` are refreshed by the generator.
> Everything else is yours to edit freely and will never be overwritten.

<!-- AUTO:meta -->
## About This Document

This file is **partially auto-generated**. Sections wrapped in `<!-- AUTO:id -->` tags
are overwritten each time the generator runs. Everything else is yours to edit freely.

| Field | Value |
|-------|-------|
| Module | `features/agents` |
| Last generated | 2026-04-05 09:18 |
| Output file | `features/agents/MODULE_README.md` |
| Signature mode | `signatures` |


**Child READMEs detected** (signatures collapsed — see links for detail):

| README | |
|--------|---|
| [`features/agents/docs/MODULE_README.md`](features/agents/docs/MODULE_README.md) | last generated 2026-04-05 09:18 |
| [`features/agents/redux/MODULE_README.md`](features/agents/redux/MODULE_README.md) | last generated 2026-04-05 09:18 |
**To refresh auto-sections:**
```bash
python utils/code_context/generate_module_readme.py features/agents --mode signatures
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

> Auto-generated. 148 files across 42 directories.

```
features/agents/
├── components/
│   ├── TO-BE-ORGANIZED/
│   │   ├── NewAgentModal.tsx
│   ├── agent-listings/
│   │   ├── AgentActionModal.tsx
│   │   ├── AgentCard.tsx
│   │   ├── AgentListDropdown.tsx
│   │   ├── AgentListItem.tsx
│   │   ├── AgentsGrid.tsx
│   │   ├── ComingSoonModal.tsx
│   │   ├── FavoriteAgentButton.tsx
│   ├── builder/
│   │   ├── AgentBuilder.tsx
│   │   ├── AgentBuilderDesktop.tsx
│   │   ├── AgentBuilderLeftPanel.tsx
│   │   ├── AgentBuilderMobile.tsx
│   │   ├── AgentBuilderRightPanel.tsx
│   │   ├── AgentModelConfiguration.tsx
│   │   ├── MessageContentItemRenderer.tsx
│   ├── context-slots-management/
│   │   ├── AgentContextSlotsManager.tsx
│   ├── debug/
│   │   ├── StreamDebugFloating.tsx
│   │   ├── StreamDebugOverlay.tsx
│   │   ├── StreamDebugPanel.tsx
│   │   ├── index.ts
│   ├── layouts/
│   ├── messages/
│   │   ├── AddBlockButton.tsx
│   │   ├── MessageItem.tsx
│   │   ├── MessageItemButtons.tsx
│   │   ├── Messages.tsx
│   │   ├── PromptMessages.tsx
│   │   ├── not-used/
│   │   │   ├── AgentMessageItem.tsx
│   │   │   ├── AgentMessages.tsx
│   │   │   ├── AgentSystemMessage.tsx
│   ├── overlays/
│   │   ├── AgentExecutionOverlay.tsx
│   ├── run/
│   │   ├── AgentConversationDisplay.tsx
│   │   ├── AgentPlanningIndicator.tsx
│   │   ├── AgentRunInput.tsx
│   │   ├── AgentRunPage.tsx
│   │   ├── AgentRunsSidebar.tsx
│   │   ├── AgentStatusIndicator.tsx
│   │   ├── AgentStreamingMessage.tsx
│   │   ├── AgentUserMessage.tsx
│   │   ├── AgentVariableInputForm.tsx
│   ├── run-controls/
│   │   ├── AgentExecutionTestModal.tsx
│   │   ├── AgentLauncherSidebarTester.tsx
│   │   ├── CreatorRunPanel.tsx
│   │   ├── RunSettingsEditor.tsx
│   │   ├── RunSettingsModal.tsx
│   ├── settings-management/
│   │   ├── AgentSettingsCore.tsx
│   │   ├── AgentSettingsModal.tsx
│   │   ├── not-used/
│   │   │   ├── AgentInlineControls.tsx
│   ├── shared/
│   │   ├── AgentBuilderWrapper.tsx
│   │   ├── AgentOptionsMenu.tsx
│   │   ├── AgentPageContext.tsx
│   │   ├── AgentRunWrapper.tsx
│   │   ├── AgentSaveStatus.tsx
│   │   ├── AgentSharedHeader.tsx
│   ├── smart/
│   │   ├── SmartAgentInput.tsx
│   │   ├── SmartAgentResourceChips.tsx
│   │   ├── SmartAgentResourcePickerButton.tsx
│   │   ├── SmartAgentVariableInputs.tsx
│   │   ├── index.ts
│   ├── system-instructions/
│   │   ├── SystemInstructionEditor.tsx
│   │   ├── SystemInstructionModal.tsx
│   │   ├── SystemMessage.tsx
│   │   ├── SystemMessageButtons.tsx
│   ├── tools-management/
│   │   ├── AgentToolsManager.tsx
│   │   ├── AgentToolsModal.tsx
│   ├── undo-history/
│   │   ├── UndoHistoryOverlay.tsx
│   ├── variables-management/
│   │   ├── AgentVariableEditor.tsx
│   │   ├── AgentVariableEditorModal.tsx
│   │   ├── AgentVariablesManager-2.tsx
│   │   ├── AgentVariablesManager.tsx
│   │   ├── AgentVariablesModal.tsx
│   │   ├── AgentVariablesPanel.tsx
│   │   ├── HighlightedText.tsx
│   │   ├── VariableSelector.tsx
├── docs/
│   ├── MODULE_README.md
├── hooks/
│   ├── useAgentAutoSave.ts
│   ├── useAgentConsumer.ts
│   ├── useAgentLauncher.ts
│   ├── useAgentUndoRedo.ts
│   ├── useAgentsBasePath.ts
│   ├── useModelControls.ts
├── redux/
│   ├── MODULE_README.md
│   ├── agent-consumers/
│   │   ├── selectors.ts
│   │   ├── slice.ts
│   ├── agent-definition/
│   │   ├── converters.ts
│   │   ├── selectors.ts
│   │   ├── slice.ts
│   │   ├── thunks.ts
│   ├── agent-shortcuts/
│   │   ├── converters.ts
│   │   ├── selectors.ts
│   │   ├── slice.ts
│   │   ├── thunks.ts
│   │   ├── types.ts
│   ├── execution-system/
│   │   ├── active-requests/
│   │   │   ├── active-requests.selectors.ts
│   │   │   ├── active-requests.slice.ts
│   │   │   ├── index.ts
│   │   ├── execution-instances/
│   │   │   ├── execution-instances.selectors.ts
│   │   │   ├── execution-instances.slice.ts
│   │   │   ├── index.ts
│   │   ├── instance-client-tools/
│   │   │   ├── index.ts
│   │   │   ├── instance-client-tools.selectors.ts
│   │   │   ├── instance-client-tools.slice.ts
│   │   ├── instance-context/
│   │   │   ├── index.ts
│   │   │   ├── instance-context.selectors.ts
│   │   │   ├── instance-context.slice.ts
│   │   ├── instance-conversation-history/
│   │   │   ├── index.ts
│   │   │   ├── instance-conversation-history.selectors.ts
│   │   │   ├── instance-conversation-history.slice.ts
│   │   ├── instance-model-overrides/
│   │   │   ├── index.ts
│   │   │   ├── instance-model-overrides.selectors.ts
│   │   │   ├── instance-model-overrides.slice.ts
│   │   ├── instance-resources/
│   │   │   ├── index.ts
│   │   │   ├── instance-resources.selectors.ts
│   │   │   ├── instance-resources.slice.ts
│   │   ├── instance-ui-state/
│   │   │   ├── index.ts
│   │   │   ├── instance-ui-state.selectors.ts
│   │   │   ├── instance-ui-state.slice.ts
│   │   ├── instance-user-input/
│   │   │   ├── index.ts
│   │   │   ├── instance-user-input.selectors.ts
│   │   │   ├── instance-user-input.slice.ts
│   │   ├── instance-variable-values/
│   │   │   ├── index.ts
│   │   │   ├── instance-variable-values.selectors.ts
│   │   │   ├── instance-variable-values.slice.ts
│   │   ├── selectors/
│   │   │   ├── aggregate.selectors.ts
│   │   ├── thunks/
│   │   │   ├── create-instance.thunk.ts
│   │   │   ├── execute-chat-instance.thunk.ts
│   │   │   ├── execute-instance.thunk.ts
│   │   │   ├── launch-agent-execution.thunk.ts
│   │   │   ├── process-stream.ts
│   │   ├── utils/
│   │   │   ├── ids.ts
│   │   │   ├── index.ts
│   │   │   ├── source-slice-helpers.ts
│   ├── mcp/
│   │   ├── mcp.slice.ts
├── services/
│   ├── mcp-oauth/
│   │   ├── discovery.ts
│   │   ├── pkce.ts
│   ├── mcp.service.ts
├── types/
│   ├── agent-api-types.ts
│   ├── agent-definition.types.ts
│   ├── agent-message-types.ts
│   ├── common.types.ts
│   ├── index.ts
│   ├── instance.types.ts
│   ├── json-schema.ts
│   ├── mcp.types.ts
│   ├── message-types.ts
│   ├── request.types.ts
├── utils/
│   ├── run-ui-utils.ts
│   ├── scope-mapping.ts
│   ├── shortcut-context-utils.ts
│   ├── variable-utils.ts
# excluded: 9 .md
```
<!-- /AUTO:tree -->

<!-- AUTO:signatures -->
## API Signatures

> Auto-generated via `output_mode="{mode}"`. ~5-10% token cost vs full source.
> For full source, open the individual files directly.
> Submodules with their own `MODULE_README.md` are collapsed to a single stub line.

```
---
Filepath: features/agents/types/common.types.ts  [typescript]

  # Interfaces
    export interface DirtyTrackable
    # /** Set of entity IDs that have unsaved changes */
    # dirtyIds: Record<string, boolean>
    export interface AsyncState
    # loading: boolean
    # error: string | null
    export interface SourceSliceState<T> extends DirtyTrackable, AsyncState
    # byId: Record<string, T>
    # allIds: string[]
    export interface InstanceSliceState<T>
    # byInstanceId: Record<string, T>
    export interface AgentPayload<T>
    # agentId: string
    # data: T
    export interface InstancePayload<T>
    # instanceId: string
    # data: T



---
Filepath: features/agents/types/json-schema.ts  [typescript]

  # Interfaces
    export interface OutputSchema
    # /** Schema name — alphanumeric, underscores, dashes, max 64 chars. */
    # name: string
    # description?: string
    # /** Must be a root-level object schema with additionalProperties: false. */
    # schema: JsonSchema
    # /** When true, the provider must enforce the schema exactly. */
    # strict?: boolean



---
Filepath: features/agents/types/agent-api-types.ts  [typescript]

  # Types
    export type LLMParams = NonNullableFields<components["schemas"]["LLMParams"]>
    export type ChatRequestPayload = NonNullableFields<
    export type SystemInstructionInput = string | SystemInstruction
    export type IdeFileState = NonNullableFields<
    export type IdeDiagnostic = NonNullableFields<
    export type IdeGitState = NonNullableFields<
    export type IdeWorkspaceState = NonNullableFields<
    export type IdeState = NonNullableFields<components["schemas"]["IdeState"]>
    export type ContextObjectType = | "text"
    export type ContextValue = | string
    export type CtxGetResult = | CtxGetFullResult
  # Interfaces
    export interface SystemInstruction
    # base_instruction?: string
    # content?: string
    # intro?: string
    # outro?: string
    # prepend_sections?: string[]
    # append_sections?: string[]
    # content_blocks?: string[]
    # tools_list?: string[]
    # ... 6 more fields
    export interface AgentStartRequest
    export interface CustomToolInputSchema
    # type: "object"
    # properties: Record<
    # string
    # {
    # type: string
    # description?: string
    # enum?: unknown[]
    # [key: string]: unknown
    # ... 3 more fields
    export interface CustomToolDefinition
    # /** Unique tool name. Must match [a-zA-Z0-9_-]{1,64}. */
    # name: string
    # /** Human-readable description shown to the model. Be specific. */
    # description?: string
    # /** JSON Schema for the tool's input parameters. */
    # input_schema?: CustomToolInputSchema
    export interface ConversationContinueRequest
    # user_input: string | ContentBlock[]
    # config_overrides?: LLMParams | null
    # stream?: boolean
    # debug?: boolean
    # client_tools?: string[]
    # /**
    # custom_tools?: CustomToolDefinition[]
    # ide_state?: IdeState | null
    # ... 13 more fields
    export interface ToolResultsRequest
    # results: ClientToolResult[]
    export interface ToolResultsResponse
    # resolved: string[]
    # count: number
    export interface ContextSlot
    export interface CtxGetFullResult
    # key: string
    # type: ContextObjectType
    # label: string
    # content: string
    # total_chars: number
    export interface CtxGetPageResult
    # key: string
    # type: ContextObjectType
    # label: string
    # content: string
    # offset: number
    # chars_returned: number
    # total_chars: number
    # has_more: boolean
    # ... 1 more fields
    export interface CtxGetSummaryResult
    # key: string
    # type: ContextObjectType
    # label: string
    # summary: string
    # total_chars: number



---
Filepath: features/agents/types/agent-definition.types.ts  [typescript]

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
    # id: string; // agx_agent.id for live agents; agx_version.id for snapshots
    # name: string
    # description: string | null
    # category: string | null
    # tags: string[]
    # agentType: AgentType
    # isVersion: boolean; // true = this record is from agx_version
    # parentAgentId: string | null; // FK → agx_agent.id, only set when isVersion = true
    # ... 29 more fields
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
    export interface UndoEntry
    # field: keyof AgentDefinition
    # value: AgentDefinition[keyof AgentDefinition]
    # timestamp: number
    # byteEstimate: number
    export interface AgentDefinitionRecord extends AgentDefinition
    # _dirty: boolean
    # _dirtyFields: Set<keyof AgentDefinition>
    # _fieldHistory: FieldSnapshot
    # _loadedFields: LoadedFields
    # _fetchStatus: AgentFetchStatus | null
    # _loading: boolean
    # _error: string | null
    # _undoPast: UndoEntry[]
    # ... 1 more fields
    export interface AgentDefinitionSliceState
    # agents: Record<string, AgentDefinitionRecord>
    # activeAgentId: string | null
    # status: "idle" | "loading" | "succeeded" | "failed"
    # error: string | null
  # Functions
    export function shouldUpgradeFetchStatus(current: AgentFetchStatus | null, incoming: AgentFetchStatus,): boolean



---
Filepath: features/agents/types/message-types.ts  [typescript]

  # Types
    export type TableBookmark = | FullTableBookmark
    export type ListBookmark = | FullListBookmark
    export type DataRefTable = | "notes"
    export type DataRef = DbRecordRef | DbQueryRef | DbFieldRef
    export type ContentBlock = // Media
    export type UserInput = string | ContentBlock[]
  # Interfaces
    export interface TextBlock
    # type: "text"
    # text: string
    export interface ImageBlock
    # type: "image"
    # /** Public URL pointing to the image. */
    # url?: string
    # /** Base64-encoded image bytes. Include mime_type when using this field. */
    # base64_data?: string
    # /** MIME type e.g. "image/jpeg". Auto-detected from the URL or data if omitted. */
    # mime_type?: string
    # /**
    # ... 4 more fields
    export interface AudioBlock
    # type: "audio"
    # /** Public URL pointing to the audio file. */
    # url?: string
    # /** Base64-encoded audio bytes. */
    # base64_data?: string
    # /** MIME type e.g. "audio/mp3", "audio/wav". Auto-detected if omitted. */
    # mime_type?: string
    # /**
    # ... 9 more fields
    export interface VideoBlock
    # type: "video"
    # /** Public URL pointing to the video file. */
    # url?: string
    # /** Base64-encoded video bytes. */
    # base64_data?: string
    # /**
    # file_uri?: string
    # /** MIME type e.g. "video/mp4". Auto-detected if omitted. */
    # ... 4 more fields
    export interface YouTubeVideoBlock
    # type: "youtube_video"
    # /** Full YouTube URL: "https://youtube.com/watch?v=..." or "https://youtu.be/..." */
    # url: string
    export interface DocumentBlock
    # type: "document"
    # /** Public URL pointing to the document. */
    # url?: string
    # /** Base64-encoded document bytes. Include mime_type when using this field. */
    # base64_data?: string
    # /** MIME type e.g. "application/pdf". Auto-detected if omitted. */
    # mime_type?: string
    export interface WebpageInputBlock extends StructuredInputBase
    # type: "input_webpage"
    # /** One or more public URLs to scrape. */
    # urls: string[]
    export interface NotesInputBlock extends StructuredInputBase
    # type: "input_notes"
    # /** One or more note IDs to fetch. */
    # note_ids: string[]
    # /** XML rendering template. Default "full". */
    # template?: "full" | "compact" | "minimal"
    export interface TaskInputBlock extends StructuredInputBase
    # type: "input_task"
    # /** One or more task IDs to fetch. */
    # task_ids: string[]
    # /** XML rendering template. Default "full". */
    # template?: "full" | "compact"
    export interface FullTableBookmark
    # type: "full_table"
    # table_id: string
    # /** Cosmetic label used in the injected XML. */
    # table_name?: string
    export interface TableColumnBookmark
    # type: "table_column"
    # table_id: string
    # column_name: string
    # table_name?: string
    export interface TableRowBookmark
    # type: "table_row"
    # table_id: string
    # row_id: string
    # table_name?: string
    export interface TableCellBookmark
    # type: "table_cell"
    # table_id: string
    # row_id: string
    # column_name: string
    # table_name?: string
    export interface TableInputBlock extends StructuredInputBase
    # type: "input_table"
    # bookmarks: TableBookmark[]
    export interface FullListBookmark
    # type: "full_list"
    # list_id: string
    # /** Cosmetic label used in the injected XML. */
    # list_name?: string
    export interface ListGroupBookmark
    # type: "list_group"
    # list_id: string
    # group_name: string
    # list_name?: string
    export interface ListItemBookmark
    # type: "list_item"
    # list_id: string
    # item_id: string
    # list_name?: string
    export interface ListInputBlock extends StructuredInputBase
    # type: "input_list"
    # bookmarks: ListBookmark[]
    export interface DbRecordRef
    # ref_type: "db_record"
    # /** Must be in the server allowlist (see DataRefTable). */
    # table: DataRefTable
    # /** Primary key of the row. */
    # id: string
    # /** Cosmetic label for the XML wrapper. Defaults to table name. */
    # label?: string
    # /** Project only these fields. Omit to include all allowed fields. */
    # ... 3 more fields
    export interface DbQueryRef
    # ref_type: "db_query"
    # /** Must be in the server allowlist. */
    # table: DataRefTable
    # /** Cosmetic label for the XML wrapper. */
    # label?: string
    # /**
    # filter?: Record<string, unknown>
    # /** Project only these fields. Omit to include all allowed fields. */
    # ... 9 more fields
    export interface DbFieldRef
    # ref_type: "db_field"
    # /** Must be in the server allowlist. */
    # table: DataRefTable
    # /** Primary key of the row. */
    # id: string
    # /** Field name to retrieve. Must be in the table's allowlist. */
    # field_name: string
    # /** Cosmetic label for the XML wrapper. */
    # ... 2 more fields
    export interface DataInputBlock extends StructuredInputBase
    # type: "input_data"
    # /** One or more typed data references. Fetched concurrently. */
    # refs: DataRef[]



---
Filepath: features/agents/types/agent-message-types.ts  [typescript]

  # Types
    export type Role = | "user"
    export type StoredRole = "user" | "assistant" | "tool"
    export type ConversationBlock = // ── User-sendable blocks (ContentBlock) ──
    export type RoleMessage = UserMessage | AssistantMessage | ToolMessage
    export type AgentDefinitionMessages = AgentDefinitionMessage[]
  # Interfaces
    export interface ThinkingBlock
    # type: "thinking"
    # /**
    # text: string
    # /**
    # provider: "openai" | "anthropic" | "google" | "cerebras" | null
    # /**
    # signature?: string | null
    # /**
    # ... 18 more fields
    export interface ToolCallBlock
    # type: "tool_call"
    # /**
    # id: string
    # /** Name of the tool being called. */
    # name: string
    # /** Arguments passed to the tool, keyed by parameter name. */
    # arguments: Record<string, unknown>
    export interface ToolResultBlock
    # type: "tool_result"
    # /**
    # call_id: string
    # /**
    # tool_use_id?: string
    # /** The name of the tool that was executed. */
    # name?: string
    # /**
    # ... 17 more fields
    export interface CodeExecutionBlock
    # type: "code_execution"
    # /** The code to execute. */
    # code: string
    # /** Programming language. Default "python". */
    # language?: string
    export interface CodeExecutionResultBlock
    # type: "code_execution_result"
    # /** Execution outcome: "success" | "error" | "timeout" | etc. */
    # outcome: string
    # /** Stdout / stderr from the execution. */
    # output: string
    export interface WebSearchCallBlock
    # type: "web_search_call"
    # /** Provider-assigned ID for this search action. */
    # id?: string
    # /** Execution status: "completed" | "failed" | etc. */
    # status?: string
    # /**
    # action?: Record<string, unknown>
    export interface ConversationMessage
    # /** Message role. See Role above. */
    # role: StoredRole
    # /** Ordered list of content blocks for this turn. */
    # content: ConversationBlock[]
    # /**
    # id?: string
    # /**
    # name?: string
    # ... 10 more fields
    export interface UserMessage extends ConversationMessage
    # role: "user"
    # content: ContentBlock[]
    export interface AssistantMessage extends ConversationMessage
    # role: "assistant"
    # content: Array<
    # | TextBlock
    # | ThinkingBlock
    # | ToolCallBlock
    # | CodeExecutionBlock
    # | CodeExecutionResultBlock
    # | WebSearchCallBlock
    # ... 1 more fields
    export interface ToolMessage extends ConversationMessage
    # role: "tool"
    # content: ToolResultBlock[]
    export interface AgentDefinitionMessage
    # /**
    # role: "user" | "assistant" | "system"
    # /**
    # content: Array<
    # | TextBlock
    # | ImageBlock
    # | AudioBlock
    # | VideoBlock
    # ... 15 more fields



---
Filepath: features/agents/types/index.ts  [typescript]




---
Filepath: features/agents/types/request.types.ts  [typescript]

  # Types
    export type ToolLifecycleStatus = | "started"
    export type RequestStatus = | "pending"
    export type TimelineEntry = | TimelineTextStart
    export type ReservationStatus = "pending" | "active" | "completed" | "failed"
  # Interfaces
    export interface ClientMetrics
    # /** When dispatch(executeInstance) fired. The true "submit" moment. */
    # submitAt: number
    # /**
    # conversationIdAt: number | null
    # /**
    # firstChunkAt: number | null
    # /**
    # streamEndAt: number | null
    # ... 35 more fields
    export interface ToolLifecycleEntry
    # callId: string
    # toolName: string
    # status: ToolLifecycleStatus
    # arguments: Record<string, unknown>
    # startedAt: string
    # completedAt: string | null
    # latestMessage: string | null
    # latestData: Record<string, unknown> | null
    # ... 5 more fields
    export interface ActiveRequest
    # requestId: string
    # instanceId: string
    # /** Assigned by the server on the first response */
    # conversationId: string | null
    # /** If this is a sub-agent request, the parent's conversationId */
    # parentConversationId: string | null
    # status: RequestStatus
    # /** O(1) array accumulation — joined lazily in selectors */
    # ... 85 more fields
    export interface RawStreamEvent
    # idx: number
    # timestamp: number
    # eventType: string
    # data: unknown
    export interface OperationEntry
    # operationId: string
    # operation: Operation
    # parentOperationId: string | null
    # startedAt: number
    export interface CompletedOperationEntry extends OperationEntry
    # status: InitCompletionStatus
    # result: Record<string, unknown>
    # completedAt: number
    # durationMs: number
    export interface TimelineTextStart extends TimelineBase
    # kind: "text_start"
    # chunkStartIndex: number
    export interface TimelineTextEnd extends TimelineBase
    # kind: "text_end"
    # chunkStartIndex: number
    # chunkEndIndex: number
    # chunkCount: number
    export interface TimelineReasoningStart extends TimelineBase
    # kind: "reasoning_start"
    # chunkStartIndex: number
    export interface TimelineReasoningEnd extends TimelineBase
    # kind: "reasoning_end"
    # chunkStartIndex: number
    # chunkEndIndex: number
    # chunkCount: number
    export interface TimelineWarning extends TimelineBase
    # kind: "warning"
    # code: string
    # level: "low" | "medium" | "high"
    # recoverable: boolean
    # userMessage: string | null
    # systemMessage: string
    export interface TimelineInfo extends TimelineBase
    # kind: "info"
    # code: string
    # userMessage: string | null
    # systemMessage: string
    export interface TimelineRecordReserved extends TimelineBase
    # kind: "record_reserved"
    # table: string
    # recordId: string
    # dbProject: string
    # parentRefs: Record<string, string>
    export interface TimelineRecordUpdate extends TimelineBase
    # kind: "record_update"
    # table: string
    # recordId: string
    # status: "active" | "completed" | "failed"
    export interface TimelinePhase extends TimelineBase
    # kind: "phase"
    # phase: Phase
    export interface TimelineInit extends TimelineBase
    # kind: "init"
    # operation: Operation
    # operationId: string
    # parentOperationId: string | null
    export interface TimelineToolEvent extends TimelineBase
    # kind: "tool_event"
    # subEvent: string
    # callId: string
    # toolName: string
    # data: Record<string, unknown> | null
    export interface TimelineContentBlock extends TimelineBase
    # kind: "content_block"
    # blockId: string
    # blockType: string
    # blockStatus: string
    export interface TimelineDataEvent extends TimelineBase
    # kind: "data"
    # dataType: string
    # data: Record<string, unknown>
    export interface TimelineCompletion extends TimelineBase
    # kind: "completion"
    # operation: Operation
    # operationId: string
    # status: InitCompletionStatus
    export interface TimelineError extends TimelineBase
    # kind: "error"
    # errorType: string
    # message: string
    # isFatal: boolean
    export interface TimelineEnd extends TimelineBase
    # kind: "end"
    # reason?: string
    export interface TimelineBroker extends TimelineBase
    # kind: "broker"
    # brokerId: string
    export interface TimelineHeartbeat extends TimelineBase
    # kind: "heartbeat"
    export interface TimelineUnknown extends TimelineBase
    # kind: "unknown"
    # originalEvent: string
    # rawData: unknown
    export interface ReservationRecord
    # dbProject: string
    # table: string
    # recordId: string
    # status: ReservationStatus
    # parentRefs: Record<string, string>
    # metadata: Record<string, unknown>
    export interface PendingToolCall
    # callId: string
    # toolName: string
    # arguments: Record<string, unknown>
    # receivedAt: string
    # deadlineAt: string
    # resolved: boolean
    export interface AssembledAgentStartRequest
    # user_input?: string | Array<Record<string, unknown>>
    # variables?: Record<string, unknown>
    # config_overrides?: Record<string, unknown>
    # context?: Record<string, unknown>
    # client_tools?: string[]
    # organization_id?: string
    # workspace_id?: string
    # project_id?: string
    # ... 5 more fields
    export interface AssembledConversationRequest
    # user_input: string | Array<Record<string, unknown>>
    # config_overrides?: Record<string, unknown>
    # context?: Record<string, unknown>
    # client_tools?: string[]
    # organization_id?: string
    # workspace_id?: string
    # project_id?: string
    # task_id?: string
    # ... 2 more fields
    export interface ClientToolResultWire
    # call_id: string
    # tool_name: string
    # output?: unknown
    # is_error?: boolean
    # error_message?: string | null
    export interface ClientToolResult
    # call_id: string
    # tool_name: string
    # output?: unknown
    # is_error?: boolean
    # error_message?: string | null



---
Filepath: features/agents/types/instance.types.ts  [typescript]

  # Types
    export type InstanceStatus = | "draft" // Being configured (manual or pre-autoRun)
    export type InstanceOrigin = | "manual" // User opened the agent runner
    export type SourceFeature = | "agent-builder"
    export type ResourceStatus = | "pending" // Just added, not yet processed
    export type ResourceBlockType = | "text"
    export type ResultDisplayMode = | "modal-full"
  # Interfaces
    export interface ExecutionInstance
    # instanceId: string
    # agentId: string
    # agentType: AgentType
    # origin: InstanceOrigin
    # shortcutId: string | null
    # status: InstanceStatus
    # sourceApp: string
    # sourceFeature: SourceFeature
    # ... 2 more fields
    export interface InstanceModelOverrideState
    # instanceId: string
    # /** Snapshot of agent's LLM settings at instance creation. Never look up agentId again. */
    # baseSettings: Partial<LLMParams>
    # overrides: Partial<LLMParams>
    # removals: string[]; // keys that are explicitly removed
    export interface ResourceOptions
    # keepFresh: boolean
    # editable: boolean
    # convertToText: boolean
    # optionalContext: boolean
    # template?: "full" | "compact" | "minimal"
    export interface ManagedResource
    # resourceId: string
    # blockType: ResourceBlockType
    # /** Raw input: URL string, file data, note IDs, bookmark objects, etc. */
    # source: unknown
    # /** Client-resolved preview for the UI (scraped text, image thumbnail, etc.) */
    # preview: unknown | null
    # /** Current lifecycle status */
    # status: ResourceStatus
    # ... 12 more fields
    export interface InstanceContextEntry
    # key: string
    # value: unknown
    # /** Whether this key matched an agent-defined context slot */
    # slotMatched: boolean
    # /** If slot-matched, the slot's type. Otherwise inferred. */
    # type: ContextObjectType
    # /** Display label (from slot or auto-generated) */
    # label: string
    export interface InstanceUserInputState
    # instanceId: string
    # /** Plain text input from the user */
    # text: string
    # /**
    # contentBlocks: Array<Record<string, unknown>> | null
    export interface BuilderAdvancedSettings
    # debug: boolean
    # store: boolean
    # maxIterations: number
    # maxRetriesPerIteration: number
    # /**
    # useStructuredSystemInstruction: boolean
    # /**
    # structuredInstruction: Partial<SystemInstruction>
    # ... 15 more fields
    export interface InstanceUIState
    # instanceId: string
    # displayMode: ResultDisplayMode
    # allowChat: boolean
    # showVariablePanel: boolean
    # isExpanded: boolean
    # /**
    # expandedVariableId: string | null
    # /**
    # ... 41 more fields



---
Filepath: features/agents/types/mcp.types.ts  [typescript]

  # Types
    export type McpAuthStrategy = Database["public"]["Enums"]["mcp_auth_strategy"]
    export type McpConnectionStatus = Database["public"]["Enums"]["mcp_connection_status"]
    export type McpServerCategory = Database["public"]["Enums"]["mcp_server_category"]
    export type McpServerStatus = Database["public"]["Enums"]["mcp_server_status"]
    export type McpTransport = Database["public"]["Enums"]["mcp_transport"]
  # Interfaces
    export interface McpCatalogEntry
    # serverId: string
    # slug: string
    # name: string
    # vendor: string
    # description: string | null
    # category: McpServerCategory
    # iconUrl: string | null
    # color: string | null
    # ... 17 more fields
    export interface McpServerConfigEntry
    # id: string
    # serverId: string
    # label: string
    # configType: string
    # isDefault: boolean
    # command: string
    # args: string[]
    # envSchema: McpEnvSchemaField[]
    # ... 5 more fields
    export interface McpEnvSchemaField
    # key: string
    # label: string
    # required: boolean
    # secret: boolean
    # helpText?: string
    # placeholder?: string
  # Functions
    export function catalogEntryFromRpc(row: CatalogRpcRow): McpCatalogEntry
    export function serverConfigFromRow(row: ServerConfigRow,): McpServerConfigEntry



---
Filepath: features/agents/utils/scope-mapping.ts  [typescript]

  # Interfaces
    export interface ApplicationScope
    # selection?: string
    # content?: string
    # context?: Record<string, unknown>
    # [key: string]: unknown
    export interface ScopeMappingResult
    # variableValues: Record<string, unknown>
    # contextEntries: InstanceContextEntry[]
  # Functions
    export function mapScopeToInstance(applicationScope: ApplicationScope, scopeMappings: Record<string, string> | null, variableDefinitions: VariableDefinition[], contextSlots: Array<{ key: string; type?: ContextObjectType; label?: string; }>,): ScopeMappingResult



---
Filepath: features/agents/utils/variable-utils.ts  [typescript]

  # Functions
    export const sanitizeVariableName = (input: string): string =>
    export const shouldShowSanitizationPreview = (input: string): boolean =>
    export const isVariableUsedInText = (variableName: string, text: string,): boolean =>



---
Filepath: features/agents/utils/shortcut-context-utils.ts  [typescript]

  # Types
    export type ShortcutContext = keyof typeof SHORTCUT_CONTEXT_META
  # Functions
    export function getShortcutContextMeta(context: ShortcutContext)
    export function isValidShortcutContext(value: string,): value is ShortcutContext



---
Filepath: features/agents/utils/run-ui-utils.ts  [typescript]

  # Types
    export type ResultDisplay = ResultDisplayMode
  # Interfaces
    export interface DisplayModeMeta
    # label: string
    # description: string
    # icon: string
    # color: string
    # useCases: readonly string[]
    # testMode: boolean
    export interface AgentUiRunConfig
    # result_display: ResultDisplay
    # auto_run: boolean
    # allow_chat: boolean
    # show_variables: boolean
    # apply_variables: boolean
    # track_in_runs: boolean
    # use_pre_execution_input: boolean; // Show input modal before execution
  # Functions
    export function parseExecutionConfig(result_display?: string | null, auto_run?: boolean | null, allow_chat?: boolean | null, show_variables?: boolean | null, apply_variables?: boolean | null, track_in_runs?: boolean | null, use_pre_execution_input?: boolean | null,): AgentUiRunConfig
    export function requiresModalUI(display: ResultDisplay): boolean
    export function requiresInlineUI(display: ResultDisplay): boolean
    export function showsResults(display: ResultDisplay): boolean
    export function getAllDisplayTypes(): ResultDisplay[]
    export function getDisplayMeta(display: ResultDisplay)
    export function isTestMode(display: ResultDisplay): boolean
    export const hasVisibleUI = (display: ResultDisplay): boolean =>
    export const isInteractive = (display: ResultDisplay): boolean =>



---
Filepath: features/agents/components/messages/MessageItemButtons.tsx  [typescript/react]

  # Components
    [Component] export function MessageItemButtons({ isEditing, hasVariableSupport, hasFullScreenEditor, variableNames, onVariableSelected, onBeforeVariableSelectorOpen, templateRole, templateCurrentContent, onTemplateContentSelected, templateMessageIndex, onSaveTemplate, onOpenFullScreenEditor, onToggleEditing, onClear, onDelete, onAddBlockType, sheetTitle })
    Props: MessageItemButtonsProps
      # isEditing?: boolean
      # hasVariableSupport?: boolean
      # hasFullScreenEditor?: boolean
      # variableNames?: string[]
      # onVariableSelected?: (name: string) => void
      # onBeforeVariableSelectorOpen?: () => void
      # templateRole?: MessageRole
      # templateCurrentContent?: string
      #   # ... 9 more fields
  # Types & Interfaces
    interface MessageItemButtonsProps



---
Filepath: features/agents/components/messages/AddBlockButton.tsx  [typescript/react]

  # Components
    [Component] export function BlockEditor({ blockType, initialValues })
    Props: BlockEditorProps
      # /** null = adding new; string = type of existing block being edited */
      # blockType: BlockType | null
      # /** Current field values (for edit mode) */
      # initialValues?: Record<string, string>
      # onConfirm: (block: Record<string, unknown>) => void
      # onCancel: () => void
      # onSelectType?: (type: BlockType) => void
      # isEdit?: boolean
    [Component] export function BlockRow({ block, onEdit, onRemove, validVariables = [], }: BlockRowProps)
    Props: BlockRowProps
      # block: Record<string, unknown>
      # onEdit: () => void
      # onRemove: () => void
      # validVariables?: string[]
    [Component] export function AddBlockTrigger({ onSelectType }: AddBlockTriggerProps)
    Props: AddBlockTriggerProps
      # onSelectType: (type: BlockType) => void
    [Component] export function BlockList({ blocks, onUpdateBlock, onRemoveBlock, onAddBlock, pendingAddType, onPendingAddTypeClear, validVariables })
    Props: BlockListProps
      # blocks: Record<string, unknown>[]
      # onUpdateBlock: (index: number, block: Record<string, unknown>) => void
      # onRemoveBlock: (index: number) => void
      # onAddBlock: (block: Record<string, unknown>) => void
      # /** Controlled from the header button — set to a BlockType to open editor */
      # pendingAddType?: BlockType | null
      # onPendingAddTypeClear?: () => void
      # validVariables?: string[]
  # Types & Interfaces
    export type BlockType = | "image"
    interface FieldConfig
    # key: string
    # label: string
    # placeholder: string
    interface BlockTypeConfig
    # type: BlockType
    # label: string
    # icon: React.ReactNode
    # fields: FieldConfig[]
    interface BlockEditorProps
    interface BlockRowProps
    interface AddBlockTriggerProps
    interface BlockListProps



---
Filepath: features/agents/components/messages/MessageItem.tsx  [typescript/react]

  # Components
    [Component] export function MessageItem({ messageIndex, agentId, onOpenFullScreenEditor, scrollContainerRef })
    Props: MessageItemProps
      # messageIndex: number
      # agentId: string
      # onOpenFullScreenEditor?: (messageIndex: number) => void
      # scrollContainerRef?: RefObject<HTMLDivElement>
  # Types & Interfaces
    interface MessageItemProps



---
Filepath: features/agents/components/messages/PromptMessages.tsx  [typescript/react]

  # Components
    [Component] export function PromptMessages({ messages, editingMessageIndex, onEditingMessageIndexChange, variablePopoverOpen, onVariablePopoverOpenChange, onMessageRoleChange, onMessageContentChange, onClearMessage, onDeleteMessage, onInsertVariable, onAddMessage, textareaRefs, cursorPositions, onCursorPositionChange, variableDefaults, onOpenFullScreenEditor, scrollContainerRef, systemMessage, modelConfig })
    Props: PromptMessagesProps
      # messages: PromptMessage[]
      # editingMessageIndex: number | null
      # onEditingMessageIndexChange: (index: number | null) => void
      # variablePopoverOpen: number | null
      # onVariablePopoverOpenChange: (index: number | null) => void
      # onMessageRoleChange: (index: number, role: string) => void
      # onMessageContentChange: (index: number, content: string) => void
      # onClearMessage: (index: number) => void
      #   # ... 11 more fields
  # Types & Interfaces
    interface PromptMessagesProps



---
Filepath: features/agents/components/messages/Messages.tsx  [typescript/react]

  # Components
    [Component] export function Messages({ agentId, onOpenFullScreenEditor, scrollContainerRef, }: MessagesProps)
    Props: MessagesProps
      # agentId: string
      # onOpenFullScreenEditor?: (messageIndex: number) => void
      # scrollContainerRef?: RefObject<HTMLDivElement>
  # Types & Interfaces
    interface MessagesProps



---
Filepath: features/agents/components/messages/not-used/AgentSystemMessage.tsx  [typescript/react]

  # Components
    [Component] export function AgentSystemMessage({ agentId }: AgentSystemMessageProps)
    Props: AgentSystemMessageProps
      # agentId: string
  # Types & Interfaces
    interface AgentSystemMessageProps



---
Filepath: features/agents/components/messages/not-used/AgentMessageItem.tsx  [typescript/react]

  # Components
    [Component] export function AgentMessageItem({ messageIndex, agentId, }: AgentMessageItemProps)
    Props: AgentMessageItemProps
      # /** Index into the full messages array (including system at position 0). */
      # messageIndex: number
      # agentId: string
  # Types & Interfaces
    interface AgentMessageItemProps



---
Filepath: features/agents/components/messages/not-used/AgentMessages.tsx  [typescript/react]

  # Components
    [Component] export function AgentMessages({ agentId }: AgentMessagesProps)
    Props: AgentMessagesProps
      # agentId: string
  # Types & Interfaces
    interface AgentMessagesProps



---
Filepath: features/agents/components/settings-management/AgentSettingsModal.tsx  [typescript/react]

  # Components
    [Component] export function AgentSettingsModal({ agentId }: AgentSettingsModalProps)
    Props: AgentSettingsModalProps
      # agentId: string
  # Types & Interfaces
    interface AgentSettingsModalProps
    interface SettingsSnapshot
    # settings: LLMParams
    # modelId: string | null



---
Filepath: features/agents/components/settings-management/AgentSettingsCore.tsx  [typescript/react]

  # Components
    [Component] export function AgentSettingsCore({ agentId }: AgentSettingsCoreProps)
    Props: AgentSettingsCoreProps
      # agentId: string
  # Types & Interfaces
    interface NumberInputProps
    # value: number
    # onChange: (val: number) => void
    # onSliderChange?: (val: number) => void
    # min?: number
    # max?: number
    # step?: number
    # isInteger?: boolean
    # disabled?: boolean
    # ... 1 more fields
    interface HighlightedJsonProps
    # value: Record<string, unknown>
    # highlightKeys?: Record<string, "error" | "warning" | "info">
    interface UnrecognizedIssue
    # kind: "unrecognized"
    # key: string
    interface InvalidIssue
    # kind: "invalid"
    # key: string
    # value: unknown
    # reason: string
    interface IssueTableProps
    # issues: Issue[]
    # onView: (key: string) => void
    # onRemove: (key: string) => void
    # onFixEnum: (key: string) => void
    interface TabBarProps
    # active: SettingsTab
    # onChange: (tab: SettingsTab) => void
    # issueCount: number
    interface AgentSettingsCoreProps



---
Filepath: features/agents/components/settings-management/not-used/AgentInlineControls.tsx  [typescript/react]

  # Components
    [Component] export function AgentInlineControls({ agentId, availableTools = [], }: AgentInlineControlsProps)
    Props: AgentInlineControlsProps
      # agentId: string
      # availableTools?: DatabaseTool[]
  # Types & Interfaces
    interface AgentInlineControlsProps



---
Filepath: features/agents/components/variables-management/AgentVariablesManager.tsx  [typescript/react]

  # Components
    [Component] export function AgentVariablesManager({ agentId }: AgentVariablesManagerProps)
    Props: AgentVariablesManagerProps
      # agentId: string
  # Types & Interfaces
    interface AgentVariablesManagerProps



---
Filepath: features/agents/components/variables-management/AgentVariablesManager-2.tsx  [typescript/react]

  # Components
    [Component] export function AgentVariablesManager({ agentId }: AgentVariablesManagerProps)
    Props: AgentVariablesManagerProps
      # agentId: string
  # Types & Interfaces
    interface VariableFormState
    # name: string
    # defaultValue: string
    # helpText: string
    # required: boolean
    interface AgentVariablesManagerProps



---
Filepath: features/agents/components/variables-management/AgentVariableEditorModal.tsx  [typescript/react]

  # Components
    [Component] export function AgentVariableEditorModal({ isOpen, onClose, onSave, existingVariable, existingNames, mode })
    Props: AgentVariableEditorModalProps
      # isOpen: boolean
      # onClose: () => void
      # onSave: (variable: VariableDefinition) => void
      # existingVariable?: VariableDefinition
      # existingNames: string[]
      # mode: "add" | "edit"
  # Types & Interfaces
    interface AgentVariableEditorModalProps



---
Filepath: features/agents/components/variables-management/VariableSelector.tsx  [typescript/react]

  # Components
    [Component] export function VariableSelector({ variables, onVariableSelected, onBeforeOpen, }: VariableSelectorProps)
    Props: VariableSelectorProps
      # variables: string[]
      # onVariableSelected: (variable: string) => void
      # onBeforeOpen?: () => void
  # Types & Interfaces
    interface VariableSelectorProps



---
Filepath: features/agents/components/variables-management/AgentVariablesPanel.tsx  [typescript/react]

  # Components
    [Component] export function AgentVariablesPanel({ agentId }: AgentVariablesPanelProps)
    Props: AgentVariablesPanelProps
      # agentId: string
  # Types & Interfaces
    interface AgentVariablesPanelProps



---
Filepath: features/agents/components/variables-management/AgentVariableEditor.tsx  [typescript/react]

  # Components
    [Component] export default function AgentVariableEditor({ name, defaultValue, customComponent, required, helpText, existingNames, originalName, onNameChange, onDefaultValueChange, onCustomComponentChange, onRequiredChange, onHelpTextChange, readonly })
    Props: AgentVariableEditorProps
      # name: string
      # defaultValue: string
      # customComponent?: VariableCustomComponent
      # required?: boolean
      # helpText?: string
      # existingNames?: string[]
      # originalName?: string
      # onNameChange?: (name: string) => void
      #   # ... 7 more fields
  # Types & Interfaces
    interface AgentVariableEditorProps



---
Filepath: features/agents/components/variables-management/HighlightedText.tsx  [typescript/react]

  # Components
    [Component] export const HighlightedText = ({ text, validVariables = [] }: HighlightedTextProps) =>
    Props: HighlightedTextProps
      # text: string
      # validVariables?: string[]
  # Types & Interfaces
    interface HighlightedTextProps



---
Filepath: features/agents/components/variables-management/AgentVariablesModal.tsx  [typescript/react]

  # Components
    [Component] export function AgentVariablesModal({ agentId }: AgentVariablesModalProps)
    Props: AgentVariablesModalProps
      # agentId: string
  # Types & Interfaces
    interface AgentVariablesModalProps



---
Filepath: features/agents/components/overlays/AgentExecutionOverlay.tsx  [typescript/react]

  # Components
    [Component] export function AgentExecutionOverlay({ instanceId, index = 0, onClose, }: AgentExecutionOverlayProps)
    Props: AgentExecutionOverlayProps
      # instanceId: string
      # index?: number
      # onClose: () => void
  # Types & Interfaces
    interface AgentExecutionOverlayProps



---
Filepath: features/agents/components/smart/SmartAgentVariableInputs.tsx  [typescript/react]

  # Components
    [Component] export function SmartAgentVariableInputs({ instanceId, compact, onSubmit, submitOnEnter })
    Props: SmartAgentVariableInputsProps
      # instanceId: string
      # /** Pass through to VariableInputComponent for compact display */
      # compact?: boolean
      # /** Called when Enter is pressed on the last variable, or always on Enter if submitOnEnter */
      # onSubmit?: () => void
      # submitOnEnter?: boolean
  # Types & Interfaces
    interface SmartAgentVariableInputsProps



---
Filepath: features/agents/components/smart/SmartAgentResourcePickerButton.tsx  [typescript/react]

  # Components
    [Component] export function SmartAgentResourcePickerButton({ instanceId, uploadBucket, uploadPath })
    Props: SmartAgentResourcePickerButtonProps
      # instanceId: string
      # uploadBucket?: string
      # uploadPath?: string
  # Types & Interfaces
    interface SmartAgentResourcePickerButtonProps



---
Filepath: features/agents/components/smart/SmartAgentInput.tsx  [typescript/react]

  # Components
    [Component] export default function SmartAgentInput({ instanceId, placeholder, sendButtonVariant, showSubmitOnEnterToggle, showAutoClearToggle, uploadBucket, uploadPath, enablePasteImages, compact, onNewInstance })
    Props: SmartAgentInputProps
      # instanceId: string | null | undefined
      # placeholder?: string
      # /** Blue = primary accent send button */
      # sendButtonVariant?: "default" | "blue"
      # showSubmitOnEnterToggle?: boolean
      # showAutoClearToggle?: boolean
      # uploadBucket?: string
      # uploadPath?: string
      #   # ... 7 more fields
  # Types & Interfaces
    interface SmartAgentInputProps



---
Filepath: features/agents/components/smart/SmartAgentResourceChips.tsx  [typescript/react]

  # Components
    [Component] export function SmartAgentResourceChips({ instanceId, }: SmartAgentResourceChipsProps)
    Props: SmartAgentResourceChipsProps
      # instanceId: string
  # Types & Interfaces
    interface ResourceChipProps
    # resource: ManagedResource
    # onRemove: () => void
    interface SmartAgentResourceChipsProps



---
Filepath: features/agents/components/smart/index.ts  [typescript]




---
Filepath: features/agents/components/agent-listings/AgentCard.tsx  [typescript/react]

  # Components
    [Component] export function AgentCard({ id, onDelete, onDuplicate, onNavigate, isDeleting, isDuplicating, isNavigating, isAnyNavigating })
    Props: AgentCardProps
      # id: string
      # onDelete?: (id: string, name: string) => void
      # onDuplicate?: (id: string) => void
      # onNavigate?: (id: string, path: string) => void
      # isDeleting?: boolean
      # isDuplicating?: boolean
      # isNavigating?: boolean
      # isAnyNavigating?: boolean
  # Types & Interfaces
    interface AgentCardProps



---
Filepath: features/agents/components/agent-listings/AgentListDropdown.tsx  [typescript/react]

  # Components
    [Component] export function AgentListDropdown({ onSelect, navigateTo, className, label = "Agents", }: AgentListDropdownProps)
    Props: AgentListDropdownProps
      # onSelect?: (agentId: string) => void
      # navigateTo?: string
      # className?: string
      # label?: string
  # Types & Interfaces
    interface AgentListDropdownProps
    interface ListPanelProps
    # agents: AgentDefinitionRecord[]
    # isLoading: boolean
    # consumer: ReturnType<typeof useAgentConsumer>
    # activeAgentId: string | null
    # allCategories: string[]
    # allTags: string[]
    # inputRef: React.RefObject<HTMLInputElement | null>
    # onSelectAgent: (a: AgentDefinitionRecord) => void
    # ... 9 more fields



---
Filepath: features/agents/components/agent-listings/ComingSoonModal.tsx  [typescript/react]

  # Components
    [Component] export function ComingSoonModal({ isOpen, onClose, featureName, }: ComingSoonModalProps)
    Props: ComingSoonModalProps
      # isOpen: boolean
      # onClose: () => void
      # featureName: string
  # Types & Interfaces
    interface ComingSoonModalProps



---
Filepath: features/agents/components/agent-listings/AgentActionModal.tsx  [typescript/react]

  # Components
    [Component] export function AgentActionModal({ isOpen, onClose, agentName, agentDescription, onRun, onEdit, onView, onDuplicate, onShare, onDelete, onCreateApp, showView, showDuplicate, showShare, showDelete, showCreateApp, isDeleting, isDuplicating })
    Props: AgentActionModalProps
      # isOpen: boolean
      # onClose: () => void
      # agentId?: string
      # agentName: string
      # agentDescription?: string
      # onRun: () => void
      # onEdit: () => void
      # onView?: () => void
      #   # ... 11 more fields
  # Types & Interfaces
    interface PrimaryActionButtonProps
    # icon: LucideIcon
    # title: string
    # onClick: (e: React.MouseEvent) => void
    # disabled?: boolean
    # gradientFrom: string
    # gradientTo: string
    # iconBgColor: string
    # iconTextColor: string
    interface AgentActionModalProps



---
Filepath: features/agents/components/agent-listings/FavoriteAgentButton.tsx  [typescript/react]

  # Components
    [Component] export function FavoriteAgentButton({ id, variant = "card", disabled, }: FavoriteAgentButtonProps)
    Props: FavoriteAgentButtonProps
      # id: string
      # /** "card" = absolute-positioned corner star, "list" = inline icon button */
      # variant?: "card" | "list"
      # disabled?: boolean
  # Types & Interfaces
    interface FavoriteAgentButtonProps



---
Filepath: features/agents/components/agent-listings/AgentListItem.tsx  [typescript/react]

  # Components
    [Component] export function AgentListItem({ id, onDelete, onDuplicate, onNavigate, isDeleting, isDuplicating, isNavigating, isAnyNavigating })
    Props: AgentListItemProps
      # id: string
      # onDelete?: (id: string, name: string) => void
      # onDuplicate?: (id: string) => void
      # onNavigate?: (id: string, path: string) => void
      # isDeleting?: boolean
      # isDuplicating?: boolean
      # isNavigating?: boolean
      # isAnyNavigating?: boolean
  # Types & Interfaces
    interface AgentListItemProps



---
Filepath: features/agents/components/agent-listings/AgentsGrid.tsx  [typescript/react]

  # Components
    [Component] export function AgentsGrid()



---
Filepath: features/agents/components/shared/AgentPageContext.tsx  [typescript/react]

  # Components
    [Component] export function AgentPageProvider({ agentId, agentName, availableTools, children, }: AgentPageProviderProps)
    Props: AgentPageProviderProps
      # agentId: string
      # agentName: string
      # availableTools: DatabaseTool[]
      # children: React.ReactNode
  # Hooks
    [Hook] export function useAgentPageContext(): AgentPageContextValue
  # Types & Interfaces
    export type AgentPageMode = "edit" | "run"
    interface AgentPageContextValue
    # agentId: string
    # agentName: string
    # availableTools: DatabaseTool[]
    # basePath: string
    # mode: AgentPageMode
    interface AgentPageProviderProps



---
Filepath: features/agents/components/shared/AgentBuilderWrapper.tsx  [typescript/react]

  # Components
    [Component] export function AgentBuilderWrapper()



---
Filepath: features/agents/components/shared/AgentOptionsMenu.tsx  [typescript/react]

  # Components
    [Component] export function AgentOptionsMenu()
  # Types & Interfaces
    interface MenuItem
    # label: string
    # icon: React.ComponentType<{ className?: string }>



---
Filepath: features/agents/components/shared/AgentRunWrapper.tsx  [typescript/react]

  # Components
    [Component] export function AgentRunWrapper()



---
Filepath: features/agents/components/shared/AgentSaveStatus.tsx  [typescript/react]

  # Components
    [Component] export function AgentSaveStatus()



---
Filepath: features/agents/components/shared/AgentSharedHeader.tsx  [typescript/react]

  # Components
    [Component] export function AgentSharedHeader()



---
Filepath: features/agents/components/undo-history/UndoHistoryOverlay.tsx  [typescript/react]

  # Components
    [Component] export function UndoHistoryOverlay({ isOpen, onClose, agentId, }: UndoHistoryOverlayProps)
    Props: UndoHistoryOverlayProps
      # isOpen: boolean
      # onClose: () => void
      # agentId: string
  # Types & Interfaces
    interface UndoHistoryOverlayProps



---
Filepath: features/agents/components/TO-BE-ORGANIZED/NewAgentModal.tsx  [typescript/react]

  # Components
    [Component] export function NewAgentModal({ isOpen, onClose }: NewAgentModalProps)
    Props: NewAgentModalProps
      # isOpen: boolean
      # onClose: () => void
  # Types & Interfaces
    interface NewAgentModalProps



---
Filepath: features/agents/components/tools-management/AgentToolsModal.tsx  [typescript/react]

  # Components
    [Component] export function AgentToolsModal({ agentId, availableTools = [], }: AgentToolsModalProps)
    Props: AgentToolsModalProps
      # agentId: string
      # availableTools?: DatabaseTool[]
  # Types & Interfaces
    interface AgentToolsModalProps



---
Filepath: features/agents/components/tools-management/AgentToolsManager.tsx  [typescript/react]

  # Components
    [Component] export function AgentToolsManager({ agentId, availableTools = [], }: AgentToolsManagerProps)
    Props: AgentToolsManagerProps
      # agentId: string
      # availableTools?: DatabaseTool[]
  # Types & Interfaces
    interface AgentToolsManagerProps



---
Filepath: features/agents/components/system-instructions/SystemMessageButtons.tsx  [typescript/react]

  # Components
    [Component] export function SystemMessageButtons({ isEditing, hasVariableSupport, hasFullScreenEditor, variableNames, onVariableSelected, onBeforeVariableSelectorOpen, templateCurrentContent, onTemplateContentSelected, onSaveTemplate, onOptimize, onOpenFullScreenEditor, onToggleEditing, onClear, onAddBlockType })
    Props: SystemMessageButtonsProps
      # isEditing?: boolean
      # hasVariableSupport?: boolean
      # hasFullScreenEditor?: boolean
      # variableNames?: string[]
      # onVariableSelected?: (name: string) => void
      # onBeforeVariableSelectorOpen?: () => void
      # /** Current system text — browse/save templates. */
      # templateCurrentContent?: string
      #   # ... 7 more fields
  # Types & Interfaces
    interface SystemMessageButtonsProps



---
Filepath: features/agents/components/system-instructions/SystemInstructionModal.tsx  [typescript/react]

  # Components
    [Component] export function SystemInstructionModal({ instanceId, open, onOpenChange, }: SystemInstructionModalProps)
    Props: SystemInstructionModalProps
      # instanceId: string
      # open: boolean
      # onOpenChange: (open: boolean) => void
  # Types & Interfaces
    interface SystemInstructionModalProps



---
Filepath: features/agents/components/system-instructions/SystemInstructionEditor.tsx  [typescript/react]

  # Components
    [Component] export function SystemInstructionEditor({ instanceId, }: SystemInstructionEditorProps)
    Props: SystemInstructionEditorProps
      # instanceId: string
  # Types & Interfaces
    interface SystemInstructionEditorProps



---
Filepath: features/agents/components/system-instructions/SystemMessage.tsx  [typescript/react]

  # Components
    [Component] export function SystemMessage({ agentId, onOpenFullScreenEditor, scrollContainerRef, }: SystemMessageProps)
    Props: SystemMessageProps
      # agentId: string
      # onOpenFullScreenEditor?: () => void
      # scrollContainerRef?: RefObject<HTMLDivElement>
  # Types & Interfaces
    interface SystemMessageProps



---
Filepath: features/agents/components/context-slots-management/AgentContextSlotsManager.tsx  [typescript/react]

  # Components
    [Component] export function AgentContextSlotsManager({ agentId, }: AgentContextSlotsManagerProps)
    Props: AgentContextSlotsManagerProps
      # agentId: string
  # Types & Interfaces
    interface SlotFormState
    # key: string
    # label: string
    # description: string
    # type: ContextObjectType
    interface SlotEditorFieldsProps
    # form: SlotFormState
    # onChange: (patch: Partial<SlotFormState>) => void
    # isEdit: boolean
    # keyDuplicate: boolean
    # /** False when key is non-empty but fails validation */
    # keyRulesOk: boolean
    interface AgentContextSlotsManagerProps



---
Filepath: features/agents/components/run/AgentRunInput.tsx  [typescript/react]

  # Components
    [Component] export function AgentRunInput({ instanceId }: AgentRunInputProps)
    Props: AgentRunInputProps
      # instanceId: string
  # Types & Interfaces
    interface AgentRunInputProps



---
Filepath: features/agents/components/run/AgentConversationDisplay.tsx  [typescript/react]

  # Components
    [Component] export function AgentConversationDisplay({ instanceId, compact, emptyStateMessage })
    Props: AgentConversationDisplayProps
      # instanceId: string
      # compact?: boolean
      # emptyStateMessage?: string
  # Types & Interfaces
    interface AgentConversationDisplayProps



---
Filepath: features/agents/components/run/AgentPlanningIndicator.tsx  [typescript/react]

  # Components
    [Component] export function AgentPlanningIndicator({ compact = false, }: AgentPlanningIndicatorProps)
    Props: AgentPlanningIndicatorProps
      # compact?: boolean
  # Types & Interfaces
    interface AgentPlanningIndicatorProps



---
Filepath: features/agents/components/run/AgentVariableInputForm.tsx  [typescript/react]

  # Components
    [Component] export function AgentVariableInputForm({ instanceId, }: AgentVariableInputFormProps)
    Props: AgentVariableInputFormProps
      # instanceId: string
  # Types & Interfaces
    interface AgentVariableInputFormProps



---
Filepath: features/agents/components/run/AgentStatusIndicator.tsx  [typescript/react]

  # Components
    [Component] export function AgentStatusIndicator({ message, compact = false, }: AgentStatusIndicatorProps)
    Props: AgentStatusIndicatorProps
      # message: string | null
      # compact?: boolean
  # Types & Interfaces
    interface AgentStatusIndicatorProps



---
Filepath: features/agents/components/run/AgentStreamingMessage.tsx  [typescript/react]

  # Components
    [Component] export function AgentStreamingMessage({ instanceId, messageIndex, compact, }: AgentStreamingMessageProps)
    Props: AgentStreamingMessageProps
      # instanceId: string
      # messageIndex: number
      # compact?: boolean
  # Types & Interfaces
    interface AgentStreamingMessageProps



---
Filepath: features/agents/components/run/AgentRunPage.tsx  [typescript/react]

  # Components
    [Component] export function AgentRunPage({ agentId, agentName }: AgentRunPageProps)
    Props: AgentRunPageProps
      # agentId: string
      # agentName: string
  # Types & Interfaces
    interface AgentRunPageProps



---
Filepath: features/agents/components/run/AgentUserMessage.tsx  [typescript/react]

  # Components
    [Component] export function AgentUserMessage({ content, contentBlocks, messageIndex, compact })
    Props: AgentUserMessageProps
      # content: string
      # contentBlocks?: Array<Record<string, unknown>>
      # messageIndex: number
      # compact?: boolean
  # Types & Interfaces
    interface ContentBlock
    # type: string
    # [key: string]: unknown
    interface AgentUserMessageProps
    interface NormalisedBlock
    # key: string
    # blockType: string
    # icon: React.ComponentType<{ className?: string }>
    # iconColor: string
    # chipBg: string
    # chipBorder: string
    # label: string
    # title: string
    # ... 1 more fields
    interface BlockModalProps
    # block: NormalisedBlock
    # onClose: () => void



---
Filepath: features/agents/components/run/AgentRunsSidebar.tsx  [typescript/react]

  # Components
    [Component] export function AgentRunsSidebar({ agentId, agentName, currentRunId, onNewRun, onClose, }: AgentRunsSidebarProps)
    Props: AgentRunsSidebarProps
      # agentId: string
      # agentName: string
      # currentRunId?: string
      # onNewRun: () => void
      # onClose: () => void
  # Types & Interfaces
    interface AgentRun
    interface AgentRunsSidebarProps



---
Filepath: features/agents/components/builder/AgentBuilderMobile.tsx  [typescript/react]

  # Components
    [Component] export function AgentBuilderMobile({ agentId, availableTools = [], }: AgentBuilderMobileProps)
    Props: AgentBuilderMobileProps
      # agentId: string
      # availableTools?: DatabaseTool[]
  # Types & Interfaces
    interface AgentBuilderMobileProps



---
Filepath: features/agents/components/builder/AgentBuilder.tsx  [typescript/react]

  # Components
    [Component] export function AgentBuilder({ agentId, availableTools = [], }: AgentBuilderProps)
    Props: AgentBuilderProps
      # agentId: string
      # availableTools?: DatabaseTool[]
  # Types & Interfaces
    interface AgentBuilderProps



---
Filepath: features/agents/components/builder/AgentBuilderLeftPanel.tsx  [typescript/react]

  # Components
    [Component] export function AgentBuilderLeftPanel({ agentId, availableTools = [], }: AgentBuilderLeftPanelProps)
    Props: AgentBuilderLeftPanelProps
      # agentId: string
      # availableTools?: DatabaseTool[]
  # Types & Interfaces
    interface AgentBuilderLeftPanelProps



---
Filepath: features/agents/components/builder/MessageContentItemRenderer.tsx  [typescript/react]

  # Components
    [Component] export function MessageContentItemRenderer({ block, hideText = false, onRemove, }: MessageContentItemRendererProps)
    Props: MessageContentItemRendererProps
      # /** Raw block object — may have .text or .content for text blocks (legacy DB). */
      # block: Record<string, unknown>
      # /** When true, skip rendering TextBlocks (caller handles via textarea). */
      # hideText?: boolean
      # /** Called to remove this block from the message. */
      # onRemove?: () => void
  # Types & Interfaces
    interface MessageContentItemRendererProps
    interface BlockPillProps
    # icon: React.ReactNode
    # label: string
    # detail?: string
    # badge?: string
    # href?: string
    # variant?: "default" | "secondary"
    # onRemove?: () => void



---
Filepath: features/agents/components/builder/AgentBuilderDesktop.tsx  [typescript/react]

  # Components
    [Component] export function AgentBuilderDesktop({ agentId, availableTools = [], }: AgentBuilderDesktopProps)
    Props: AgentBuilderDesktopProps
      # agentId: string
      # availableTools?: DatabaseTool[]
  # Types & Interfaces
    interface AgentBuilderDesktopProps



---
Filepath: features/agents/components/builder/AgentBuilderRightPanel.tsx  [typescript/react]

  # Components
    [Component] export function AgentBuilderRightPanel({ agentId, }: AgentBuilderRightPanelProps)
    Props: AgentBuilderRightPanelProps
      # agentId: string
  # Types & Interfaces
    interface AgentBuilderRightPanelProps



---
Filepath: features/agents/components/builder/AgentModelConfiguration.tsx  [typescript/react]

  # Components
    [Component] export function AgentModelConfiguration({ agentId, availableTools = [], }: AgentModelConfigurationProps)
    Props: AgentModelConfigurationProps
      # agentId: string
      # availableTools?: DatabaseTool[]
  # Types & Interfaces
    interface AgentModelConfigurationProps



---
Filepath: features/agents/components/debug/StreamDebugFloating.tsx  [typescript/react]

  # Components
    [Component] export default function StreamDebugFloating({ instanceId, onClose, defaultPosition, y })
    Props: StreamDebugFloatingProps
      # instanceId: string
      # onClose: () => void
      # defaultPosition?: { x: number; y: number }
  # Types & Interfaces
    export interface StreamDebugFloatingProps



---
Filepath: features/agents/components/debug/StreamDebugPanel.tsx  [typescript/react]

  # Components
    [Component] export function StreamDebugPanel({ instanceId, className, hideChrome, requestIdOverride })
    Props: StreamDebugPanelProps
      # instanceId: string
      # className?: string
      # /**
      # hideChrome?: boolean
      # /**
      # requestIdOverride?: string
  # Types & Interfaces
    export interface StreamDebugPanelProps



---
Filepath: features/agents/components/debug/StreamDebugOverlay.tsx  [typescript/react]

  # Components
    [Component] export function StreamDebugOverlay({ instanceId, isOpen, onClose, }: StreamDebugOverlayProps)
    Props: StreamDebugOverlayProps
      # instanceId: string
      # isOpen: boolean
      # onClose: () => void
  # Types & Interfaces
    export interface StreamDebugOverlayProps



---
Filepath: features/agents/components/debug/index.ts  [typescript]




---
Filepath: features/agents/components/run-controls/AgentExecutionTestModal.tsx  [typescript/react]

  # Components
    [Component] export function AgentExecutionTestModal({ isOpen, onClose, testType, agentId, variables, userInput, useChat })
    Props: AgentExecutionTestModalProps
      # isOpen: boolean
      # onClose: () => void
      # testType: "direct" | "inline" | "background"
      # agentId: string
      # sourceInstanceId: string
      # autoRun: boolean
      # allowChat: boolean
      # showVariables: boolean
      #   # ... 4 more fields
  # Types & Interfaces
    interface AgentExecutionTestModalProps
    interface BackgroundTask
    # instanceId: string
    # startedAt: string
    # status: "running" | "complete" | "error"
    # preview?: string



---
Filepath: features/agents/components/run-controls/CreatorRunPanel.tsx  [typescript/react]

  # Components
    [Component] export function CreatorRunPanel({ instanceId, onNewInstance, tabs: allowedTabs, }: CreatorRunPanelProps)
    Props: CreatorRunPanelProps
      # instanceId: string
      # onNewInstance?: (newId: string) => void
      # /** Restrict which tabs are visible. Defaults to all tabs when omitted. */
      # tabs?: TabId[]
  # Types & Interfaces
    interface CreatorRunPanelProps



---
Filepath: features/agents/components/run-controls/RunSettingsEditor.tsx  [typescript/react]

  # Components
    [Component] export function RunSettingsEditor({ instanceId }: RunSettingsEditorProps)
    Props: RunSettingsEditorProps
      # instanceId: string
  # Types & Interfaces
    interface RunSettingsEditorProps



---
Filepath: features/agents/components/run-controls/AgentLauncherSidebarTester.tsx  [typescript/react]

  # Components
    [Component] export function AgentLauncherSidebarTester({ instanceId, }: AgentLauncherSidebarTesterProps)
    Props: AgentLauncherSidebarTesterProps
      # instanceId: string
  # Types & Interfaces
    interface AgentLauncherSidebarTesterProps



---
Filepath: features/agents/components/run-controls/RunSettingsModal.tsx  [typescript/react]

  # Components
    [Component] export function RunSettingsModal({ instanceId }: RunSettingsModalProps)
    Props: RunSettingsModalProps
      # instanceId: string
  # Types & Interfaces
    interface RunSettingsModalProps



---
Filepath: features/agents/hooks/useAgentsBasePath.ts  [typescript]

  # Functions
    export function useAgentsBasePath(): string



---
Filepath: features/agents/hooks/useAgentAutoSave.ts  [typescript]

  # Functions
    export function useAgentAutoSave(agentId: string)



---
Filepath: features/agents/hooks/useModelControls.ts  [typescript]

  # Interfaces
    export interface ControlDefinition
    # type:
    # | "number"
    # | "integer"
    # | "boolean"
    # | "string"
    # | "enum"
    # | "array"
    # | "string_array"
    # ... 6 more fields
    export interface NormalizedControls
    # temperature?: ControlDefinition
    # max_tokens?: ControlDefinition; // Legacy alias — remapped to max_output_tokens at parse time
    # max_output_tokens?: ControlDefinition
    # top_p?: ControlDefinition
    # top_k?: ControlDefinition
    # tool_choice?: ControlDefinition
    # parallel_tool_calls?: ControlDefinition
    # reasoning_effort?: ControlDefinition
    # ... 42 more fields
  # Functions
    export function useModelControls(models: any[], selectedModelId: string)
    export function getModelDefaults(model: any)



---
Filepath: features/agents/hooks/useAgentConsumer.ts  [typescript]

  # Interfaces
    export interface UseAgentConsumerReturn
    # tab: AgentTab
    # sortBy: AgentSortOption
    # searchTerm: string
    # includedCats: string[]
    # includedTags: string[]
    # favFilter: AgentFavFilter
    # archFilter: AgentArchFilter
    # accessFilter: AgentAccessFilter
    # ... 22 more fields
  # Functions
    export function useAgentConsumer(consumerId: string, options?: { /** * If true, the consumer slot is deleted from Redux on component unmount. * Default: false — persistent consumers (like the main agents page)



---
Filepath: features/agents/hooks/useAgentUndoRedo.ts  [typescript]

  # Types
    export type Platform = | "mac"
  # Functions
    export function getPlatform(): Platform
    export function isMacLike(): boolean
    export function isTouchDevice(): boolean
    export function getUndoShortcutHint(): string
    export function getRedoShortcutHint(): string
    export function useAgentUndoRedo({ agentId, enabled = true, }: UseAgentUndoRedoOptions): UseAgentUndoRedoReturn



---
Filepath: features/agents/hooks/useAgentLauncher.ts  [typescript]

  # Interfaces
    export interface LaunchAgentOverrides
    # displayMode?: ResultDisplayMode
    # autoRun?: boolean
    # allowChat?: boolean
    # showVariables?: boolean
    # usePreExecutionInput?: boolean
    # autoClearConversation?: boolean
    # conversationMode?: "agent" | "conversation" | "chat"
    # userInput?: string
    # ... 10 more fields
    export interface UseAgentLauncherReturn
    # launchAgent: (
    # agentId: string
    # options?: LaunchAgentOverrides
    # ) => Promise<LaunchResult>
    # launchShortcut: (
    # shortcutId: string
    # applicationScope: ApplicationScope
    # options?: Partial<LaunchAgentOverrides>
    # ... 3 more fields
  # Functions
    export function useAgentLauncher(): UseAgentLauncherReturn
    export async function launchAgentImperative(dispatch: ReturnType<typeof useAppDispatch>, options: LaunchAgentOptions,): Promise<LaunchResult>



---
Submodule: features/agents/redux/  [51 files — full detail in features/agents/redux/MODULE_README.md]

---
Filepath: features/agents/services/mcp.service.ts  [typescript]

  # Interfaces
    export interface UpsertConnectionParams
    # serverId: string
    # accessToken?: string
    # refreshToken?: string
    # tokenExpiresAt?: string
    # credentialsJson?: string
    # configId?: string
    # transport?: McpTransport
    # oauthTokenEndpoint?: string
    # ... 3 more fields
  # Functions
    export async function fetchMcpCatalog(): Promise<McpCatalogEntry[]>
    export async function connectMcpServer(params: UpsertConnectionParams,): Promise<string>
    export async function disconnectMcpServer(serverId: string): Promise<void>
    export async function fetchMcpServerConfigs(serverId: string,): Promise<McpServerConfigEntry[]>



---
Filepath: features/agents/services/mcp-oauth/discovery.ts  [typescript]

  # Interfaces
    export interface ProtectedResourceMetadata
    # resource: string
    # authorization_servers?: string[]
    # scopes_supported?: string[]
    # bearer_methods_supported?: string[]
    export interface AuthServerMetadata
    # issuer: string
    # authorization_endpoint: string
    # token_endpoint: string
    # registration_endpoint?: string
    # scopes_supported?: string[]
    # response_types_supported?: string[]
    # code_challenge_methods_supported?: string[]
    # grant_types_supported?: string[]
    export interface DiscoveryResult
    # protectedResource: ProtectedResourceMetadata
    # authServer: AuthServerMetadata
    export interface DynamicClientRegistrationResult
    # client_id: string
    # client_secret?: string
    # client_id_issued_at?: number
    # client_secret_expires_at?: number
  # Functions
    export async function fetchProtectedResourceMetadata(mcpServerUrl: string,): Promise<ProtectedResourceMetadata | null>
    export async function fetchAuthServerMetadata(authServerUrl: string,): Promise<AuthServerMetadata | null>
    export async function discoverOAuthEndpoints(mcpServerUrl: string,): Promise<DiscoveryResult>
    export async function registerDynamicClient(registrationEndpoint: string, params: { redirectUri: string; clientName?: string; grantTypes?: string[]; responseTypes?: string[]; scope?: string; },): Promise<DynamicClientRegistrationResult>



---
Filepath: features/agents/services/mcp-oauth/pkce.ts  [typescript]

  # Functions
    export function generateCodeVerifier(length = 64): string
    export async function generateCodeChallenge(verifier: string): Promise<string>
    export function generateState(): string
```
<!-- /AUTO:signatures -->

<!-- AUTO:config -->
## Generation Config

> Auto-managed. Contains the exact parameters used to generate this README.
> Used by parent modules to auto-refresh this file when it is stale.
> Do not edit manually — changes will be overwritten on the next run.

```json
{
  "subdirectory": "features/agents",
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
