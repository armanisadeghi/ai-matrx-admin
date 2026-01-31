/**
 * Direct Messaging Schema Migration
 * 
 * Creates tables for real-time direct messaging system:
 * - dm_conversations: Stores conversation metadata
 * - dm_conversation_participants: Links users to conversations
 * - dm_messages: Stores messages
 * 
 * Uses auth.users(id) as UUID for user references
 * All tables prefixed with dm_ to avoid conflicts with existing tables
 * 
 * Run this migration in the Supabase SQL Editor
 */

-- ============================================
-- ENABLE REALTIME FOR MESSAGING TABLES
-- ============================================

-- This will be enabled after table creation

-- ============================================
-- CREATE ENUM TYPES
-- ============================================

DO $$ BEGIN
  CREATE TYPE dm_conversation_type AS ENUM ('direct', 'group');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE dm_participant_role AS ENUM ('owner', 'admin', 'member');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE dm_message_type AS ENUM ('text', 'image', 'video', 'audio', 'file', 'system');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE dm_message_status AS ENUM ('sending', 'sent', 'delivered', 'read', 'failed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- CREATE TABLES
-- ============================================

-- Conversations table
CREATE TABLE IF NOT EXISTS dm_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type dm_conversation_type NOT NULL DEFAULT 'direct',
  group_name TEXT,
  group_image_url TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Conversation participants table
CREATE TABLE IF NOT EXISTS dm_conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES dm_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role dm_participant_role NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_read_at TIMESTAMPTZ,
  is_muted BOOLEAN NOT NULL DEFAULT false,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(conversation_id, user_id)
);

-- Messages table
CREATE TABLE IF NOT EXISTS dm_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES dm_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type dm_message_type NOT NULL DEFAULT 'text',
  media_url TEXT,
  media_thumbnail_url TEXT,
  media_metadata JSONB,
  status dm_message_status NOT NULL DEFAULT 'sent',
  reply_to_id UUID REFERENCES dm_messages(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ,
  deleted_for_everyone BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  edited_at TIMESTAMPTZ,
  client_message_id TEXT
);

-- ============================================
-- CREATE INDEXES
-- ============================================

-- Conversation participants indexes
CREATE INDEX IF NOT EXISTS idx_dm_conversation_participants_user 
  ON dm_conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_dm_conversation_participants_conv 
  ON dm_conversation_participants(conversation_id);

-- Messages indexes
CREATE INDEX IF NOT EXISTS idx_dm_messages_conversation 
  ON dm_messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dm_messages_sender 
  ON dm_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_dm_messages_client_id 
  ON dm_messages(client_message_id) 
  WHERE client_message_id IS NOT NULL;

-- Conversations indexes
CREATE INDEX IF NOT EXISTS idx_dm_conversations_updated 
  ON dm_conversations(updated_at DESC);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to check if user is participant in conversation
CREATE OR REPLACE FUNCTION is_dm_participant(
  p_user_id UUID,
  p_conversation_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM dm_conversation_participants
    WHERE user_id = p_user_id
    AND conversation_id = p_conversation_id
    AND is_archived = false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread count for a user in a conversation
CREATE OR REPLACE FUNCTION get_dm_unread_count(
  p_user_id UUID,
  p_conversation_id UUID
) RETURNS INTEGER AS $$
DECLARE
  v_last_read TIMESTAMPTZ;
  v_count INTEGER;
BEGIN
  -- Get user's last read timestamp
  SELECT last_read_at INTO v_last_read
  FROM dm_conversation_participants
  WHERE user_id = p_user_id AND conversation_id = p_conversation_id;
  
  -- Count messages after last read
  IF v_last_read IS NULL THEN
    -- Count all messages not from this user
    SELECT COUNT(*) INTO v_count
    FROM dm_messages
    WHERE conversation_id = p_conversation_id
    AND sender_id != p_user_id
    AND deleted_at IS NULL;
  ELSE
    SELECT COUNT(*) INTO v_count
    FROM dm_messages
    WHERE conversation_id = p_conversation_id
    AND sender_id != p_user_id
    AND created_at > v_last_read
    AND deleted_at IS NULL;
  END IF;
  
  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user info from auth.users
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
    au.id AS user_id,
    au.email::TEXT AS email,
    COALESCE(
      au.raw_user_meta_data->>'full_name',
      au.raw_user_meta_data->>'name',
      au.email
    )::TEXT AS display_name,
    COALESCE(
      au.raw_user_meta_data->>'avatar_url',
      au.raw_user_meta_data->>'picture'
    )::TEXT AS avatar_url
  FROM auth.users au
  WHERE au.id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get conversations with details for a user
CREATE OR REPLACE FUNCTION get_dm_conversations_with_details(p_user_id UUID)
RETURNS TABLE (
  conversation_id UUID,
  conversation_type dm_conversation_type,
  group_name TEXT,
  group_image_url TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  last_message_id UUID,
  last_message_content TEXT,
  last_message_at TIMESTAMPTZ,
  last_message_sender_id UUID,
  unread_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id AS conversation_id,
    c.type AS conversation_type,
    c.group_name,
    c.group_image_url,
    c.created_at,
    c.updated_at,
    lm.id AS last_message_id,
    lm.content AS last_message_content,
    lm.created_at AS last_message_at,
    lm.sender_id AS last_message_sender_id,
    get_dm_unread_count(p_user_id, c.id) AS unread_count
  FROM dm_conversations c
  INNER JOIN dm_conversation_participants cp ON c.id = cp.conversation_id
  LEFT JOIN LATERAL (
    SELECT m.id, m.content, m.created_at, m.sender_id
    FROM dm_messages m
    WHERE m.conversation_id = c.id AND m.deleted_at IS NULL
    ORDER BY m.created_at DESC
    LIMIT 1
  ) lm ON true
  WHERE cp.user_id = p_user_id
  AND cp.is_archived = false
  ORDER BY COALESCE(lm.created_at, c.updated_at) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to find existing direct conversation between two users
CREATE OR REPLACE FUNCTION find_dm_direct_conversation(
  p_user1_id UUID,
  p_user2_id UUID
) RETURNS UUID AS $$
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
  LIMIT 1;
  
  RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGERS
-- ============================================

-- Update conversation updated_at when messages are added
CREATE OR REPLACE FUNCTION update_dm_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE dm_conversations 
  SET updated_at = now() 
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_dm_conversation_on_message ON dm_messages;
CREATE TRIGGER trigger_update_dm_conversation_on_message
  AFTER INSERT ON dm_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_dm_conversation_timestamp();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on all tables
ALTER TABLE dm_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE dm_conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE dm_messages ENABLE ROW LEVEL SECURITY;

-- Conversations policies
DROP POLICY IF EXISTS "dm_conversations_select" ON dm_conversations;
CREATE POLICY "dm_conversations_select" ON dm_conversations
  FOR SELECT USING (
    is_dm_participant(auth.uid(), id)
  );

DROP POLICY IF EXISTS "dm_conversations_insert" ON dm_conversations;
CREATE POLICY "dm_conversations_insert" ON dm_conversations
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "dm_conversations_update" ON dm_conversations;
CREATE POLICY "dm_conversations_update" ON dm_conversations
  FOR UPDATE USING (
    created_by = auth.uid() OR is_dm_participant(auth.uid(), id)
  );

DROP POLICY IF EXISTS "dm_conversations_delete" ON dm_conversations;
CREATE POLICY "dm_conversations_delete" ON dm_conversations
  FOR DELETE USING (
    created_by = auth.uid()
  );

-- Conversation participants policies
DROP POLICY IF EXISTS "dm_participants_select" ON dm_conversation_participants;
CREATE POLICY "dm_participants_select" ON dm_conversation_participants
  FOR SELECT USING (
    user_id = auth.uid() OR is_dm_participant(auth.uid(), conversation_id)
  );

DROP POLICY IF EXISTS "dm_participants_insert" ON dm_conversation_participants;
CREATE POLICY "dm_participants_insert" ON dm_conversation_participants
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "dm_participants_update" ON dm_conversation_participants;
CREATE POLICY "dm_participants_update" ON dm_conversation_participants
  FOR UPDATE USING (
    user_id = auth.uid()
  );

DROP POLICY IF EXISTS "dm_participants_delete" ON dm_conversation_participants;
CREATE POLICY "dm_participants_delete" ON dm_conversation_participants
  FOR DELETE USING (
    user_id = auth.uid()
  );

-- Messages policies
DROP POLICY IF EXISTS "dm_messages_select" ON dm_messages;
CREATE POLICY "dm_messages_select" ON dm_messages
  FOR SELECT USING (
    is_dm_participant(auth.uid(), conversation_id)
  );

DROP POLICY IF EXISTS "dm_messages_insert" ON dm_messages;
CREATE POLICY "dm_messages_insert" ON dm_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND is_dm_participant(auth.uid(), conversation_id)
  );

DROP POLICY IF EXISTS "dm_messages_update" ON dm_messages;
CREATE POLICY "dm_messages_update" ON dm_messages
  FOR UPDATE USING (
    sender_id = auth.uid()
  );

DROP POLICY IF EXISTS "dm_messages_delete" ON dm_messages;
CREATE POLICY "dm_messages_delete" ON dm_messages
  FOR DELETE USING (
    sender_id = auth.uid()
  );

-- ============================================
-- ENABLE REALTIME
-- ============================================

-- Enable realtime for dm_messages table (for postgres_changes)
ALTER PUBLICATION supabase_realtime ADD TABLE dm_messages;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

-- Grant execute permissions on functions to authenticated users
GRANT EXECUTE ON FUNCTION is_dm_participant(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_dm_unread_count(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_dm_user_info(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_dm_conversations_with_details(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION find_dm_direct_conversation(UUID, UUID) TO authenticated;
