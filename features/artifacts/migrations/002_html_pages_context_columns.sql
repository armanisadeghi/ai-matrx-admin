-- =============================================================================
-- Migration: Add context columns to html_pages
-- Target database: HTML Supabase project (viyklljfdhtidwecakwx)
--
-- Enables reverse-lookup from the HTML site back to the main app artifact,
-- and stores the organizational context at the time of publish.
-- =============================================================================

ALTER TABLE public.html_pages
    ADD COLUMN IF NOT EXISTS artifact_id        UUID NULL,
    ADD COLUMN IF NOT EXISTS source_message_id  UUID NULL,
    ADD COLUMN IF NOT EXISTS source_conv_id     UUID NULL,
    ADD COLUMN IF NOT EXISTS context_metadata   JSONB NOT NULL DEFAULT '{}';

-- context_metadata shape:
-- {
--   "organization_id": "uuid | null",
--   "workspace_id":    "uuid | null",
--   "project_id":      "uuid | null",
--   "task_id":         "uuid | null"
-- }

-- Index to look up pages by their artifact ID
CREATE INDEX IF NOT EXISTS html_pages_artifact_id
    ON public.html_pages(artifact_id)
    WHERE artifact_id IS NOT NULL;

-- Index to look up pages by source message
CREATE INDEX IF NOT EXISTS html_pages_source_message
    ON public.html_pages(source_message_id)
    WHERE source_message_id IS NOT NULL;
