-- ============================================================
-- Migration: User Review Workflow
-- Adds the ability for admins to send feedback items to users
-- for testing/review, with a separate messaging channel.
-- ============================================================

-- 1. Create feedback_user_messages table
-- This is SEPARATE from feedback_comments (which is admin/AI internal).
-- Only admin ↔ user messages go here.
CREATE TABLE IF NOT EXISTS feedback_user_messages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    feedback_id uuid NOT NULL REFERENCES user_feedback(id) ON DELETE CASCADE,
    sender_type text NOT NULL CHECK (sender_type IN ('admin', 'user')),
    sender_name text,
    content text NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    email_sent boolean DEFAULT false NOT NULL
);

-- Index for fast lookups by feedback item
CREATE INDEX IF NOT EXISTS idx_feedback_user_messages_feedback_id 
ON feedback_user_messages(feedback_id);

-- Index for ordering by time
CREATE INDEX IF NOT EXISTS idx_feedback_user_messages_created_at 
ON feedback_user_messages(feedback_id, created_at ASC);

-- 2. Enable RLS
ALTER TABLE feedback_user_messages ENABLE ROW LEVEL SECURITY;

-- Users can read messages on their own feedback items
CREATE POLICY "Users read own feedback messages"
ON feedback_user_messages FOR SELECT
TO authenticated
USING (
    feedback_id IN (
        SELECT id FROM user_feedback WHERE user_id = auth.uid()
    )
);

-- Users can insert messages (replies) on their own feedback items
CREATE POLICY "Users reply to own feedback messages"
ON feedback_user_messages FOR INSERT
TO authenticated
WITH CHECK (
    sender_type = 'user'
    AND feedback_id IN (
        SELECT id FROM user_feedback WHERE user_id = auth.uid()
    )
);

-- Service role / admin can do everything (for server-side actions)
CREATE POLICY "Service role full access to feedback messages"
ON feedback_user_messages FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 3. RPC: Send user review message (admin → user)
-- Changes status to 'user_review', creates the message, returns the message
CREATE OR REPLACE FUNCTION send_user_review_message(
    p_feedback_id uuid,
    p_message text,
    p_sender_name text DEFAULT 'Admin'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_message feedback_user_messages;
    v_feedback user_feedback;
BEGIN
    -- Verify feedback exists
    SELECT * INTO v_feedback FROM user_feedback WHERE id = p_feedback_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Feedback item not found: %', p_feedback_id;
    END IF;

    -- Update feedback status to user_review
    UPDATE user_feedback
    SET status = 'user_review',
        updated_at = now()
    WHERE id = p_feedback_id;

    -- Insert the message
    INSERT INTO feedback_user_messages (feedback_id, sender_type, sender_name, content)
    VALUES (p_feedback_id, 'admin', p_sender_name, p_message)
    RETURNING * INTO v_message;

    RETURN row_to_json(v_message);
END;
$$;

-- 4. RPC: Get user messages for a feedback item
CREATE OR REPLACE FUNCTION get_user_messages(p_feedback_id uuid)
RETURNS SETOF feedback_user_messages
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM feedback_user_messages
    WHERE feedback_id = p_feedback_id
    ORDER BY created_at ASC;
END;
$$;

-- 5. RPC: User replies to a user review
-- Creates the message and changes status back to awaiting_review
CREATE OR REPLACE FUNCTION reply_to_user_review(
    p_feedback_id uuid,
    p_message text,
    p_sender_name text DEFAULT 'User'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_message feedback_user_messages;
    v_feedback user_feedback;
BEGIN
    -- Verify feedback exists and is in user_review status
    SELECT * INTO v_feedback FROM user_feedback WHERE id = p_feedback_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Feedback item not found: %', p_feedback_id;
    END IF;

    -- Insert the user's reply
    INSERT INTO feedback_user_messages (feedback_id, sender_type, sender_name, content)
    VALUES (p_feedback_id, 'user', p_sender_name, p_message)
    RETURNING * INTO v_message;

    -- Move status back to awaiting_review so it shows up in admin's test results
    UPDATE user_feedback
    SET status = 'awaiting_review',
        updated_at = now()
    WHERE id = p_feedback_id;

    RETURN row_to_json(v_message);
END;
$$;

-- 6. RPC: Admin replies in user review thread (keeps status as user_review)
CREATE OR REPLACE FUNCTION admin_reply_user_review(
    p_feedback_id uuid,
    p_message text,
    p_sender_name text DEFAULT 'Admin'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_message feedback_user_messages;
BEGIN
    -- Insert the admin's reply
    INSERT INTO feedback_user_messages (feedback_id, sender_type, sender_name, content)
    VALUES (p_feedback_id, 'admin', p_sender_name, p_message)
    RETURNING * INTO v_message;

    -- Move back to user_review if it was in awaiting_review (admin responded)
    UPDATE user_feedback
    SET status = 'user_review',
        updated_at = now()
    WHERE id = p_feedback_id
      AND status = 'awaiting_review';

    RETURN row_to_json(v_message);
END;
$$;

-- 7. Mark a message as email_sent
CREATE OR REPLACE FUNCTION mark_user_message_emailed(p_message_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE feedback_user_messages
    SET email_sent = true
    WHERE id = p_message_id;
END;
$$;
