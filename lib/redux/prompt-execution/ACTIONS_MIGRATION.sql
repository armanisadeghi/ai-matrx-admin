-- Migration: Create Prompt Actions System
-- Purpose: Enable context-aware prompt execution with broker integration

-- ============================================================================
-- 1. Create prompt_actions table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.prompt_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Basic info
  name TEXT NOT NULL,
  description TEXT,
  
  -- Prompt reference (either user prompt OR builtin, not both)
  prompt_id UUID REFERENCES prompts(id) ON DELETE CASCADE,
  prompt_builtin_id UUID REFERENCES prompt_builtins(id) ON DELETE CASCADE,
  
  -- Broker mappings: {variableName: brokerId}
  -- Example: {"client_name": "broker-uuid-company-name", "deadline": "broker-uuid-deadline"}
  broker_mappings JSONB NOT NULL DEFAULT '{}'::JSONB,
  
  -- Hardcoded overrides: {variableName: value}
  -- These ALWAYS override broker values
  -- Example: {"tone": "professional", "format": "markdown"}
  hardcoded_values JSONB NOT NULL DEFAULT '{}'::JSONB,
  
  -- Context scopes this action expects/requires
  -- Used to determine which broker resolution to attempt
  -- Example: ['workspace', 'project', 'task', 'ai_run']
  context_scopes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  
  -- Execution configuration (same structure as shortcuts)
  execution_config JSONB NOT NULL DEFAULT '{
    "auto_run": false,
    "allow_chat": true,
    "show_variables": false,
    "apply_variables": true,
    "result_display": "modal-full",
    "track_in_runs": true
  }'::JSONB,
  
  -- Ownership & access
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  is_public BOOLEAN NOT NULL DEFAULT false,
  
  -- Categorization
  tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  icon_name TEXT,
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Primary key
  CONSTRAINT prompt_actions_pkey PRIMARY KEY (id),
  
  -- Must reference either prompt OR prompt_builtin, not both
  CONSTRAINT prompt_actions_prompt_check CHECK (
    (prompt_id IS NOT NULL AND prompt_builtin_id IS NULL) OR
    (prompt_id IS NULL AND prompt_builtin_id IS NOT NULL)
  )
) TABLESPACE pg_default;

-- ============================================================================
-- 2. Create indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_prompt_actions_user 
  ON public.prompt_actions(user_id) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_prompt_actions_prompt 
  ON public.prompt_actions(prompt_id) 
  WHERE prompt_id IS NOT NULL AND is_active = true;

CREATE INDEX IF NOT EXISTS idx_prompt_actions_builtin 
  ON public.prompt_actions(prompt_builtin_id) 
  WHERE prompt_builtin_id IS NOT NULL AND is_active = true;

CREATE INDEX IF NOT EXISTS idx_prompt_actions_public 
  ON public.prompt_actions(is_public, is_active) 
  WHERE is_public = true AND is_active = true;

CREATE INDEX IF NOT EXISTS idx_prompt_actions_tags 
  ON public.prompt_actions USING GIN(tags) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_prompt_actions_context_scopes 
  ON public.prompt_actions USING GIN(context_scopes) 
  WHERE is_active = true;

-- Covering index for fast retrieval
CREATE INDEX IF NOT EXISTS idx_prompt_actions_covering 
  ON public.prompt_actions(id, is_active) 
  INCLUDE (
    name, 
    description, 
    prompt_id, 
    prompt_builtin_id,
    broker_mappings,
    hardcoded_values,
    context_scopes,
    execution_config,
    icon_name
  ) 
  WHERE is_active = true;

-- ============================================================================
-- 3. Create trigger for updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_prompt_actions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prompt_actions_updated_at
  BEFORE UPDATE ON prompt_actions
  FOR EACH ROW
  EXECUTE FUNCTION update_prompt_actions_updated_at();

-- ============================================================================
-- 4. Enable RLS (Row Level Security)
-- ============================================================================

ALTER TABLE prompt_actions ENABLE ROW LEVEL SECURITY;

-- Users can view their own actions
CREATE POLICY "Users can view their own actions"
  ON prompt_actions FOR SELECT
  USING (
    user_id = auth.uid() OR 
    is_public = true
  );

-- Users can create their own actions
CREATE POLICY "Users can create their own actions"
  ON prompt_actions FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own actions
CREATE POLICY "Users can update their own actions"
  ON prompt_actions FOR UPDATE
  USING (user_id = auth.uid());

-- Users can delete their own actions
CREATE POLICY "Users can delete their own actions"
  ON prompt_actions FOR DELETE
  USING (user_id = auth.uid());




--------- NOT DONE YET ---------



-- ============================================================================
-- 5. OPTIONAL: Allow shortcuts to reference actions
-- ============================================================================

-- Add action_id column to prompt_shortcuts
ALTER TABLE prompt_shortcuts 
ADD COLUMN IF NOT EXISTS action_id UUID REFERENCES prompt_actions(id) ON DELETE CASCADE;

-- Create index
CREATE INDEX IF NOT EXISTS idx_prompt_shortcuts_action 
  ON public.prompt_shortcuts(action_id) 
  WHERE action_id IS NOT NULL AND is_active = true;

-- Update constraint to allow shortcuts to point to either prompt OR action
-- Note: This modifies existing shortcuts table - review carefully!

-- First, ensure existing shortcuts have prompt_builtin_id
-- (They should, but let's be safe)

-- Drop old unique constraint
ALTER TABLE prompt_shortcuts 
DROP CONSTRAINT IF EXISTS prompt_shortcuts_unique_category_prompt;

-- Add new constraint: must have either prompt_builtin_id OR action_id (not both)
ALTER TABLE prompt_shortcuts
ADD CONSTRAINT prompt_shortcuts_target_check CHECK (
  (prompt_builtin_id IS NOT NULL AND action_id IS NULL) OR
  (prompt_builtin_id IS NULL AND action_id IS NOT NULL)
);

-- Add new unique constraint
ALTER TABLE prompt_shortcuts
ADD CONSTRAINT prompt_shortcuts_unique_category_target 
  UNIQUE NULLS NOT DISTINCT (category_id, prompt_builtin_id, action_id);

-- ============================================================================
-- 6. Sample data (for testing)
-- ============================================================================

-- Example action: "Generate Project Brief" with broker integration
/*
INSERT INTO prompt_actions (
  name,
  description,
  prompt_builtin_id,
  broker_mappings,
  hardcoded_values,
  context_scopes,
  execution_config,
  user_id,
  is_public,
  tags,
  icon_name
) VALUES (
  'Generate Project Brief',
  'Automatically generates a project brief using client and project context',
  'some-prompt-builtin-uuid',
  '{
    "client_name": "broker-uuid-company-name",
    "project_type": "broker-uuid-project-type",
    "deadline": "broker-uuid-project-deadline",
    "budget": "broker-uuid-project-budget"
  }'::JSONB,
  '{
    "tone": "professional",
    "format": "markdown"
  }'::JSONB,
  ARRAY['workspace', 'project'],
  '{
    "auto_run": true,
    "allow_chat": false,
    "show_variables": false,
    "apply_variables": true,
    "result_display": "modal-full",
    "track_in_runs": true
  }'::JSONB,
  'your-user-uuid',
  true,
  ARRAY['project-management', 'automation'],
  'FileText'
);
*/

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================

/*
-- To rollback this migration:

DROP TRIGGER IF EXISTS trigger_prompt_actions_updated_at ON prompt_actions;
DROP FUNCTION IF EXISTS update_prompt_actions_updated_at();
DROP TABLE IF EXISTS prompt_actions CASCADE;

-- Revert prompt_shortcuts changes
ALTER TABLE prompt_shortcuts DROP COLUMN IF EXISTS action_id;
ALTER TABLE prompt_shortcuts DROP CONSTRAINT IF EXISTS prompt_shortcuts_target_check;
ALTER TABLE prompt_shortcuts DROP CONSTRAINT IF EXISTS prompt_shortcuts_unique_category_target;
-- Restore original constraint
ALTER TABLE prompt_shortcuts 
ADD CONSTRAINT prompt_shortcuts_unique_category_prompt 
  UNIQUE (category_id, prompt_builtin_id);
*/

