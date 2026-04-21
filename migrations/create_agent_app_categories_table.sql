-- ============================================================
-- Phase 8.6 — agent_app_categories table
-- ============================================================
-- Static category list for agent apps. Mirrors prompt_app_categories.
-- Populated by admins; referenced by agent_apps.category (text, not FK)
-- for the same loose-coupling the legacy system uses.
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.agent_app_categories (
  id           text PRIMARY KEY,
  name         text NOT NULL,
  description  text,
  icon         text,
  sort_order   integer DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_agent_app_categories_sort
  ON public.agent_app_categories(sort_order);

-- Seed starter set (idempotent)
INSERT INTO public.agent_app_categories (id, name, description, icon, sort_order) VALUES
  ('writing',      'Writing',      'Content creation, editing, and writing tools',       'PenTool',      10),
  ('productivity', 'Productivity', 'Task management, summarization, and efficiency',     'CheckSquare',  20),
  ('research',     'Research',     'Search, analysis, and investigation tools',          'Search',       30),
  ('coding',       'Coding',       'Developer tools, code assistants, and snippets',     'Code2',        40),
  ('education',    'Education',    'Teaching, tutoring, and learning aids',              'GraduationCap',50),
  ('marketing',    'Marketing',    'Copy, ads, SEO, and brand tools',                    'Megaphone',    60),
  ('creative',     'Creative',     'Art, ideation, and creative brainstorming',          'Palette',      70),
  ('business',     'Business',     'Strategy, operations, and business support',         'Briefcase',    80),
  ('data',         'Data',         'Analysis, visualization, and data tools',            'BarChart3',    90),
  ('other',        'Other',        'Everything else',                                    'Sparkles',    100)
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------
-- RLS — read-all, platform-admin-write
-- ------------------------------------------------------------
ALTER TABLE public.agent_app_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agent_app_categories_read_auth"    ON public.agent_app_categories;
DROP POLICY IF EXISTS "agent_app_categories_read_anon"    ON public.agent_app_categories;
DROP POLICY IF EXISTS "agent_app_categories_write_admin"  ON public.agent_app_categories;
DROP POLICY IF EXISTS "agent_app_categories_service_role" ON public.agent_app_categories;

CREATE POLICY "agent_app_categories_read_auth"
ON public.agent_app_categories FOR SELECT TO authenticated
USING (true);

CREATE POLICY "agent_app_categories_read_anon"
ON public.agent_app_categories FOR SELECT TO anon
USING (true);

CREATE POLICY "agent_app_categories_write_admin"
ON public.agent_app_categories FOR ALL TO authenticated
USING (public.is_platform_admin())
WITH CHECK (public.is_platform_admin());

CREATE POLICY "agent_app_categories_service_role"
ON public.agent_app_categories FOR ALL TO service_role
USING (true) WITH CHECK (true);

COMMIT;

COMMENT ON TABLE public.agent_app_categories IS 'Static category list for agent_apps. Platform-admin-owned.';
