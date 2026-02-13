-- SMS Integration Schema
-- All tables prefixed with sms_ for feature identification
-- Supports: inbound/outbound messaging, user phone numbers, conversations,
-- notifications, opt-in/opt-out compliance, AI agent triggers, admin messaging

-- ============================================
-- Phone Numbers assigned to users
-- ============================================
CREATE TABLE IF NOT EXISTS sms_phone_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  phone_number TEXT NOT NULL UNIQUE,
  twilio_sid TEXT NOT NULL UNIQUE,
  friendly_name TEXT,
  capabilities JSONB DEFAULT '{"sms": true, "mms": true, "voice": false}'::jsonb,
  number_type TEXT NOT NULL DEFAULT 'local' CHECK (number_type IN ('local', 'toll_free', 'short_code')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  assigned_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sms_phone_numbers_user_id ON sms_phone_numbers(user_id);
CREATE INDEX idx_sms_phone_numbers_phone_number ON sms_phone_numbers(phone_number);
CREATE INDEX idx_sms_phone_numbers_active ON sms_phone_numbers(is_active) WHERE is_active = true;

ALTER TABLE sms_phone_numbers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own phone numbers"
  ON sms_phone_numbers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all phone numbers"
  ON sms_phone_numbers FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- SMS Conversations (thread tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS sms_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  external_phone_number TEXT NOT NULL,
  our_phone_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'blocked')),
  conversation_type TEXT NOT NULL DEFAULT 'user_initiated' CHECK (conversation_type IN ('user_initiated', 'system_initiated', 'ai_agent', 'admin', 'notification')),
  ai_agent_id TEXT,
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  last_message_direction TEXT CHECK (last_message_direction IN ('inbound', 'outbound')),
  message_count INTEGER NOT NULL DEFAULT 0,
  unread_count INTEGER NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sms_conversations_user_id ON sms_conversations(user_id);
CREATE INDEX idx_sms_conversations_external_phone ON sms_conversations(external_phone_number);
CREATE INDEX idx_sms_conversations_our_phone ON sms_conversations(our_phone_number);
CREATE INDEX idx_sms_conversations_status ON sms_conversations(status);
CREATE INDEX idx_sms_conversations_type ON sms_conversations(conversation_type);
CREATE INDEX idx_sms_conversations_last_message ON sms_conversations(last_message_at DESC);

ALTER TABLE sms_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own conversations"
  ON sms_conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all conversations"
  ON sms_conversations FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- SMS Messages (all directions)
-- ============================================
CREATE TABLE IF NOT EXISTS sms_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES sms_conversations(id) ON DELETE CASCADE,
  twilio_sid TEXT UNIQUE,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  from_number TEXT NOT NULL,
  to_number TEXT NOT NULL,
  body TEXT,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'accepted', 'sending', 'sent', 'delivered', 'undelivered', 'failed', 'received', 'read')),
  error_code TEXT,
  error_message TEXT,
  num_segments INTEGER DEFAULT 1,
  price DECIMAL(10, 5),
  price_unit TEXT DEFAULT 'USD',
  -- Media/MMS fields
  num_media INTEGER NOT NULL DEFAULT 0,
  media_urls TEXT[] DEFAULT '{}',
  media_content_types TEXT[] DEFAULT '{}',
  -- Sender context
  sent_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sent_by_type TEXT NOT NULL DEFAULT 'system' CHECK (sent_by_type IN ('user', 'system', 'ai_agent', 'admin', 'notification', 'auto_reply')),
  -- AI Agent processing
  ai_processed BOOLEAN NOT NULL DEFAULT false,
  ai_response_id TEXT,
  ai_processing_status TEXT CHECK (ai_processing_status IN ('pending', 'processing', 'completed', 'failed', 'skipped')),
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sms_messages_conversation_id ON sms_messages(conversation_id);
CREATE INDEX idx_sms_messages_twilio_sid ON sms_messages(twilio_sid);
CREATE INDEX idx_sms_messages_direction ON sms_messages(direction);
CREATE INDEX idx_sms_messages_status ON sms_messages(status);
CREATE INDEX idx_sms_messages_from ON sms_messages(from_number);
CREATE INDEX idx_sms_messages_to ON sms_messages(to_number);
CREATE INDEX idx_sms_messages_created ON sms_messages(created_at DESC);
CREATE INDEX idx_sms_messages_ai_pending ON sms_messages(ai_processing_status) WHERE ai_processing_status = 'pending';
CREATE INDEX idx_sms_messages_sent_by_user ON sms_messages(sent_by_user_id);

ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in their conversations"
  ON sms_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sms_conversations
      WHERE sms_conversations.id = sms_messages.conversation_id
      AND sms_conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage all messages"
  ON sms_messages FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- SMS Media Attachments (MMS detail tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS sms_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES sms_messages(id) ON DELETE CASCADE,
  twilio_media_sid TEXT,
  content_type TEXT NOT NULL,
  original_url TEXT NOT NULL,
  stored_url TEXT,
  storage_path TEXT,
  file_size INTEGER,
  file_name TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sms_media_message_id ON sms_media(message_id);

ALTER TABLE sms_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view media in their conversations"
  ON sms_media FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sms_messages
      JOIN sms_conversations ON sms_conversations.id = sms_messages.conversation_id
      WHERE sms_messages.id = sms_media.message_id
      AND sms_conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage all media"
  ON sms_media FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- SMS Opt-In/Opt-Out Compliance
-- ============================================
CREATE TABLE IF NOT EXISTS sms_consent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  consent_type TEXT NOT NULL CHECK (consent_type IN ('transactional', 'marketing', 'ai_agent', 'notifications', 'all')),
  status TEXT NOT NULL DEFAULT 'opted_in' CHECK (status IN ('opted_in', 'opted_out', 'pending')),
  opted_in_at TIMESTAMPTZ,
  opted_out_at TIMESTAMPTZ,
  opt_in_method TEXT CHECK (opt_in_method IN ('web_form', 'sms_keyword', 'api', 'manual', 'account_creation')),
  opt_out_method TEXT CHECK (opt_out_method IN ('sms_keyword', 'web_form', 'api', 'manual', 'admin')),
  opt_in_keyword TEXT,
  opt_out_keyword TEXT,
  ip_address TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(phone_number, consent_type)
);

CREATE INDEX idx_sms_consent_phone ON sms_consent(phone_number);
CREATE INDEX idx_sms_consent_user_id ON sms_consent(user_id);
CREATE INDEX idx_sms_consent_status ON sms_consent(status);

ALTER TABLE sms_consent ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own consent records"
  ON sms_consent FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all consent"
  ON sms_consent FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- SMS Notification Preferences (per user)
-- ============================================
CREATE TABLE IF NOT EXISTS sms_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  phone_number TEXT,
  sms_enabled BOOLEAN NOT NULL DEFAULT false,
  -- Notification categories
  dm_notifications BOOLEAN NOT NULL DEFAULT false,
  task_notifications BOOLEAN NOT NULL DEFAULT false,
  job_completion_notifications BOOLEAN NOT NULL DEFAULT false,
  system_alerts BOOLEAN NOT NULL DEFAULT false,
  marketing_messages BOOLEAN NOT NULL DEFAULT false,
  ai_agent_messages BOOLEAN NOT NULL DEFAULT true,
  -- Quiet hours (TCPA compliance)
  quiet_hours_enabled BOOLEAN NOT NULL DEFAULT true,
  quiet_hours_start TIME NOT NULL DEFAULT '21:00',
  quiet_hours_end TIME NOT NULL DEFAULT '08:00',
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  -- Rate limiting
  max_messages_per_hour INTEGER NOT NULL DEFAULT 10,
  max_messages_per_day INTEGER NOT NULL DEFAULT 50,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sms_notification_prefs_user ON sms_notification_preferences(user_id);

ALTER TABLE sms_notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view and update their own notification preferences"
  ON sms_notification_preferences FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all notification preferences"
  ON sms_notification_preferences FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- SMS Notifications Log (outbound notification tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS sms_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  message_id UUID REFERENCES sms_messages(id) ON DELETE SET NULL,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('dm_notification', 'task_assignment', 'task_due_date', 'job_complete', 'system_alert', 'verification', 'marketing', 'ai_agent_response', 'admin_message', 'custom')),
  category TEXT NOT NULL DEFAULT 'transactional' CHECK (category IN ('transactional', 'marketing', 'system')),
  reference_type TEXT,
  reference_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'skipped', 'blocked_quiet_hours', 'blocked_opt_out', 'blocked_rate_limit')),
  failure_reason TEXT,
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sms_notifications_user ON sms_notifications(user_id);
CREATE INDEX idx_sms_notifications_type ON sms_notifications(notification_type);
CREATE INDEX idx_sms_notifications_status ON sms_notifications(status);
CREATE INDEX idx_sms_notifications_scheduled ON sms_notifications(scheduled_for) WHERE scheduled_for IS NOT NULL;
CREATE INDEX idx_sms_notifications_created ON sms_notifications(created_at DESC);

ALTER TABLE sms_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON sms_notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all notifications"
  ON sms_notifications FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- SMS Rate Limiting (per phone number)
-- ============================================
CREATE TABLE IF NOT EXISTS sms_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  window_type TEXT NOT NULL CHECK (window_type IN ('hourly', 'daily')),
  message_count INTEGER NOT NULL DEFAULT 0,
  UNIQUE(phone_number, window_start, window_type)
);

CREATE INDEX idx_sms_rate_limits_phone ON sms_rate_limits(phone_number);
CREATE INDEX idx_sms_rate_limits_window ON sms_rate_limits(window_start, window_type);

ALTER TABLE sms_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only"
  ON sms_rate_limits FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- SMS Webhook Logs (raw incoming webhook data for debugging)
-- ============================================
CREATE TABLE IF NOT EXISTS sms_webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_type TEXT NOT NULL CHECK (webhook_type IN ('inbound_sms', 'status_callback', 'voice', 'other')),
  twilio_sid TEXT,
  raw_payload JSONB NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT false,
  processing_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sms_webhook_logs_type ON sms_webhook_logs(webhook_type);
CREATE INDEX idx_sms_webhook_logs_created ON sms_webhook_logs(created_at DESC);
CREATE INDEX idx_sms_webhook_logs_unprocessed ON sms_webhook_logs(processed) WHERE processed = false;

ALTER TABLE sms_webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only for webhook logs"
  ON sms_webhook_logs FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- Trigger: Update conversation on new message
-- ============================================
CREATE OR REPLACE FUNCTION sms_update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE sms_conversations SET
    last_message_at = NEW.created_at,
    last_message_preview = LEFT(NEW.body, 100),
    last_message_direction = NEW.direction,
    message_count = message_count + 1,
    unread_count = CASE
      WHEN NEW.direction = 'inbound' THEN unread_count + 1
      ELSE unread_count
    END,
    updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sms_message_inserted
  AFTER INSERT ON sms_messages
  FOR EACH ROW
  EXECUTE FUNCTION sms_update_conversation_on_message();

-- ============================================
-- Trigger: Update timestamps on row update
-- ============================================
CREATE OR REPLACE FUNCTION sms_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sms_phone_numbers_updated
  BEFORE UPDATE ON sms_phone_numbers
  FOR EACH ROW EXECUTE FUNCTION sms_update_timestamp();

CREATE TRIGGER trg_sms_conversations_updated
  BEFORE UPDATE ON sms_conversations
  FOR EACH ROW EXECUTE FUNCTION sms_update_timestamp();

CREATE TRIGGER trg_sms_messages_updated
  BEFORE UPDATE ON sms_messages
  FOR EACH ROW EXECUTE FUNCTION sms_update_timestamp();

CREATE TRIGGER trg_sms_consent_updated
  BEFORE UPDATE ON sms_consent
  FOR EACH ROW EXECUTE FUNCTION sms_update_timestamp();

CREATE TRIGGER trg_sms_notification_prefs_updated
  BEFORE UPDATE ON sms_notification_preferences
  FOR EACH ROW EXECUTE FUNCTION sms_update_timestamp();

-- ============================================
-- Trigger: Auto-handle opt-out keywords
-- ============================================
CREATE OR REPLACE FUNCTION sms_handle_opt_out_keywords()
RETURNS TRIGGER AS $$
DECLARE
  opt_out_keywords TEXT[] := ARRAY['STOP', 'UNSUBSCRIBE', 'END', 'QUIT', 'STOPALL', 'CANCEL', 'REVOKE', 'OPTOUT'];
  opt_in_keywords TEXT[] := ARRAY['START', 'UNSTOP', 'YES', 'SUBSCRIBE'];
  msg_body TEXT;
BEGIN
  IF NEW.direction = 'inbound' THEN
    msg_body := UPPER(TRIM(COALESCE(NEW.body, '')));

    IF msg_body = ANY(opt_out_keywords) THEN
      -- Opt out all consent types for this number
      UPDATE sms_consent SET
        status = 'opted_out',
        opted_out_at = now(),
        opt_out_method = 'sms_keyword',
        opt_out_keyword = msg_body,
        updated_at = now()
      WHERE phone_number = NEW.from_number
        AND status = 'opted_in';

    ELSIF msg_body = ANY(opt_in_keywords) THEN
      -- Opt back in for this number
      UPDATE sms_consent SET
        status = 'opted_in',
        opted_in_at = now(),
        opt_in_method = 'sms_keyword',
        opt_in_keyword = msg_body,
        updated_at = now()
      WHERE phone_number = NEW.from_number
        AND status = 'opted_out';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sms_opt_out_handler
  AFTER INSERT ON sms_messages
  FOR EACH ROW
  EXECUTE FUNCTION sms_handle_opt_out_keywords();
