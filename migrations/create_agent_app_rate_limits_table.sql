-- ============================================================
-- Phase 8.4 — agent_app_rate_limits table + enforcement trigger
-- ============================================================
-- Per-(app, identifier) rolling-window counter. Enforcement is
-- done by a BEFORE INSERT trigger on agent_app_executions that
-- increments the counter and rejects the insert if the window
-- cap has been exceeded.
--
-- Identifier precedence: user_id → fingerprint → ip_address.
-- Window length is set on the app (rate_limit_window_hours) and
-- the cap is chosen based on whether the caller is authenticated
-- (rate_limit_authenticated) or anonymous (rate_limit_per_ip).
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.agent_app_rate_limits (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id                uuid NOT NULL REFERENCES public.agent_apps(id) ON DELETE CASCADE,

  user_id               uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  fingerprint           text,
  ip_address            inet,

  execution_count       integer NOT NULL DEFAULT 0,
  first_execution_at    timestamptz NOT NULL DEFAULT now(),
  last_execution_at     timestamptz NOT NULL DEFAULT now(),
  window_start_at       timestamptz NOT NULL DEFAULT now(),

  is_blocked            boolean DEFAULT false,
  blocked_until         timestamptz,
  blocked_reason        text,

  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- One row per (app, identifier) — a partial unique index per identifier kind
CREATE UNIQUE INDEX IF NOT EXISTS uq_agent_app_rate_limits_user
  ON public.agent_app_rate_limits(app_id, user_id)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_agent_app_rate_limits_fingerprint
  ON public.agent_app_rate_limits(app_id, fingerprint)
  WHERE user_id IS NULL AND fingerprint IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_agent_app_rate_limits_ip
  ON public.agent_app_rate_limits(app_id, ip_address)
  WHERE user_id IS NULL AND fingerprint IS NULL AND ip_address IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_agent_app_rate_limits_window
  ON public.agent_app_rate_limits(app_id, window_start_at);

-- ------------------------------------------------------------
-- Enforcement: BEFORE INSERT on agent_app_executions
-- Resolves identifier, rolls the window if stale, increments
-- the counter, and throws if the cap is exceeded.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_agent_app_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_app                  public.agent_apps%ROWTYPE;
  v_window_hours         integer;
  v_cap                  integer;
  v_window_start_cutoff  timestamptz;
  v_rate                 public.agent_app_rate_limits%ROWTYPE;
  v_ip                   inet;
BEGIN
  SELECT * INTO v_app FROM public.agent_apps WHERE id = NEW.app_id;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  v_window_hours := GREATEST(COALESCE(v_app.rate_limit_window_hours, 24), 1);
  v_window_start_cutoff := now() - make_interval(hours => v_window_hours);

  IF NEW.user_id IS NOT NULL THEN
    v_cap := COALESCE(v_app.rate_limit_authenticated, 100);
  ELSE
    v_cap := COALESCE(v_app.rate_limit_per_ip, 20);
  END IF;

  v_ip := NEW.ip_address;

  -- Fetch-or-create the row for this identifier (user_id / fingerprint / ip)
  IF NEW.user_id IS NOT NULL THEN
    SELECT * INTO v_rate
    FROM public.agent_app_rate_limits
    WHERE app_id = NEW.app_id AND user_id = NEW.user_id;
  ELSIF NEW.fingerprint IS NOT NULL THEN
    SELECT * INTO v_rate
    FROM public.agent_app_rate_limits
    WHERE app_id = NEW.app_id AND user_id IS NULL AND fingerprint = NEW.fingerprint;
  ELSIF v_ip IS NOT NULL THEN
    SELECT * INTO v_rate
    FROM public.agent_app_rate_limits
    WHERE app_id = NEW.app_id AND user_id IS NULL AND fingerprint IS NULL AND ip_address = v_ip;
  END IF;

  IF v_rate.id IS NULL THEN
    INSERT INTO public.agent_app_rate_limits (
      app_id, user_id, fingerprint, ip_address,
      execution_count, first_execution_at, last_execution_at, window_start_at
    ) VALUES (
      NEW.app_id, NEW.user_id, NEW.fingerprint, v_ip,
      1, now(), now(), now()
    )
    RETURNING * INTO v_rate;

    RETURN NEW;
  END IF;

  IF v_rate.is_blocked AND (v_rate.blocked_until IS NULL OR v_rate.blocked_until > now()) THEN
    RAISE EXCEPTION 'agent_app_rate_limit_exceeded: app=% identifier_blocked until=%',
      NEW.app_id, v_rate.blocked_until
      USING ERRCODE = 'check_violation';
  END IF;

  -- Roll the window if stale
  IF v_rate.window_start_at < v_window_start_cutoff THEN
    UPDATE public.agent_app_rate_limits
       SET execution_count = 1,
           window_start_at = now(),
           last_execution_at = now(),
           is_blocked = false,
           blocked_until = NULL,
           blocked_reason = NULL,
           updated_at = now()
     WHERE id = v_rate.id;
    RETURN NEW;
  END IF;

  -- Inside the window — enforce the cap
  IF v_rate.execution_count >= v_cap THEN
    UPDATE public.agent_app_rate_limits
       SET is_blocked = true,
           blocked_until = v_rate.window_start_at + make_interval(hours => v_window_hours),
           blocked_reason = 'window_cap_exceeded',
           last_execution_at = now(),
           updated_at = now()
     WHERE id = v_rate.id;

    RAISE EXCEPTION 'agent_app_rate_limit_exceeded: app=% count=% cap=%',
      NEW.app_id, v_rate.execution_count, v_cap
      USING ERRCODE = 'check_violation';
  END IF;

  UPDATE public.agent_app_rate_limits
     SET execution_count = execution_count + 1,
         last_execution_at = now(),
         updated_at = now()
   WHERE id = v_rate.id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_agent_app_rate_limit ON public.agent_app_executions;
CREATE TRIGGER trg_agent_app_rate_limit
  BEFORE INSERT ON public.agent_app_executions
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_agent_app_rate_limit();

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.agent_app_rate_limits_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_agent_app_rate_limits_updated_at ON public.agent_app_rate_limits;
CREATE TRIGGER trg_agent_app_rate_limits_updated_at
  BEFORE UPDATE ON public.agent_app_rate_limits
  FOR EACH ROW
  EXECUTE FUNCTION public.agent_app_rate_limits_set_updated_at();

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
ALTER TABLE public.agent_app_rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agent_app_rate_limits_read_owner"   ON public.agent_app_rate_limits;
DROP POLICY IF EXISTS "agent_app_rate_limits_service_role" ON public.agent_app_rate_limits;

CREATE POLICY "agent_app_rate_limits_read_owner"
ON public.agent_app_rate_limits FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.agent_apps a
    WHERE a.id = agent_app_rate_limits.app_id
      AND (a.user_id = auth.uid()
        OR (a.organization_id IS NOT NULL AND public.is_org_admin(a.organization_id))
        OR (a.user_id IS NULL AND a.organization_id IS NULL AND a.project_id IS NULL AND a.task_id IS NULL AND public.is_platform_admin()))
  )
);

CREATE POLICY "agent_app_rate_limits_service_role"
ON public.agent_app_rate_limits FOR ALL TO service_role
USING (true) WITH CHECK (true);

COMMIT;

COMMENT ON TABLE  public.agent_app_rate_limits IS 'Per-(app,identifier) rolling-window execution counter. Enforced by trigger on agent_app_executions INSERT.';
COMMENT ON FUNCTION public.enforce_agent_app_rate_limit IS 'Rejects agent_app_executions inserts that exceed the app rate cap in the current window. Raises check_violation.';
