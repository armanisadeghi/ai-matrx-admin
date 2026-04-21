-- ============================================================
-- Phase 1.3 — agent_context_menu_view
-- ============================================================
-- Agent-aware mirror of `context_menu_unified_view`. Returns
-- placement-grouped category trees with items (agent shortcuts +
-- content blocks) visible to the calling user across every scope
-- they belong to (global, user, organization).
--
-- SHAPE PARITY: the output is intentionally identical in structure
-- to `context_menu_unified_view` so Phase 3's new menu can consume it
-- with zero re-shaping beyond swapping 'prompt_shortcut'/'prompt_builtin'
-- keys for 'agent_shortcut'/'agent'.
--
-- SCOPE PRECEDENCE: visibility only. The UI layer (Phase 3 hook) is
-- responsible for collapsing duplicate labels by precedence
-- user > organization > global.
--
-- CONSUMED BY:
--   • fetchUnifiedMenu thunk (Phase 1.5)
--   • useUnifiedAgentContextMenu hook (Phase 3)
--   • get_ssr_shell_data RPC (SSR hydration — updated in Phase 3)
-- ============================================================

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
          'result_display',      s.result_display,
          'auto_run',            s.auto_run,
          'allow_chat',          s.allow_chat,
          'show_variables',      s.show_variables,
          'apply_variables',     s.apply_variables,
          'use_pre_execution_input', s.use_pre_execution_input,
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
'Agent-aware replacement for context_menu_unified_view. Output shape is
intentionally parallel. Row-level visibility is delegated to the underlying
tables'' RLS (shortcut_categories, agx_shortcut, content_blocks). The UI
layer applies scope precedence (user > organization > global).';
