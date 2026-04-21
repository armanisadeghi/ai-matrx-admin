-- ============================================================
-- Phase 8.3 — agent_app_errors table
-- ============================================================
-- Error registry for agent_apps. Populated by the sandbox error
-- boundary, stream-error paths, and a trigger that emits an entry
-- when an execution row is flagged unsuccessful.
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.agent_app_errors (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id              uuid NOT NULL REFERENCES public.agent_apps(id) ON DELETE CASCADE,
  execution_id        uuid REFERENCES public.agent_app_executions(id) ON DELETE SET NULL,

  error_type          text NOT NULL,
  error_code          text,
  error_message       text,
  error_details       jsonb DEFAULT '{}'::jsonb,

  variables_sent      jsonb DEFAULT '{}'::jsonb,
  expected_variables  jsonb DEFAULT '{}'::jsonb,

  resolved            boolean DEFAULT false,
  resolved_at         timestamptz,
  resolved_by         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_notes    text,

  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_app_errors_app_id       ON public.agent_app_errors(app_id);
CREATE INDEX IF NOT EXISTS idx_agent_app_errors_execution_id ON public.agent_app_errors(execution_id) WHERE execution_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agent_app_errors_unresolved   ON public.agent_app_errors(app_id, resolved) WHERE resolved = false;
CREATE INDEX IF NOT EXISTS idx_agent_app_errors_created_at   ON public.agent_app_errors(created_at DESC);

-- ------------------------------------------------------------
-- Auto-emit an error row when an execution is marked failed
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_agent_app_error_on_failed_execution()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.success = false AND NEW.error_type IS NOT NULL THEN
    INSERT INTO public.agent_app_errors (
      app_id, execution_id, error_type, error_message, error_details, variables_sent
    )
    VALUES (
      NEW.app_id,
      NEW.id,
      NEW.error_type,
      NEW.error_message,
      COALESCE(NEW.metadata, '{}'::jsonb),
      COALESCE(NEW.variables_provided, '{}'::jsonb)
    )
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_agent_app_error_on_failed_exec ON public.agent_app_executions;
CREATE TRIGGER trg_agent_app_error_on_failed_exec
  AFTER INSERT OR UPDATE OF success, error_type ON public.agent_app_executions
  FOR EACH ROW
  WHEN (NEW.success = false AND NEW.error_type IS NOT NULL)
  EXECUTE FUNCTION public.create_agent_app_error_on_failed_execution();

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
ALTER TABLE public.agent_app_errors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agent_app_errors_read_owner"   ON public.agent_app_errors;
DROP POLICY IF EXISTS "agent_app_errors_update_owner" ON public.agent_app_errors;
DROP POLICY IF EXISTS "agent_app_errors_service_role" ON public.agent_app_errors;

CREATE POLICY "agent_app_errors_read_owner"
ON public.agent_app_errors FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.agent_apps a
    WHERE a.id = agent_app_errors.app_id
      AND (a.user_id = auth.uid()
        OR (a.organization_id IS NOT NULL AND public.is_org_admin(a.organization_id))
        OR (a.user_id IS NULL AND a.organization_id IS NULL AND a.project_id IS NULL AND a.task_id IS NULL AND public.is_platform_admin()))
  )
);

CREATE POLICY "agent_app_errors_update_owner"
ON public.agent_app_errors FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.agent_apps a
    WHERE a.id = agent_app_errors.app_id
      AND (a.user_id = auth.uid()
        OR (a.organization_id IS NOT NULL AND public.is_org_admin(a.organization_id)))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.agent_apps a
    WHERE a.id = agent_app_errors.app_id
      AND (a.user_id = auth.uid()
        OR (a.organization_id IS NOT NULL AND public.is_org_admin(a.organization_id)))
  )
);

CREATE POLICY "agent_app_errors_service_role"
ON public.agent_app_errors FOR ALL TO service_role
USING (true) WITH CHECK (true);

COMMIT;

COMMENT ON TABLE public.agent_app_errors IS 'Error log for agent_apps. Auto-populated by trigger on failed executions; manually written for sandbox render errors.';
