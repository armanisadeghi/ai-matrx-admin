-- ============================================
-- SUPABASE MESSAGING SYSTEM
-- Complete database migration for real-time chat
-- ============================================
--
-- This migration creates:
-- 1. conversations - Direct and group chat containers
-- 2. conversation_participants - Who's in each conversation
-- 3. messages - All chat messages
-- 4. message_reactions - Emoji reactions (optional)
-- 5. message_read_receipts - Per-message read tracking (optional)
--
-- BEFORE RUNNING:
-- 1. Verify your users table is named "users" with UUID primary key
-- 2. If you have no "blocks" table, remove block-related RLS policies
-- 3. Remove optional tables if not needed
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
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CONVERSATION PARTICIPANTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_read_at TIMESTAMPTZ,
  is_muted BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  
  UNIQUE(conversation_id, user_id)
);

-- ============================================
-- MESSAGES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Message content
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video', 'audio', 'file', 'system')),

  -- For media messages (optional - remove if not needed)
  media_url TEXT,
  media_thumbnail_url TEXT,
  media_metadata JSONB, -- width, height, duration, size, etc.

  -- Message status tracking
  status TEXT DEFAULT 'sent' CHECK (status IN ('sending', 'sent', 'delivered', 'read', 'failed')),

  -- Reply support (optional - remove if not needed)
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

-- ============================================
-- MESSAGE REACTIONS TABLE (Optional)
-- Remove this section if reactions not needed
-- ============================================

CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reaction TEXT NOT NULL, -- emoji or reaction type
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(message_id, user_id, reaction)
);

-- ============================================
-- MESSAGE READ RECEIPTS TABLE (Optional)
-- Remove this section if per-message read receipts not needed
-- ============================================

CREATE TABLE IF NOT EXISTS message_read_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(message_id, user_id)
);

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

-- Message reactions index
CREATE INDEX IF NOT EXISTS idx_message_reactions_message 
  ON message_reactions(message_id);

-- Read receipts indexes
CREATE INDEX IF NOT EXISTS idx_message_read_receipts_message 
  ON message_read_receipts(message_id);
CREATE INDEX IF NOT EXISTS idx_message_read_receipts_user 
  ON message_read_receipts(user_id);

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_read_receipts ENABLE ROW LEVEL SECURITY;

-- ============================================
-- SECURITY DEFINER FUNCTION
-- Prevents RLS infinite recursion when checking participation
-- ============================================

CREATE OR REPLACE FUNCTION is_conversation_participant(p_conversation_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = p_conversation_id
    AND user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION is_conversation_participant(UUID, UUID) TO authenticated;

COMMENT ON FUNCTION is_conversation_participant IS 
  'Check if a user is a participant in a conversation. Uses SECURITY DEFINER to bypass RLS and prevent recursion.';

-- ============================================
-- RLS POLICIES - CONVERSATIONS
-- ============================================

-- Users can read conversations they're part of or created
CREATE POLICY "Users can read own conversations" ON conversations
  FOR SELECT USING (
    auth.uid() = created_by
    OR is_conversation_participant(id, auth.uid())
  );

-- Users can create conversations
CREATE POLICY "Users can create conversations" ON conversations
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Owners can update their conversations
CREATE POLICY "Owners can update conversations" ON conversations
  FOR UPDATE USING (auth.uid() = created_by);

-- Owners can delete their conversations
CREATE POLICY "Owners can delete conversations" ON conversations
  FOR DELETE USING (auth.uid() = created_by);

-- ============================================
-- RLS POLICIES - CONVERSATION PARTICIPANTS
-- ============================================

-- Users can read participants in conversations they're part of
CREATE POLICY "Users can read conversation participants" ON conversation_participants
  FOR SELECT USING (
    is_conversation_participant(conversation_id, auth.uid())
  );

-- Users can add participants to conversations they created, or add themselves
CREATE POLICY "Users can add participants to conversations" ON conversation_participants
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = conversation_participants.conversation_id
      AND conversations.created_by = auth.uid()
    )
  );

-- Users can update their own participation (e.g., mute, archive)
CREATE POLICY "Users can update own participation" ON conversation_participants
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can leave conversations
CREATE POLICY "Users can leave conversations" ON conversation_participants
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- RLS POLICIES - MESSAGES
-- ============================================

-- Users can read messages in their conversations
CREATE POLICY "Users can read messages in their conversations" ON messages
  FOR SELECT USING (
    is_conversation_participant(conversation_id, auth.uid())
    AND (deleted_at IS NULL OR sender_id = auth.uid())
  );

-- Users can send messages to their conversations
-- NOTE: Remove the blocks check if your project has no blocking feature
CREATE POLICY "Users can send messages to their conversations" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND is_conversation_participant(conversation_id, auth.uid())
    -- OPTIONAL: Block check - remove if no blocks table exists
    -- AND NOT EXISTS (
    --   SELECT 1 FROM blocks b
    --   JOIN conversation_participants cp ON cp.conversation_id = messages.conversation_id
    --   WHERE (b.blocker_id = cp.user_id AND b.blocked_id = auth.uid())
    --      OR (b.blocker_id = auth.uid() AND b.blocked_id = cp.user_id)
    -- )
  );

-- Users can update their own messages (for edits and soft deletes)
CREATE POLICY "Users can update own messages" ON messages
  FOR UPDATE USING (auth.uid() = sender_id);

-- Users can delete their own messages
CREATE POLICY "Users can delete own messages" ON messages
  FOR DELETE USING (auth.uid() = sender_id);

-- ============================================
-- RLS POLICIES - MESSAGE REACTIONS (Optional)
-- ============================================

-- Users can read reactions on messages they can see
CREATE POLICY "Users can read reactions" ON message_reactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM messages m
      WHERE m.id = message_reactions.message_id
      AND is_conversation_participant(m.conversation_id, auth.uid())
    )
  );

-- Users can add reactions to messages they can see
CREATE POLICY "Users can add reactions" ON message_reactions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM messages m
      WHERE m.id = message_reactions.message_id
      AND is_conversation_participant(m.conversation_id, auth.uid())
    )
  );

-- Users can remove their own reactions
CREATE POLICY "Users can remove own reactions" ON message_reactions
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- RLS POLICIES - MESSAGE READ RECEIPTS (Optional)
-- ============================================

-- Users can see read receipts for messages in their conversations
CREATE POLICY "Users can read message receipts" ON message_read_receipts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM messages m
      WHERE m.id = message_read_receipts.message_id
      AND is_conversation_participant(m.conversation_id, auth.uid())
    )
  );

-- Users can mark messages as read
CREATE POLICY "Users can mark messages as read" ON message_read_receipts
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM messages m
      WHERE m.id = message_read_receipts.message_id
      AND is_conversation_participant(m.conversation_id, auth.uid())
    )
  );

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
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

CREATE TRIGGER on_message_insert
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_on_message();

-- ============================================
-- ENABLE REALTIME
-- ============================================

-- Enable realtime subscriptions for these tables
-- This allows clients to subscribe to INSERT/UPDATE/DELETE events
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE message_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE message_read_receipts;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to get unread message count for a user in a conversation
CREATE OR REPLACE FUNCTION get_unread_count(p_conversation_id UUID, p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_last_read TIMESTAMPTZ;
  v_count INTEGER;
BEGIN
  -- Get user's last read timestamp
  SELECT last_read_at INTO v_last_read
  FROM conversation_participants
  WHERE conversation_id = p_conversation_id
  AND user_id = p_user_id;

  -- Count messages after last read (excluding user's own messages)
  SELECT COUNT(*) INTO v_count
  FROM messages
  WHERE conversation_id = p_conversation_id
  AND sender_id != p_user_id
  AND deleted_at IS NULL
  AND (v_last_read IS NULL OR created_at > v_last_read);

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get conversations with last message and unread count
CREATE OR REPLACE FUNCTION get_conversations_with_details(p_user_id UUID)
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
    get_unread_count(c.id, p_user_id) as unread_count
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
  WHERE cp.user_id = p_user_id
  AND cp.is_archived = false
  ORDER BY COALESCE(m.created_at, c.updated_at) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- DONE
-- ============================================
-- After running this migration:
-- 1. Run: supabase gen types typescript --local > src/types/database.types.ts
-- 2. Create the MessagingService and hooks
-- 3. Create API routes
