-- ============================================
-- AI MATRX MESSAGING SYSTEM
-- Complete database migration for real-time chat
-- ============================================
--
-- This migration creates:
-- 1. conversations - Direct and group chat containers
-- 2. conversation_participants - Who's in each conversation
-- 3. messages - All chat messages
--
-- ADAPTED FOR AI MATRX:
-- - Uses users(matrix_id) as TEXT instead of users(id) as UUID
-- - Removed message_reactions and message_read_receipts for MVP
-- - No blocks table check (can be added later)
--
-- ============================================

-- ============================================
-- CONVERSATIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT DEFAULT 'direct' CHECK (type IN ('direct', 'group')),
  group_name TEXT,
  group_image_url TEXT,
  created_by TEXT REFERENCES users(matrix_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE conversations IS 'Chat conversations - direct (1:1) or group';
COMMENT ON COLUMN conversations.type IS 'direct for 1:1 chats, group for multi-user';
COMMENT ON COLUMN conversations.created_by IS 'matrix_id of user who created the conversation';

-- ============================================
-- CONVERSATION PARTICIPANTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(matrix_id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_read_at TIMESTAMPTZ,
  is_muted BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  
  UNIQUE(conversation_id, user_id)
);

COMMENT ON TABLE conversation_participants IS 'Links users to conversations they are part of';
COMMENT ON COLUMN conversation_participants.user_id IS 'matrix_id of the participant';
COMMENT ON COLUMN conversation_participants.last_read_at IS 'When user last read messages in this conversation';

-- ============================================
-- MESSAGES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL REFERENCES users(matrix_id) ON DELETE CASCADE,

  -- Message content
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video', 'audio', 'file', 'system')),

  -- For media messages (optional - for future use)
  media_url TEXT,
  media_thumbnail_url TEXT,
  media_metadata JSONB, -- width, height, duration, size, etc.

  -- Message status tracking
  status TEXT DEFAULT 'sent' CHECK (status IN ('sending', 'sent', 'delivered', 'read', 'failed')),

  -- Reply support (optional - for future use)
  reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL,

  -- Soft delete (for "delete for me" vs "delete for everyone")
  deleted_at TIMESTAMPTZ,
  deleted_for_everyone BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  edited_at TIMESTAMPTZ,

  -- Prevent duplicate messages (client-side idempotency key)
  client_message_id TEXT
);

COMMENT ON TABLE messages IS 'All chat messages in the system';
COMMENT ON COLUMN messages.sender_id IS 'matrix_id of the message sender';
COMMENT ON COLUMN messages.client_message_id IS 'Client-generated ID for deduplication and optimistic updates';
COMMENT ON COLUMN messages.status IS 'Message delivery status: sending -> sent -> delivered -> read';

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Conversation participant lookups
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id 
  ON conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation_id 
  ON conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_archived 
  ON conversation_participants(conversation_id) WHERE is_archived = false;

-- Primary query: get messages for a conversation (sorted by time, paginated)
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created 
  ON messages(conversation_id, created_at DESC);

-- For fetching unread messages
CREATE INDEX IF NOT EXISTS idx_messages_conversation_status 
  ON messages(conversation_id, status);

-- For sender filtering
CREATE INDEX IF NOT EXISTS idx_messages_sender 
  ON messages(sender_id);

-- For client-side deduplication
CREATE INDEX IF NOT EXISTS idx_messages_client_id 
  ON messages(client_message_id) WHERE client_message_id IS NOT NULL;

-- For reply threads
CREATE INDEX IF NOT EXISTS idx_messages_reply_to 
  ON messages(reply_to_id) WHERE reply_to_id IS NOT NULL;

-- For soft delete filtering
CREATE INDEX IF NOT EXISTS idx_messages_not_deleted 
  ON messages(conversation_id, created_at DESC) WHERE deleted_at IS NULL;

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- ============================================
-- HELPER FUNCTION: Get user's matrix_id from auth.uid()
-- Maps Supabase auth.uid() to users.matrix_id
-- ============================================

CREATE OR REPLACE FUNCTION get_user_matrix_id()
RETURNS TEXT AS $$
DECLARE
  v_matrix_id TEXT;
BEGIN
  SELECT matrix_id INTO v_matrix_id
  FROM users
  WHERE auth_id = auth.uid()::TEXT
  LIMIT 1;
  
  RETURN v_matrix_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION get_user_matrix_id() TO authenticated;

COMMENT ON FUNCTION get_user_matrix_id IS 
  'Get the current user matrix_id from auth.uid(). Uses SECURITY DEFINER to bypass RLS.';

-- ============================================
-- SECURITY DEFINER FUNCTION
-- Prevents RLS infinite recursion when checking participation
-- ============================================

CREATE OR REPLACE FUNCTION is_conversation_participant(p_conversation_id UUID, p_user_matrix_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = p_conversation_id
    AND user_id = p_user_matrix_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION is_conversation_participant(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION is_conversation_participant IS 
  'Check if a user is a participant in a conversation. Uses SECURITY DEFINER to bypass RLS and prevent recursion.';

-- ============================================
-- RLS POLICIES - CONVERSATIONS
-- ============================================

-- Users can read conversations they're part of or created
CREATE POLICY "Users can read own conversations" ON conversations
  FOR SELECT USING (
    created_by = get_user_matrix_id()
    OR is_conversation_participant(id, get_user_matrix_id())
  );

-- Users can create conversations
CREATE POLICY "Users can create conversations" ON conversations
  FOR INSERT WITH CHECK (created_by = get_user_matrix_id());

-- Owners can update their conversations
CREATE POLICY "Owners can update conversations" ON conversations
  FOR UPDATE USING (created_by = get_user_matrix_id());

-- Owners can delete their conversations
CREATE POLICY "Owners can delete conversations" ON conversations
  FOR DELETE USING (created_by = get_user_matrix_id());

-- ============================================
-- RLS POLICIES - CONVERSATION PARTICIPANTS
-- ============================================

-- Users can read participants in conversations they're part of
CREATE POLICY "Users can read conversation participants" ON conversation_participants
  FOR SELECT USING (
    is_conversation_participant(conversation_id, get_user_matrix_id())
  );

-- Users can add participants to conversations they created, or add themselves
CREATE POLICY "Users can add participants to conversations" ON conversation_participants
  FOR INSERT WITH CHECK (
    user_id = get_user_matrix_id()
    OR EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = conversation_participants.conversation_id
      AND conversations.created_by = get_user_matrix_id()
    )
  );

-- Users can update their own participation (e.g., mute, archive)
CREATE POLICY "Users can update own participation" ON conversation_participants
  FOR UPDATE USING (user_id = get_user_matrix_id());

-- Users can leave conversations
CREATE POLICY "Users can leave conversations" ON conversation_participants
  FOR DELETE USING (user_id = get_user_matrix_id());

-- ============================================
-- RLS POLICIES - MESSAGES
-- ============================================

-- Users can read messages in their conversations
CREATE POLICY "Users can read messages in their conversations" ON messages
  FOR SELECT USING (
    is_conversation_participant(conversation_id, get_user_matrix_id())
    AND (deleted_at IS NULL OR sender_id = get_user_matrix_id())
  );

-- Users can send messages to their conversations
CREATE POLICY "Users can send messages to their conversations" ON messages
  FOR INSERT WITH CHECK (
    sender_id = get_user_matrix_id()
    AND is_conversation_participant(conversation_id, get_user_matrix_id())
  );

-- Users can update their own messages (for edits and soft deletes)
CREATE POLICY "Users can update own messages" ON messages
  FOR UPDATE USING (sender_id = get_user_matrix_id());

-- Users can delete their own messages
CREATE POLICY "Users can delete own messages" ON messages
  FOR DELETE USING (sender_id = get_user_matrix_id());

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp (may already exist from other migrations)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to conversations (skip if trigger already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_conversations_updated_at'
  ) THEN
    CREATE TRIGGER update_conversations_updated_at 
      BEFORE UPDATE ON conversations 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Update conversation updated_at when new message is sent
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_message_insert ON messages;
CREATE TRIGGER on_message_insert
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_on_message();

-- ============================================
-- ENABLE REALTIME
-- ============================================

-- Enable realtime subscriptions for messages table
-- This allows clients to subscribe to INSERT/UPDATE/DELETE events
DO $$
BEGIN
  -- Check if table is already in publication before adding
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  END IF;
END $$;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to get unread message count for a user in a conversation
CREATE OR REPLACE FUNCTION get_unread_count(p_conversation_id UUID, p_user_matrix_id TEXT)
RETURNS INTEGER AS $$
DECLARE
  v_last_read TIMESTAMPTZ;
  v_count INTEGER;
BEGIN
  -- Get user's last read timestamp
  SELECT last_read_at INTO v_last_read
  FROM conversation_participants
  WHERE conversation_id = p_conversation_id
  AND user_id = p_user_matrix_id;

  -- Count messages after last read (excluding user's own messages)
  SELECT COUNT(*) INTO v_count
  FROM messages
  WHERE conversation_id = p_conversation_id
  AND sender_id != p_user_matrix_id
  AND deleted_at IS NULL
  AND (v_last_read IS NULL OR created_at > v_last_read);

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_unread_count(UUID, TEXT) TO authenticated;

-- Function to get conversations with last message and unread count
CREATE OR REPLACE FUNCTION get_conversations_with_details(p_user_matrix_id TEXT)
RETURNS TABLE (
  conversation_id UUID,
  conversation_type TEXT,
  group_name TEXT,
  group_image_url TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  last_message_content TEXT,
  last_message_sender_id TEXT,
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
    get_unread_count(c.id, p_user_matrix_id) as unread_count
  FROM conversations c
  JOIN conversation_participants cp ON cp.conversation_id = c.id
  LEFT JOIN LATERAL (
    SELECT content, sender_id, created_at
    FROM messages
    WHERE conversation_id = c.id
    AND deleted_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1
  ) m ON true
  WHERE cp.user_id = p_user_matrix_id
  AND cp.is_archived = false
  ORDER BY COALESCE(m.created_at, c.updated_at) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_conversations_with_details(TEXT) TO authenticated;

-- Function to find existing direct conversation between two users
CREATE OR REPLACE FUNCTION find_direct_conversation(p_user1_matrix_id TEXT, p_user2_matrix_id TEXT)
RETURNS UUID AS $$
DECLARE
  v_conversation_id UUID;
BEGIN
  SELECT c.id INTO v_conversation_id
  FROM conversations c
  WHERE c.type = 'direct'
  AND EXISTS (
    SELECT 1 FROM conversation_participants cp1
    WHERE cp1.conversation_id = c.id AND cp1.user_id = p_user1_matrix_id
  )
  AND EXISTS (
    SELECT 1 FROM conversation_participants cp2
    WHERE cp2.conversation_id = c.id AND cp2.user_id = p_user2_matrix_id
  )
  AND (
    SELECT COUNT(*) FROM conversation_participants cp
    WHERE cp.conversation_id = c.id
  ) = 2
  LIMIT 1;
  
  RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION find_direct_conversation(TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION find_direct_conversation IS 
  'Find existing direct conversation between two users. Returns NULL if none exists.';

-- ============================================
-- DONE
-- ============================================
-- After running this migration:
-- 1. Run: pnpm supabase gen types typescript --local > types/database.types.ts
-- 2. Create the MessagingService and hooks
-- 3. Create API routes
