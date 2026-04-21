-- ============================================================
-- Phase 8.2 — agent_app_executions table
-- ============================================================
-- Per-execution log for agent apps. Mirrors prompt_app_executions.
-- Used for analytics, guest-limit tracking, and forensics.
--
-- Requires: agent_apps, ai_tasks (existing).
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.agent_app_executions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id                uuid NOT NULL REFERENCES public.agent_apps(id) ON DELETE CASCADE,

  user_id               uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  fingerprint           text,
  ip_address            inet,
  user_agent            text,

  task_id               uuid NOT NULL,

  variables_provided    jsonb DEFAULT '{}'::jsonb,
  variables_used        jsonb DEFAULT '{}'::jsonb,

  success               boolean DEFAULT true,
  error_type            text,
  error_message         text,

  execution_time_ms     integer,
  tokens_used           integer,
  cost                  numeric(12,6),

  referer               text,
  metadata              jsonb DEFAULT '{}'::jsonb,

  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_app_executions_app_id       ON public.agent_app_executions(app_id);
CREATE INDEX IF NOT EXISTS idx_agent_app_executions_user_id      ON public.agent_app_executions(user_id)     WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agent_app_executions_fingerprint  ON public.agent_app_executions(fingerprint) WHERE fingerprint IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agent_app_executions_task_id      ON public.agent_app_executions(task_id);
CREATE INDEX IF NOT EXISTS idx_agent_app_executions_created_at   ON public.agent_app_executions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_app_executions_success      ON public.agent_app_executions(app_id, success, created_at DESC);

-- Unique task_id per execution (one task_id, one execution row)
CREATE UNIQUE INDEX IF NOT EXISTS uq_agent_app_executions_task_id ON public.agent_app_executions(task_id);

-- ------------------------------------------------------------
-- Success-rate rollup trigger (mirrors prompt_apps approach)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_agent_app_success_rate()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
  v_success_count INTEGER;
  v_total_count   INTEGER;
  v_rate          NUMERIC(5,4);
BEGIN
  SELECT
    COUNT(*) FILTER (WHERE success = true),
    COUNT(*)
  INTO v_success_count, v_total_count
  FROM public.agent_app_executions
  WHERE app_id = NEW.app_id;

  IF v_total_count > 0 THEN
    v_rate := (v_success_count::NUMERIC / v_total_count);
    UPDATE public.agent_apps
       SET success_rate     = v_rate,
           total_executions = v_total_count,
           last_execution_at = GREATEST(COALESCE(last_execution_at, '-infinity'::timestamptz), NEW.created_at)
     WHERE id = NEW.app_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_agent_app_exec_success_rate ON public.agent_app_executions;
CREATE TRIGGER trg_agent_app_exec_success_rate
  AFTER INSERT OR UPDATE OF success ON public.agent_app_executions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_agent_app_success_rate();

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
ALTER TABLE public.agent_app_executions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agent_app_executions_read_owner"   ON public.agent_app_executions;
DROP POLICY IF EXISTS "agent_app_executions_read_self"    ON public.agent_app_executions;
DROP POLICY IF EXISTS "agent_app_executions_insert_any"   ON public.agent_app_executions;
DROP POLICY IF EXISTS "agent_app_executions_insert_anon"  ON public.agent_app_executions;
DROP POLICY IF EXISTS "agent_app_executions_update_own"   ON public.agent_app_executions;
DROP POLICY IF EXISTS "agent_app_executions_service_role" ON public.agent_app_executions;

CREATE POLICY "agent_app_executions_read_owner"
ON public.agent_app_executions FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.agent_apps a
    WHERE a.id = agent_app_executions.app_id
      AND (a.user_id = auth.uid()
        OR (a.organization_id IS NOT NULL AND public.is_org_admin(a.organization_id))
        OR (a.user_id IS NULL AND a.organization_id IS NULL AND a.project_id IS NULL AND a.task_id IS NULL AND public.is_platform_admin()))
  )
);

CREATE POLICY "agent_app_executions_read_self"
ON public.agent_app_executions FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "agent_app_executions_insert_any"
ON public.agent_app_executions FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.agent_apps a
    WHERE a.id = agent_app_executions.app_id
      AND a.status = 'published'
  )
);

CREATE POLICY "agent_app_executions_insert_anon"
ON public.agent_app_executions FOR INSERT TO anon
WITH CHECK (
  user_id IS NULL
  AND EXISTS (
    SELECT 1 FROM public.agent_apps a
    WHERE a.id = agent_app_executions.app_id
      AND a.status = 'published'
      AND a.is_public = true
  )
);

CREATE POLICY "agent_app_executions_update_own"
ON public.agent_app_executions FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.agent_apps a
    WHERE a.id = agent_app_executions.app_id
      AND a.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.agent_apps a
    WHERE a.id = agent_app_executions.app_id
      AND a.user_id = auth.uid()
  )
);

CREATE POLICY "agent_app_executions_service_role"
ON public.agent_app_executions FOR ALL TO service_role
USING (true) WITH CHECK (true);

COMMIT;

COMMENT ON TABLE public.agent_app_executions IS 'Per-execution log for agent_apps. Guest rows carry fingerprint + ip; authenticated rows carry user_id.';
