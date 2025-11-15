# Current Tables

```sql
create table public.prompt_shortcuts (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  prompt_builtin_id uuid null,  -- NULLABLE: Shortcuts can exist without a prompt
  category_id uuid not null,
  label text not null,
  description text null,
  icon_name text null,
  keyboard_shortcut text null,
  sort_order integer not null default 0,
  scope_mappings jsonb null,
  available_scopes text[] null,  -- Which scope keys are valid for this shortcut
  -- Execution Configuration (Boolean-based system)
  result_display text not null default 'modal',  -- WHERE to display results: modal, inline, background, sidebar, toast
  auto_run boolean not null default true,  -- Run immediately (true) or wait for user (false)
  allow_chat boolean not null default true,  -- Allow conversation (true) or one-shot (false)
  show_variables boolean not null default false,  -- Show variable form (true) or hide (false)
  apply_variables boolean not null default true,  -- Apply variables (true) or ignore (false)
  is_active boolean not null default true,
  created_by_user_id uuid null,
  constraint prompt_shortcuts_pkey primary key (id),
  constraint prompt_shortcuts_category_fkey foreign KEY (category_id) references shortcut_categories (id) on delete CASCADE,
  constraint prompt_shortcuts_created_by_fkey foreign KEY (created_by_user_id) references auth.users (id),
  constraint prompt_shortcuts_prompt_fkey foreign KEY (prompt_builtin_id) references prompt_builtins (id) on delete CASCADE,
  constraint prompt_shortcuts_result_display_check check (result_display IN ('modal', 'inline', 'background', 'sidebar', 'toast'))
) TABLESPACE pg_default;

create index IF not exists prompt_shortcuts_category_active_idx on public.prompt_shortcuts using btree (category_id, sort_order) TABLESPACE pg_default
where
  (is_active = true);

create index IF not exists prompt_shortcuts_prompt_idx on public.prompt_shortcuts using btree (prompt_builtin_id) TABLESPACE pg_default
where
  (is_active = true);

create index IF not exists idx_prompt_shortcuts_category_active_sort on public.prompt_shortcuts using btree (category_id, is_active, sort_order) TABLESPACE pg_default
where
  (is_active = true);

create index IF not exists idx_prompt_shortcuts_covering on public.prompt_shortcuts using btree (id, prompt_builtin_id, is_active) INCLUDE (scope_mappings) TABLESPACE pg_default
where
  (is_active = true);


create table public.prompt_builtins (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  name character varying not null,
  description text null,
  messages jsonb not null,
  variable_defaults jsonb null,  -- Array of {name, defaultValue, customComponent}
  tools jsonb null,
  settings jsonb null,
  created_by_user_id uuid null,
  is_active boolean not null default true,
  source_prompt_id uuid null,  -- NEW: Track if converted from a user prompt
  source_prompt_snapshot_at timestamp with time zone null,  -- NEW: When source was snapshotted
  constraint prompt_builtins_pkey primary key (id),
  constraint prompt_builtins_created_by_user_id_fkey foreign KEY (created_by_user_id) references auth.users (id),
  constraint prompt_builtins_source_prompt_id_fkey foreign KEY (source_prompt_id) references prompts (id) on delete SET NULL
) TABLESPACE pg_default;

create index IF not exists idx_prompt_builtins_execution_covering on public.prompt_builtins using btree (id, is_active) INCLUDE (messages, variable_defaults, tools, settings) TABLESPACE pg_default
where
  (is_active = true);

create index IF not exists prompt_builtins_active_idx on public.prompt_builtins using btree (is_active) TABLESPACE pg_default
where
  (is_active = true);

create index IF not exists idx_prompt_builtins_source_prompt on public.prompt_builtins using btree (source_prompt_id) TABLESPACE pg_default
where
  (source_prompt_id is not null);


create table public.shortcut_categories (
  id uuid not null default gen_random_uuid (),
  placement_type text not null,
  parent_category_id uuid null,
  label text not null,
  description text null,
  icon_name text not null default 'SquareMenu'::text,
  color text null default 'zinc'::text,
  sort_order integer null default 999,
  is_active boolean null default true,
  metadata jsonb null default '{}'::jsonb,
  constraint shortcut_categories_pkey primary key (id),
  constraint shortcut_categories_parent_fkey foreign KEY (parent_category_id) references shortcut_categories (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_spc_new_placement_type on public.shortcut_categories using btree (placement_type) TABLESPACE pg_default;

create index IF not exists idx_spc_new_parent on public.shortcut_categories using btree (parent_category_id) TABLESPACE pg_default;

create index IF not exists idx_spc_new_active on public.shortcut_categories using btree (is_active) TABLESPACE pg_default
where
  (is_active = true);

create index IF not exists idx_spc_new_sort on public.shortcut_categories using btree (placement_type, parent_category_id, sort_order) TABLESPACE pg_default;

create index IF not exists idx_shortcut_categories_menu_covering on public.shortcut_categories using btree (
  placement_type,
  parent_category_id,
  sort_order,
  is_active
) INCLUDE (
  id,
  label,
  description,
  icon_name,
  color,
  metadata
) TABLESPACE pg_default
where
  (
    (placement_type = 'menu'::text)
    and (is_active = true)
  );
```

# View

```sql
-- =====================================================
-- CONTEXT MENU VIEW
-- =====================================================
-- This view provides all the data needed for rendering the context menu
-- in a single efficient query with proper hierarchy and sorting

CREATE OR REPLACE VIEW public.context_menu_view AS
WITH RECURSIVE category_hierarchy AS (
  -- Base case: root categories (no parent)
  SELECT 
    sc.id,
    sc.placement_type,
    sc.parent_category_id,
    sc.label,
    sc.description,
    sc.icon_name,
    sc.color,
    sc.sort_order,
    sc.metadata,
    1 AS depth,
    ARRAY[sc.sort_order] AS sort_path,
    sc.id::text AS path
  FROM shortcut_categories sc
  WHERE sc.placement_type = 'menu'
    AND sc.is_active = TRUE
    AND sc.parent_category_id IS NULL
  
  UNION ALL
  
  -- Recursive case: child categories
  SELECT 
    sc.id,
    sc.placement_type,
    sc.parent_category_id,
    sc.label,
    sc.description,
    sc.icon_name,
    sc.color,
    sc.sort_order,
    sc.metadata,
    ch.depth + 1,
    ch.sort_path || sc.sort_order,
    ch.path || '/' || sc.id::text
  FROM shortcut_categories sc
  INNER JOIN category_hierarchy ch ON sc.parent_category_id = ch.id
  WHERE sc.placement_type = 'menu'
    AND sc.is_active = TRUE
)
SELECT 
  -- Category information
  ch.id AS category_id,
  ch.parent_category_id,
  ch.label AS category_label,
  ch.description AS category_description,
  ch.icon_name AS category_icon,
  ch.color AS category_color,
  ch.sort_order AS category_sort_order,
  ch.depth AS category_depth,
  ch.sort_path AS category_sort_path,
  ch.path AS category_path,
  ch.metadata AS category_metadata,
  
  -- Shortcut information (will be NULL if no shortcuts in category)
  ps.id AS shortcut_id,
  ps.prompt_builtin_id,
  ps.label AS shortcut_label,
  ps.description AS shortcut_description,
  ps.icon_name AS shortcut_icon,
  ps.keyboard_shortcut,
  ps.sort_order AS shortcut_sort_order,
  ps.scope_mappings, -- INCLUDED: needed for execution
  
  -- Flag for standalone items (no visual category wrapper)
  (ch.id = '18aee474-a512-4467-b755-332a6ccae0b0') AS is_standalone,
  
  -- Prompt preview data (basic info, not full prompt execution data)
  pb.name AS prompt_name
  
FROM category_hierarchy ch
LEFT JOIN prompt_shortcuts ps 
  ON ps.category_id = ch.id 
  AND ps.is_active = TRUE
LEFT JOIN prompt_builtins pb 
  ON pb.id = ps.prompt_builtin_id 
  AND pb.is_active = TRUE
  
-- Order by hierarchy first, then shortcuts within each category
ORDER BY 
  ch.sort_path,
  ps.sort_order NULLS FIRST;

-- =====================================================
-- ADDITIONAL OPTIMIZING INDEXES
-- =====================================================

-- Composite index for the main join in the view
CREATE INDEX IF NOT EXISTS idx_prompt_shortcuts_category_active_sort 
ON public.prompt_shortcuts (category_id, is_active, sort_order) 
WHERE is_active = TRUE;

-- Covering index for shortcut_categories with all frequently accessed columns
CREATE INDEX IF NOT EXISTS idx_shortcut_categories_menu_covering 
ON public.shortcut_categories (placement_type, parent_category_id, sort_order, is_active)
INCLUDE (id, label, description, icon_name, color, metadata)
WHERE placement_type = 'menu' AND is_active = TRUE;

-- Covering index for prompt_shortcuts to avoid extra lookups
CREATE INDEX IF NOT EXISTS idx_prompt_shortcuts_covering
ON public.prompt_shortcuts (id, prompt_builtin_id, is_active)
INCLUDE (scope_mappings)
WHERE is_active = TRUE;

-- Covering index for prompt_builtins to get execution data efficiently
CREATE INDEX IF NOT EXISTS idx_prompt_builtins_execution_covering
ON public.prompt_builtins (id, is_active)
INCLUDE (messages, variable_defaults, tools, settings)
WHERE is_active = TRUE;
```



```sql
-- =====================================================
-- RUN THIS: Single function + index for prompt execution
-- =====================================================

-- The function that gets called when a menu item is clicked
CREATE OR REPLACE FUNCTION public.get_prompt_execution_data(p_shortcut_id uuid)
RETURNS TABLE (
  -- Shortcut metadata
  shortcut_id uuid,
  shortcut_label text,
  
  -- Scope mapping configuration
  scope_mappings jsonb,
  
  -- Prompt execution data (the 4 core items you need)
  prompt_builtin_id uuid,
  prompt_name varchar,
  messages jsonb,
  variable_defaults jsonb,
  tools jsonb,
  settings jsonb
) 
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ps.id AS shortcut_id,
    ps.label AS shortcut_label,
    ps.scope_mappings,
    pb.id AS prompt_builtin_id,
    pb.name AS prompt_name,
    pb.messages,
    pb.variable_defaults,
    pb.tools,
    pb.settings
  FROM prompt_shortcuts ps
  INNER JOIN prompt_builtins pb ON pb.id = ps.prompt_builtin_id
  WHERE ps.id = p_shortcut_id
    AND ps.is_active = TRUE
    AND pb.is_active = TRUE;
END;
$$;

-- Covering index for optimal performance
CREATE INDEX IF NOT EXISTS idx_prompt_builtins_execution_covering
ON public.prompt_builtins (id, is_active)
INCLUDE (name, messages, variable_defaults, tools, settings)
WHERE is_active = TRUE;
```

```sql
-- =====================================================
-- SHORTCUTS BY PLACEMENT VIEW
-- =====================================================
-- Optimized view for loading shortcuts grouped by placement type
-- Includes all necessary data for context menus, buttons, cards, etc.
-- Replaces the need for API routes - direct client access!

CREATE OR REPLACE VIEW public.shortcuts_by_placement_view AS
SELECT 
  -- Shortcut fields
  ps.id AS shortcut_id,
  ps.created_at AS shortcut_created_at,
  ps.updated_at AS shortcut_updated_at,
  ps.prompt_builtin_id,
  ps.label AS shortcut_label,
  ps.description AS shortcut_description,
  ps.icon_name AS shortcut_icon,
  ps.keyboard_shortcut,
  ps.sort_order AS shortcut_sort_order,
  ps.scope_mappings,
  ps.available_scopes,
  ps.is_active AS shortcut_is_active,
  
  -- Category fields
  sc.id AS category_id,
  sc.placement_type,
  sc.parent_category_id,
  sc.label AS category_label,
  sc.description AS category_description,
  sc.icon_name AS category_icon,
  sc.color AS category_color,
  sc.sort_order AS category_sort_order,
  sc.is_active AS category_is_active,
  sc.metadata AS category_metadata,
  
  -- Prompt Builtin fields (for execution)
  pb.id AS builtin_id,
  pb.name AS builtin_name,
  pb.description AS builtin_description,
  pb.messages AS builtin_messages,
  pb.variable_defaults AS builtin_variable_defaults,
  pb.tools AS builtin_tools,
  pb.settings AS builtin_settings,
  pb.is_active AS builtin_is_active,
  pb.source_prompt_id,
  pb.source_prompt_snapshot_at

FROM prompt_shortcuts ps
INNER JOIN shortcut_categories sc ON ps.category_id = sc.id
LEFT JOIN prompt_builtins pb ON ps.prompt_builtin_id = pb.id

WHERE ps.is_active = TRUE
  AND sc.is_active = TRUE

ORDER BY 
  sc.placement_type,
  sc.sort_order,
  ps.sort_order;

-- Grant access to authenticated users
GRANT SELECT ON public.shortcuts_by_placement_view TO authenticated;

-- =====================================================
-- OPTIMIZING INDEX (if not already exists)
-- =====================================================
-- This ensures the view query is lightning fast
CREATE INDEX IF NOT EXISTS idx_prompt_shortcuts_placement_covering
ON public.prompt_shortcuts (category_id, is_active, sort_order)
INCLUDE (
  id, 
  prompt_builtin_id, 
  label, 
  description, 
  icon_name, 
  keyboard_shortcut, 
  scope_mappings, 
  available_scopes,
  result_display,
  auto_run,
  allow_chat,
  show_variables,
  apply_variables
)
WHERE is_active = TRUE;

COMMENT ON VIEW public.shortcuts_by_placement_view IS 
'Optimized view for loading shortcuts by placement type with boolean-based execution configuration. Used by UnifiedContextMenu and other placement-specific components. Direct client access - no API route needed.';
```