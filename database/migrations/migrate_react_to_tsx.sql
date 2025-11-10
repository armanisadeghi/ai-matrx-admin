-- ============================================================================
-- MIGRATION: Update component_language from 'react' to 'tsx'
-- ============================================================================
-- This migration updates all prompt_apps records that use 'react' as the
-- component_language to use 'tsx' (TypeScript + JSX) instead.
--
-- Background:
-- - 'react' is not a valid language identifier for syntax highlighting
-- - Prism.js recognizes 'tsx', 'jsx', 'typescript', etc.
-- - The CodeBlock component now maps 'react' → 'tsx' for backward compatibility
-- - New apps will use 'tsx' by default
-- ============================================================================

BEGIN;

-- Update all records with component_language = 'react' to 'tsx'
UPDATE prompt_apps
SET component_language = 'tsx'
WHERE component_language = 'react';

-- Verify the update
DO $$
DECLARE
    react_count integer;
    tsx_count integer;
BEGIN
    SELECT COUNT(*) INTO react_count FROM prompt_apps WHERE component_language = 'react';
    SELECT COUNT(*) INTO tsx_count FROM prompt_apps WHERE component_language = 'tsx';
    
    RAISE NOTICE 'Migration complete!';
    RAISE NOTICE '  - Records with "react": %', react_count;
    RAISE NOTICE '  - Records with "tsx": %', tsx_count;
END $$;

COMMIT;

-- ============================================================================
-- If you encounter trigger errors, you may need to temporarily disable them:
-- ============================================================================
-- To disable triggers during migration:
--   ALTER TABLE prompt_apps DISABLE TRIGGER ALL;
--   -- Run the UPDATE statement above
--   ALTER TABLE prompt_apps ENABLE TRIGGER ALL;
--
-- To check what triggers exist:
--   SELECT trigger_name, event_manipulation, event_object_table
--   FROM information_schema.triggers
--   WHERE event_object_table = 'prompt_apps';
-- ============================================================================

