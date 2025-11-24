-- ============================================================================
-- PROMPT BUILTINS WITH SOURCE PROMPT INFO VIEW
-- ============================================================================
-- 
-- PURPOSE: Eliminate N+1 query problem when displaying prompt builtins
-- 
-- PROBLEM: PromptBuiltinsTableManager was making individual API calls for each
-- builtin's source prompt name (25+ separate requests visible in terminal logs)
-- 
-- SOLUTION: Single view that LEFT JOINs prompt_builtins with prompts table
-- to get source_prompt_name in one efficient query
--
-- PERFORMANCE: Reduces 25+ API calls to 1 database query with JOIN
-- ============================================================================

-- Drop existing view if it exists
DROP VIEW IF EXISTS public.prompt_builtins_with_source_view;

-- Create optimized view
CREATE OR REPLACE VIEW public.prompt_builtins_with_source_view AS
SELECT 
  -- All prompt_builtins columns
  pb.id,
  pb.created_at,
  pb.updated_at,
  pb.name,
  pb.description,
  pb.messages,
  pb.variable_defaults,
  pb.tools,
  pb.settings,
  pb.is_active,
  pb.source_prompt_id,
  pb.source_prompt_snapshot_at,
  
  -- Source prompt info (if exists)
  p.name AS source_prompt_name,
  p.description AS source_prompt_description,
  p.updated_at AS source_prompt_updated_at
  
FROM public.prompt_builtins pb
LEFT JOIN public.prompts p ON pb.source_prompt_id = p.id

ORDER BY pb.name ASC;

-- Grant access to authenticated users
GRANT SELECT ON public.prompt_builtins_with_source_view TO authenticated;

-- Add helpful comment
COMMENT ON VIEW public.prompt_builtins_with_source_view IS 
'Optimized view for prompt builtins with source prompt information. 
Eliminates N+1 query problem by joining with prompts table.
Returns all builtin fields plus source_prompt_name for display.
Used by PromptBuiltinsTableManager and admin interfaces.';

-- ============================================================================
-- USAGE EXAMPLE
-- ============================================================================
-- 
-- Before (N+1 problem):
-- 1. SELECT * FROM prompt_builtins;  -- Returns 25 rows
-- 2. For each row with source_prompt_id:
--    SELECT name FROM prompts WHERE id = {source_prompt_id};  -- 25 queries!
-- 
-- After (single query):
-- SELECT * FROM prompt_builtins_with_source_view;  -- Returns 25 rows with names!
-- 
-- ============================================================================

