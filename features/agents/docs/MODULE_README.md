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
| Last generated | 2026-04-01 13:25 |
| Output file | `features/agents/MODULE_README.md` |
| Signature mode | `signatures` |

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

> Auto-generated. 114 files across 30 directories.

```
features/agents/
├── MODULE_README.md
├── components/
│   ├── builder/
│   │   ├── AgentBuilder.tsx
│   │   ├── AgentBuilderDesktop.tsx
│   │   ├── AgentBuilderLeftPanel.tsx
│   │   ├── AgentBuilderMobile.tsx
│   │   ├── AgentBuilderRightPanel.tsx
│   │   ├── AgentBuilderTopBar.tsx
│   │   ├── AgentContextSlotsManager.tsx
│   │   ├── AgentModelConfiguration.tsx
│   │   ├── AgentToolsManager.tsx
│   │   ├── AgentVariablesManager.tsx
│   │   ├── MessageContentItemRenderer.tsx
│   ├── layouts/
│   │   ├── AgentActionModal.tsx
│   │   ├── AgentCard.tsx
│   │   ├── AgentListItem.tsx
│   │   ├── AgentsGrid.tsx
│   │   ├── FavoriteAgentButton.tsx
│   │   ├── NewAgentModal.tsx
│   ├── messages/
│   │   ├── AddBlockButton.tsx
│   │   ├── MessageItem.tsx
│   │   ├── MessageItemButtons.tsx
│   │   ├── Messages.tsx
│   │   ├── PromptMessages.tsx
│   │   ├── SystemMessage.tsx
│   │   ├── SystemMessageButtons.tsx
│   │   ├── not-used/
│   │   │   ├── AgentMessageItem.tsx
│   │   │   ├── AgentMessages.tsx
│   │   │   ├── AgentSystemMessage.tsx
│   ├── run/
│   │   ├── AgentConversationDisplay.tsx
│   │   ├── AgentPlanningIndicator.tsx
│   │   ├── AgentRequestStats.tsx
│   │   ├── AgentRunInput.tsx
│   │   ├── AgentRunPage.tsx
│   │   ├── AgentRunsSidebar.tsx
│   │   ├── AgentStreamingMessage.tsx
│   │   ├── AgentVariableInputForm.tsx
│   ├── settings/
│   │   ├── AgentSettingsCore.tsx
│   │   ├── AgentSettingsModal.tsx
│   │   ├── AgentToolsModal.tsx
│   │   ├── AgentVariablesModal.tsx
│   │   ├── not-used/
│   │   │   ├── AgentInlineControls.tsx
│   ├── shared/
│   │   ├── HighlightedText.tsx
│   │   ├── VariableSelector.tsx
│   ├── smart/
│   │   ├── SmartAgentInput.tsx
│   │   ├── SmartAgentResourceChips.tsx
│   │   ├── SmartAgentResourcePickerButton.tsx
│   │   ├── SmartAgentVariableInputs.tsx
│   │   ├── index.ts
│   ├── variables/
│   │   ├── AgentVariableEditor.tsx
│   │   ├── AgentVariableEditorModal.tsx
│   │   ├── AgentVariablesManager.tsx
├── hooks/
│   ├── useAgentAutoSave.ts
│   ├── useAgentConsumer.ts
│   ├── useModelControls.ts
├── redux/
│   ├── agent-consumers/
│   │   ├── selectors.ts
│   │   ├── slice.ts
│   ├── agent-definition/
│   │   ├── converters.ts
│   │   ├── selectors.ts
│   │   ├── slice.ts
│   │   ├── thunks.ts
│   │   ├── types.ts
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
│   │   │   ├── instance-model-overrides.selectors.ts
│   │   ├── thunks/
│   │   │   ├── create-instance.thunk.ts
│   │   │   ├── execute-instance.thunk.ts
│   │   ├── utils/
│   │   │   ├── ids.ts
│   │   │   ├── index.ts
│   │   │   ├── source-slice-helpers.ts
├── types/
│   ├── agent-api-types.ts
│   ├── agent-message-types.ts
│   ├── common.types.ts
│   ├── index.ts
│   ├── instance.types.ts
│   ├── json-schema.ts
│   ├── message-types.ts
│   ├── request.types.ts
├── utils/
│   ├── run-ui-utils.ts
│   ├── shortcut-context-utils.ts
│   ├── variable-utils.ts
# excluded: 4 .md, 1 .txt
```
<!-- /AUTO:tree -->

<!-- AUTO:signatures -->
## API Signatures

> Auto-generated via `output_mode="signatures"`. ~5-10% token cost vs full source.
> For full source, open the individual files directly.

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
    export type ContextObjectType = | "text"
    export type ContextValue = | string
    export type CtxGetResult = | CtxGetFullResult
    export type StreamEvent = | MessageEvent
  # Interfaces
    export interface LLMParams
    # /** Model UUID. When present, overrides the agent's stored modelId. */
    # model?: string
    # /** Max tokens the model will generate. */
    # max_output_tokens?: number
    # /** Randomness: 0 = deterministic, 2 = maximum. Provider ranges vary. */
    # temperature?: number
    # /** Nucleus sampling: top probability mass to consider. */
    # top_p?: number
    # ... 79 more fields
    export interface IdeFileState
    # path: string
    # content: string
    # language: string
    export interface IdeDiagnostic
    # message: string
    # severity: string; // "error" | "warning" | "information" | "hint"
    # range: Record<string, unknown>
    # source?: string
    export interface IdeGitState
    # branch: string
    # status: string
    export interface IdeWorkspaceState
    # name: string
    # folders: string[]
    export interface IdeState
    # active_file?: IdeFileState
    # selected_text?: string
    # diagnostics?: IdeDiagnostic[]
    # workspace?: IdeWorkspaceState
    # git?: IdeGitState
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
    export interface MessageEvent
    # event: "message"
    # data: { content: string }
    export interface ChunkEvent
    # event: "chunk"
    # data: { content: string }
    export interface ToolDelegatedEvent
    # event: "tool_delegated"
    # data: {
    # tool_name: string
    # call_id: string
    # arguments: Record<string, unknown>
    # }
    export interface StructuredInputWarningEvent
    export interface DataEvent
    # event: "data"
    # data: Record<string, unknown>
    export interface EndEvent
    # event: "end"
    # data: Record<string, never>
    export interface ErrorEvent
    # event: "error"
    # data: { message: string }


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
    export type RequestStatus = | "pending" // Request assembled, not yet sent
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
    # ... 30 more fields
    export interface ActiveRequest
    # requestId: string
    # instanceId: string
    # /** Assigned by the server on the first response */
    # conversationId: string | null
    # /** If this is a sub-agent request, the parent's conversationId */
    # parentConversationId: string | null
    # status: RequestStatus
    # /** Accumulated text response from chunk events */
    # ... 18 more fields
    export interface PendingToolCall
    # callId: string
    # toolName: string
    # arguments: Record<string, unknown>
    # /** When this delegation was received */
    # receivedAt: string
    # /** 120-second deadline from the server */
    # deadlineAt: string
    # /** Whether the client has submitted a result */
    # ... 1 more fields
    export interface StreamWarning
    # type: string
    # failures: Array<{
    # url?: string
    # reason: string
    # }>
    export interface AssembledAgentStartRequest
    # user_input?: string | Array<Record<string, unknown>>
    # variables?: Record<string, unknown>
    # config_overrides?: Record<string, unknown>
    # context?: Record<string, unknown>
    # client_tools?: string[]
    # organization_id?: string
    # workspace_id?: string
    # project_id?: string
    # ... 3 more fields
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
    export type ResourceStatus = | "pending" // Just added, not yet processed
    export type ResourceBlockType = | "text"
    export type ResultDisplayMode = | "modal-full"
  # Interfaces
    export interface ModelUsage
    # input_tokens: number
    # output_tokens: number
    # cached_input_tokens: number
    # total_tokens: number
    # api: string
    # request_count: number
    # cost: number
    export interface CompletionStats
    export interface ExecutionInstance
    # instanceId: string
    # agentId: string
    # agentType: AgentType
    # origin: InstanceOrigin
    # shortcutId: string | null
    # status: InstanceStatus
    # createdAt: string
    # updatedAt: string
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
    export interface InstanceUIState
    # instanceId: string
    # displayMode: ResultDisplayMode
    # allowChat: boolean
    # showVariablePanel: boolean
    # isExpanded: boolean
    # /**
    # expandedVariableId: string | null
    # /**
    # ... 30 more fields


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
    export type ResultDisplay = | "modal-full" // Full modal with chat interface (PromptRunnerModal)
  # Interfaces
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
Filepath: features/agents/components/settings/AgentToolsModal.tsx  [typescript/react]

  # Components
    [Component] export function AgentToolsModal({ agentId, availableTools = [], }: AgentToolsModalProps)
    Props: AgentToolsModalProps
      # agentId: string
      # availableTools?: Array<{
      # name: string
      # description?: string
      # [key: string]: unknown
      # }>
  # Types & Interfaces
    interface AgentToolsModalProps


---
Filepath: features/agents/components/settings/AgentSettingsModal.tsx  [typescript/react]

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
Filepath: features/agents/components/settings/AgentSettingsCore.tsx  [typescript/react]

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
    interface AgentSettingsCoreProps


---
Filepath: features/agents/components/settings/AgentVariablesModal.tsx  [typescript/react]

  # Components
    [Component] export function AgentVariablesModal({ agentId }: AgentVariablesModalProps)
    Props: AgentVariablesModalProps
      # agentId: string
  # Types & Interfaces
    interface AgentVariablesModalProps


---
Filepath: features/agents/components/settings/not-used/AgentInlineControls.tsx  [typescript/react]

  # Components
    [Component] export function AgentInlineControls({ agentId, availableTools = [], }: AgentInlineControlsProps)
    Props: AgentInlineControlsProps
      # agentId: string
      # availableTools?: Array<{
      # name: string
      # description?: string
      # [key: string]: unknown
      # }>
  # Types & Interfaces
    interface AgentInlineControlsProps


---
Filepath: features/agents/components/messages/MessageItemButtons.tsx  [typescript/react]

  # Components
    [Component] export function MessageItemButtons({ isEditing, hasVariableSupport, hasFullScreenEditor, onInsertVariable, onOpenFullScreenEditor, onToggleEditing, onClear, onDelete, onAddBlockType, sheetTitle })
    Props: MessageItemButtonsProps
      # isEditing?: boolean
      # hasVariableSupport?: boolean
      # hasFullScreenEditor?: boolean
      # onInsertVariable?: () => void
      # onOpenFullScreenEditor?: () => void
      # onToggleEditing?: () => void
      # onClear?: () => void
      # onDelete?: () => void
      #   # ... 2 more fields
  # Types & Interfaces
    interface MessageItemButtonsProps


---
Filepath: features/agents/components/messages/SystemMessageButtons.tsx  [typescript/react]

  # Components
    [Component] export function SystemMessageButtons({ isEditing, hasVariableSupport, hasFullScreenEditor, onInsertVariable, onOpenTemplates, onOptimize, onOpenFullScreenEditor, onToggleEditing, onClear, onAddBlockType })
    Props: SystemMessageButtonsProps
      # isEditing?: boolean
      # hasVariableSupport?: boolean
      # hasFullScreenEditor?: boolean
      # onInsertVariable?: () => void
      # onOpenTemplates?: () => void
      # onOptimize?: () => void
      # onOpenFullScreenEditor?: () => void
      # onToggleEditing?: () => void
      #   # ... 2 more fields
  # Types & Interfaces
    interface SystemMessageButtonsProps


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
Filepath: features/agents/components/messages/SystemMessage.tsx  [typescript/react]

  # Components
    [Component] export function SystemMessage({ agentId, onOpenFullScreenEditor, scrollContainerRef, }: SystemMessageProps)
    Props: SystemMessageProps
      # agentId: string
      # onOpenFullScreenEditor?: () => void
      # scrollContainerRef?: RefObject<HTMLDivElement>
  # Types & Interfaces
    interface SystemMessageProps


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
Filepath: features/agents/components/shared/VariableSelector.tsx  [typescript/react]

  # Components
    [Component] export function VariableSelector({ variables, onVariableSelected, onBeforeOpen, }: VariableSelectorProps)
    Props: VariableSelectorProps
      # variables: string[]
      # onVariableSelected: (variable: string) => void
      # onBeforeOpen?: () => void
  # Types & Interfaces
    interface VariableSelectorProps


---
Filepath: features/agents/components/shared/HighlightedText.tsx  [typescript/react]

  # Components
    [Component] export const HighlightedText = ({ text, validVariables = [] }: HighlightedTextProps) =>
    Props: HighlightedTextProps
      # text: string
      # validVariables?: string[]
  # Types & Interfaces
    interface HighlightedTextProps


---
Filepath: features/agents/components/layouts/AgentCard.tsx  [typescript/react]

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
Filepath: features/agents/components/layouts/AgentActionModal.tsx  [typescript/react]

  # Components
    [Component] export function AgentActionModal({ isOpen, onClose, agentName, ...rest }: AgentActionModalProps)
    Props: AgentActionModalProps
      # isOpen: boolean
      # onClose: () => void
      # agentName?: string
      # agentDescription?: string
      # onRun?: (e?: React.MouseEvent) => void
      # onEdit?: (e?: React.MouseEvent) => void
      # onDuplicate?: () => void
      # onShare?: () => void
      #   # ... 3 more fields
  # Types & Interfaces
    interface AgentActionModalProps


---
Filepath: features/agents/components/layouts/NewAgentModal.tsx  [typescript/react]

  # Components
    [Component] export function NewAgentModal({ isOpen, onClose }: NewAgentModalProps)
    Props: NewAgentModalProps
      # isOpen: boolean
      # onClose: () => void
  # Types & Interfaces
    interface NewAgentModalProps


---
Filepath: features/agents/components/layouts/FavoriteAgentButton.tsx  [typescript/react]

  # Components
    [Component] export function FavoriteAgentButton({ id, disabled, }: FavoriteAgentButtonProps)
    Props: FavoriteAgentButtonProps
      # id: string
      # disabled?: boolean
  # Types & Interfaces
    interface FavoriteAgentButtonProps


---
Filepath: features/agents/components/layouts/AgentListItem.tsx  [typescript/react]

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
Filepath: features/agents/components/layouts/AgentsGrid.tsx  [typescript/react]

  # Components
    [Component] export function AgentsGrid()


---
Filepath: features/agents/components/variables/AgentVariablesManager.tsx  [typescript/react]

  # Components
    [Component] export function AgentVariablesManager({ agentId }: AgentVariablesManagerProps)
    Props: AgentVariablesManagerProps
      # agentId: string
  # Types & Interfaces
    interface AgentVariablesManagerProps


---
Filepath: features/agents/components/variables/AgentVariableEditorModal.tsx  [typescript/react]

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
Filepath: features/agents/components/variables/AgentVariableEditor.tsx  [typescript/react]

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
    [Component] export function AgentPlanningIndicator({ startedAt, compact = false, }: AgentPlanningIndicatorProps)
    Props: AgentPlanningIndicatorProps
      # /** ISO string from activeRequest.startedAt — used to compute elapsed time */
      # startedAt: string | undefined
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
Filepath: features/agents/components/run/AgentRunsSidebar.tsx  [typescript/react]

  # Components
    [Component] export function AgentRunsSidebar({ agentId, agentName, currentRunId, onNewRun, }: AgentRunsSidebarProps)
    Props: AgentRunsSidebarProps
      # agentId: string
      # agentName: string
      # currentRunId?: string
      # onNewRun: () => void
  # Types & Interfaces
    interface AgentRun
    interface AgentRunsSidebarProps


---
Filepath: features/agents/components/run/AgentRequestStats.tsx  [typescript/react]

  # Components
    [Component] export function AgentRequestStats({ instanceId }: AgentRequestStatsProps)
    Props: AgentRequestStatsProps
      # instanceId: string
  # Types & Interfaces
    interface AgentRequestStatsProps


---
Filepath: features/agents/components/builder/AgentBuilderMobile.tsx  [typescript/react]

  # Components
    [Component] export function AgentBuilderMobile({ agentId, availableTools = [], }: AgentBuilderMobileProps)
    Props: AgentBuilderMobileProps
      # agentId: string
      # availableTools?: Array<{
      # name: string
      # description?: string
      # [key: string]: unknown
      # }>
  # Types & Interfaces
    interface AgentBuilderMobileProps


---
Filepath: features/agents/components/builder/AgentBuilder.tsx  [typescript/react]

  # Components
    [Component] export function AgentBuilder({ agentId, availableTools = [], }: AgentBuilderProps)
    Props: AgentBuilderProps
      # agentId: string
      # availableTools?: Array<{
      # name: string
      # description?: string
      # [key: string]: unknown
      # }>
  # Types & Interfaces
    interface AgentBuilderProps


---
Filepath: features/agents/components/builder/AgentVariablesManager.tsx  [typescript/react]

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
Filepath: features/agents/components/builder/AgentBuilderLeftPanel.tsx  [typescript/react]

  # Components
    [Component] export function AgentBuilderLeftPanel({ agentId, availableTools = [], }: AgentBuilderLeftPanelProps)
    Props: AgentBuilderLeftPanelProps
      # agentId: string
      # availableTools?: Array<{
      # name: string
      # description?: string
      # [key: string]: unknown
      # }>
  # Types & Interfaces
    interface AgentBuilderLeftPanelProps


---
Filepath: features/agents/components/builder/AgentContextSlotsManager.tsx  [typescript/react]

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
Filepath: features/agents/components/builder/AgentBuilderTopBar.tsx  [typescript/react]

  # Components
    [Component] export function AgentBuilderTopBar({ agentId }: AgentBuilderTopBarProps)
    Props: AgentBuilderTopBarProps
      # agentId: string
  # Types & Interfaces
    interface AgentBuilderTopBarProps


---
Filepath: features/agents/components/builder/AgentToolsManager.tsx  [typescript/react]

  # Components
    [Component] export function AgentToolsManager({ agentId, availableTools = [], }: AgentToolsManagerProps)
    Props: AgentToolsManagerProps
      # agentId: string
      # availableTools?: ToolEntry[]
  # Types & Interfaces
    interface ToolEntry
    # name: string
    # description?: string
    # category?: string
    # [key: string]: unknown
    interface AgentToolsManagerProps


---
Filepath: features/agents/components/builder/AgentBuilderDesktop.tsx  [typescript/react]

  # Components
    [Component] export function AgentBuilderDesktop({ agentId, availableTools = [], }: AgentBuilderDesktopProps)
    Props: AgentBuilderDesktopProps
      # agentId: string
      # availableTools?: Array<{
      # name: string
      # description?: string
      # [key: string]: unknown
      # }>
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
      # availableTools?: Array<{
      # name: string
      # description?: string
      # [key: string]: unknown
      # }>
  # Types & Interfaces
    interface AgentModelConfigurationProps


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
    const updateAgentFromSource = createAsyncThunk(...)


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
