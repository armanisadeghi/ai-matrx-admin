-- Migration: Email System for AI Matrx
-- Created: 2026-01-30
-- Purpose: Email logging, tracking, and contact form support

-- =====================================================
-- Table: admin_email_logs
-- Purpose: Tracks emails sent from admin portal for audit purposes
-- =====================================================

-- Drop table if exists (for development/rerun)
DROP TABLE IF EXISTS admin_email_logs CASCADE;

CREATE TABLE admin_email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sent_by UUID REFERENCES auth.users(id) NOT NULL,
  recipient_count INTEGER NOT NULL,
  subject TEXT NOT NULL,
  successful_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX idx_admin_email_logs_sent_by ON admin_email_logs(sent_by);
CREATE INDEX idx_admin_email_logs_created_at ON admin_email_logs(created_at DESC);

-- Enable RLS
ALTER TABLE admin_email_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow admins/moderators to view all logs
DROP POLICY IF EXISTS "Admins can view email logs" ON admin_email_logs;
CREATE POLICY "Admins can view email logs"
  ON admin_email_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE public.users.id = auth.uid() 
      AND public.users.role IN ('admin', 'moderator')
    )
  );

-- RLS Policy: Allow admins/moderators to insert logs
DROP POLICY IF EXISTS "Admins can insert email logs" ON admin_email_logs;
CREATE POLICY "Admins can insert email logs"
  ON admin_email_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE public.users.id = auth.uid() 
      AND public.users.role IN ('admin', 'moderator')
    )
  );

-- Grant service role full access (for admin client which bypasses RLS)
GRANT ALL ON admin_email_logs TO service_role;

-- =====================================================
-- Table: contact_submissions
-- Purpose: Store contact form submissions from public users
-- =====================================================

DROP TABLE IF EXISTS contact_submissions CASCADE;

CREATE TABLE contact_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (
    status IN ('new', 'in_progress', 'resolved', 'archived')
  ),
  admin_notes TEXT,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_contact_submissions_user_id ON contact_submissions(user_id);
CREATE INDEX idx_contact_submissions_status ON contact_submissions(status);
CREATE INDEX idx_contact_submissions_created_at ON contact_submissions(created_at DESC);
CREATE INDEX idx_contact_submissions_email ON contact_submissions(email);

-- Enable RLS
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone can submit (for public contact form)
DROP POLICY IF EXISTS "Anyone can submit contact form" ON contact_submissions;
CREATE POLICY "Anyone can submit contact form"
  ON contact_submissions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- RLS Policy: Users can view their own submissions
DROP POLICY IF EXISTS "Users can view own submissions" ON contact_submissions;
CREATE POLICY "Users can view own submissions"
  ON contact_submissions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policy: Admins/moderators can view all submissions
DROP POLICY IF EXISTS "Admins can view all submissions" ON contact_submissions;
CREATE POLICY "Admins can view all submissions"
  ON contact_submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE public.users.id = auth.uid() 
      AND public.users.role IN ('admin', 'moderator')
    )
  );

-- RLS Policy: Admins/moderators can update submissions
DROP POLICY IF EXISTS "Admins can update submissions" ON contact_submissions;
CREATE POLICY "Admins can update submissions"
  ON contact_submissions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE public.users.id = auth.uid() 
      AND public.users.role IN ('admin', 'moderator')
    )
  );

-- Grant service role full access
GRANT ALL ON contact_submissions TO service_role;

-- =====================================================
-- Table: user_email_preferences
-- Purpose: Store user email notification preferences
-- =====================================================

DROP TABLE IF EXISTS user_email_preferences CASCADE;

CREATE TABLE user_email_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL UNIQUE,
  
  -- Email notification preferences
  sharing_notifications BOOLEAN DEFAULT true,
  organization_invitations BOOLEAN DEFAULT true,
  resource_updates BOOLEAN DEFAULT true,
  marketing_emails BOOLEAN DEFAULT false,
  weekly_digest BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index
CREATE INDEX idx_user_email_preferences_user_id ON user_email_preferences(user_id);

-- Enable RLS
ALTER TABLE user_email_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own preferences
DROP POLICY IF EXISTS "Users can view own email preferences" ON user_email_preferences;
CREATE POLICY "Users can view own email preferences"
  ON user_email_preferences FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policy: Users can update their own preferences
DROP POLICY IF EXISTS "Users can update own email preferences" ON user_email_preferences;
CREATE POLICY "Users can update own email preferences"
  ON user_email_preferences FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS Policy: Users can insert their own preferences
DROP POLICY IF EXISTS "Users can insert own email preferences" ON user_email_preferences;
CREATE POLICY "Users can insert own email preferences"
  ON user_email_preferences FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Grant service role full access
GRANT ALL ON user_email_preferences TO service_role;

-- =====================================================
-- Update organization_invitations table
-- Add email tracking columns
-- =====================================================

-- Check if columns don't exist before adding them
DO $$
BEGIN
  -- Add email_sent column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organization_invitations' 
    AND column_name = 'email_sent'
  ) THEN
    ALTER TABLE organization_invitations 
    ADD COLUMN email_sent BOOLEAN DEFAULT false;
  END IF;

  -- Add email_sent_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organization_invitations' 
    AND column_name = 'email_sent_at'
  ) THEN
    ALTER TABLE organization_invitations 
    ADD COLUMN email_sent_at TIMESTAMPTZ;
  END IF;
END $$;

-- Create index for email tracking
CREATE INDEX IF NOT EXISTS idx_org_invitations_email_sent 
ON organization_invitations(email_sent, email_sent_at);

-- =====================================================
-- Functions
-- =====================================================

-- Function: Update updated_at timestamp for contact_submissions
CREATE OR REPLACE FUNCTION update_contact_submission_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for contact_submissions updated_at
DROP TRIGGER IF EXISTS trigger_contact_submissions_updated_at ON contact_submissions;
CREATE TRIGGER trigger_contact_submissions_updated_at
    BEFORE UPDATE ON contact_submissions
    FOR EACH ROW
    EXECUTE FUNCTION update_contact_submission_updated_at();

-- Function: Update updated_at timestamp for user_email_preferences
CREATE OR REPLACE FUNCTION update_user_email_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for user_email_preferences updated_at
DROP TRIGGER IF EXISTS trigger_user_email_preferences_updated_at ON user_email_preferences;
CREATE TRIGGER trigger_user_email_preferences_updated_at
    BEFORE UPDATE ON user_email_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_user_email_preferences_updated_at();

-- =====================================================
-- Helper function: Get or create user email preferences
-- =====================================================

CREATE OR REPLACE FUNCTION get_user_email_preferences(p_user_id UUID)
RETURNS user_email_preferences AS $$
DECLARE
  v_preferences user_email_preferences;
BEGIN
  -- Try to get existing preferences
  SELECT * INTO v_preferences
  FROM user_email_preferences
  WHERE user_id = p_user_id;

  -- If not found, create default preferences
  IF NOT FOUND THEN
    INSERT INTO user_email_preferences (user_id)
    VALUES (p_user_id)
    RETURNING * INTO v_preferences;
  END IF;

  RETURN v_preferences;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_email_preferences(UUID) TO authenticated, service_role;

-- =====================================================
-- Comments
-- =====================================================

COMMENT ON TABLE admin_email_logs IS 'Tracks all emails sent from the admin portal for audit purposes';
COMMENT ON TABLE contact_submissions IS 'Stores contact form submissions from public and authenticated users';
COMMENT ON TABLE user_email_preferences IS 'User preferences for email notifications';
COMMENT ON FUNCTION get_user_email_preferences(UUID) IS 'Gets user email preferences or creates defaults if not exists';
