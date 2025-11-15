-- =====================================================
-- Execution Configuration V2 - Boolean-Based System
-- =====================================================
-- Replaces confusing mode strings with clear boolean flags

-- Step 1: Drop old columns
ALTER TABLE public.prompt_shortcuts
DROP COLUMN IF EXISTS modal_mode,
DROP COLUMN IF EXISTS allow_initial_message;

-- Step 2: Rename execution_context to result_display for clarity
ALTER TABLE public.prompt_shortcuts
RENAME COLUMN execution_context TO result_display;

-- Step 3: Rename allow_chat (keep it, it's good!)
-- (No change needed, we're keeping this one)

-- Step 4: Add new boolean columns
ALTER TABLE public.prompt_shortcuts
ADD COLUMN IF NOT EXISTS auto_run BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS show_variables BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS apply_variables BOOLEAN DEFAULT true;

-- Step 5: Update constraint on result_display
ALTER TABLE public.prompt_shortcuts
DROP CONSTRAINT IF EXISTS prompt_shortcuts_execution_context_check;

ALTER TABLE public.prompt_shortcuts
ADD CONSTRAINT prompt_shortcuts_result_display_check
CHECK (result_display IN ('modal', 'inline', 'background', 'sidebar', 'toast'));

-- Step 6: Update default value
ALTER TABLE public.prompt_shortcuts
ALTER COLUMN result_display SET DEFAULT 'modal';

-- Step 7: Update index name for clarity
DROP INDEX IF EXISTS idx_prompt_shortcuts_execution_context;

CREATE INDEX IF NOT EXISTS idx_prompt_shortcuts_result_display
ON public.prompt_shortcuts (result_display)
WHERE is_active = TRUE;

-- Step 8: Update covering index to include new columns
DROP INDEX IF EXISTS idx_prompt_shortcuts_placement_covering;

CREATE INDEX IF NOT EXISTS idx_prompt_shortcuts_placement_covering
ON public.prompt_shortcuts (category_id, is_active, sort_order)
INCLUDE (
  id, 
  prompt_builtin_id, 
  label, 
  description, 
  icon_name, 
  keyboard_shortcut, 
  scope_mappings, 
  available_scopes,
  result_display,
  auto_run,
  allow_chat,
  show_variables,
  apply_variables
)
WHERE is_active = TRUE;

-- Step 9: Add comments
COMMENT ON COLUMN public.prompt_shortcuts.result_display IS 'WHERE/HOW to display results: modal, inline, background, sidebar, toast';
COMMENT ON COLUMN public.prompt_shortcuts.auto_run IS 'Whether to run immediately on open (true) or wait for user click (false)';
COMMENT ON COLUMN public.prompt_shortcuts.allow_chat IS 'Whether to allow conversational mode (true) or one-shot execution (false)';
COMMENT ON COLUMN public.prompt_shortcuts.show_variables IS 'Whether to show variable form (true) or hide it (false)';
COMMENT ON COLUMN public.prompt_shortcuts.apply_variables IS 'Whether to apply variables (true) or ignore them entirely (false)';

COMMENT ON TABLE public.prompt_shortcuts IS 'Shortcuts that link categories to prompt builtins with execution configuration';

