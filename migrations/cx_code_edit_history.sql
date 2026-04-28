-- =============================================================================
-- Migration: cx_code_message_file + cx_code_edit
-- Target database: Main Supabase project (automation-matrix)
--
-- Purpose: Conversation- and message-scoped audit log of every AI-generated
-- code edit a user has accepted, rejected, or reverted. Powers the in-tab
-- diff review UI, per-patch undo, per-message and per-conversation revert,
-- and the "triple view" inspector (Before / With updates / Modifications
-- Since) that lets a user click any assistant message and see exactly what
-- it changed in any file it touched.
--
-- Two-table layout:
--   cx_code_message_file  ── one row per (assistant message, file) pair.
--                            Stores the before/after content snapshots that
--                            power the triple view. Cheap to scan for
--                            history timelines.
--   cx_code_edit          ── one row per individual SEARCH/REPLACE block,
--                            for fine-grained per-hunk undo and audit.
--
-- The two tables are denormalized on conversation_id and message_id (kept on
-- both) so reads can join from either anchor without an extra hop.
-- =============================================================================

-- ── Status enums ─────────────────────────────────────────────────────────────

CREATE TYPE public.code_message_file_status AS ENUM (
    'in_progress',  -- some patches are still pending review
    'completed',    -- every patch resolved (applied or rejected)
    'reverted'      -- user rolled back this entire message_file entry
);

CREATE TYPE public.code_edit_status AS ENUM (
    'applied',
    'rejected',
    'reverted'
);

-- ── cx_code_message_file ─────────────────────────────────────────────────────

CREATE TABLE public.cx_code_message_file (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Anchors. We keep conversation_id + message_id denormalized so
    -- conversation-wide and message-wide queries are single-table scans.
    message_id              UUID NOT NULL REFERENCES public.cx_message(id)      ON DELETE CASCADE,
    conversation_id         UUID NOT NULL REFERENCES public.cx_conversation(id) ON DELETE CASCADE,
    user_id                 UUID NOT NULL REFERENCES auth.users(id)             ON DELETE CASCADE,
    organization_id         UUID NULL,

    -- File identity. (file_adapter, file_path) is canonical across all
    -- filesystems; library_file_id is also stored when the file is a
    -- code_files row so we can join back to the library if needed.
    file_adapter            TEXT NOT NULL,    -- "library" | "sandbox" | "mock" | "cloud-fs" | "cloud-file" | "source"
    file_path               TEXT NOT NULL,
    library_file_id         UUID NULL,

    -- Triple-view snapshots. before_content is captured at the moment the
    -- first patch for this (message, file) pair is applied OR rejected;
    -- after_content tracks the file content as further patches resolve.
    before_content          TEXT NOT NULL,
    after_content           TEXT NOT NULL,

    -- Aggregate counters — denormalized so list views don't need to
    -- count cx_code_edit rows.
    edits_applied_count     INTEGER NOT NULL DEFAULT 0,
    edits_rejected_count    INTEGER NOT NULL DEFAULT 0,
    edits_pending_count     INTEGER NOT NULL DEFAULT 0,

    -- Lifecycle
    status                  public.code_message_file_status NOT NULL DEFAULT 'in_progress',
    reverted_at             TIMESTAMPTZ NULL,

    -- Future: commit-tied view. Populated by a separate flow.
    git_commit_sha          TEXT NULL,
    git_branch              TEXT NULL,

    -- Timestamps
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Idempotency: at most one row per (message, file). The flush thunk
    -- relies on this for upsert semantics.
    CONSTRAINT cx_code_message_file_unique UNIQUE (message_id, file_adapter, file_path)
);

CREATE INDEX cx_code_message_file_conversation
    ON public.cx_code_message_file (conversation_id, created_at DESC);

CREATE INDEX cx_code_message_file_message
    ON public.cx_code_message_file (message_id);

CREATE INDEX cx_code_message_file_file_path
    ON public.cx_code_message_file (file_adapter, file_path, created_at DESC);

CREATE INDEX cx_code_message_file_user
    ON public.cx_code_message_file (user_id, created_at DESC);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.cx_code_message_file_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER cx_code_message_file_updated_at
    BEFORE UPDATE ON public.cx_code_message_file
    FOR EACH ROW EXECUTE FUNCTION public.cx_code_message_file_set_updated_at();

-- ── cx_code_edit ─────────────────────────────────────────────────────────────

CREATE TABLE public.cx_code_edit (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    message_file_id         UUID NOT NULL REFERENCES public.cx_code_message_file(id) ON DELETE CASCADE,

    -- Denormalized anchors so per-message and per-conversation timeline
    -- queries can scan a single table.
    message_id              UUID NOT NULL REFERENCES public.cx_message(id)      ON DELETE CASCADE,
    conversation_id         UUID NOT NULL REFERENCES public.cx_conversation(id) ON DELETE CASCADE,
    user_id                 UUID NOT NULL REFERENCES auth.users(id)             ON DELETE CASCADE,

    -- Patch payload. block_index is the SEARCH/REPLACE position within the
    -- assistant message — stable across re-stages and our key for upserts.
    block_index             INTEGER NOT NULL,
    search_text             TEXT NOT NULL,
    replace_text            TEXT NOT NULL,

    -- Lifecycle
    status                  public.code_edit_status NOT NULL,
    applied_at              TIMESTAMPTZ NULL,
    rejected_at             TIMESTAMPTZ NULL,
    reverted_at             TIMESTAMPTZ NULL,
    reject_reason           TEXT NULL,

    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT cx_code_edit_unique UNIQUE (message_file_id, block_index)
);

CREATE INDEX cx_code_edit_message_file
    ON public.cx_code_edit (message_file_id, block_index);

CREATE INDEX cx_code_edit_message
    ON public.cx_code_edit (message_id);

CREATE INDEX cx_code_edit_conversation
    ON public.cx_code_edit (conversation_id, created_at DESC);

CREATE INDEX cx_code_edit_user
    ON public.cx_code_edit (user_id, created_at DESC);

-- ── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE public.cx_code_message_file ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cx_code_edit         ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_code_message_file" ON public.cx_code_message_file
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "service_role_all_code_message_file" ON public.cx_code_message_file
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "users_own_code_edit" ON public.cx_code_edit
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "service_role_all_code_edit" ON public.cx_code_edit
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── Upsert RPC ───────────────────────────────────────────────────────────────
--
-- One transactional entry point for the client to flush a queued batch
-- of edits. Accepts a JSON payload describing the (message, file) pair
-- plus the list of resolved patches; performs an upsert on
-- cx_code_message_file (preserving its created_at and the original
-- before_content so re-flushes never overwrite the canonical baseline)
-- and a per-patch upsert into cx_code_edit. Returns the canonical ids.
--
-- Payload shape (one call per (message, file) pair):
-- {
--   "message_id": "uuid",
--   "conversation_id": "uuid",
--   "organization_id": "uuid" | null,
--   "file_adapter": "library",
--   "file_path": "path/to/file.ts",
--   "library_file_id": "uuid" | null,
--   "before_content": "string",
--   "after_content": "string",
--   "status": "in_progress" | "completed" | "reverted",
--   "git_commit_sha": "sha" | null,
--   "git_branch": "branch" | null,
--   "edits_applied_count": 1,
--   "edits_rejected_count": 0,
--   "edits_pending_count": 0,
--   "edits": [
--     {
--       "block_index": 0,
--       "search_text": "...",
--       "replace_text": "...",
--       "status": "applied" | "rejected" | "reverted",
--       "applied_at": "iso" | null,
--       "rejected_at": "iso" | null,
--       "reverted_at": "iso" | null,
--       "reject_reason": "string" | null
--     }
--   ]
-- }

CREATE OR REPLACE FUNCTION public.cx_code_history_upsert(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    v_user_id           UUID := auth.uid();
    v_message_id        UUID := (p_payload->>'message_id')::UUID;
    v_conversation_id   UUID := (p_payload->>'conversation_id')::UUID;
    v_organization_id   UUID := NULLIF(p_payload->>'organization_id', '')::UUID;
    v_file_adapter      TEXT := p_payload->>'file_adapter';
    v_file_path         TEXT := p_payload->>'file_path';
    v_library_file_id   UUID := NULLIF(p_payload->>'library_file_id', '')::UUID;
    v_before_content    TEXT := p_payload->>'before_content';
    v_after_content     TEXT := p_payload->>'after_content';
    v_status            public.code_message_file_status :=
                            (p_payload->>'status')::public.code_message_file_status;
    v_applied_count     INTEGER := COALESCE((p_payload->>'edits_applied_count')::INTEGER, 0);
    v_rejected_count    INTEGER := COALESCE((p_payload->>'edits_rejected_count')::INTEGER, 0);
    v_pending_count     INTEGER := COALESCE((p_payload->>'edits_pending_count')::INTEGER, 0);
    v_git_commit_sha    TEXT := NULLIF(p_payload->>'git_commit_sha', '');
    v_git_branch        TEXT := NULLIF(p_payload->>'git_branch', '');
    v_message_file_id   UUID;
    v_edit              JSONB;
    v_edit_ids          JSONB := '[]'::JSONB;
    v_edit_id           UUID;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'cx_code_history_upsert: not authenticated';
    END IF;

    IF v_message_id IS NULL OR v_conversation_id IS NULL OR v_file_adapter IS NULL OR v_file_path IS NULL THEN
        RAISE EXCEPTION 'cx_code_history_upsert: missing required fields';
    END IF;

    -- Verify the caller actually owns the message they're attaching history
    -- to. Without this check a client could fabricate a message_id from
    -- another user's conversation; the cx_message FK alone wouldn't catch
    -- that.
    PERFORM 1 FROM public.cx_message m
    WHERE m.id = v_message_id
      AND EXISTS (
          SELECT 1 FROM public.cx_conversation c
          WHERE c.id = m.conversation_id AND c.user_id = v_user_id
      );

    IF NOT FOUND THEN
        RAISE EXCEPTION 'cx_code_history_upsert: message_id does not belong to caller';
    END IF;

    -- Upsert the message_file row. On conflict, we update everything
    -- *except* before_content — that snapshot is the canonical baseline
    -- for this (message, file) pair and must never drift even if the
    -- client re-flushes after later accepts.
    INSERT INTO public.cx_code_message_file AS mf (
        message_id, conversation_id, user_id, organization_id,
        file_adapter, file_path, library_file_id,
        before_content, after_content,
        edits_applied_count, edits_rejected_count, edits_pending_count,
        status, git_commit_sha, git_branch
    )
    VALUES (
        v_message_id, v_conversation_id, v_user_id, v_organization_id,
        v_file_adapter, v_file_path, v_library_file_id,
        v_before_content, v_after_content,
        v_applied_count, v_rejected_count, v_pending_count,
        v_status, v_git_commit_sha, v_git_branch
    )
    ON CONFLICT (message_id, file_adapter, file_path) DO UPDATE
        SET after_content         = EXCLUDED.after_content,
            edits_applied_count   = EXCLUDED.edits_applied_count,
            edits_rejected_count  = EXCLUDED.edits_rejected_count,
            edits_pending_count   = EXCLUDED.edits_pending_count,
            status                = EXCLUDED.status,
            library_file_id       = COALESCE(EXCLUDED.library_file_id, mf.library_file_id),
            organization_id       = COALESCE(EXCLUDED.organization_id, mf.organization_id),
            git_commit_sha        = COALESCE(EXCLUDED.git_commit_sha, mf.git_commit_sha),
            git_branch            = COALESCE(EXCLUDED.git_branch, mf.git_branch),
            reverted_at           = CASE
                                       WHEN EXCLUDED.status = 'reverted' AND mf.reverted_at IS NULL
                                           THEN NOW()
                                       ELSE mf.reverted_at
                                    END
    RETURNING mf.id INTO v_message_file_id;

    -- Per-patch upserts. block_index is stable per (message, file) so the
    -- unique constraint handles dedupe across retries and partial flushes.
    FOR v_edit IN SELECT * FROM jsonb_array_elements(COALESCE(p_payload->'edits', '[]'::JSONB))
    LOOP
        INSERT INTO public.cx_code_edit AS ce (
            message_file_id, message_id, conversation_id, user_id,
            block_index, search_text, replace_text,
            status, applied_at, rejected_at, reverted_at, reject_reason
        )
        VALUES (
            v_message_file_id,
            v_message_id,
            v_conversation_id,
            v_user_id,
            (v_edit->>'block_index')::INTEGER,
            v_edit->>'search_text',
            v_edit->>'replace_text',
            (v_edit->>'status')::public.code_edit_status,
            NULLIF(v_edit->>'applied_at', '')::TIMESTAMPTZ,
            NULLIF(v_edit->>'rejected_at', '')::TIMESTAMPTZ,
            NULLIF(v_edit->>'reverted_at', '')::TIMESTAMPTZ,
            NULLIF(v_edit->>'reject_reason', '')
        )
        ON CONFLICT (message_file_id, block_index) DO UPDATE
            SET status        = EXCLUDED.status,
                applied_at    = COALESCE(EXCLUDED.applied_at, ce.applied_at),
                rejected_at   = COALESCE(EXCLUDED.rejected_at, ce.rejected_at),
                reverted_at   = COALESCE(EXCLUDED.reverted_at, ce.reverted_at),
                reject_reason = COALESCE(EXCLUDED.reject_reason, ce.reject_reason)
        RETURNING ce.id INTO v_edit_id;

        v_edit_ids := v_edit_ids || jsonb_build_object(
            'block_index', v_edit->>'block_index',
            'id', v_edit_id
        );
    END LOOP;

    RETURN jsonb_build_object(
        'message_file_id', v_message_file_id,
        'edits', v_edit_ids
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.cx_code_history_upsert(JSONB) TO authenticated;

-- ── Comments for tooling / Supabase Studio docs ─────────────────────────────

COMMENT ON TABLE  public.cx_code_message_file IS
    'One row per (assistant message, file) pair. Stores the before/after content snapshots that power the triple-view diff inspector.';
COMMENT ON COLUMN public.cx_code_message_file.before_content IS
    'File content captured immediately before the first patch from this assistant message was applied or rejected. Canonical baseline — never overwritten on re-flush.';
COMMENT ON COLUMN public.cx_code_message_file.after_content IS
    'File content after every accepted patch from this message has been applied. Re-computed and re-flushed as further patches resolve.';
COMMENT ON COLUMN public.cx_code_message_file.file_adapter IS
    'Filesystem identity prefix: library | sandbox | mock | cloud-fs | cloud-file | source.';

COMMENT ON TABLE  public.cx_code_edit IS
    'One row per individual SEARCH/REPLACE block. Backs per-hunk undo and the per-message audit timeline.';

COMMENT ON FUNCTION public.cx_code_history_upsert(JSONB) IS
    'Transactional flush endpoint for AI edit history. Upserts one cx_code_message_file row plus its associated cx_code_edit rows; preserves the canonical before_content across re-flushes; verifies caller owns the parent cx_conversation. Idempotent via the (message, file) and (message_file, block_index) unique constraints.';
