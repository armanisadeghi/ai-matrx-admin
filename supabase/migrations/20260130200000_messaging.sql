-- ============================================
-- AI MATRX DIRECT MESSAGING SYSTEM
-- Complete database migration for real-time chat
-- ============================================
--
-- Tables prefixed with dm_ to avoid conflicts with existing tables
-- Uses auth.users(id) as UUID for user references
--
-- ============================================

-- ============================================
-- DM_CONVERSATIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS dm_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT DEFAULT 'direct' CHECK (type IN ('direct', 'group')),
  group_name TEXT,
  group_image_url TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE dm_conversations IS 'Direct messaging conversations - 1:1 or group chats';

-- ============================================
-- DM_CONVERSATION_PARTICIPANTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS dm_conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES dm_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_read_at TIMESTAMPTZ,
  is_muted BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  
  UNIQUE(conversation_id, user_id)
);

COMMENT ON TABLE dm_conversation_participants IS 'Links users to DM conversations';

-- ============================================
-- DM_MESSAGES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS dm_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES dm_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Message content
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video', 'audio', 'file', 'system')),

  -- For media messages
  media_url TEXT,
  media_thumbnail_url TEXT,
  media_metadata JSONB,

  -- Message status tracking
  status TEXT DEFAULT 'sent' CHECK (status IN ('sending', 'sent', 'delivered', 'read', 'failed')),

  -- Reply support
  reply_to_id UUID REFERENCES dm_messages(id) ON DELETE SET NULL,

  -- Soft delete
  deleted_at TIMESTAMPTZ,
  deleted_for_everyone BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  edited_at TIMESTAMPTZ,

  -- Prevent duplicate messages (client-side idempotency key)
  client_message_id TEXT
);

COMMENT ON TABLE dm_messages IS 'Direct messaging - all chat messages';

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_dm_participants_user_id 
  ON dm_conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_dm_participants_conversation_id 
  ON dm_conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_dm_participants_archived 
  ON dm_conversation_participants(conversation_id) WHERE is_archived = false;

CREATE INDEX IF NOT EXISTS idx_dm_messages_conversation_created 
  ON dm_messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dm_messages_conversation_status 
  ON dm_messages(conversation_id, status);
CREATE INDEX IF NOT EXISTS idx_dm_messages_sender 
  ON dm_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_dm_messages_client_id 
  ON dm_messages(client_message_id) WHERE client_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dm_messages_reply_to 
  ON dm_messages(reply_to_id) WHERE reply_to_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dm_messages_not_deleted 
  ON dm_messages(conversation_id, created_at DESC) WHERE deleted_at IS NULL;

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE dm_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE dm_conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE dm_messages ENABLE ROW LEVEL SECURITY;

-- ============================================
-- SECURITY DEFINER FUNCTION
-- Prevents RLS infinite recursion when checking participation
-- NOTE: Parameter order is (conversation_id, user_id)
-- ============================================

CREATE OR REPLACE FUNCTION is_dm_participant(p_conversation_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM dm_conversation_participants
    WHERE conversation_id = p_conversation_id
    AND user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION is_dm_participant(UUID, UUID) TO authenticated;

-- ============================================
-- RLS POLICIES - DM_CONVERSATIONS
-- ============================================

CREATE POLICY "Users can read own dm_conversations" ON dm_conversations
  FOR SELECT USING (
    created_by = auth.uid()
    OR is_dm_participant(id, auth.uid())
  );

CREATE POLICY "Users can create dm_conversations" ON dm_conversations
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Owners can update dm_conversations" ON dm_conversations
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Owners can delete dm_conversations" ON dm_conversations
  FOR DELETE USING (created_by = auth.uid());

-- ============================================
-- RLS POLICIES - DM_CONVERSATION_PARTICIPANTS
-- ============================================

CREATE POLICY "Users can read dm_conversation_participants" ON dm_conversation_participants
  FOR SELECT USING (
    is_dm_participant(conversation_id, auth.uid())
  );

CREATE POLICY "Users can add dm_participants" ON dm_conversation_participants
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM dm_conversations
      WHERE dm_conversations.id = dm_conversation_participants.conversation_id
      AND dm_conversations.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update own dm_participation" ON dm_conversation_participants
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can leave dm_conversations" ON dm_conversation_participants
  FOR DELETE USING (user_id = auth.uid());

-- ============================================
-- RLS POLICIES - DM_MESSAGES
-- ============================================

CREATE POLICY "Users can read dm_messages" ON dm_messages
  FOR SELECT USING (
    is_dm_participant(conversation_id, auth.uid())
    AND (deleted_at IS NULL OR sender_id = auth.uid())
  );

CREATE POLICY "Users can send dm_messages" ON dm_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND is_dm_participant(conversation_id, auth.uid())
  );

CREATE POLICY "Users can update own dm_messages" ON dm_messages
  FOR UPDATE USING (sender_id = auth.uid());

CREATE POLICY "Users can delete own dm_messages" ON dm_messages
  FOR DELETE USING (sender_id = auth.uid());

-- ============================================
-- TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION update_dm_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE dm_conversations
  SET updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_dm_message_insert ON dm_messages;
CREATE TRIGGER on_dm_message_insert
  AFTER INSERT ON dm_messages
  FOR EACH ROW EXECUTE FUNCTION update_dm_conversation_timestamp();

-- ============================================
-- ENABLE REALTIME
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'dm_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE dm_messages;
  END IF;
END $$;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Get unread message count
-- NOTE: Parameter order is (conversation_id, user_id)
CREATE OR REPLACE FUNCTION get_dm_unread_count(p_conversation_id UUID, p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_last_read TIMESTAMPTZ;
  v_count INTEGER;
BEGIN
  SELECT last_read_at INTO v_last_read
  FROM dm_conversation_participants
  WHERE conversation_id = p_conversation_id
  AND user_id = p_user_id;

  SELECT COUNT(*) INTO v_count
  FROM dm_messages
  WHERE conversation_id = p_conversation_id
  AND sender_id != p_user_id
  AND deleted_at IS NULL
  AND (v_last_read IS NULL OR created_at > v_last_read);

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_dm_unread_count(UUID, UUID) TO authenticated;

-- Get user display info from auth.users
CREATE OR REPLACE FUNCTION get_dm_user_info(p_user_id UUID)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.id as user_id,
    au.email::TEXT as email,
    COALESCE(
      au.raw_user_meta_data->>'full_name',
      au.raw_user_meta_data->>'name',
      split_part(au.email, '@', 1)
    )::TEXT as display_name,
    COALESCE(
      au.raw_user_meta_data->>'avatar_url',
      au.raw_user_meta_data->>'picture'
    )::TEXT as avatar_url
  FROM auth.users au
  WHERE au.id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION get_dm_user_info(UUID) TO authenticated;

-- Get conversations with details
CREATE OR REPLACE FUNCTION get_dm_conversations_with_details(p_user_id UUID)
RETURNS TABLE (
  conversation_id UUID,
  conversation_type TEXT,
  group_name TEXT,
  group_image_url TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  last_message_content TEXT,
  last_message_sender_id UUID,
  last_message_at TIMESTAMPTZ,
  unread_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id as conversation_id,
    c.type as conversation_type,
    c.group_name,
    c.group_image_url,
    c.created_at,
    c.updated_at,
    m.content as last_message_content,
    m.sender_id as last_message_sender_id,
    m.created_at as last_message_at,
    get_dm_unread_count(c.id, p_user_id) as unread_count
  FROM dm_conversations c
  JOIN dm_conversation_participants cp ON cp.conversation_id = c.id
  LEFT JOIN LATERAL (
    SELECT content, sender_id, created_at
    FROM dm_messages
    WHERE conversation_id = c.id
    AND deleted_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1
  ) m ON true
  WHERE cp.user_id = p_user_id
  AND cp.is_archived = false
  ORDER BY COALESCE(m.created_at, c.updated_at) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_dm_conversations_with_details(UUID) TO authenticated;

-- Find existing direct conversation between two users
CREATE OR REPLACE FUNCTION find_dm_direct_conversation(p_user1_id UUID, p_user2_id UUID)
RETURNS UUID AS $$
DECLARE
  v_conversation_id UUID;
BEGIN
  SELECT c.id INTO v_conversation_id
  FROM dm_conversations c
  WHERE c.type = 'direct'
  AND EXISTS (
    SELECT 1 FROM dm_conversation_participants cp1
    WHERE cp1.conversation_id = c.id AND cp1.user_id = p_user1_id
  )
  AND EXISTS (
    SELECT 1 FROM dm_conversation_participants cp2
    WHERE cp2.conversation_id = c.id AND cp2.user_id = p_user2_id
  )
  AND (
    SELECT COUNT(*) FROM dm_conversation_participants cp
    WHERE cp.conversation_id = c.id
  ) = 2
  LIMIT 1;
  
  RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION find_dm_direct_conversation(UUID, UUID) TO authenticated;

-- ============================================
-- DONE
-- ============================================
