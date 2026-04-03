-- Flashcard Persistence: user_flashcard_sets + user_flashcard_reviews
-- Lightweight tables for tracking auto-generated flashcard sets and spaced repetition reviews.
-- Related to cx_ chat system via conversation_id and message_id.

-- ============================================================================
-- user_flashcard_sets — A saved set of flashcards from a chat message
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_flashcard_sets (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    conversation_id uuid REFERENCES cx_conversation(id) ON DELETE SET NULL,
    message_id      uuid REFERENCES cx_message(id) ON DELETE SET NULL,
    title           text NOT NULL DEFAULT 'Flashcards',
    cards           jsonb NOT NULL DEFAULT '[]',   -- Array of { front: string, back: string }
    card_count      smallint NOT NULL DEFAULT 0,
    tags            text[] NOT NULL DEFAULT '{}',
    is_archived     boolean NOT NULL DEFAULT false,
    last_studied_at timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_flashcard_sets_user       ON user_flashcard_sets(user_id);
CREATE INDEX idx_flashcard_sets_conv       ON user_flashcard_sets(conversation_id) WHERE conversation_id IS NOT NULL;
CREATE INDEX idx_flashcard_sets_message    ON user_flashcard_sets(message_id) WHERE message_id IS NOT NULL;

-- RLS
ALTER TABLE user_flashcard_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own flashcard sets"
    ON user_flashcard_sets
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_flashcard_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_flashcard_set_updated_at
    BEFORE UPDATE ON user_flashcard_sets
    FOR EACH ROW
    EXECUTE FUNCTION update_flashcard_set_updated_at();


-- ============================================================================
-- user_flashcard_reviews — Individual card review events (append-only log)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_flashcard_reviews (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    set_id      uuid NOT NULL REFERENCES user_flashcard_sets(id) ON DELETE CASCADE,
    card_index  smallint NOT NULL,               -- 0-based index into cards array
    result      text NOT NULL CHECK (result IN ('correct', 'partial', 'incorrect')),
    reviewed_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_flashcard_reviews_set     ON user_flashcard_reviews(set_id);
CREATE INDEX idx_flashcard_reviews_user    ON user_flashcard_reviews(user_id);
CREATE INDEX idx_flashcard_reviews_lookup  ON user_flashcard_reviews(set_id, card_index, reviewed_at DESC);

-- RLS
ALTER TABLE user_flashcard_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own flashcard reviews"
    ON user_flashcard_reviews
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
