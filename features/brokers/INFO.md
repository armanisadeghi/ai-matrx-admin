# Broker Values Hierarchy - Final Architecture

## Overview
The broker values system implements a flexible 9-level hierarchy that supports multiple organizational structures. The database enforces technical constraints but remains semantically neutral, allowing organizations to use the hierarchy however best fits their workflow.

## Hierarchy Levels (Priority Order: Most → Least Specific)

1. **AI Task** - Individual AI conversation turn
2. **AI Run** - Complete AI conversation session
3. **Task** - Specific todo item
4. **Project** - Initiative or deliverable
5. **Workspace** - Flexible container (commonly used for clients/accounts, supports infinite nesting)
6. **Organization** - Company-wide scope
7. **User** - Individual user preferences (follows user across all organizations)
8. **Global** - System-wide defaults

## Database Schema

### `broker_values` Table Structure
- `broker_id` (UUID, FK to brokers table)
- `value` (JSONB)
- Scope columns (exactly ONE must be set):
  - `is_global` (BOOLEAN)
  - `user_id` (UUID, FK to auth.users)
  - `organization_id` (UUID, FK to organizations)
  - `workspace_id` (UUID, FK to workspaces)
  - `project_id` (UUID, FK to projects)
  - `task_id` (UUID, FK to tasks)
  - `ai_run_id` (UUID, FK to ai_run)
  - `ai_task_id` (UUID, FK to ai_task)

### Key Constraints
- **Single Scope Enforcement**: Each broker_value must belong to exactly one scope level
- **Uniqueness**: One value per broker per scope (using UNIQUE NULLS NOT DISTINCT)
- **Cascade Deletion**: Deleting a scope entity removes its broker values

### Workspace Nesting
- Workspaces support `parent_workspace_id` for unlimited nesting depth
- Resolution function traverses workspace hierarchy, preferring closer ancestors
- Priority increases with workspace depth (closer = higher priority)

## Resolution Behavior

The `get_broker_values_for_context()` function:
- Accepts all scope IDs as parameters
- Returns most specific value for each broker
- Handles workspace hierarchy traversal automatically
- Returns: `broker_id`, `value`, `scope_level`, `scope_id`

## Recommended Usage Patterns

### Primary Pattern: Client-Centric
```
Organization: Agency
└─ Workspace: Client Name (client-specific brokers here)
   ├─ Project: Website Redesign
   ├─ Project: Brand Guide
   └─ Project: Social Campaign
```

### Alternative Pattern: Work-Type-Centric
```
Organization: Agency
└─ Workspace: Service Type
   ├─ Project: Client A
   └─ Project: Client B
```

### Internal Work Pattern
```
Organization: Agency
└─ Workspace: Internal Operations
   ├─ Project: Quarterly Planning
   └─ Project: Team Documentation
```

**Note**: The database supports all patterns equally. Application UI should provide templates and guidance to nudge users toward recommended patterns while remaining flexible.

## Implementation Notes

- Global brokers may be computed at runtime (e.g., `current_date`) or stored with `is_global=TRUE`
- User-level brokers follow the individual across all organizations
- Indexes exist on all scope columns for query performance
- The system prioritizes specificity over inheritance (no value merging)

```sql
ALTER TABLE broker_values 
ADD COLUMN user_id UUID NULL;

ALTER TABLE broker_values
ADD CONSTRAINT broker_values_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
```

### Global Level
Global brokers are **computed at runtime** (like `current_date`), so they don't need storage. They'd be handled in your application code, not in broker_values.

But if you want to allow **system admins to set global default values**, you could use a special flag:

```sql
ALTER TABLE broker_values 
ADD COLUMN is_global BOOLEAN DEFAULT FALSE;
```

---

## Complete SQL Migration

```sql
-- Add new scope columns
ALTER TABLE broker_values 
ADD COLUMN user_id UUID NULL,
ADD COLUMN ai_run_id UUID NULL,
ADD COLUMN ai_task_id UUID NULL,
ADD COLUMN is_global BOOLEAN DEFAULT FALSE;

-- Add foreign key constraints
ALTER TABLE broker_values
ADD CONSTRAINT broker_values_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE broker_values
ADD CONSTRAINT broker_values_ai_run_id_fkey 
  FOREIGN KEY (ai_run_id) REFERENCES ai_run(id) ON DELETE CASCADE;

ALTER TABLE broker_values
ADD CONSTRAINT broker_values_ai_task_id_fkey 
  FOREIGN KEY (ai_task_id) REFERENCES ai_task(id) ON DELETE CASCADE;

-- Drop old constraints
ALTER TABLE broker_values 
DROP CONSTRAINT IF EXISTS broker_values_single_scope_check;

ALTER TABLE broker_values
DROP CONSTRAINT IF EXISTS broker_values_unique_per_scope;

-- Add updated single scope check
-- Exactly ONE of these must be true: is_global OR one scope column is set
ALTER TABLE broker_values
ADD CONSTRAINT broker_values_single_scope_check CHECK (
  CASE 
    WHEN is_global = TRUE THEN (
      user_id IS NULL AND
      organization_id IS NULL AND
      workspace_id IS NULL AND
      project_id IS NULL AND
      task_id IS NULL AND
      ai_run_id IS NULL AND
      ai_task_id IS NULL
    )
    ELSE (
      (user_id IS NOT NULL)::INTEGER +
      (organization_id IS NOT NULL)::INTEGER +
      (workspace_id IS NOT NULL)::INTEGER +
      (project_id IS NOT NULL)::INTEGER +
      (task_id IS NOT NULL)::INTEGER +
      (ai_run_id IS NOT NULL)::INTEGER +
      (ai_task_id IS NOT NULL)::INTEGER = 1
    )
  END
);

-- Add updated unique constraint
ALTER TABLE broker_values
ADD CONSTRAINT broker_values_unique_per_scope UNIQUE NULLS NOT DISTINCT (
  broker_id,
  is_global,
  user_id,
  organization_id,
  workspace_id,
  project_id,
  task_id,
  ai_run_id,
  ai_task_id
);

-- Add indexes for new columns
CREATE INDEX idx_broker_values_user ON broker_values(user_id) 
  WHERE user_id IS NOT NULL;

CREATE INDEX idx_broker_values_ai_run ON broker_values(ai_run_id) 
  WHERE ai_run_id IS NOT NULL;

CREATE INDEX idx_broker_values_ai_task ON broker_values(ai_task_id) 
  WHERE ai_task_id IS NOT NULL;

CREATE INDEX idx_broker_values_global ON broker_values(broker_id) 
  WHERE is_global = TRUE;
```

---

## Updated Resolution Function

```sql
CREATE OR REPLACE FUNCTION get_broker_values_for_context(
  p_broker_ids UUID[],
  p_user_id UUID DEFAULT NULL,
  p_organization_id UUID DEFAULT NULL,
  p_workspace_id UUID DEFAULT NULL,
  p_project_id UUID DEFAULT NULL,
  p_task_id UUID DEFAULT NULL,
  p_ai_run_id UUID DEFAULT NULL,
  p_ai_task_id UUID DEFAULT NULL
)
RETURNS TABLE (
  broker_id UUID,
  value JSONB,
  scope_level TEXT,
  scope_id UUID
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE 
  workspace_hierarchy AS (
    SELECT w.id, w.parent_workspace_id, w.organization_id, 0 as depth
    FROM workspaces w
    WHERE w.id = p_workspace_id
    
    UNION ALL
    
    SELECT w.id, w.parent_workspace_id, w.organization_id, wh.depth + 1
    FROM workspaces w
    INNER JOIN workspace_hierarchy wh ON w.id = wh.parent_workspace_id
  ),
  all_values AS (
    -- AI Task level (highest priority - this specific turn)
    SELECT 
      bv.broker_id,
      bv.value,
      'ai_task' as scope_level,
      bv.ai_task_id as scope_id,
      1 as priority
    FROM broker_values bv
    WHERE bv.ai_task_id = p_ai_task_id
      AND bv.broker_id = ANY(p_broker_ids)
    
    UNION ALL
    
    -- AI Run level (this conversation)
    SELECT 
      bv.broker_id,
      bv.value,
      'ai_run' as scope_level,
      bv.ai_run_id as scope_id,
      2 as priority
    FROM broker_values bv
    WHERE bv.ai_run_id = p_ai_run_id
      AND bv.broker_id = ANY(p_broker_ids)
    
    UNION ALL
    
    -- Task level (this todo)
    SELECT 
      bv.broker_id,
      bv.value,
      'task' as scope_level,
      bv.task_id as scope_id,
      3 as priority
    FROM broker_values bv
    WHERE bv.task_id = p_task_id
      AND bv.broker_id = ANY(p_broker_ids)
    
    UNION ALL
    
    -- Project level (this deliverable)
    SELECT 
      bv.broker_id,
      bv.value,
      'project' as scope_level,
      bv.project_id as scope_id,
      4 as priority
    FROM broker_values bv
    WHERE bv.project_id = p_project_id
      AND bv.broker_id = ANY(p_broker_ids)
    
    UNION ALL
    
    -- Workspace levels (client/account, with nesting)
    -- Closest workspace = highest priority
    SELECT 
      bv.broker_id,
      bv.value,
      'workspace' as scope_level,
      bv.workspace_id as scope_id,
      5 + wh.depth as priority
    FROM broker_values bv
    INNER JOIN workspace_hierarchy wh ON bv.workspace_id = wh.id
    WHERE bv.broker_id = ANY(p_broker_ids)
    
    UNION ALL
    
    -- Organization level (company-wide)
    SELECT 
      bv.broker_id,
      bv.value,
      'organization' as scope_level,
      bv.organization_id as scope_id,
      1000 as priority
    FROM broker_values bv
    WHERE bv.organization_id = p_organization_id
      AND bv.broker_id = ANY(p_broker_ids)
    
    UNION ALL
    
    -- User level (personal preferences)
    SELECT 
      bv.broker_id,
      bv.value,
      'user' as scope_level,
      bv.user_id as scope_id,
      1001 as priority
    FROM broker_values bv
    WHERE bv.user_id = p_user_id
      AND bv.broker_id = ANY(p_broker_ids)
    
    UNION ALL
    
    -- Global level (system-wide defaults)
    SELECT 
      bv.broker_id,
      bv.value,
      'global' as scope_level,
      NULL as scope_id,
      2000 as priority
    FROM broker_values bv
    WHERE bv.is_global = TRUE
      AND bv.broker_id = ANY(p_broker_ids)
  )
  SELECT DISTINCT ON (av.broker_id)
    av.broker_id,
    av.value,
    av.scope_level,
    av.scope_id
  FROM all_values av
  ORDER BY av.broker_id, av.priority ASC;
END;
$$ LANGUAGE plpgsql STABLE;
```

# Current Fnctions:

## 1. Main Resolution Function

```sql
CREATE OR REPLACE FUNCTION get_broker_values_for_context(
  p_broker_ids UUID[],
  p_user_id UUID DEFAULT NULL,
  p_organization_id UUID DEFAULT NULL,
  p_workspace_id UUID DEFAULT NULL,
  p_project_id UUID DEFAULT NULL,
  p_task_id UUID DEFAULT NULL,
  p_ai_runs_id UUID DEFAULT NULL,
  p_ai_tasks_id UUID DEFAULT NULL
)
RETURNS TABLE (
  broker_id UUID,
  value JSONB,
  scope_level TEXT,
  scope_id UUID
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE 
  workspace_hierarchy AS (
    SELECT w.id, w.parent_workspace_id, w.organization_id, 0 as depth
    FROM workspaces w
    WHERE w.id = p_workspace_id
    
    UNION ALL
    
    SELECT w.id, w.parent_workspace_id, w.organization_id, wh.depth + 1
    FROM workspaces w
    INNER JOIN workspace_hierarchy wh ON w.id = wh.parent_workspace_id
  ),
  all_values AS (
    -- AI Task level (highest priority - this specific turn)
    SELECT 
      bv.broker_id,
      bv.value,
      'ai_task' as scope_level,
      bv.ai_tasks_id as scope_id,
      1 as priority
    FROM broker_values bv
    WHERE bv.ai_tasks_id = p_ai_tasks_id
      AND bv.broker_id = ANY(p_broker_ids)
    
    UNION ALL
    
    -- AI Run level (this conversation)
    SELECT 
      bv.broker_id,
      bv.value,
      'ai_run' as scope_level,
      bv.ai_runs_id as scope_id,
      2 as priority
    FROM broker_values bv
    WHERE bv.ai_runs_id = p_ai_runs_id
      AND bv.broker_id = ANY(p_broker_ids)
    
    UNION ALL
    
    -- Task level (this todo)
    SELECT 
      bv.broker_id,
      bv.value,
      'task' as scope_level,
      bv.task_id as scope_id,
      3 as priority
    FROM broker_values bv
    WHERE bv.task_id = p_task_id
      AND bv.broker_id = ANY(p_broker_ids)
    
    UNION ALL
    
    -- Project level (this deliverable)
    SELECT 
      bv.broker_id,
      bv.value,
      'project' as scope_level,
      bv.project_id as scope_id,
      4 as priority
    FROM broker_values bv
    WHERE bv.project_id = p_project_id
      AND bv.broker_id = ANY(p_broker_ids)
    
    UNION ALL
    
    -- Workspace levels (client/account, with nesting)
    -- Closest workspace = highest priority
    SELECT 
      bv.broker_id,
      bv.value,
      'workspace' as scope_level,
      bv.workspace_id as scope_id,
      5 + wh.depth as priority
    FROM broker_values bv
    INNER JOIN workspace_hierarchy wh ON bv.workspace_id = wh.id
    WHERE bv.broker_id = ANY(p_broker_ids)
    
    UNION ALL
    
    -- Organization level (company-wide)
    SELECT 
      bv.broker_id,
      bv.value,
      'organization' as scope_level,
      bv.organization_id as scope_id,
      1000 as priority
    FROM broker_values bv
    WHERE bv.organization_id = p_organization_id
      AND bv.broker_id = ANY(p_broker_ids)
    
    UNION ALL
    
    -- User level (personal preferences)
    SELECT 
      bv.broker_id,
      bv.value,
      'user' as scope_level,
      bv.user_id as scope_id,
      1001 as priority
    FROM broker_values bv
    WHERE bv.user_id = p_user_id
      AND bv.broker_id = ANY(p_broker_ids)
    
    UNION ALL
    
    -- Global level (system-wide defaults)
    SELECT 
      bv.broker_id,
      bv.value,
      'global' as scope_level,
      NULL as scope_id,
      2000 as priority
    FROM broker_values bv
    WHERE bv.is_global = TRUE
      AND bv.broker_id = ANY(p_broker_ids)
  )
  SELECT DISTINCT ON (av.broker_id)
    av.broker_id,
    av.value,
    av.scope_level,
    av.scope_id
  FROM all_values av
  ORDER BY av.broker_id, av.priority ASC;
END;
$$ LANGUAGE plpgsql STABLE;
```

## 2. Get Missing Brokers Function

```sql
CREATE OR REPLACE FUNCTION get_missing_broker_ids(
  p_broker_ids UUID[],
  p_user_id UUID DEFAULT NULL,
  p_organization_id UUID DEFAULT NULL,
  p_workspace_id UUID DEFAULT NULL,
  p_project_id UUID DEFAULT NULL,
  p_task_id UUID DEFAULT NULL,
  p_ai_runs_id UUID DEFAULT NULL,
  p_ai_tasks_id UUID DEFAULT NULL
)
RETURNS UUID[] AS $$
DECLARE
  found_broker_ids UUID[];
BEGIN
  -- Get all broker IDs that have values in context
  SELECT ARRAY_AGG(broker_id)
  INTO found_broker_ids
  FROM get_broker_values_for_context(
    p_broker_ids,
    p_user_id,
    p_organization_id,
    p_workspace_id,
    p_project_id,
    p_task_id,
    p_ai_runs_id,
    p_ai_tasks_id
  );
  
  -- Return the difference (brokers that need values)
  RETURN ARRAY(
    SELECT unnest(p_broker_ids)
    EXCEPT
    SELECT unnest(COALESCE(found_broker_ids, ARRAY[]::UUID[]))
  );
END;
$$ LANGUAGE plpgsql STABLE;
```

## 3. Get Complete Broker Dataset Function

```sql
CREATE OR REPLACE FUNCTION get_complete_broker_data_for_context(
  p_broker_ids UUID[],
  p_user_id UUID DEFAULT NULL,
  p_organization_id UUID DEFAULT NULL,
  p_workspace_id UUID DEFAULT NULL,
  p_project_id UUID DEFAULT NULL,
  p_task_id UUID DEFAULT NULL,
  p_ai_runs_id UUID DEFAULT NULL,
  p_ai_tasks_id UUID DEFAULT NULL
)
RETURNS TABLE (
  broker_id UUID,
  broker_name VARCHAR,
  data_type TEXT,
  value JSONB,
  has_value BOOLEAN,
  scope_level TEXT,
  scope_id UUID,
  default_value TEXT,
  description TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH resolved_values AS (
    SELECT *
    FROM get_broker_values_for_context(
      p_broker_ids,
      p_user_id,
      p_organization_id,
      p_workspace_id,
      p_project_id,
      p_task_id,
      p_ai_runs_id,
      p_ai_tasks_id
    )
  )
  SELECT 
    db.id as broker_id,
    db.name as broker_name,
    db.data_type::TEXT as data_type,
    rv.value,
    (rv.value IS NOT NULL) as has_value,
    rv.scope_level,
    rv.scope_id,
    db.default_value,
    db.description
  FROM data_broker db
  LEFT JOIN resolved_values rv ON db.id = rv.broker_id
  WHERE db.id = ANY(p_broker_ids);
END;
$$ LANGUAGE plpgsql STABLE;
```

## 4. Upsert Broker Value Function

```sql
CREATE OR REPLACE FUNCTION upsert_broker_value(
  p_broker_id UUID,
  p_value JSONB,
  p_is_global BOOLEAN DEFAULT FALSE,
  p_user_id UUID DEFAULT NULL,
  p_organization_id UUID DEFAULT NULL,
  p_workspace_id UUID DEFAULT NULL,
  p_project_id UUID DEFAULT NULL,
  p_task_id UUID DEFAULT NULL,
  p_ai_runs_id UUID DEFAULT NULL,
  p_ai_tasks_id UUID DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  result_id UUID;
BEGIN
  INSERT INTO broker_values (
    broker_id,
    is_global,
    user_id,
    organization_id,
    workspace_id,
    project_id,
    task_id,
    ai_runs_id,
    ai_tasks_id,
    value,
    created_by
  ) VALUES (
    p_broker_id,
    p_is_global,
    p_user_id,
    p_organization_id,
    p_workspace_id,
    p_project_id,
    p_task_id,
    p_ai_runs_id,
    p_ai_tasks_id,
    p_value,
    p_created_by
  )
  ON CONFLICT ON CONSTRAINT broker_values_unique_per_scope
  DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = now()
  RETURNING id INTO result_id;
  
  RETURN result_id;
END;
$$ LANGUAGE plpgsql;
```

## 5. Bonus: Bulk Upsert Function

This is helpful if you need to set multiple broker values at once:

```sql
CREATE OR REPLACE FUNCTION bulk_upsert_broker_values(
  p_broker_value_pairs JSONB, -- Array of {broker_id, value} objects
  p_is_global BOOLEAN DEFAULT FALSE,
  p_user_id UUID DEFAULT NULL,
  p_organization_id UUID DEFAULT NULL,
  p_workspace_id UUID DEFAULT NULL,
  p_project_id UUID DEFAULT NULL,
  p_task_id UUID DEFAULT NULL,
  p_ai_runs_id UUID DEFAULT NULL,
  p_ai_tasks_id UUID DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS TABLE (
  broker_id UUID,
  broker_value_id UUID,
  success BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  WITH input_data AS (
    SELECT 
      (item->>'broker_id')::UUID as broker_id,
      (item->'value')::JSONB as value
    FROM jsonb_array_elements(p_broker_value_pairs) as item
  )
  INSERT INTO broker_values (
    broker_id,
    is_global,
    user_id,
    organization_id,
    workspace_id,
    project_id,
    task_id,
    ai_runs_id,
    ai_tasks_id,
    value,
    created_by
  )
  SELECT
    id.broker_id,
    p_is_global,
    p_user_id,
    p_organization_id,
    p_workspace_id,
    p_project_id,
    p_task_id,
    p_ai_runs_id,
    p_ai_tasks_id,
    id.value,
    p_created_by
  FROM input_data id
  ON CONFLICT ON CONSTRAINT broker_values_unique_per_scope
  DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = now()
  RETURNING 
    broker_values.broker_id,
    broker_values.id as broker_value_id,
    TRUE as success;
END;
$$ LANGUAGE plpgsql;
```

## Usage Examples

```sql
-- Example 1: Get all broker values for an AI task execution
SELECT * FROM get_broker_values_for_context(
  p_broker_ids := ARRAY['broker-uuid-1', 'broker-uuid-2']::UUID[],
  p_user_id := 'user-uuid',
  p_organization_id := 'org-uuid',
  p_workspace_id := 'workspace-uuid',
  p_project_id := 'project-uuid',
  p_task_id := 'task-uuid',
  p_ai_runs_id := 'ai-run-uuid',
  p_ai_tasks_id := 'ai-task-uuid'
);

-- Example 2: Get complete dataset with broker metadata
SELECT * FROM get_complete_broker_data_for_context(
  p_broker_ids := ARRAY['broker-uuid-1', 'broker-uuid-2']::UUID[],
  p_ai_runs_id := 'ai-run-uuid'
);

-- Example 3: Find which brokers need user input
SELECT get_missing_broker_ids(
  p_broker_ids := ARRAY['broker-uuid-1', 'broker-uuid-2', 'broker-uuid-3']::UUID[],
  p_workspace_id := 'workspace-uuid'
);

-- Example 4: Set a broker value at workspace level (client-specific)
SELECT upsert_broker_value(
  p_broker_id := 'broker-uuid-1',
  p_value := '{"companyName": "Dr. Smith Plastic Surgery", "industry": "Healthcare"}'::JSONB,
  p_workspace_id := 'workspace-uuid',
  p_created_by := 'user-uuid'
);

-- Example 5: Override at AI run level for this conversation
SELECT upsert_broker_value(
  p_broker_id := 'broker-uuid-1',
  p_value := '{"tone": "casual", "experimentalApproach": true}'::JSONB,
  p_ai_runs_id := 'ai-run-uuid',
  p_created_by := 'user-uuid'
);

-- Example 6: Set global system-wide default
SELECT upsert_broker_value(
  p_broker_id := 'broker-uuid-current-date',
  p_value := '"2025-11-16"'::JSONB,
  p_is_global := TRUE,
  p_created_by := 'system'
);

-- Example 7: Set user-level personal preference
SELECT upsert_broker_value(
  p_broker_id := 'broker-uuid-writing-style',
  p_value := '{"style": "professional", "tone": "friendly"}'::JSONB,
  p_user_id := 'user-uuid',
  p_created_by := 'user-uuid'
);

-- Example 8: Bulk upsert multiple broker values at once
SELECT * FROM bulk_upsert_broker_values(
  p_broker_value_pairs := '[
    {"broker_id": "broker-uuid-1", "value": {"clientName": "Dr. Smith"}},
    {"broker_id": "broker-uuid-2", "value": {"brandColor": "#4A90E2"}},
    {"broker_id": "broker-uuid-3", "value": {"mission": "Excellence in care"}}
  ]'::JSONB,
  p_workspace_id := 'workspace-uuid',
  p_created_by := 'user-uuid'
);
```

# Related Tables

```sql
create table public.organizations (
  id uuid not null default extensions.uuid_generate_v4 (),
  name text not null,
  slug text not null,
  description text null,
  logo_url text null,
  website text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  created_by uuid null,
  is_personal boolean null default false,
  settings jsonb null default '{}'::jsonb,
  constraint organizations_pkey primary key (id),
  constraint organizations_slug_key unique (slug),
  constraint organizations_created_by_fkey foreign KEY (created_by) references auth.users (id) on delete set null,
  constraint valid_slug check ((slug ~ '^[a-z0-9\-]+$'::text))
) TABLESPACE pg_default;



create table public.data_broker (
  id uuid not null default gen_random_uuid (),
  name character varying not null,
  data_type public.data_type null default 'str'::data_type,
  default_value text null,
  color public.color null default 'blue'::color,
  output_component uuid null,
  field_component_id uuid null,
  user_id uuid null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  is_public boolean null default false,
  authenticated_read boolean null default true,
  public_read boolean null default true,
  default_scope character varying null,
  description text null,
  constraint data_broker_pkey primary key (id),
  constraint data_broker_default_component_fkey foreign KEY (input_component) references data_input_component (id) on update CASCADE,
  constraint data_broker_field_component_id_fkey foreign KEY (field_component_id) references field_components (id) on update CASCADE on delete set null,
  constraint data_broker_output_component_fkey foreign KEY (output_component) references data_output_component (id) on update CASCADE,
  constraint data_broker_user_id_fkey foreign KEY (user_id) references auth.users (id) on update CASCADE on delete CASCADE
) TABLESPACE pg_default;


create table public.workspaces (
  id uuid not null default gen_random_uuid (),
  organization_id uuid not null,
  parent_workspace_id uuid null,
  name text not null,
  description text null,
  settings jsonb null default '{}'::jsonb,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  created_by uuid null,
  constraint workspaces_pkey primary key (id),
  constraint workspaces_created_by_fkey foreign KEY (created_by) references auth.users (id) on delete set null,
  constraint workspaces_organization_id_fkey foreign KEY (organization_id) references organizations (id) on delete CASCADE,
  constraint workspaces_parent_workspace_id_fkey foreign KEY (parent_workspace_id) references workspaces (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_workspaces_parent on public.workspaces using btree (parent_workspace_id) TABLESPACE pg_default;

create index IF not exists idx_workspaces_org on public.workspaces using btree (organization_id) TABLESPACE pg_default;

create table public.projects (
  id uuid not null default extensions.uuid_generate_v4 (),
  name text not null,
  description text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  created_by uuid null,
  constraint projects_pkey primary key (id),
  constraint projects_created_by_fkey foreign KEY (created_by) references auth.users (id) on delete set null
) TABLESPACE pg_default;


create table public.tasks (
  id uuid not null default extensions.uuid_generate_v4 (),
  title text not null,
  description text null,
  project_id uuid null,
  status text not null default 'incomplete'::text,
  due_date date null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  user_id uuid null,
  authenticated_read boolean null default false,
  parent_task_id uuid null,
  priority public.task_priority null,
  assignee_id uuid null,
  constraint tasks_pkey primary key (id),
  constraint tasks_assignee_id_fkey foreign KEY (assignee_id) references auth.users (id) on delete set null,
  constraint tasks_created_by_fkey foreign KEY (user_id) references auth.users (id) on delete set null,
  constraint tasks_parent_task_id_fkey foreign KEY (parent_task_id) references tasks (id) on delete CASCADE,
  constraint tasks_project_id_fkey foreign KEY (project_id) references projects (id) on delete CASCADE,
  constraint tasks_status_check check (
    (
      status = any (array['incomplete'::text, 'completed'::text])
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_tasks_parent_task_id on public.tasks using btree (parent_task_id) TABLESPACE pg_default;

create index IF not exists idx_tasks_assignee_id on public.tasks using btree (assignee_id) TABLESPACE pg_default;

create index IF not exists idx_tasks_priority on public.tasks using btree (priority) TABLESPACE pg_default;

create table public.ai_runs (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  source_type text not null,
  source_id uuid null,
  name text null,
  description text null,
  tags text[] null default array[]::text[],
  messages jsonb not null default '[]'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  variable_values jsonb null default '{}'::jsonb,
  broker_values jsonb null default '{}'::jsonb,
  attachments jsonb null default '[]'::jsonb,
  metadata jsonb null default '{}'::jsonb,
  status text null default 'active'::text,
  is_starred boolean null default false,
  total_tokens integer null default 0,
  total_cost numeric(10, 6) null default 0,
  message_count integer null default 0,
  task_count integer null default 0,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  last_message_at timestamp with time zone not null default now(),
  constraint ai_runs_pkey primary key (id),
  constraint ai_runs_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE,
  constraint ai_runs_source_type_check check (
    (
      source_type = any (
        array[
          'prompt'::text,
          'chat'::text,
          'applet'::text,
          'cockpit'::text,
          'workflow'::text,
          'custom'::text
        ]
      )
    )
  ),
  constraint ai_runs_status_check check (
    (
      status = any (
        array['active'::text, 'archived'::text, 'deleted'::text]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_ai_runs_user_id on public.ai_runs using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_ai_runs_source on public.ai_runs using btree (source_type, source_id) TABLESPACE pg_default;

create index IF not exists idx_ai_runs_user_source on public.ai_runs using btree (user_id, source_type) TABLESPACE pg_default;

create index IF not exists idx_ai_runs_last_message on public.ai_runs using btree (last_message_at desc) TABLESPACE pg_default;

create index IF not exists idx_ai_runs_status on public.ai_runs using btree (status) TABLESPACE pg_default
where
  (status = 'active'::text);

create index IF not exists idx_ai_runs_starred on public.ai_runs using btree (is_starred) TABLESPACE pg_default
where
  (is_starred = true);

create index IF not exists idx_ai_runs_tags on public.ai_runs using gin (tags) TABLESPACE pg_default;

create trigger trigger_ai_runs_message_count BEFORE INSERT
or
update OF messages on ai_runs for EACH row
execute FUNCTION update_ai_runs_message_count ();

create trigger trigger_ai_runs_updated_at BEFORE
update on ai_runs for EACH row
execute FUNCTION update_ai_runs_updated_at ();

create table public.ai_tasks (
  id uuid not null default gen_random_uuid (),
  run_id uuid not null,
  user_id uuid not null,
  task_id uuid not null,
  service text not null,
  task_name text not null,
  provider text null,
  endpoint text null,
  model text null,
  model_id uuid null,
  request_data jsonb not null default '{}'::jsonb,
  response_text text null,
  response_data jsonb null,
  response_info jsonb null,
  response_errors jsonb null,
  tool_updates jsonb null,
  response_complete boolean null default false,
  response_metadata jsonb null default '{}'::jsonb,
  tokens_input integer null,
  tokens_output integer null,
  tokens_total integer null,
  cost numeric(10, 6) null,
  time_to_first_token integer null,
  total_time integer null,
  status text null default 'pending'::text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  completed_at timestamp with time zone null,
  constraint ai_tasks_pkey primary key (id),
  constraint ai_tasks_task_id_key unique (task_id),
  constraint ai_tasks_run_id_fkey foreign KEY (run_id) references ai_runs (id) on delete CASCADE,
  constraint ai_tasks_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE,
  constraint ai_tasks_status_check check (
    (
      status = any (
        array[
          'pending'::text,
          'streaming'::text,
          'completed'::text,
          'failed'::text,
          'cancelled'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_ai_tasks_run_id on public.ai_tasks using btree (run_id) TABLESPACE pg_default;

create index IF not exists idx_ai_tasks_task_id on public.ai_tasks using btree (task_id) TABLESPACE pg_default;

create index IF not exists idx_ai_tasks_user_id on public.ai_tasks using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_ai_tasks_status on public.ai_tasks using btree (status) TABLESPACE pg_default;

create index IF not exists idx_ai_tasks_created_at on public.ai_tasks using btree (created_at desc) TABLESPACE pg_default;

create index IF not exists idx_ai_tasks_provider_model on public.ai_tasks using btree (provider, model) TABLESPACE pg_default;

create index IF not exists idx_ai_tasks_model_id on public.ai_tasks using btree (model_id) TABLESPACE pg_default;

create trigger trigger_ai_tasks_updated_at BEFORE
update on ai_tasks for EACH row
execute FUNCTION update_ai_tasks_updated_at ();

create trigger trigger_update_run_aggregates
after INSERT
or
update on ai_tasks for EACH row
execute FUNCTION update_run_aggregates_from_task ();

create trigger update_prompt_app_exec_on_task_update
after
update OF status,
total_time,
tokens_total,
cost on ai_tasks for EACH row when (
  old.status is distinct from new.status
  or old.total_time is distinct from new.total_time
  or old.tokens_total is distinct from new.tokens_total
  or old.cost is distinct from new.cost
)
execute FUNCTION update_prompt_app_execution_from_task ();

create table public.broker_values (
  id uuid not null default gen_random_uuid (),
  broker_id uuid not null,
  organization_id uuid null,
  workspace_id uuid null,
  project_id uuid null,
  task_id uuid null,
  value jsonb not null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  created_by uuid null,
  user_id uuid null,
  ai_runs_id uuid null,
  ai_tasks_id uuid null,
  is_global boolean null default false,
  constraint broker_values_pkey primary key (id),
  constraint broker_values_unique_per_scope unique NULLS not distinct (
    broker_id,
    is_global,
    user_id,
    organization_id,
    workspace_id,
    project_id,
    task_id,
    ai_runs_id,
    ai_tasks_id
  ),
  constraint broker_values_broker_id_fkey foreign KEY (broker_id) references data_broker (id) on delete CASCADE,
  constraint broker_values_created_by_fkey foreign KEY (created_by) references auth.users (id) on delete set null,
  constraint broker_values_organization_id_fkey foreign KEY (organization_id) references organizations (id) on delete CASCADE,
  constraint broker_values_project_id_fkey foreign KEY (project_id) references projects (id) on delete CASCADE,
  constraint broker_values_task_id_fkey foreign KEY (task_id) references tasks (id) on delete CASCADE,
  constraint broker_values_workspace_id_fkey foreign KEY (workspace_id) references workspaces (id) on delete CASCADE,
  constraint broker_values_ai_tasks_id_fkey foreign KEY (ai_tasks_id) references ai_tasks (id) on delete CASCADE,
  constraint broker_values_ai_runs_id_fkey foreign KEY (ai_runs_id) references ai_runs (id) on delete CASCADE,
  constraint broker_values_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE,
  constraint broker_values_single_scope_check check (
    case
      when (is_global = true) then (
        (user_id is null)
        and (organization_id is null)
        and (workspace_id is null)
        and (project_id is null)
        and (task_id is null)
        and (ai_runs_id is null)
        and (ai_tasks_id is null)
      )
      else (
        (
          (
            (
              (
                (
                  (
                    ((user_id is not null))::integer + ((organization_id is not null))::integer
                  ) + ((workspace_id is not null))::integer
                ) + ((project_id is not null))::integer
              ) + ((task_id is not null))::integer
            ) + ((ai_runs_id is not null))::integer
          ) + ((ai_tasks_id is not null))::integer
        ) = 1
      )
    end
  )
) TABLESPACE pg_default;

create index IF not exists idx_broker_values_user on public.broker_values using btree (user_id) TABLESPACE pg_default
where
  (user_id is not null);

create index IF not exists idx_broker_values_ai_runs on public.broker_values using btree (ai_runs_id) TABLESPACE pg_default
where
  (ai_runs_id is not null);

create index IF not exists idx_broker_values_ai_tasks on public.broker_values using btree (ai_tasks_id) TABLESPACE pg_default
where
  (ai_tasks_id is not null);

create index IF not exists idx_broker_values_broker on public.broker_values using btree (broker_id) TABLESPACE pg_default;

create index IF not exists idx_broker_values_org on public.broker_values using btree (organization_id) TABLESPACE pg_default
where
  (organization_id is not null);

create index IF not exists idx_broker_values_workspace on public.broker_values using btree (workspace_id) TABLESPACE pg_default
where
  (workspace_id is not null);

create index IF not exists idx_broker_values_project on public.broker_values using btree (project_id) TABLESPACE pg_default
where
  (project_id is not null);

create index IF not exists idx_broker_values_task on public.broker_values using btree (task_id) TABLESPACE pg_default
where
  (task_id is not null);

create index IF not exists idx_broker_values_global on public.broker_values using btree (broker_id) TABLESPACE pg_default
where
  (is_global = true);
```