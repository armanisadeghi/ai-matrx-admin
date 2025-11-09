-- ============================================================================
-- PROMPT APPS SYSTEM - Public shareable AI-powered mini-apps
-- ============================================================================
-- Purpose: Allow users to create custom UIs for their prompts that become
-- public web apps accessible via unique slugs (e.g., aimatrx.com/p/story-generator)
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- For gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search (trigrams)

-- ============================================================================
-- MAIN TABLE: prompt_apps
-- ============================================================================

CREATE TABLE prompt_apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Ownership & Association
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt_id UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  
  -- Public Identity
  slug TEXT UNIQUE NOT NULL,  -- URL-friendly: aimatrx.com/p/{slug}
  name TEXT NOT NULL,
  tagline TEXT,               -- Short description (1-2 sentences)
  description TEXT,           -- Full description with markdown
  category TEXT,              -- 'productivity', 'creative', 'education', etc.
  tags TEXT[] DEFAULT '{}',
  
  -- Visual Assets
  preview_image_url TEXT,
  favicon_url TEXT,
  
  -- Component Code
  component_code TEXT NOT NULL,     -- React/JSX as string (AI-generated)
  component_language TEXT NOT NULL DEFAULT 'react', -- 'react' or 'html'
  
  -- Variable Contract (what the UI promises to provide)
  variable_schema JSONB DEFAULT '[]',
  -- Example: [{"name": "topic", "type": "string", "required": true}]
  
  -- Allowed Dependencies (security)
  allowed_imports JSONB DEFAULT '[]',
  -- Example: ["react", "lucide-react", "@/components/ui/button"]
  
  -- Configuration
  layout_config JSONB DEFAULT '{}',
  -- Example: {"theme": "dark", "maxWidth": "800px", "showBranding": true}
  
  styling_config JSONB DEFAULT '{}',
  -- Example: {"primaryColor": "#3b82f6", "customCSS": "..."}
  
  -- Publishing & Status
  status TEXT NOT NULL DEFAULT 'draft',
  -- Options: 'draft', 'published', 'archived', 'suspended'
  
  is_verified BOOLEAN DEFAULT false,    -- Manually verified by admin
  is_featured BOOLEAN DEFAULT false,    -- Featured on homepage
  
  -- Rate Limiting (per app)
  rate_limit_per_ip INTEGER DEFAULT 5,           -- Max executions per IP/session
  rate_limit_window_hours INTEGER DEFAULT 24,    -- Reset window
  rate_limit_authenticated INTEGER DEFAULT 100,  -- Higher limit for logged-in users
  
  -- Usage Statistics (updated via triggers)
  total_executions INTEGER DEFAULT 0,
  unique_users_count INTEGER DEFAULT 0,
  success_rate DECIMAL(5,2) DEFAULT 100.00,
  avg_execution_time_ms INTEGER,
  
  -- Cost Tracking
  total_tokens_used INTEGER DEFAULT 0,
  total_cost DECIMAL(10,4) DEFAULT 0.0000,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  -- Example: {"aiGeneratedAt": "...", "generationPrompt": "...", "version": 1}
  
  -- Full-text search (trigger-maintained)
  search_tsv tsvector,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  last_execution_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT valid_status CHECK (status IN ('draft', 'published', 'archived', 'suspended')),
  CONSTRAINT valid_component_language CHECK (component_language IN ('react', 'html')),
  CONSTRAINT valid_slug CHECK (slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$' AND length(slug) BETWEEN 3 AND 50),
  CONSTRAINT positive_rate_limits CHECK (
    rate_limit_per_ip > 0 AND 
    rate_limit_window_hours > 0 AND 
    rate_limit_authenticated > 0
  )
);

-- ============================================================================
-- EXECUTIONS TABLE: prompt_app_executions
-- ============================================================================

CREATE TABLE prompt_app_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Association
  app_id UUID NOT NULL REFERENCES prompt_apps(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- NULL for anonymous
  
  -- Anonymous Tracking
  fingerprint TEXT,           -- Browser fingerprint
  ip_address INET,            -- IP address (hashed for privacy)
  user_agent TEXT,
  
  -- Execution Details
  task_id UUID NOT NULL,      -- Socket.IO task ID (links to ai_tasks if logged in)
  variables_provided JSONB DEFAULT '{}',
  variables_used JSONB DEFAULT '{}',    -- After validation/defaults applied
  
  -- Results
  success BOOLEAN DEFAULT false,
  error_type TEXT,
  error_message TEXT,
  
  -- Performance
  execution_time_ms INTEGER,
  tokens_used INTEGER,
  cost DECIMAL(10,6),
  
  -- Metadata
  referer TEXT,               -- Where did user come from?
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes (created below)
  CONSTRAINT valid_error_type CHECK (error_type IS NULL OR error_type IN (
    'missing_variables', 'invalid_variables', 'rate_limit_exceeded',
    'execution_error', 'timeout', 'cost_limit_exceeded'
  ))
);

-- ============================================================================
-- ERRORS TABLE: prompt_app_errors
-- ============================================================================

CREATE TABLE prompt_app_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  app_id UUID NOT NULL REFERENCES prompt_apps(id) ON DELETE CASCADE,
  execution_id UUID REFERENCES prompt_app_executions(id) ON DELETE SET NULL,
  
  error_type TEXT NOT NULL,
  error_code TEXT,
  error_message TEXT,
  error_details JSONB DEFAULT '{}',
  
  -- Context
  variables_sent JSONB DEFAULT '{}',
  expected_variables JSONB DEFAULT '{}',
  
  -- Resolution
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_error_type CHECK (error_type IN (
    'missing_variable', 'extra_variable', 'invalid_variable_type',
    'component_render_error', 'api_error', 'rate_limit', 'other'
  ))
);

-- ============================================================================
-- RATE LIMITING TABLE: prompt_app_rate_limits
-- ============================================================================

CREATE TABLE prompt_app_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  app_id UUID NOT NULL REFERENCES prompt_apps(id) ON DELETE CASCADE,
  
  -- Identifier (one of these will be populated)
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,     -- For authenticated users
  fingerprint TEXT,                                              -- For anonymous users
  ip_address INET,                                               -- Fallback
  
  -- Usage Tracking
  execution_count INTEGER DEFAULT 1,
  first_execution_at TIMESTAMPTZ DEFAULT NOW(),
  last_execution_at TIMESTAMPTZ DEFAULT NOW(),
  window_start_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Status
  is_blocked BOOLEAN DEFAULT false,
  blocked_until TIMESTAMPTZ,
  blocked_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: one record per identifier per app
  UNIQUE(app_id, user_id),
  UNIQUE(app_id, fingerprint),
  UNIQUE(app_id, ip_address)
);

-- ============================================================================
-- ANALYTICS VIEW: prompt_app_analytics
-- ============================================================================

CREATE VIEW prompt_app_analytics AS
SELECT 
  pa.id AS app_id,
  pa.slug,
  pa.name,
  pa.user_id AS creator_id,
  pa.status,
  pa.total_executions,
  
  -- Time-based metrics
  COUNT(DISTINCT pae.id) FILTER (WHERE pae.created_at > NOW() - INTERVAL '24 hours') AS executions_24h,
  COUNT(DISTINCT pae.id) FILTER (WHERE pae.created_at > NOW() - INTERVAL '7 days') AS executions_7d,
  COUNT(DISTINCT pae.id) FILTER (WHERE pae.created_at > NOW() - INTERVAL '30 days') AS executions_30d,
  
  -- User metrics
  COUNT(DISTINCT pae.fingerprint) AS unique_anonymous_users,
  COUNT(DISTINCT pae.user_id) FILTER (WHERE pae.user_id IS NOT NULL) AS unique_authenticated_users,
  
  -- Success metrics
  COUNT(*) FILTER (WHERE pae.success = true) AS successful_executions,
  COUNT(*) FILTER (WHERE pae.success = false) AS failed_executions,
  ROUND(
    (COUNT(*) FILTER (WHERE pae.success = true)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 
    2
  ) AS success_rate_percent,
  
  -- Performance metrics
  AVG(pae.execution_time_ms)::INTEGER AS avg_execution_time_ms,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY pae.execution_time_ms)::INTEGER AS median_execution_time_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY pae.execution_time_ms)::INTEGER AS p95_execution_time_ms,
  
  -- Cost metrics
  SUM(pae.tokens_used)::BIGINT AS total_tokens,
  SUM(pae.cost)::DECIMAL(10,4) AS total_cost,
  AVG(pae.cost)::DECIMAL(10,6) AS avg_cost_per_execution,
  
  -- Timestamps
  MIN(pae.created_at) AS first_execution_at,
  MAX(pae.created_at) AS last_execution_at

FROM prompt_apps pa
LEFT JOIN prompt_app_executions pae ON pa.id = pae.app_id
GROUP BY pa.id, pa.slug, pa.name, pa.user_id, pa.status, pa.total_executions;

-- ============================================================================
-- INDEXES
-- ============================================================================

-- prompt_apps indexes
CREATE INDEX idx_prompt_apps_user_id ON prompt_apps(user_id);
CREATE INDEX idx_prompt_apps_prompt_id ON prompt_apps(prompt_id);
-- Note: slug has UNIQUE constraint, which creates its own index automatically
CREATE INDEX idx_prompt_apps_status ON prompt_apps(status);
CREATE INDEX idx_prompt_apps_published ON prompt_apps(published_at) WHERE status = 'published';
CREATE INDEX idx_prompt_apps_category ON prompt_apps(category);
CREATE INDEX idx_prompt_apps_tags ON prompt_apps USING gin(tags);
CREATE INDEX idx_prompt_apps_featured ON prompt_apps(is_featured) WHERE is_featured = true;

-- Full-text search on generated tsvector column
CREATE INDEX idx_prompt_apps_search ON prompt_apps USING gin(search_tsv);

-- prompt_app_executions indexes
CREATE INDEX idx_executions_app_id ON prompt_app_executions(app_id);
CREATE INDEX idx_executions_user_id ON prompt_app_executions(user_id);
CREATE INDEX idx_executions_fingerprint ON prompt_app_executions(fingerprint);
CREATE INDEX idx_executions_ip_address ON prompt_app_executions(ip_address);
CREATE INDEX idx_executions_task_id ON prompt_app_executions(task_id);
CREATE INDEX idx_executions_created_at ON prompt_app_executions(created_at DESC);
CREATE INDEX idx_executions_app_created ON prompt_app_executions(app_id, created_at DESC);

-- prompt_app_errors indexes
CREATE INDEX idx_errors_app_id ON prompt_app_errors(app_id);
CREATE INDEX idx_errors_execution_id ON prompt_app_errors(execution_id);
CREATE INDEX idx_errors_type ON prompt_app_errors(error_type);
CREATE INDEX idx_errors_unresolved ON prompt_app_errors(resolved) WHERE resolved = false;
CREATE INDEX idx_errors_created_at ON prompt_app_errors(created_at DESC);

-- prompt_app_rate_limits indexes
CREATE INDEX idx_rate_limits_app_id ON prompt_app_rate_limits(app_id);
CREATE INDEX idx_rate_limits_user_id ON prompt_app_rate_limits(user_id);
CREATE INDEX idx_rate_limits_fingerprint ON prompt_app_rate_limits(fingerprint);
CREATE INDEX idx_rate_limits_ip_address ON prompt_app_rate_limits(ip_address);
CREATE INDEX idx_rate_limits_blocked ON prompt_app_rate_limits(is_blocked) WHERE is_blocked = true;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE prompt_apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_app_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_app_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_app_rate_limits ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROMPT_APPS RLS POLICIES
-- ============================================================================

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Users can view own apps" ON prompt_apps;
DROP POLICY IF EXISTS "Anyone can view published apps" ON prompt_apps;
DROP POLICY IF EXISTS "Users can create apps" ON prompt_apps;
DROP POLICY IF EXISTS "Users can update own apps" ON prompt_apps;
DROP POLICY IF EXISTS "Users can delete own apps" ON prompt_apps;

-- Create new policies
CREATE POLICY "prompt_apps_select_policy" ON prompt_apps
FOR SELECT
USING (
  user_id = auth.uid()
  OR status = 'published'
  OR has_permission('prompt_apps', id, 'viewer'::permission_level)
);

CREATE POLICY "prompt_apps_insert_policy" ON prompt_apps
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "prompt_apps_update_policy" ON prompt_apps
FOR UPDATE
USING (
  user_id = auth.uid()
  OR has_permission('prompt_apps', id, 'editor'::permission_level)
);

CREATE POLICY "prompt_apps_delete_policy" ON prompt_apps
FOR DELETE
USING (
  user_id = auth.uid()
  OR has_permission('prompt_apps', id, 'admin'::permission_level)
);

-- ============================================================================
-- PROMPT_APP_EXECUTIONS RLS POLICIES
-- ============================================================================

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Users can view own executions" ON prompt_app_executions;
DROP POLICY IF EXISTS "App owners can view their app executions" ON prompt_app_executions;

-- Create new policies
CREATE POLICY "prompt_app_executions_select_policy" ON prompt_app_executions
FOR SELECT
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM prompt_apps 
    WHERE prompt_apps.id = prompt_app_executions.app_id 
    AND (
      prompt_apps.user_id = auth.uid()
      OR has_permission('prompt_apps', prompt_apps.id, 'viewer'::permission_level)
    )
  )
);

CREATE POLICY "prompt_app_executions_insert_policy" ON prompt_app_executions
FOR INSERT
WITH CHECK (true); -- Service role will handle inserts, but allow for authenticated users too

-- ============================================================================
-- PROMPT_APP_ERRORS RLS POLICIES
-- ============================================================================

-- Drop old policies if they exist
DROP POLICY IF EXISTS "App owners can view errors" ON prompt_app_errors;

-- Create new policies
CREATE POLICY "prompt_app_errors_select_policy" ON prompt_app_errors
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM prompt_apps 
    WHERE prompt_apps.id = prompt_app_errors.app_id 
    AND (
      prompt_apps.user_id = auth.uid()
      OR has_permission('prompt_apps', prompt_apps.id, 'viewer'::permission_level)
    )
  )
);

CREATE POLICY "prompt_app_errors_insert_policy" ON prompt_app_errors
FOR INSERT
WITH CHECK (true); -- Service role handles error creation

-- ============================================================================
-- PROMPT_APP_RATE_LIMITS RLS POLICIES
-- ============================================================================

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Users can view own rate limits" ON prompt_app_rate_limits;

-- Create new policies
CREATE POLICY "prompt_app_rate_limits_select_policy" ON prompt_app_rate_limits
FOR SELECT
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM prompt_apps 
    WHERE prompt_apps.id = prompt_app_rate_limits.app_id 
    AND (
      prompt_apps.user_id = auth.uid()
      OR has_permission('prompt_apps', prompt_apps.id, 'viewer'::permission_level)
    )
  )
);

CREATE POLICY "prompt_app_rate_limits_insert_policy" ON prompt_app_rate_limits
FOR INSERT
WITH CHECK (true); -- Service role handles rate limit tracking

-- ============================================================================
-- TRIGGERS & FUNCTIONS
-- ============================================================================

-- Update search_tsv column for full-text search
CREATE OR REPLACE FUNCTION prompt_apps_tsvector_update() 
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_tsv :=
    setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', array_to_string(coalesce(NEW.tags, '{}')::text[], ' ')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prompt_apps_tsvector_update_trg
BEFORE INSERT OR UPDATE OF name, description, tags ON prompt_apps
FOR EACH ROW 
EXECUTE FUNCTION prompt_apps_tsvector_update();

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_prompt_apps_updated_at
  BEFORE UPDATE ON prompt_apps
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rate_limits_updated_at
  BEFORE UPDATE ON prompt_app_rate_limits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Increment execution count on app
CREATE OR REPLACE FUNCTION increment_app_execution_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE prompt_apps
  SET 
    total_executions = total_executions + 1,
    last_execution_at = NOW()
  WHERE id = NEW.app_id;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER increment_execution_count_on_execution
  AFTER INSERT ON prompt_app_executions
  FOR EACH ROW
  EXECUTE FUNCTION increment_app_execution_count();

-- Update success rate on app
CREATE OR REPLACE FUNCTION update_app_success_rate()
RETURNS TRIGGER AS $$
DECLARE
  success_count INTEGER;
  total_count INTEGER;
  rate DECIMAL(5,2);
BEGIN
  -- Calculate success rate for this app
  SELECT 
    COUNT(*) FILTER (WHERE success = true),
    COUNT(*)
  INTO success_count, total_count
  FROM prompt_app_executions
  WHERE app_id = NEW.app_id;
  
  IF total_count > 0 THEN
    rate := (success_count::DECIMAL / total_count) * 100;
    
    UPDATE prompt_apps
    SET success_rate = rate
    WHERE id = NEW.app_id;
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_success_rate_on_execution
  AFTER INSERT ON prompt_app_executions
  FOR EACH ROW
  EXECUTE FUNCTION update_app_success_rate();

-- Create error record when execution fails
CREATE OR REPLACE FUNCTION create_error_on_failed_execution()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.success = false AND NEW.error_type IS NOT NULL THEN
    INSERT INTO prompt_app_errors (
      app_id,
      execution_id,
      error_type,
      error_message,
      error_details,
      variables_sent
    ) VALUES (
      NEW.app_id,
      NEW.id,
      CASE NEW.error_type
        WHEN 'missing_variables' THEN 'missing_variable'
        WHEN 'invalid_variables' THEN 'invalid_variable_type'
        WHEN 'execution_error' THEN 'api_error'
        ELSE 'other'
      END,
      NEW.error_message,
      jsonb_build_object(
        'error_type', NEW.error_type,
        'execution_time_ms', NEW.execution_time_ms
      ),
      NEW.variables_provided
    );
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER create_error_on_execution_failure
  AFTER INSERT ON prompt_app_executions
  FOR EACH ROW
  WHEN (NEW.success = false)
  EXECUTE FUNCTION create_error_on_failed_execution();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to check rate limit (called by API)
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_app_id UUID,
  p_user_id UUID DEFAULT NULL,
  p_fingerprint TEXT DEFAULT NULL,
  p_ip_address INET DEFAULT NULL
)
RETURNS TABLE(
  allowed BOOLEAN,
  remaining INTEGER,
  reset_at TIMESTAMPTZ,
  is_blocked BOOLEAN
) AS $$
DECLARE
  v_app prompt_apps%ROWTYPE;
  v_limit_record prompt_app_rate_limits%ROWTYPE;
  v_max_executions INTEGER;
  v_window_hours INTEGER;
BEGIN
  -- Get app config
  SELECT * INTO v_app FROM prompt_apps WHERE id = p_app_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'App not found';
  END IF;
  
  -- Determine max executions based on authentication
  IF p_user_id IS NOT NULL THEN
    v_max_executions := v_app.rate_limit_authenticated;
  ELSE
    v_max_executions := v_app.rate_limit_per_ip;
  END IF;
  
  v_window_hours := v_app.rate_limit_window_hours;
  
  -- Find existing rate limit record
  IF p_user_id IS NOT NULL THEN
    SELECT * INTO v_limit_record FROM prompt_app_rate_limits 
    WHERE app_id = p_app_id AND user_id = p_user_id;
  ELSIF p_fingerprint IS NOT NULL THEN
    SELECT * INTO v_limit_record FROM prompt_app_rate_limits
    WHERE app_id = p_app_id AND fingerprint = p_fingerprint;
  ELSIF p_ip_address IS NOT NULL THEN
    SELECT * INTO v_limit_record FROM prompt_app_rate_limits
    WHERE app_id = p_app_id AND ip_address = p_ip_address;
  END IF;
  
  -- No existing record = allow
  IF v_limit_record IS NULL THEN
    RETURN QUERY SELECT true, v_max_executions - 1, NOW() + (v_window_hours || ' hours')::INTERVAL, false;
    RETURN;
  END IF;
  
  -- Check if blocked
  IF v_limit_record.is_blocked AND v_limit_record.blocked_until > NOW() THEN
    RETURN QUERY SELECT false, 0, v_limit_record.blocked_until, true;
    RETURN;
  END IF;
  
  -- Check if window expired
  IF v_limit_record.window_start_at + (v_window_hours || ' hours')::INTERVAL < NOW() THEN
    -- Window expired, reset
    RETURN QUERY SELECT true, v_max_executions - 1, NOW() + (v_window_hours || ' hours')::INTERVAL, false;
    RETURN;
  END IF;
  
  -- Check if limit reached
  IF v_limit_record.execution_count >= v_max_executions THEN
    RETURN QUERY SELECT 
      false, 
      0, 
      v_limit_record.window_start_at + (v_window_hours || ' hours')::INTERVAL,
      false;
    RETURN;
  END IF;
  
  -- Allow execution
  RETURN QUERY SELECT 
    true,
    v_max_executions - v_limit_record.execution_count - 1,
    v_limit_record.window_start_at + (v_window_hours || ' hours')::INTERVAL,
    false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SEED DATA (Example categories)
-- ============================================================================

-- Create enum-like reference table for categories (optional)
CREATE TABLE prompt_app_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  sort_order INTEGER DEFAULT 0
);

INSERT INTO prompt_app_categories (id, name, description, icon, sort_order) VALUES
  ('productivity', 'Productivity', 'Tools for getting work done', 'Briefcase', 10),
  ('creative', 'Creative', 'Writing, art, music, and design', 'Palette', 20),
  ('education', 'Education', 'Learning and teaching tools', 'GraduationCap', 30),
  ('entertainment', 'Entertainment', 'Games, stories, and fun', 'Gamepad2', 40),
  ('business', 'Business', 'Marketing, sales, and strategy', 'TrendingUp', 50),
  ('developer', 'Developer', 'Code, APIs, and technical tools', 'Code', 60),
  ('data', 'Data & Analytics', 'Analysis and visualization', 'BarChart3', 70),
  ('health', 'Health & Wellness', 'Fitness, nutrition, mental health', 'Heart', 80),
  ('other', 'Other', 'Miscellaneous applications', 'MoreHorizontal', 90);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE prompt_apps IS 'Public shareable AI-powered mini-apps with custom UIs';
COMMENT ON TABLE prompt_app_executions IS 'Track every execution of prompt apps including anonymous usage';
COMMENT ON TABLE prompt_app_errors IS 'Error tracking for debugging and monitoring app health';
COMMENT ON TABLE prompt_app_rate_limits IS 'Rate limiting to prevent abuse while allowing free access';
COMMENT ON COLUMN prompt_apps.slug IS 'URL-friendly identifier: aimatrx.com/p/{slug}';
COMMENT ON COLUMN prompt_apps.component_code IS 'React/JSX code as string, generated by AI';
COMMENT ON COLUMN prompt_apps.variable_schema IS 'JSON schema of variables the UI promises to provide';
COMMENT ON COLUMN prompt_apps.search_tsv IS 'Trigger-maintained tsvector for full-text search (auto-updated on insert/update)';
COMMENT ON COLUMN prompt_app_executions.fingerprint IS 'Browser fingerprint for anonymous tracking';

-- ============================================================================
-- USAGE EXAMPLES
-- ============================================================================

-- Full-text search example:
-- SELECT * FROM prompt_apps
-- WHERE search_tsv @@ plainto_tsquery('english', 'story generator')
-- ORDER BY ts_rank(search_tsv, plainto_tsquery('english', 'story generator')) DESC
-- LIMIT 20;

