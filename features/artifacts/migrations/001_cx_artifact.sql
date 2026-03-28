-- =============================================================================
-- Migration: cx_artifact table
-- Target database: Main Supabase project
--
-- Purpose: Universal artifact registry for all AI-generated content.
-- Parallels cx_media — one row per generated item, linked to the source message.
-- Supports HTML pages, flashcard decks, org charts, diagrams, and any future
-- content type via artifact_type + external_system/external_id pattern.
-- =============================================================================

-- ── Types ─────────────────────────────────────────────────────────────────────

CREATE TYPE public.artifact_type AS ENUM (
    'html_page',
    'flashcard_deck',
    'org_chart',
    'diagram',
    'data_table',
    'timeline',
    'comparison_table',
    'quiz',
    'summary',
    'outline',
    'report',
    'code_snippet',
    'spreadsheet',
    'presentation',
    'other'
);

CREATE TYPE public.artifact_status AS ENUM (
    'draft',       -- generated locally, not yet published to an external system
    'published',   -- live at an external URL
    'archived',    -- soft-deleted by the user (hidden but recoverable)
    'failed'       -- generation or publish operation failed
);

-- ── Main table ────────────────────────────────────────────────────────────────

CREATE TABLE public.cx_artifact (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Source tracking — where did this content come from?
    message_id          UUID NOT NULL REFERENCES public.cx_message(id) ON DELETE SET NULL,
    conversation_id     UUID NOT NULL REFERENCES public.cx_conversation(id) ON DELETE CASCADE,
    user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Organizational context — captured from appContextSlice at creation time (all optional)
    organization_id     UUID NULL,
    workspace_id        UUID NULL,
    project_id          UUID NULL,
    task_id             UUID NULL,

    -- Artifact classification
    artifact_type       public.artifact_type NOT NULL,
    status              public.artifact_status NOT NULL DEFAULT 'draft',

    -- External system pointer — flexible pointer to any external content store
    external_system     TEXT NULL,   -- e.g. 'html_pages', 'flashcard_db', 'shopify', 'wordpress'
    external_id         TEXT NULL,   -- ID in the external system (e.g. html_pages.id uuid)
    external_url        TEXT NULL,   -- publicly accessible URL if published

    -- Display info — denormalized for fast list views without joins
    title               TEXT NULL,
    description         TEXT NULL,
    thumbnail_url       TEXT NULL,

    -- Type-specific extras that don't warrant a dedicated column
    metadata            JSONB NOT NULL DEFAULT '{}',

    -- Timestamps
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ NULL       -- soft-delete: NULL = active
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

-- Primary lookups
CREATE INDEX cx_artifact_message_id    ON public.cx_artifact(message_id)            WHERE deleted_at IS NULL;
CREATE INDEX cx_artifact_user_id       ON public.cx_artifact(user_id)               WHERE deleted_at IS NULL;
CREATE INDEX cx_artifact_conversation  ON public.cx_artifact(conversation_id)       WHERE deleted_at IS NULL;

-- Context filtering (sparse — only index when non-null)
CREATE INDEX cx_artifact_project_id    ON public.cx_artifact(project_id, user_id)   WHERE deleted_at IS NULL AND project_id IS NOT NULL;
CREATE INDEX cx_artifact_task_id       ON public.cx_artifact(task_id, user_id)      WHERE deleted_at IS NULL AND task_id IS NOT NULL;

-- Type + user filtering (for CMS list view)
CREATE INDEX cx_artifact_type_user     ON public.cx_artifact(artifact_type, user_id) WHERE deleted_at IS NULL;

-- External ID lookup (for reverse lookup from external systems)
CREATE INDEX cx_artifact_external      ON public.cx_artifact(external_system, external_id) WHERE deleted_at IS NULL AND external_id IS NOT NULL;

-- ── Auto-update updated_at ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.cx_artifact_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER cx_artifact_updated_at
    BEFORE UPDATE ON public.cx_artifact
    FOR EACH ROW EXECUTE FUNCTION public.cx_artifact_set_updated_at();

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE public.cx_artifact ENABLE ROW LEVEL SECURITY;

-- Users can only see their own artifacts (non-deleted)
CREATE POLICY "users_own_artifacts" ON public.cx_artifact
    FOR ALL USING (auth.uid() = user_id AND deleted_at IS NULL);

-- Service role bypasses RLS (used by API routes)
CREATE POLICY "service_role_all" ON public.cx_artifact
    FOR ALL TO service_role USING (true);
