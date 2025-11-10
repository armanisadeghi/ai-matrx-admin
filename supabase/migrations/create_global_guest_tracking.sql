-- ============================================================================
-- GLOBAL GUEST TRACKING SYSTEM
-- ============================================================================
-- This replaces per-app rate limiting with global guest execution tracking
-- ============================================================================

-- ============================================================================
-- 1. GLOBAL GUEST EXECUTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.guest_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Guest Identification (one of these will be populated)
  fingerprint TEXT NOT NULL UNIQUE,  -- FingerprintJS visitor ID
  
  -- Backup identifiers (for debugging)
  ip_address INET,
  user_agent TEXT,
  
  -- Execution Tracking
  total_executions INTEGER DEFAULT 0,
  first_execution_at TIMESTAMPTZ DEFAULT NOW(),
  last_execution_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Daily reset tracking
  daily_reset_at TIMESTAMPTZ DEFAULT DATE_TRUNC('day', NOW()),
  daily_executions INTEGER DEFAULT 0,
  
  -- Status
  is_blocked BOOLEAN DEFAULT false,
  blocked_until TIMESTAMPTZ,
  blocked_reason TEXT,
  
  -- Conversion tracking
  converted_to_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  converted_at TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_guest_executions_fingerprint ON guest_executions(fingerprint);
CREATE INDEX IF NOT EXISTS idx_guest_executions_ip ON guest_executions(ip_address);
CREATE INDEX IF NOT EXISTS idx_guest_executions_blocked ON guest_executions(is_blocked) WHERE is_blocked = true;
CREATE INDEX IF NOT EXISTS idx_guest_executions_daily_reset ON guest_executions(daily_reset_at);

-- ============================================================================
-- 2. GUEST EXECUTION LOG (Detailed tracking per interaction)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.guest_execution_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Link to guest
  guest_id UUID NOT NULL REFERENCES guest_executions(id) ON DELETE CASCADE,
  fingerprint TEXT NOT NULL,  -- Denormalized for faster queries
  
  -- What was executed
  resource_type TEXT NOT NULL,  -- 'prompt_app', 'chat', 'voice', etc.
  resource_id UUID,             -- App ID or other resource
  resource_name TEXT,           -- For display
  
  -- Execution details
  task_id UUID,                 -- Link to ai_tasks if applicable
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  
  -- Costs
  tokens_used INTEGER,
  cost DECIMAL(10,6),
  execution_time_ms INTEGER,
  
  -- Context
  ip_address INET,
  user_agent TEXT,
  referer TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_guest_log_guest_id ON guest_execution_log(guest_id);
CREATE INDEX IF NOT EXISTS idx_guest_log_fingerprint ON guest_execution_log(fingerprint);
CREATE INDEX IF NOT EXISTS idx_guest_log_created ON guest_execution_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_guest_log_resource ON guest_execution_log(resource_type, resource_id);

-- ============================================================================
-- 3. FUNCTIONS
-- ============================================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_guest_executions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_guest_executions_updated_at_trg ON guest_executions;
CREATE TRIGGER update_guest_executions_updated_at_trg
  BEFORE UPDATE ON guest_executions
  FOR EACH ROW
  EXECUTE FUNCTION update_guest_executions_updated_at();

-- Reset daily counters
CREATE OR REPLACE FUNCTION reset_daily_guest_counters()
RETURNS void AS $$
BEGIN
  UPDATE guest_executions
  SET 
    daily_executions = 0,
    daily_reset_at = DATE_TRUNC('day', NOW())
  WHERE daily_reset_at < DATE_TRUNC('day', NOW());
END;
$$ LANGUAGE plpgsql;

-- Check if guest can execute (global limit check)
CREATE OR REPLACE FUNCTION check_guest_execution_limit(
  p_fingerprint TEXT,
  p_max_executions INTEGER DEFAULT 5
)
RETURNS TABLE(
  allowed BOOLEAN,
  remaining INTEGER,
  total_used INTEGER,
  is_blocked BOOLEAN,
  guest_id UUID
) AS $$
DECLARE
  v_guest guest_executions%ROWTYPE;
BEGIN
  -- Get or create guest record
  SELECT * INTO v_guest
  FROM guest_executions
  WHERE fingerprint = p_fingerprint;
  
  -- If no record exists, they can execute (will be created on first execution)
  IF v_guest IS NULL THEN
    RETURN QUERY SELECT true, p_max_executions - 1, 0, false, NULL::UUID;
    RETURN;
  END IF;
  
  -- Check if blocked
  IF v_guest.is_blocked AND (v_guest.blocked_until IS NULL OR v_guest.blocked_until > NOW()) THEN
    RETURN QUERY SELECT false, 0, v_guest.total_executions, true, v_guest.id;
    RETURN;
  END IF;
  
  -- Check daily limit (resets every 24h)
  IF v_guest.daily_reset_at < DATE_TRUNC('day', NOW()) THEN
    -- Reset daily counter
    UPDATE guest_executions
    SET 
      daily_executions = 0,
      daily_reset_at = DATE_TRUNC('day', NOW())
    WHERE id = v_guest.id;
    
    v_guest.daily_executions := 0;
  END IF;
  
  -- Check if limit reached
  IF v_guest.daily_executions >= p_max_executions THEN
    RETURN QUERY SELECT 
      false, 
      0, 
      v_guest.total_executions,
      false,
      v_guest.id;
    RETURN;
  END IF;
  
  -- Allow execution
  RETURN QUERY SELECT 
    true, 
    p_max_executions - v_guest.daily_executions - 1,
    v_guest.total_executions,
    false,
    v_guest.id;
END;
$$ LANGUAGE plpgsql;

-- Record guest execution
CREATE OR REPLACE FUNCTION record_guest_execution(
  p_fingerprint TEXT,
  p_resource_type TEXT,
  p_resource_id UUID DEFAULT NULL,
  p_resource_name TEXT DEFAULT NULL,
  p_task_id UUID DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_referer TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_guest_id UUID;
  v_log_id UUID;
BEGIN
  -- Insert or update guest record
  INSERT INTO guest_executions (
    fingerprint,
    ip_address,
    user_agent,
    total_executions,
    daily_executions,
    last_execution_at
  )
  VALUES (
    p_fingerprint,
    p_ip_address,
    p_user_agent,
    1,
    1,
    NOW()
  )
  ON CONFLICT (fingerprint)
  DO UPDATE SET
    total_executions = guest_executions.total_executions + 1,
    daily_executions = CASE
      WHEN guest_executions.daily_reset_at < DATE_TRUNC('day', NOW())
      THEN 1
      ELSE guest_executions.daily_executions + 1
    END,
    daily_reset_at = CASE
      WHEN guest_executions.daily_reset_at < DATE_TRUNC('day', NOW())
      THEN DATE_TRUNC('day', NOW())
      ELSE guest_executions.daily_reset_at
    END,
    last_execution_at = NOW(),
    ip_address = COALESCE(p_ip_address, guest_executions.ip_address),
    user_agent = COALESCE(p_user_agent, guest_executions.user_agent)
  RETURNING id INTO v_guest_id;
  
  -- Create log entry
  INSERT INTO guest_execution_log (
    guest_id,
    fingerprint,
    resource_type,
    resource_id,
    resource_name,
    task_id,
    ip_address,
    user_agent,
    referer
  )
  VALUES (
    v_guest_id,
    p_fingerprint,
    p_resource_type,
    p_resource_id,
    p_resource_name,
    p_task_id,
    p_ip_address,
    p_user_agent,
    p_referer
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE guest_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_execution_log ENABLE ROW LEVEL SECURITY;

-- Admins can see everything
CREATE POLICY "admin_all_guest_executions" ON guest_executions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email LIKE '%@aimatrx.com'
    )
  );

CREATE POLICY "admin_all_guest_logs" ON guest_execution_log
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email LIKE '%@aimatrx.com'
    )
  );

-- Public can check their own limits (no auth required for reads)
CREATE POLICY "guests_can_check_own_limits" ON guest_executions
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Service role can insert/update
CREATE POLICY "service_can_manage_guests" ON guest_executions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "service_can_manage_logs" ON guest_execution_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 5. CLEANUP OLD DATA (Optional - run manually or via cron)
-- ============================================================================

-- Delete guest records older than 90 days that never converted
CREATE OR REPLACE FUNCTION cleanup_old_guest_records()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM guest_executions
  WHERE 
    converted_to_user_id IS NULL
    AND last_execution_at < NOW() - INTERVAL '90 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SUCCESS!
-- ============================================================================
-- After running this migration:
-- 1. Global guest tracking table created
-- 2. Execution log for detailed history
-- 3. Functions for checking limits and recording executions
-- 4. Daily reset mechanism (5 free runs per day)
-- 5. RLS policies for security
--
-- Next steps:
-- 1. Update API endpoints to use new functions
-- 2. Remove per-app rate limiting
-- 3. Add UI components for warnings and signup
-- ============================================================================

