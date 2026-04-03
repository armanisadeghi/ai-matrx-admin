All 6 are live. Here's what was created and the TypeScript types for the React team:

---

## 6 New RPCs

### 1. `get_agent_version_history(agent_id, limit?, offset?)`

Paginated version list for the agent editor's version panel. SECURITY INVOKER (RLS on agent_versions handles access).

```typescript
interface AgentVersionHistoryItem {
  version_id: string;        // UUID of the version row (pass to get_agent_version_snapshot)
  version_number: number;
  name: string;              // agent name at that version
  changed_at: string;        // ISO timestamp
  change_note: string | null;
}
```

### 2. `get_agent_version_snapshot(agent_id, version_number)`

Full version data for diff/preview. Returns everything except ownership/status fields.

```typescript
interface AgentVersionSnapshot {
  version_id: string;
  version_number: number;
  agent_type: string;
  name: string;
  description: string | null;
  messages: any[];
  variable_definitions: VariableDefinition[] | null;
  model_id: string | null;
  model_tiers: any | null;
  settings: Record<string, any>;
  output_schema: any | null;
  tools: string[];
  custom_tools: CustomTool[];
  context_slots: ContextSlot[] | null;
  category: string | null;
  tags: string[];
  is_active: boolean;
  changed_at: string;
  change_note: string | null;
}
```

### 3. `purge_agent_versions(agent_id, keep_count?)`

Deletes old versions, keeps N most recent. **Never deletes**: version 1, the current live version, or any version referenced by a shortcut. SECURITY DEFINER.

```typescript
interface PurgeVersionsResult {
  success: boolean;
  error?: string;
  deleted_count?: number;
  kept_count?: number;
}
```

### 4. `get_agent_access_level(agent_id)`

Returns the current user's permission level. Checks from highest to lowest: owner → admin → editor → viewer → public → none. SECURITY DEFINER (needs to read other users' data).

```typescript
interface AgentAccessLevel {
  agent_id: string;
  agent_name: string;
  owner_id: string | null;
  owner_email: string | null;
  access_level: 'owner' | 'admin' | 'editor' | 'viewer' | 'public' | 'none';
  is_owner: boolean;
}
```

### 5. `get_agents_shared_with_me()`

All agents shared with the current user that they don't own. Excludes archived. Ordered by name.

```typescript
interface SharedAgentItem {
  id: string;
  name: string;
  description: string | null;
  agent_type: 'user' | 'builtin';
  category: string | null;
  tags: string[];
  owner_id: string | null;
  owner_email: string | null;
  permission_level: string;
  created_at: string;
  updated_at: string;
}
```

### 6. `get_shared_agents_for_chat()`

Minimal shared agent list for the chat picker. Only active, non-archived agents.

```typescript
interface SharedAgentForChat {
  id: string;
  name: string;
  permission_level: string;
  owner_email: string | null;
}
```

---

That closes all the gaps except the 2 prompt_app RPCs which we'll do when `prompt_apps` gets rewired. The full RPC count for the new agent system is now **18 total** — everything the frontend needs to operate independently of the old `prompts` / `prompt_builtins` tables.