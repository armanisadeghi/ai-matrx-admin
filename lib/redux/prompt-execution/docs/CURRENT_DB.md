# Current Prompt DB Infrastructure

## public.prompts & public.prompt_builtins

User prompts are stored in "prompts" and "prompt_builtins" are the same thing, but they are owned by the system for triggering important builtin systems, especially those built into context menus, buttons and other core functionality.

```sql
create table public.prompts (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone null default now(),
  name character varying null,
  messages jsonb null,
  variable_defaults jsonb null,
  tools jsonb null,
  user_id uuid null,
  settings jsonb null,
  description text null,
  constraint pompts_pkey primary key (id),
  constraint pompts_user_id_fkey foreign KEY (user_id) references auth.users (id) on update CASCADE on delete CASCADE
) TABLESPACE pg_default;

create table public.prompt_builtins (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  name character varying not null,
  description text null,
  messages jsonb not null,
  variable_defaults jsonb null,
  tools jsonb null,
  settings jsonb null,
  created_by_user_id uuid null,
  is_active boolean not null default true,
  source_prompt_id uuid null,
  source_prompt_snapshot_at timestamp with time zone null,
  constraint prompt_builtins_pkey primary key (id),
  constraint prompt_builtins_created_by_user_id_fkey foreign KEY (created_by_user_id) references auth.users (id),
  constraint prompt_builtins_source_prompt_id_fkey foreign KEY (source_prompt_id) references prompts (id) on delete set null
) TABLESPACE pg_default;

create index IF not exists idx_prompt_builtins_active_small on public.prompt_builtins using btree (is_active, created_at desc, created_by_user_id) TABLESPACE pg_default;

create index IF not exists idx_prompt_builtins_source_prompt on public.prompt_builtins using btree (source_prompt_id) TABLESPACE pg_default
where
  (source_prompt_id is not null);

create index IF not exists idx_prompt_builtins_messages_gin on public.prompt_builtins using gin (messages) TABLESPACE pg_default;

create index IF not exists idx_prompt_builtins_tools_gin on public.prompt_builtins using gin (tools) TABLESPACE pg_default;

create index IF not exists idx_prompt_builtins_settings_gin on public.prompt_builtins using gin (settings) TABLESPACE pg_default;

create index IF not exists idx_prompt_builtins_variable_defaults_gin on public.prompt_builtins using gin (variable_defaults) TABLESPACE pg_default;

create index IF not exists prompt_builtins_active_idx on public.prompt_builtins using btree (is_active) TABLESPACE pg_default
where
  (is_active = true);

```

### Sample Prompt Object:
```json
{
  "id": "cceb347c-518e-4ff9-ac74-94c56180ed31",
  "name": "Travel Advisor",
  "description": "",
  "messages": [
    {
      "role": "system",
      "content": "Act as an expert travel advisor specializing in travel to {{city}}.\n\nWhen a user asks a question, get directly to the answer. Skip things like 'Certainly!' and other starters."
    },
    {
      "role": "user",
      "content": "I'm looking to do some traveling and I would like your guidance please. Can you tell me about {{what}} in a concise way?\n\n---"
    }
  ],
  "variable_defaults": [
    {
      "name": "city",
      "defaultValue": "Las Vegas",
      "customComponent": {
        "type": "radio",
        "options": [
          "New York",
          "Los Angeles",
          "Miami",
          "Las Vegas",
          "Paris",
          "London",
          "Ibiza"
        ],
        "allowOther": true
      }
    },
    {
      "name": "what",
      "defaultValue": "Hotels"
    }
  ],
  "settings": {
    "model_id": "548126f2-714a-4562-9001-0c31cbeea375",
    "store": true,
    "tools": [],
    "top_p": 1,
    "stream": true,
    "temperature": 1,
    "max_tokens": 4096
  }
}
```


## AI Runs

```sql
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

create view public.ai_runs_summary as
select
  r.id,
  r.name,
  r.source_type,
  r.source_id,
  r.message_count,
  r.task_count,
  r.total_tokens,
  r.total_cost,
  r.is_starred,
  r.status,
  r.created_at,
  r.last_message_at,
  r.user_id
from
  ai_runs r
where
  r.status = 'active'::text
order by
  r.last_message_at desc;
```

# AI Tasks

A new Task ID is assigned for each time a call is made so a multi-turn conversation will have many tasks

```sql
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

create view public.ai_tasks_analytics as
select
  t.user_id,
  t.service,
  t.task_name,
  count(*) as total_tasks,
  avg(t.total_time) as avg_total_time,
  avg(t.time_to_first_token) as avg_time_to_first_token,
  sum(t.tokens_total) as total_tokens,
  sum(t.cost) as total_cost,
  date_trunc('day'::text, t.created_at) as day
from
  ai_tasks t
where
  t.status = 'completed'::text
group by
  t.user_id,
  t.service,
  t.task_name,
  (date_trunc('day'::text, t.created_at));
```

## Prompt Shortcuts

Shortcuts allow context menus, buttons and other components to quickly and easily connect with pre-determined prompts for quick and easy execution.

Shorcuts also define the presentation such as the result component, how variables should be handled and more.

This system is best demonstrated with this component: features\prompts\components\modal\PromptRunnerModalSidebarTester.tsx

```sql
create table public.prompt_shortcuts (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  prompt_builtin_id uuid null,
  category_id uuid not null,
  label text not null,
  description text null,
  icon_name text null,
  keyboard_shortcut text null,
  sort_order integer not null default 0,
  scope_mappings jsonb null,
  is_active boolean not null default true,
  created_by_user_id uuid null,
  available_scopes text[] null,
  result_display text null default 'modal'::text,
  allow_chat boolean null default true,
  auto_run boolean null default true,
  show_variables boolean null default false,
  apply_variables boolean null default true,
  constraint prompt_shortcuts_pkey primary key (id),
  constraint prompt_shortcuts_unique_category_prompt unique (category_id, prompt_builtin_id),
  constraint prompt_shortcuts_category_fkey foreign KEY (category_id) references shortcut_categories (id) on delete CASCADE,
  constraint prompt_shortcuts_created_by_fkey foreign KEY (created_by_user_id) references auth.users (id),
  constraint prompt_shortcuts_prompt_fkey foreign KEY (prompt_builtin_id) references prompt_builtins (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists prompt_shortcuts_category_active_idx on public.prompt_shortcuts using btree (category_id, sort_order) TABLESPACE pg_default
where
  (is_active = true);

create index IF not exists prompt_shortcuts_prompt_idx on public.prompt_shortcuts using btree (prompt_builtin_id) TABLESPACE pg_default
where
  (is_active = true);

create index IF not exists idx_prompt_shortcuts_available_scopes on public.prompt_shortcuts using gin (available_scopes) TABLESPACE pg_default
where
  (is_active = true);

create index IF not exists idx_prompt_shortcuts_category_active_sort on public.prompt_shortcuts using btree (category_id, is_active, sort_order) TABLESPACE pg_default
where
  (is_active = true);

create index IF not exists idx_prompt_shortcuts_covering on public.prompt_shortcuts using btree (id, prompt_builtin_id, is_active) INCLUDE (scope_mappings, available_scopes) TABLESPACE pg_default
where
  (is_active = true);

create index IF not exists idx_prompt_shortcuts_placement_covering on public.prompt_shortcuts using btree (category_id, is_active, sort_order) INCLUDE (
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
) TABLESPACE pg_default
where
  (is_active = true);

create index IF not exists idx_prompt_shortcuts_unified_covering on public.prompt_shortcuts using btree (category_id, is_active, sort_order) INCLUDE (
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
  apply_variables,
  created_at,
  updated_at
) TABLESPACE pg_default
where
  (is_active = true);

create index IF not exists idx_prompt_shortcuts_category_active on public.prompt_shortcuts using btree (category_id, is_active, sort_order) TABLESPACE pg_default
where
  (is_active = true);
```

## Additional Information

There are many other tables as well, but these are the core tables involved with prompts.