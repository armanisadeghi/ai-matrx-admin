description: Verify updated DB schema
prompt: Read-only research task. The user just pulled latest main and updated the Supabase-generated types. I need the current, authoritative column list for these tables and the RPC signature, so I can write a plan that locks the unified Message and Conversation types to the DB.

Read this file: /home/user/ai-matrx-admin/types/database.types.ts

Report verbatim (copy-paste from the file, with line numbers):

1. The full `Row` type for `public.cx_conversation` — every column, including new/updated ones.
2. The full `Row` type for `public.cx_message`.
3. The full `Row` types for `public.cx_tool_call`, `public.cx_artifact`, `public.cx_media` (these come back from the `get_cx_conversation_bundle` RPC).
4. The full `Row` type for `public.ctx_scope_assignments` — the junction table.
5. The full `Row` type for `public.ctx_scopes` (for context when building scope selectors).
6. The function signature of `get_cx_conversation_bundle` if present in the generated `Functions` block — arguments and return type.
7. The full `Row` type for `public.cx_user_request` and `public.cx_request` (for the observability slice).

Report the file paths and line numbers. If any of these are absent from the types file, say so explicitly — that tells me the user hasn't regenerated types for them yet.

Be literal: I want the actual TypeScript shape, not a summary. Budget &lt;200 lines of output.
subagent_type: Explore

---

## Report

**File:** `/home/user/ai-matrx-admin/types/database.types.ts` (21,553 lines)

### 1. `public.cx_conversation` Row type (lines 4663–4692)
```typescript
Row: {
  config: Json
  created_at: string
  deleted_at: string | null
  description: string | null
  forked_at_position: number | null
  forked_from_id: string | null
  id: string
  initial_agent_id: string | null
  initial_agent_version_id: string | null
  is_ephemeral: boolean
  is_public: boolean
  keywords: string[] | null
  last_model_id: string | null
  message_count: number
  metadata: Json
  organization_id: string | null
  overrides: Json
  parent_conversation_id: string | null
  project_id: string | null
  source_app: string
  source_feature: string
  status: string
  system_instruction: string | null
  task_id: string | null
  title: string | null
  updated_at: string
  user_id: string
  variables: Json
}
```

### 2. `public.cx_message` Row type (lines 4863–4879)
```typescript
Row: {
  agent_id: string | null
  content: Json
  content_history: Json | null
  conversation_id: string
  created_at: string
  deleted_at: string | null
  id: string
  is_visible_to_model: boolean
  is_visible_to_user: boolean
  metadata: Json
  position: number
  role: string
  source: string
  status: string
  user_content: Json | null
}
```

### 3. Related Row types from bundle RPC

**`public.cx_tool_call` Row type (lines 5026–5061)**
```typescript
Row: {
  arguments: Json
  call_id: string
  completed_at: string
  conversation_id: string
  cost_usd: number | null
  created_at: string
  deleted_at: string | null
  duration_ms: number
  error_message: string | null
  error_type: string | null
  execution_events: Json | null
  file_path: string | null
  id: string
  input_tokens: number | null
  is_error: boolean | null
  iteration: number
  message_id: string | null
  metadata: Json
  output: string | null
  output_chars: number
  output_preview: Json | null
  output_tokens: number | null
  output_type: string | null
  parent_call_id: string | null
  persist_key: string | null
  retry_count: number | null
  started_at: string
  status: string
  success: boolean
  tool_name: string
  tool_type: string
  total_tokens: number | null
  user_id: string
  user_request_id: string | null
}
```

**`public.cx_artifact` Row type (lines 4582–4602)**
```typescript
Row: {
  artifact_type: Database["public"]["Enums"]["artifact_type"]
  conversation_id: string
  created_at: string
  deleted_at: string | null
  description: string | null
  external_id: string | null
  external_system: string | null
  external_url: string | null
  id: string
  message_id: string
  metadata: Json
  organization_id: string | null
  project_id: string | null
  status: Database["public"]["Enums"]["artifact_status"]
  task_id: string | null
  thumbnail_url: string | null
  title: string | null
  updated_at: string
  user_id: string
}
```

**`public.cx_media` Row type (lines 4813–4825)**
```typescript
Row: {
  conversation_id: string | null
  created_at: string
  deleted_at: string | null
  file_size_bytes: number | null
  file_uri: string | null
  id: string
  kind: string
  metadata: Json
  mime_type: string | null
  url: string
  user_id: string
}
```

### 4. `public.ctx_scope_assignments` Row type (lines 3952–3959)
```typescript
Row: {
  created_at: string
  created_by: string | null
  entity_id: string
  entity_type: string
  id: string
  scope_id: string
}
```

### 5. `public.ctx_scopes` Row type (lines 4050–4061)
```typescript
Row: {
  created_at: string
  created_by: string | null
  description: string
  id: string
  name: string
  organization_id: string
  parent_scope_id: string | null
  scope_type_id: string
  settings: Json
  updated_at: string
}
```

### 6. RPC signature for `get_cx_conversation_bundle`
**ABSENT** — This function is not present in the generated `Functions` block. Only `get_cx_conversations_shared_with_me` exists (line 18326).

### 7. Observability types

**`public.cx_user_request` Row type (lines 5166–5194)**
```typescript
Row: {
  agent_id: string | null
  agent_version_id: string | null
  api_duration_ms: number | null
  completed_at: string | null
  conversation_id: string
  created_at: string
  deleted_at: string | null
  error: string | null
  finish_reason: string | null
  id: string
  iterations: number
  metadata: Json
  result_end_position: number | null
  result_start_position: number | null
  source_app: string
  source_feature: string
  status: string
  tool_duration_ms: number | null
  total_cached_tokens: number
  total_cost: number | null
  total_duration_ms: number | null
  total_input_tokens: number
  total_output_tokens: number
  total_tokens: number
  total_tool_calls: number
  trigger_message_position: number | null
  user_id: string
}
```

**`public.cx_request` Row type (lines 4932–4954)**
```typescript
Row: {
  ai_model_id: string
  api_class: string | null
  api_duration_ms: number | null
  cached_tokens: number | null
  conversation_id: string
  cost: number | null
  created_at: string
  deleted_at: string | null
  finish_reason: string | null
  id: string
  input_tokens: number | null
  iteration: number
  metadata: Json
  output_tokens: number | null
  response_id: string | null
  tool_calls_count: number | null
  tool_calls_details: Json | null
  tool_duration_ms: number | null
  total_duration_ms: number | null
  total_tokens: number | null
  user_request_id: string
}
```