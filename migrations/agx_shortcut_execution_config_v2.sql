-- ============================================================
-- Phase 3.5 — Agent Execution Config v2 on agx_shortcut
-- ============================================================
-- Reshapes `agx_shortcut` to carry the full AgentExecutionConfig
-- bundle so shortcuts, agent apps, and testers can all produce
-- and consume the same canonical customization contract.
--
-- DROPS:  apply_variables, show_variables
-- RENAMES: result_display → display_mode
--          use_pre_execution_input → show_pre_execution_gate
-- ADDS:   show_variable_panel, variables_panel_style,
--         show_definition_messages, show_definition_message_content,
--         hide_reasoning, hide_tool_results,
--         pre_execution_message, bypass_gate_seconds,
--         default_user_input, default_variables, context_overrides,
--         llm_overrides
--
-- Destructive: apply_variables / show_variables values are discarded.
-- User has approved the destructive drop (no data worth preserving).
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. DROP unused columns (destructive, per user's approval)
-- ------------------------------------------------------------
ALTER TABLE public.agx_shortcut
  DROP COLUMN IF EXISTS apply_variables,
  DROP COLUMN IF EXISTS show_variables;

-- ------------------------------------------------------------
-- 2. RENAME columns to match canonical TS field names
-- ------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'agx_shortcut'
      AND column_name = 'result_display'
  ) THEN
    ALTER TABLE public.agx_shortcut RENAME COLUMN result_display TO display_mode;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'agx_shortcut'
      AND column_name = 'use_pre_execution_input'
  ) THEN
    ALTER TABLE public.agx_shortcut RENAME COLUMN use_pre_execution_input TO show_pre_execution_gate;
  END IF;
END $$;

-- Ensure the renamed `display_mode` has the right default
ALTER TABLE public.agx_shortcut
  ALTER COLUMN display_mode SET DEFAULT 'modal-full';

-- Ensure the renamed `show_pre_execution_gate` has a boolean default
ALTER TABLE public.agx_shortcut
  ALTER COLUMN show_pre_execution_gate SET DEFAULT false;

-- ------------------------------------------------------------
-- 3. ADD the new columns
-- ------------------------------------------------------------
ALTER TABLE public.agx_shortcut
  ADD COLUMN IF NOT EXISTS show_variable_panel boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS variables_panel_style text NOT NULL DEFAULT 'inline',
  ADD COLUMN IF NOT EXISTS show_definition_messages boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_definition_message_content boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hide_reasoning boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hide_tool_results boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pre_execution_message text NULL,
  ADD COLUMN IF NOT EXISTS bypass_gate_seconds integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS default_user_input text NULL,
  ADD COLUMN IF NOT EXISTS default_variables jsonb NULL,
  ADD COLUMN IF NOT EXISTS context_overrides jsonb NULL,
  ADD COLUMN IF NOT EXISTS llm_overrides jsonb NULL;

-- Sanity: bypass_gate_seconds must be non-negative. 0 = wait for user.
ALTER TABLE public.agx_shortcut
  DROP CONSTRAINT IF EXISTS agx_shortcut_bypass_gate_seconds_check;
ALTER TABLE public.agx_shortcut
  ADD CONSTRAINT agx_shortcut_bypass_gate_seconds_check
  CHECK (bypass_gate_seconds >= 0);

-- ------------------------------------------------------------
-- 4. Refresh agent_context_menu_view
--    The view in migrations/create_agent_context_menu_view.sql hard-codes
--    the old column names (result_display, use_pre_execution_input,
--    apply_variables, show_variables). We must recreate it with the new
--    column names so downstream consumers (the context menu v2 hook) see
--    correct payloads.
-- ------------------------------------------------------------
DROP VIEW IF EXISTS public.agent_context_menu_view;

CREATE OR REPLACE VIEW public.agent_context_menu_view AS
WITH shortcut_items AS (
  SELECT
    sc.id AS category_id,
    sc.placement_type,
    COALESCE(
      json_agg(
        json_build_object(
          'type',               'agent_shortcut',
          'id',                  s.id,
          'label',               s.label,
          'description',         s.description,
          'icon_name',           s.icon_name,
          'sort_order',          s.sort_order,
          'keyboard_shortcut',   s.keyboard_shortcut,
          'scope_mappings',      s.scope_mappings,
          'enabled_contexts',    s.enabled_contexts,

          -- New canonical config bundle (matches AgentExecutionConfig)
          'display_mode',                      s.display_mode,
          'auto_run',                          s.auto_run,
          'allow_chat',                        s.allow_chat,
          'show_variable_panel',               s.show_variable_panel,
          'variables_panel_style',             s.variables_panel_style,
          'show_definition_messages',          s.show_definition_messages,
          'show_definition_message_content',   s.show_definition_message_content,
          'hide_reasoning',                    s.hide_reasoning,
          'hide_tool_results',                 s.hide_tool_results,
          'show_pre_execution_gate',           s.show_pre_execution_gate,
          'pre_execution_message',             s.pre_execution_message,
          'bypass_gate_seconds',               s.bypass_gate_seconds,
          'default_user_input',                s.default_user_input,
          'default_variables',                 s.default_variables,
          'context_overrides',                 s.context_overrides,
          'llm_overrides',                     s.llm_overrides,

          'agent_id',            s.agent_id,
          'agent_version_id',    s.agent_version_id,
          'use_latest',          s.use_latest,
          'scope', CASE
            WHEN s.user_id IS NOT NULL         THEN 'user'
            WHEN s.organization_id IS NOT NULL THEN 'organization'
            WHEN s.project_id IS NOT NULL      THEN 'project'
            WHEN s.task_id IS NOT NULL         THEN 'task'
            ELSE 'global'
          END,
          'agent', CASE
            WHEN a.id IS NOT NULL THEN json_build_object(
              'id',          a.id,
              'name',        a.name,
              'description', a.description
            )
            ELSE NULL
          END
        )
        ORDER BY s.sort_order
      ) FILTER (WHERE s.id IS NOT NULL),
      '[]'::json
    ) AS items
  FROM public.shortcut_categories sc
  LEFT JOIN public.agx_shortcut s
    ON s.category_id = sc.id
    AND s.is_active = TRUE
  LEFT JOIN public.agx_agent a
    ON a.id = s.agent_id
  WHERE sc.is_active = TRUE
  GROUP BY sc.id, sc.placement_type
),
block_items AS (
  SELECT
    sc.id AS category_id,
    sc.placement_type,
    COALESCE(
      json_agg(
        json_build_object(
          'type',       'content_block',
          'id',          cb.id,
          'label',       cb.label,
          'description', cb.description,
          'icon_name',   cb.icon_name,
          'sort_order',  cb.sort_order,
          'template',    cb.template,
          'block_id',    cb.block_id,
          'scope', CASE
            WHEN cb.user_id IS NOT NULL         THEN 'user'
            WHEN cb.organization_id IS NOT NULL THEN 'organization'
            WHEN cb.project_id IS NOT NULL      THEN 'project'
            WHEN cb.task_id IS NOT NULL         THEN 'task'
            ELSE 'global'
          END
        )
        ORDER BY cb.sort_order
      ) FILTER (WHERE cb.id IS NOT NULL),
      '[]'::json
    ) AS items
  FROM public.shortcut_categories sc
  LEFT JOIN public.content_blocks cb
    ON cb.category_id = sc.id
    AND cb.is_active = TRUE
  WHERE sc.is_active = TRUE
  GROUP BY sc.id, sc.placement_type
)
SELECT
  sc.placement_type,
  json_agg(
    json_build_object(
      'category', json_build_object(
        'id',                 sc.id,
        'placement_type',     sc.placement_type,
        'parent_category_id', sc.parent_category_id,
        'label',              sc.label,
        'description',        sc.description,
        'icon_name',          sc.icon_name,
        'color',              sc.color,
        'sort_order',         sc.sort_order,
        'is_active',          sc.is_active,
        'metadata',           sc.metadata,
        'enabled_contexts',   sc.enabled_contexts,
        'scope', CASE
          WHEN sc.user_id IS NOT NULL         THEN 'user'
          WHEN sc.organization_id IS NOT NULL THEN 'organization'
          WHEN sc.project_id IS NOT NULL      THEN 'project'
          WHEN sc.task_id IS NOT NULL         THEN 'task'
          ELSE 'global'
        END
      ),
      'items', (
        SELECT COALESCE(
          json_agg(elem ORDER BY (elem->>'sort_order')::int),
          '[]'::json
        )
        FROM (
          SELECT json_array_elements(si.items) AS elem
          WHERE si.items::text != '[]'
          UNION ALL
          SELECT json_array_elements(bi.items) AS elem
          WHERE bi.items::text != '[]'
        ) combined
      )
    )
    ORDER BY sc.sort_order
  ) AS categories_flat
FROM public.shortcut_categories sc
LEFT JOIN shortcut_items si ON si.category_id = sc.id
LEFT JOIN block_items    bi ON bi.category_id = sc.id
WHERE sc.is_active = TRUE
GROUP BY sc.placement_type;

GRANT SELECT ON public.agent_context_menu_view TO authenticated;
GRANT SELECT ON public.agent_context_menu_view TO anon;

COMMENT ON VIEW public.agent_context_menu_view IS
'Agent-aware unified context menu. Row-level visibility is delegated to
the underlying tables'' RLS. Output shape mirrors AgentExecutionConfig
for shortcut items — clients should treat each shortcut item''s fields as
the canonical config bundle keys.';

-- ------------------------------------------------------------
-- 5. Column comments (documentation in the DB itself)
-- ------------------------------------------------------------
COMMENT ON COLUMN public.agx_shortcut.display_mode IS
  'How the launched agent is presented. ResultDisplayMode string. Default modal-full.';
COMMENT ON COLUMN public.agx_shortcut.show_variable_panel IS
  'When true, the variable panel is shown to the user before / during execution so they can edit resolved variable values.';
COMMENT ON COLUMN public.agx_shortcut.variables_panel_style IS
  'UI style for the variable panel (inline/wizard/form/compact/guided/cards). App validates.';
COMMENT ON COLUMN public.agx_shortcut.show_definition_messages IS
  'Reveal agent-definition messages to the user. Secret-sensitive.';
COMMENT ON COLUMN public.agx_shortcut.show_definition_message_content IS
  'When show_definition_messages is true, whether to reveal interpolated content.';
COMMENT ON COLUMN public.agx_shortcut.hide_reasoning IS
  'When true, hide reasoning/thinking blocks from the output.';
COMMENT ON COLUMN public.agx_shortcut.hide_tool_results IS
  'When true, hide tool-call result blocks from the output.';
COMMENT ON COLUMN public.agx_shortcut.show_pre_execution_gate IS
  'When true, show a pre-execution input gate before auto-run fires.';
COMMENT ON COLUMN public.agx_shortcut.pre_execution_message IS
  'Custom message shown inside the pre-execution gate.';
COMMENT ON COLUMN public.agx_shortcut.bypass_gate_seconds IS
  'Seconds before the gate auto-executes. 0 = wait for user indefinitely.';
COMMENT ON COLUMN public.agx_shortcut.default_user_input IS
  'Designer-provided extra instructions appended to the template. Not user-editable, not visible.';
COMMENT ON COLUMN public.agx_shortcut.default_variables IS
  'JSON object keyed by agent variable NAME. Overrides agent defaults; scope-mappings + user edits still override this.';
COMMENT ON COLUMN public.agx_shortcut.context_overrides IS
  'JSON object keyed by context-slot KEY. Adds new slots and/or seeds default values for agent-declared slots.';
COMMENT ON COLUMN public.agx_shortcut.llm_overrides IS
  'JSON object of partial LLMParams (temperature, model_id, max_output_tokens, etc.). Delta-only.';

COMMIT;

-- ============================================================
-- Post-migration checklist (manual)
--   1. Run `npm run types` (or equivalent) to regenerate
--      types/database.types.ts
--   2. Remove `as any` casts in:
--        - app/api/agent-context-menu/route.ts
--        - app/api/agent-shortcuts/**
--   3. Update the agent_context_menu_view if it joins agx_shortcut
--      columns that were renamed. (It joins most columns by name
--      as `result_display`, etc. — needs refresh.)
-- ============================================================
