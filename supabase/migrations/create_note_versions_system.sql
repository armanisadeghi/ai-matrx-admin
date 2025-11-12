-- ============================================================================
-- NOTE VERSIONS SYSTEM - Track note history with automatic versioning
-- ============================================================================
-- Purpose: Provide version history for notes with automatic cleanup (max 10 versions)
-- Features:
-- - Auto-create versions on note updates (via trigger)
-- - Track AI vs user edits
-- - Store full content snapshots for easy retrieval
-- - Automatic cleanup of old versions beyond the 10-version limit
-- ============================================================================

-- ============================================================================
-- TABLE: note_versions
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.note_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Association
  note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Version Content (full snapshot)
  content TEXT NOT NULL,
  label TEXT NOT NULL,
  
  -- Version Metadata
  version_number INTEGER NOT NULL, -- Sequential version number for this note
  change_source TEXT NOT NULL DEFAULT 'user', -- 'user' | 'ai' | 'system'
  change_type TEXT, -- 'manual_edit' | 'ai_diff' | 'full_replace' | null
  diff_metadata JSONB DEFAULT '{}', -- Store diff info if applicable
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT note_versions_note_id_version_number_key UNIQUE (note_id, version_number)
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_note_versions_note_id 
  ON public.note_versions(note_id);

CREATE INDEX IF NOT EXISTS idx_note_versions_user_id 
  ON public.note_versions(user_id);

CREATE INDEX IF NOT EXISTS idx_note_versions_created_at 
  ON public.note_versions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_note_versions_note_version 
  ON public.note_versions(note_id, version_number DESC);

-- ============================================================================
-- FUNCTION: Create Note Version
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_note_version()
RETURNS TRIGGER AS $$
DECLARE
  v_version_number INTEGER;
  v_versions_count INTEGER;
  v_oldest_version_id UUID;
BEGIN
  -- Only create version if content or label actually changed
  IF (OLD.content IS DISTINCT FROM NEW.content) OR 
     (OLD.label IS DISTINCT FROM NEW.label) THEN
    
    -- Get next version number for this note
    SELECT COALESCE(MAX(version_number), 0) + 1
    INTO v_version_number
    FROM public.note_versions
    WHERE note_id = NEW.id;
    
    -- Insert the new version (snapshot of OLD content before update)
    INSERT INTO public.note_versions (
      note_id,
      user_id,
      content,
      label,
      version_number,
      change_source,
      change_type,
      diff_metadata
    ) VALUES (
      NEW.id,
      NEW.user_id,
      OLD.content, -- Store the OLD content (before the update)
      OLD.label,
      v_version_number,
      COALESCE(NEW.metadata->>'last_change_source', 'user'),
      NEW.metadata->>'last_change_type',
      COALESCE((NEW.metadata->'last_diff_metadata')::jsonb, '{}'::jsonb)
    );
    
    -- Check version count and cleanup if needed
    SELECT COUNT(*)
    INTO v_versions_count
    FROM public.note_versions
    WHERE note_id = NEW.id;
    
    -- If we have more than 10 versions, delete the oldest
    IF v_versions_count > 10 THEN
      SELECT id
      INTO v_oldest_version_id
      FROM public.note_versions
      WHERE note_id = NEW.id
      ORDER BY version_number ASC
      LIMIT 1;
      
      DELETE FROM public.note_versions
      WHERE id = v_oldest_version_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGER: Auto-create versions on note updates
-- ============================================================================
DROP TRIGGER IF EXISTS note_version_trigger ON public.notes;

CREATE TRIGGER note_version_trigger
  BEFORE UPDATE ON public.notes
  FOR EACH ROW
  EXECUTE FUNCTION public.create_note_version();

-- ============================================================================
-- HELPER FUNCTION: Get version history for a note
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_note_versions(p_note_id UUID)
RETURNS TABLE (
  id UUID,
  version_number INTEGER,
  content TEXT,
  label TEXT,
  change_source TEXT,
  change_type TEXT,
  diff_metadata JSONB,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    nv.id,
    nv.version_number,
    nv.content,
    nv.label,
    nv.change_source,
    nv.change_type,
    nv.diff_metadata,
    nv.created_at
  FROM public.note_versions nv
  WHERE nv.note_id = p_note_id
  ORDER BY nv.version_number DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- HELPER FUNCTION: Restore note to a specific version
-- ============================================================================
CREATE OR REPLACE FUNCTION public.restore_note_version(
  p_note_id UUID,
  p_version_number INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  v_version RECORD;
BEGIN
  -- Get the version to restore
  SELECT content, label
  INTO v_version
  FROM public.note_versions
  WHERE note_id = p_note_id 
    AND version_number = p_version_number;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Update the note (this will trigger version creation automatically)
  UPDATE public.notes
  SET 
    content = v_version.content,
    label = v_version.label,
    metadata = COALESCE(metadata, '{}'::jsonb) || 
               jsonb_build_object(
                 'last_change_source', 'system',
                 'last_change_type', 'version_restore'
               )
  WHERE id = p_note_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================
ALTER TABLE public.note_versions ENABLE ROW LEVEL SECURITY;

-- Users can view their own note versions
CREATE POLICY "Users can view their own note versions"
  ON public.note_versions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can delete their own note versions
CREATE POLICY "Users can delete their own note versions"
  ON public.note_versions
  FOR DELETE
  USING (auth.uid() = user_id);

-- System can insert versions (trigger handles this)
CREATE POLICY "System can insert note versions"
  ON public.note_versions
  FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- NOTES
-- ============================================================================
-- This system works by:
-- 1. Storing a snapshot of the OLD content before each update
-- 2. Automatically limiting to 10 most recent versions
-- 3. Tracking whether changes came from user, AI, or system
-- 4. Providing easy restore functionality
--
-- To track AI changes, set metadata before updating:
-- UPDATE notes SET 
--   content = 'new content',
--   metadata = metadata || '{"last_change_source": "ai", "last_change_type": "ai_diff"}'
-- WHERE id = note_id;
-- ============================================================================

