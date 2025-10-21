-- Add quiz content hash and metadata to quiz_sessions table
-- This allows detecting duplicate quizzes and storing quiz metadata

-- Add new columns
ALTER TABLE quiz_sessions
ADD COLUMN IF NOT EXISTS quiz_content_hash TEXT,
ADD COLUMN IF NOT EXISTS quiz_metadata JSONB DEFAULT '{}'::jsonb;

-- Add index on content hash for fast duplicate detection
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_content_hash 
ON quiz_sessions(user_id, quiz_content_hash);

-- Add check constraint to ensure hash format (64 char hex string)
ALTER TABLE quiz_sessions
ADD CONSTRAINT quiz_content_hash_format 
CHECK (quiz_content_hash IS NULL OR quiz_content_hash ~ '^[a-f0-9]{64}$');

-- Add comment
COMMENT ON COLUMN quiz_sessions.quiz_content_hash IS 'SHA-256 hash of quiz questions content for duplicate detection';
COMMENT ON COLUMN quiz_sessions.quiz_metadata IS 'Quiz metadata like title, category, quizId from AI generation';

-- Optional: Add unique constraint if you want to prevent duplicate quiz sessions per user
-- Uncomment if you want users to have only one session per unique quiz
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_quiz_sessions_user_hash_unique
-- ON quiz_sessions(user_id, quiz_content_hash)
-- WHERE is_completed = false;

