-- ============================================================================
-- NOTE VERSIONS SYSTEM - Version history and diff tracking for notes
-- ============================================================================
-- Purpose: Automatically track changes to notes with version history
-- Max 10 versions per note (auto-cleanup via trigger)
-- ============================================================================

-- ============================================================================
-- MAIN TABLE: note_versions
-- ============================================================================

CREATE TABLE IF NOT EXISTS note_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Association
  note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,

  -- Version Data
  version_number INTEGER NOT NULL,
  content TEXT NOT NULL,
  label TEXT NOT NULL,

  -- Metadata at time of version
  folder_name TEXT,
  tags TEXT[],
  metadata JSONB DEFAULT '{}',

  -- Tracking
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Change Info
  change_type TEXT DEFAULT 'manual',
  -- Options: 'manual', 'ai_edit', 'ai_accept_all', 'ai_accept_partial'

  change_metadata JSONB DEFAULT '{}',
  -- Example: {"diffCount": 3, "acceptedDiffs": ["diff-1", "diff-2"]}

  -- Constraints
  CONSTRAINT valid_change_type CHECK (change_type IN ('manual', 'ai_edit', 'ai_accept_all', 'ai_accept_partial')),
  CONSTRAINT positive_version CHECK (version_number > 0)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_note_versions_note_id ON note_versions(note_id);
CREATE INDEX idx_note_versions_created_at ON note_versions(created_at DESC);
CREATE INDEX idx_note_versions_note_created ON note_versions(note_id, created_at DESC);
CREATE INDEX idx_note_versions_version_number ON note_versions(note_id, version_number DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE note_versions ENABLE ROW LEVEL SECURITY;

-- Users can view versions for notes they own
CREATE POLICY "note_versions_select_policy" ON note_versions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM notes
    WHERE notes.id = note_versions.note_id
    AND notes.user_id = auth.uid()
  )
);

-- System trigger handles inserts (but allow user inserts too)
CREATE POLICY "note_versions_insert_policy" ON note_versions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM notes
    WHERE notes.id = note_versions.note_id
    AND notes.user_id = auth.uid()
  )
);

-- Users can delete versions for their own notes
CREATE POLICY "note_versions_delete_policy" ON note_versions
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM notes
    WHERE notes.id = note_versions.note_id
    AND notes.user_id = auth.uid()
  )
);

-- ============================================================================
-- TRIGGERS & FUNCTIONS
-- ============================================================================

-- Function to get next version number
CREATE OR REPLACE FUNCTION get_next_version_number(p_note_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_max_version INTEGER;
BEGIN
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO v_max_version
  FROM note_versions
  WHERE note_id = p_note_id;

  RETURN v_max_version;
END;
$$ LANGUAGE plpgsql;

-- Function to create version on note update
CREATE OR REPLACE FUNCTION create_note_version()
RETURNS TRIGGER AS $$
DECLARE
  v_version_number INTEGER;
  v_version_count INTEGER;
  v_oldest_version_id UUID;
BEGIN
  -- Only create version if content actually changed
  IF OLD.content IS DISTINCT FROM NEW.content OR
     OLD.label IS DISTINCT FROM NEW.label THEN

    -- Get next version number
    v_version_number := get_next_version_number(NEW.id);

    -- Insert the OLD content as a version (preserve what it was before the change)
    INSERT INTO note_versions (
      note_id,
      version_number,
      content,
      label,
      folder_name,
      tags,
      metadata,
      created_by,
      created_at,
      change_type,
      change_metadata
    ) VALUES (
      OLD.id,
      v_version_number,
      OLD.content,
      OLD.label,
      OLD.folder_name,
      OLD.tags,
      OLD.metadata,
      OLD.user_id,
      OLD.updated_at,  -- Use the timestamp before the update
      COALESCE((NEW.metadata->>'lastChangeType')::TEXT, 'manual'),
      COALESCE(NEW.metadata->'lastChangeMetadata', '{}'::jsonb)
    );

    -- Check version count and delete oldest if > 10
    SELECT COUNT(*) INTO v_version_count
    FROM note_versions
    WHERE note_id = NEW.id;

    IF v_version_count > 10 THEN
      -- Get oldest version ID
      SELECT id INTO v_oldest_version_id
      FROM note_versions
      WHERE note_id = NEW.id
      ORDER BY version_number ASC
      LIMIT 1;

      -- Delete oldest version
      DELETE FROM note_versions WHERE id = v_oldest_version_id;

      -- Renumber remaining versions to maintain sequence
      WITH numbered_versions AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as new_number
        FROM note_versions
        WHERE note_id = NEW.id
      )
      UPDATE note_versions nv
      SET version_number = numbered_versions.new_number
      FROM numbered_versions
      WHERE nv.id = numbered_versions.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on notes table
DROP TRIGGER IF EXISTS create_version_on_note_update ON notes;
CREATE TRIGGER create_version_on_note_update
  AFTER UPDATE ON notes
  FOR EACH ROW
  WHEN (OLD.is_deleted = false)  -- Don't version deleted notes
  EXECUTE FUNCTION create_note_version();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get version history for a note
CREATE OR REPLACE FUNCTION get_note_version_history(p_note_id UUID)
RETURNS TABLE(
  version_id UUID,
  version_number INTEGER,
  content TEXT,
  label TEXT,
  created_at TIMESTAMPTZ,
  created_by UUID,
  change_type TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    id,
    version_number,
    content,
    label,
    created_at,
    created_by,
    change_type
  FROM note_versions
  WHERE note_id = p_note_id
  ORDER BY version_number DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to restore a specific version
CREATE OR REPLACE FUNCTION restore_note_version(
  p_note_id UUID,
  p_version_number INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  v_version note_versions%ROWTYPE;
BEGIN
  -- Get the version
  SELECT * INTO v_version
  FROM note_versions
  WHERE note_id = p_note_id
  AND version_number = p_version_number;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Version not found';
  END IF;

  -- Update the note with version content
  UPDATE notes
  SET
    content = v_version.content,
    label = v_version.label,
    updated_at = NOW(),
    metadata = jsonb_set(
      COALESCE(metadata, '{}'::jsonb),
      '{lastChangeType}',
      '"version_restore"'::jsonb
    )
  WHERE id = p_note_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to compare two versions (returns diff metadata)
CREATE OR REPLACE FUNCTION compare_note_versions(
  p_note_id UUID,
  p_version_number_1 INTEGER,
  p_version_number_2 INTEGER
)
RETURNS TABLE(
  version_1_content TEXT,
  version_2_content TEXT,
  version_1_label TEXT,
  version_2_label TEXT,
  version_1_created_at TIMESTAMPTZ,
  version_2_created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    v1.content,
    v2.content,
    v1.label,
    v2.label,
    v1.created_at,
    v2.created_at
  FROM
    (SELECT * FROM note_versions WHERE note_id = p_note_id AND version_number = p_version_number_1) v1
    CROSS JOIN
    (SELECT * FROM note_versions WHERE note_id = p_note_id AND version_number = p_version_number_2) v2;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE note_versions IS 'Version history for notes - automatically tracks changes with max 10 versions per note';
COMMENT ON COLUMN note_versions.version_number IS 'Sequential version number (1-based, renumbered when old versions deleted)';
COMMENT ON COLUMN note_versions.change_type IS 'How the change was made: manual, ai_edit, ai_accept_all, ai_accept_partial';
COMMENT ON COLUMN note_versions.change_metadata IS 'Additional metadata about the change (e.g., which diffs were accepted)';
COMMENT ON FUNCTION create_note_version() IS 'Trigger function that creates a version when note content changes';
COMMENT ON FUNCTION get_next_version_number(UUID) IS 'Gets the next sequential version number for a note';
COMMENT ON FUNCTION restore_note_version(UUID, INTEGER) IS 'Restores a note to a specific version';
