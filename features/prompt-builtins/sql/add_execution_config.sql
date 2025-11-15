-- =====================================================
-- Add Execution Configuration to Prompt Shortcuts
-- =====================================================
-- Adds columns to control how shortcuts execute

-- Add execution_context column
ALTER TABLE public.prompt_shortcuts
ADD COLUMN IF NOT EXISTS execution_context TEXT DEFAULT 'modal'
CHECK (execution_context IN ('modal', 'inline', 'background', 'sidebar', 'toast'));

-- Add modal_mode column (only applies when execution_context is 'modal')
ALTER TABLE public.prompt_shortcuts
ADD COLUMN IF NOT EXISTS modal_mode TEXT DEFAULT 'auto-run'
CHECK (modal_mode IN ('auto-run', 'auto-run-one-shot', 'manual-with-hidden-variables', 'manual-with-visible-variables', 'manual'));

-- Add allow_chat column
ALTER TABLE public.prompt_shortcuts
ADD COLUMN IF NOT EXISTS allow_chat BOOLEAN DEFAULT true;

-- Add allow_initial_message column
ALTER TABLE public.prompt_shortcuts
ADD COLUMN IF NOT EXISTS allow_initial_message BOOLEAN DEFAULT false;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_prompt_shortcuts_execution_context
ON public.prompt_shortcuts (execution_context)
WHERE is_active = TRUE;

-- Add comments
COMMENT ON COLUMN public.prompt_shortcuts.execution_context IS 'WHERE/HOW the prompt executes: modal, inline, background, sidebar, toast';
COMMENT ON COLUMN public.prompt_shortcuts.modal_mode IS 'HOW the modal behaves (only for execution_context=modal): auto-run, auto-run-one-shot, manual, etc.';
COMMENT ON COLUMN public.prompt_shortcuts.allow_chat IS 'Whether to allow chat/conversation (for modal context)';
COMMENT ON COLUMN public.prompt_shortcuts.allow_initial_message IS 'Whether to prompt user for initial message (for modal context)';

