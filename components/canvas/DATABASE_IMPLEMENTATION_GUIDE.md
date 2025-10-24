# Database Implementation Guide
## Supabase Schema & Migrations for Canvas Social System

---

## 🗄️ Migration Files

### Migration 1: Core Tables

```sql
-- Migration: 001_create_shared_canvas_tables.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable full-text search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Shared Canvas Items Table
CREATE TABLE shared_canvas_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    share_token TEXT UNIQUE NOT NULL,
    
    -- Content
    title TEXT NOT NULL,
    description TEXT,
    canvas_type TEXT NOT NULL CHECK (canvas_type IN (
        'quiz', 'flashcard', 'game', 'diagram', 'timeline',
        'comparison', 'decision-tree', 'troubleshooting',
        'research', 'progress', 'presentation', 'other'
    )),
    canvas_data JSONB NOT NULL,
    thumbnail_url TEXT,
    
    -- Creator
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    creator_username TEXT,
    creator_display_name TEXT,
    
    -- Versioning
    original_id UUID REFERENCES shared_canvas_items(id) ON DELETE SET NULL,
    forked_from UUID REFERENCES shared_canvas_items(id) ON DELETE SET NULL,
    version_number INTEGER DEFAULT 1,
    fork_count INTEGER DEFAULT 0 CHECK (fork_count >= 0),
    
    -- Social Stats
    view_count INTEGER DEFAULT 0 CHECK (view_count >= 0),
    like_count INTEGER DEFAULT 0 CHECK (like_count >= 0),
    share_count INTEGER DEFAULT 0 CHECK (share_count >= 0),
    comment_count INTEGER DEFAULT 0 CHECK (comment_count >= 0),
    play_count INTEGER DEFAULT 0 CHECK (play_count >= 0),
    completion_rate DECIMAL(5,2) CHECK (completion_rate >= 0 AND completion_rate <= 100),
    
    -- Gamification
    has_scoring BOOLEAN DEFAULT false,
    high_score INTEGER,
    high_score_user UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    average_score DECIMAL(8,2),
    total_attempts INTEGER DEFAULT 0 CHECK (total_attempts >= 0),
    
    -- Visibility & Settings
    visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'unlisted', 'private')),
    allow_remixes BOOLEAN DEFAULT true,
    require_attribution BOOLEAN DEFAULT true,
    featured BOOLEAN DEFAULT false,
    
    -- Tags & Categories
    tags TEXT[] DEFAULT '{}',
    categories TEXT[] DEFAULT '{}',
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ,
    last_played_at TIMESTAMPTZ,
    
    -- Trending Score (updated by trigger)
    trending_score DECIMAL(10,2) DEFAULT 0,
    
    -- Search
    search_vector tsvector
);

-- Indexes for performance
CREATE INDEX idx_shared_canvas_token ON shared_canvas_items(share_token);
CREATE INDEX idx_shared_canvas_creator ON shared_canvas_items(created_by);
CREATE INDEX idx_shared_canvas_original ON shared_canvas_items(original_id);
CREATE INDEX idx_shared_canvas_forked_from ON shared_canvas_items(forked_from);
CREATE INDEX idx_shared_canvas_type ON shared_canvas_items(canvas_type);
CREATE INDEX idx_shared_canvas_visibility ON shared_canvas_items(visibility);
CREATE INDEX idx_shared_canvas_trending ON shared_canvas_items(trending_score DESC) WHERE visibility = 'public';
CREATE INDEX idx_shared_canvas_featured ON shared_canvas_items(featured, created_at DESC) WHERE featured = true;
CREATE INDEX idx_shared_canvas_tags ON shared_canvas_items USING GIN(tags);
CREATE INDEX idx_shared_canvas_categories ON shared_canvas_items USING GIN(categories);
CREATE INDEX idx_shared_canvas_search ON shared_canvas_items USING GIN(search_vector);
CREATE INDEX idx_shared_canvas_created_at ON shared_canvas_items(created_at DESC);

-- Update search vector on insert/update
CREATE OR REPLACE FUNCTION update_canvas_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(NEW.creator_display_name, '')), 'D');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_canvas_search_vector
    BEFORE INSERT OR UPDATE ON shared_canvas_items
    FOR EACH ROW
    EXECUTE FUNCTION update_canvas_search_vector();

-- Update timestamp on update
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_canvas_updated_at
    BEFORE UPDATE ON shared_canvas_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
```

### Migration 2: Social Features

```sql
-- Migration: 002_create_social_tables.sql

-- Canvas Likes
CREATE TABLE canvas_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    canvas_id UUID NOT NULL REFERENCES shared_canvas_items(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(canvas_id, user_id)
);

CREATE INDEX idx_canvas_likes_canvas ON canvas_likes(canvas_id);
CREATE INDEX idx_canvas_likes_user ON canvas_likes(user_id);
CREATE INDEX idx_canvas_likes_created_at ON canvas_likes(created_at DESC);

-- Update like_count on shared_canvas_items
CREATE OR REPLACE FUNCTION update_canvas_like_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE shared_canvas_items 
        SET like_count = like_count + 1 
        WHERE id = NEW.canvas_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE shared_canvas_items 
        SET like_count = GREATEST(like_count - 1, 0) 
        WHERE id = OLD.canvas_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_canvas_like_count
    AFTER INSERT OR DELETE ON canvas_likes
    FOR EACH ROW
    EXECUTE FUNCTION update_canvas_like_count();

-- Canvas Comments
CREATE TABLE canvas_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    canvas_id UUID NOT NULL REFERENCES shared_canvas_items(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    username TEXT NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    
    -- Comment Data
    content TEXT NOT NULL CHECK (LENGTH(content) >= 1 AND LENGTH(content) <= 2000),
    parent_comment_id UUID REFERENCES canvas_comments(id) ON DELETE CASCADE,
    
    -- Social
    like_count INTEGER DEFAULT 0 CHECK (like_count >= 0),
    reply_count INTEGER DEFAULT 0 CHECK (reply_count >= 0),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    edited BOOLEAN DEFAULT false,
    deleted BOOLEAN DEFAULT false,
    
    -- Moderation
    flagged BOOLEAN DEFAULT false,
    flag_count INTEGER DEFAULT 0
);

CREATE INDEX idx_canvas_comments_canvas ON canvas_comments(canvas_id, created_at DESC);
CREATE INDEX idx_canvas_comments_user ON canvas_comments(user_id);
CREATE INDEX idx_canvas_comments_parent ON canvas_comments(parent_comment_id);

-- Update comment_count on shared_canvas_items
CREATE OR REPLACE FUNCTION update_canvas_comment_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.deleted = false THEN
        UPDATE shared_canvas_items 
        SET comment_count = comment_count + 1 
        WHERE id = NEW.canvas_id;
    ELSIF TG_OP = 'UPDATE' AND OLD.deleted = false AND NEW.deleted = true THEN
        UPDATE shared_canvas_items 
        SET comment_count = GREATEST(comment_count - 1, 0) 
        WHERE id = NEW.canvas_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_canvas_comment_count
    AFTER INSERT OR UPDATE ON canvas_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_canvas_comment_count();

-- Comment Likes
CREATE TABLE canvas_comment_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    comment_id UUID NOT NULL REFERENCES canvas_comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(comment_id, user_id)
);

CREATE INDEX idx_comment_likes_comment ON canvas_comment_likes(comment_id);
CREATE INDEX idx_comment_likes_user ON canvas_comment_likes(user_id);

-- Update comment like_count
CREATE OR REPLACE FUNCTION update_comment_like_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE canvas_comments 
        SET like_count = like_count + 1 
        WHERE id = NEW.comment_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE canvas_comments 
        SET like_count = GREATEST(like_count - 1, 0) 
        WHERE id = OLD.comment_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_comment_like_count
    AFTER INSERT OR DELETE ON canvas_comment_likes
    FOR EACH ROW
    EXECUTE FUNCTION update_comment_like_count();
```

### Migration 3: Analytics & Scoring

```sql
-- Migration: 003_create_analytics_tables.sql

-- Canvas Scores (for scored content)
CREATE TABLE canvas_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    canvas_id UUID NOT NULL REFERENCES shared_canvas_items(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    username TEXT,
    display_name TEXT,
    
    -- Score Data
    score INTEGER NOT NULL CHECK (score >= 0),
    max_score INTEGER NOT NULL CHECK (max_score > 0),
    percentage DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE WHEN max_score > 0 THEN (score::DECIMAL / max_score * 100) ELSE 0 END
    ) STORED,
    time_taken INTEGER CHECK (time_taken >= 0), -- seconds
    
    -- Context
    completed BOOLEAN DEFAULT false,
    attempt_number INTEGER DEFAULT 1 CHECK (attempt_number > 0),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    data JSONB DEFAULT '{}'::jsonb -- Game-specific data
);

CREATE INDEX idx_canvas_scores_canvas ON canvas_scores(canvas_id);
CREATE INDEX idx_canvas_scores_user ON canvas_scores(user_id);
CREATE INDEX idx_canvas_scores_leaderboard ON canvas_scores(canvas_id, score DESC, time_taken ASC);
CREATE INDEX idx_canvas_scores_user_canvas ON canvas_scores(user_id, canvas_id, created_at DESC);

-- Update high score on canvas
CREATE OR REPLACE FUNCTION update_canvas_high_score()
RETURNS TRIGGER AS $$
DECLARE
    current_high INTEGER;
BEGIN
    SELECT high_score INTO current_high FROM shared_canvas_items WHERE id = NEW.canvas_id;
    
    IF current_high IS NULL OR NEW.score > current_high THEN
        UPDATE shared_canvas_items 
        SET 
            high_score = NEW.score,
            high_score_user = NEW.user_id
        WHERE id = NEW.canvas_id;
    END IF;
    
    -- Update average score and attempt count
    UPDATE shared_canvas_items
    SET 
        total_attempts = total_attempts + 1,
        average_score = (
            SELECT AVG(score) FROM canvas_scores WHERE canvas_id = NEW.canvas_id
        )
    WHERE id = NEW.canvas_id;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_canvas_high_score
    AFTER INSERT ON canvas_scores
    FOR EACH ROW
    EXECUTE FUNCTION update_canvas_high_score();

-- Canvas Views
CREATE TABLE canvas_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    canvas_id UUID NOT NULL REFERENCES shared_canvas_items(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- View Data
    viewed_at TIMESTAMPTZ DEFAULT NOW(),
    session_id TEXT,
    referrer TEXT,
    user_agent TEXT,
    
    -- Engagement
    time_spent INTEGER CHECK (time_spent >= 0), -- seconds
    completed BOOLEAN DEFAULT false,
    interacted BOOLEAN DEFAULT false
);

CREATE INDEX idx_canvas_views_canvas ON canvas_views(canvas_id);
CREATE INDEX idx_canvas_views_user ON canvas_views(user_id);
CREATE INDEX idx_canvas_views_date ON canvas_views(viewed_at DESC);
CREATE INDEX idx_canvas_views_session ON canvas_views(session_id);

-- Update view_count (with deduplication per session)
CREATE OR REPLACE FUNCTION update_canvas_view_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Only count as new view if no view from same session in last hour
    IF NOT EXISTS (
        SELECT 1 FROM canvas_views 
        WHERE canvas_id = NEW.canvas_id 
        AND session_id = NEW.session_id 
        AND viewed_at > NOW() - INTERVAL '1 hour'
        AND id != NEW.id
    ) THEN
        UPDATE shared_canvas_items 
        SET view_count = view_count + 1,
            last_played_at = NEW.viewed_at
        WHERE id = NEW.canvas_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_canvas_view_count
    AFTER INSERT ON canvas_views
    FOR EACH ROW
    EXECUTE FUNCTION update_canvas_view_count();
```

### Migration 4: User System

```sql
-- Migration: 004_create_user_tables.sql

-- User Achievements
CREATE TABLE user_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    achievement_type TEXT NOT NULL CHECK (achievement_type IN (
        -- Creator
        'first_creation', 'viral_creator', 'top_creator', 'hall_of_fame', 
        'perfectionist', 'remix_master',
        -- Player
        'first_play', 'high_scorer', 'champion', 'streak_master', 
        'completionist', 'speed_demon',
        -- Social
        'conversationalist', 'supporter', 'popular', 'connector',
        -- Special
        'early_adopter', 'beta_tester', 'community_hero'
    )),
    achievement_data JSONB DEFAULT '{}'::jsonb,
    
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, achievement_type)
);

CREATE INDEX idx_achievements_user ON user_achievements(user_id);
CREATE INDEX idx_achievements_type ON user_achievements(achievement_type);

-- User Stats
CREATE TABLE user_stats (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Creation Stats
    total_created INTEGER DEFAULT 0 CHECK (total_created >= 0),
    total_likes_received INTEGER DEFAULT 0 CHECK (total_likes_received >= 0),
    total_views_received INTEGER DEFAULT 0 CHECK (total_views_received >= 0),
    total_forks_received INTEGER DEFAULT 0 CHECK (total_forks_received >= 0),
    
    -- Engagement Stats
    total_plays INTEGER DEFAULT 0 CHECK (total_plays >= 0),
    total_likes_given INTEGER DEFAULT 0 CHECK (total_likes_given >= 0),
    total_comments INTEGER DEFAULT 0 CHECK (total_comments >= 0),
    
    -- Scores
    average_score DECIMAL(8,2),
    total_high_scores INTEGER DEFAULT 0 CHECK (total_high_scores >= 0),
    best_score INTEGER,
    
    -- Social
    follower_count INTEGER DEFAULT 0 CHECK (follower_count >= 0),
    following_count INTEGER DEFAULT 0 CHECK (following_count >= 0),
    
    -- Gamification
    total_xp INTEGER DEFAULT 0 CHECK (total_xp >= 0),
    level INTEGER DEFAULT 1 CHECK (level >= 1 AND level <= 100),
    streak_days INTEGER DEFAULT 0 CHECK (streak_days >= 0),
    last_active_date DATE,
    longest_streak INTEGER DEFAULT 0 CHECK (longest_streak >= 0),
    
    -- Metadata
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_stats_level ON user_stats(level DESC);
CREATE INDEX idx_user_stats_xp ON user_stats(total_xp DESC);
CREATE INDEX idx_user_stats_created ON user_stats(total_created DESC);

-- User Follows
CREATE TABLE user_follows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(follower_id, following_id),
    CHECK (follower_id != following_id)
);

CREATE INDEX idx_user_follows_follower ON user_follows(follower_id);
CREATE INDEX idx_user_follows_following ON user_follows(following_id);

-- Update follower/following counts
CREATE OR REPLACE FUNCTION update_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE user_stats SET following_count = following_count + 1 WHERE user_id = NEW.follower_id;
        UPDATE user_stats SET follower_count = follower_count + 1 WHERE user_id = NEW.following_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE user_stats SET following_count = GREATEST(following_count - 1, 0) WHERE user_id = OLD.follower_id;
        UPDATE user_stats SET follower_count = GREATEST(follower_count - 1, 0) WHERE user_id = OLD.following_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_follow_counts
    AFTER INSERT OR DELETE ON user_follows
    FOR EACH ROW
    EXECUTE FUNCTION update_follow_counts();

-- User Bookmarks
CREATE TABLE user_bookmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    canvas_id UUID NOT NULL REFERENCES shared_canvas_items(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, canvas_id)
);

CREATE INDEX idx_bookmarks_user ON user_bookmarks(user_id, created_at DESC);
CREATE INDEX idx_bookmarks_canvas ON user_bookmarks(canvas_id);
```

### Migration 5: Trending & Analytics

```sql
-- Migration: 005_create_trending_functions.sql

-- Function to calculate trending score
CREATE OR REPLACE FUNCTION calculate_trending_score(
    p_like_count INTEGER,
    p_play_count INTEGER,
    p_comment_count INTEGER,
    p_share_count INTEGER,
    p_fork_count INTEGER,
    p_view_count INTEGER,
    p_completion_rate DECIMAL,
    p_created_at TIMESTAMPTZ,
    p_featured BOOLEAN
) RETURNS DECIMAL AS $$
DECLARE
    age_hours DECIMAL;
    decay_factor DECIMAL;
    engagement_score DECIMAL;
    quality_multiplier DECIMAL;
    featured_boost DECIMAL;
BEGIN
    -- Calculate age in hours
    age_hours := EXTRACT(EPOCH FROM (NOW() - p_created_at)) / 3600;
    
    -- Decay factor (80% decay per day)
    decay_factor := POWER(0.8, age_hours / 24.0);
    
    -- Engagement score with weighted values
    engagement_score := (
        COALESCE(p_like_count, 0) * 3 +
        COALESCE(p_play_count, 0) * 2 +
        COALESCE(p_comment_count, 0) * 5 +
        COALESCE(p_share_count, 0) * 10 +
        COALESCE(p_fork_count, 0) * 15 +
        COALESCE(p_view_count, 0) * 0.1
    );
    
    -- Quality multiplier based on completion rate
    quality_multiplier := 1.0 + (COALESCE(p_completion_rate, 50) / 100.0);
    
    -- Featured boost
    featured_boost := CASE WHEN p_featured THEN 2.0 ELSE 1.0 END;
    
    RETURN engagement_score * decay_factor * quality_multiplier * featured_boost;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update all trending scores
CREATE OR REPLACE FUNCTION update_all_trending_scores()
RETURNS void AS $$
BEGIN
    UPDATE shared_canvas_items
    SET trending_score = calculate_trending_score(
        like_count,
        play_count,
        comment_count,
        share_count,
        fork_count,
        view_count,
        completion_rate,
        created_at,
        featured
    )
    WHERE visibility = 'public';
END;
$$ LANGUAGE plpgsql;

-- Trigger to update trending score on stat changes
CREATE OR REPLACE FUNCTION trigger_update_trending_score()
RETURNS TRIGGER AS $$
BEGIN
    NEW.trending_score := calculate_trending_score(
        NEW.like_count,
        NEW.play_count,
        NEW.comment_count,
        NEW.share_count,
        NEW.fork_count,
        NEW.view_count,
        NEW.completion_rate,
        NEW.created_at,
        NEW.featured
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_trending
    BEFORE INSERT OR UPDATE OF like_count, play_count, comment_count, 
                              share_count, fork_count, view_count, 
                              completion_rate, featured
    ON shared_canvas_items
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_trending_score();
```

### Migration 6: RLS Policies

```sql
-- Migration: 006_create_rls_policies.sql

-- Enable RLS
ALTER TABLE shared_canvas_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE canvas_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE canvas_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE canvas_comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE canvas_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE canvas_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bookmarks ENABLE ROW LEVEL SECURITY;

-- Shared Canvas Items Policies
CREATE POLICY "Public canvases are viewable by everyone"
    ON shared_canvas_items FOR SELECT
    USING (visibility = 'public' OR visibility = 'unlisted');

CREATE POLICY "Users can view their own canvases"
    ON shared_canvas_items FOR SELECT
    USING (auth.uid() = created_by);

CREATE POLICY "Users can create canvases"
    ON shared_canvas_items FOR INSERT
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own canvases"
    ON shared_canvas_items FOR UPDATE
    USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own canvases"
    ON shared_canvas_items FOR DELETE
    USING (auth.uid() = created_by);

-- Canvas Likes Policies
CREATE POLICY "Likes are viewable by everyone"
    ON canvas_likes FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can like"
    ON canvas_likes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike their own likes"
    ON canvas_likes FOR DELETE
    USING (auth.uid() = user_id);

-- Canvas Comments Policies
CREATE POLICY "Comments are viewable by everyone"
    ON canvas_comments FOR SELECT
    USING (deleted = false);

CREATE POLICY "Authenticated users can comment"
    ON canvas_comments FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments"
    ON canvas_comments FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
    ON canvas_comments FOR DELETE
    USING (auth.uid() = user_id);

-- Canvas Scores Policies
CREATE POLICY "Scores are viewable by everyone"
    ON canvas_scores FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can submit scores"
    ON canvas_scores FOR INSERT
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Canvas Views Policies
CREATE POLICY "Anyone can create views"
    ON canvas_views FOR INSERT
    WITH CHECK (true);

-- User Stats Policies
CREATE POLICY "User stats are viewable by everyone"
    ON user_stats FOR SELECT
    USING (true);

CREATE POLICY "Users can update their own stats"
    ON user_stats FOR UPDATE
    USING (auth.uid() = user_id);

-- User Follows Policies
CREATE POLICY "Follows are viewable by everyone"
    ON user_follows FOR SELECT
    USING (true);

CREATE POLICY "Users can follow others"
    ON user_follows FOR INSERT
    WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow"
    ON user_follows FOR DELETE
    USING (auth.uid() = follower_id);

-- User Bookmarks Policies
CREATE POLICY "Users can view their own bookmarks"
    ON user_bookmarks FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create bookmarks"
    ON user_bookmarks FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bookmarks"
    ON user_bookmarks FOR DELETE
    USING (auth.uid() = user_id);
```

---

## 🔧 Helper Functions

```sql
-- Get user's canvas feed
CREATE OR REPLACE FUNCTION get_user_feed(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    canvas_id UUID,
    title TEXT,
    canvas_type TEXT,
    creator_username TEXT,
    like_count INTEGER,
    view_count INTEGER,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sc.id,
        sc.title,
        sc.canvas_type,
        sc.creator_username,
        sc.like_count,
        sc.view_count,
        sc.created_at
    FROM shared_canvas_items sc
    WHERE sc.visibility = 'public'
    AND (
        -- From users you follow
        sc.created_by IN (
            SELECT following_id FROM user_follows WHERE follower_id = p_user_id
        )
        -- Or trending content
        OR sc.trending_score > 10
    )
    ORDER BY sc.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Get leaderboard for a canvas
CREATE OR REPLACE FUNCTION get_canvas_leaderboard(
    p_canvas_id UUID,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    rank BIGINT,
    username TEXT,
    display_name TEXT,
    score INTEGER,
    time_taken INTEGER,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ROW_NUMBER() OVER (ORDER BY cs.score DESC, cs.time_taken ASC) as rank,
        cs.username,
        cs.display_name,
        cs.score,
        cs.time_taken,
        cs.created_at
    FROM canvas_scores cs
    WHERE cs.canvas_id = p_canvas_id
    ORDER BY cs.score DESC, cs.time_taken ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
```

---

## 📊 Materialized Views for Performance

```sql
-- Top creators view (refreshed daily)
CREATE MATERIALIZED VIEW top_creators AS
SELECT 
    u.id as user_id,
    u.raw_user_meta_data->>'username' as username,
    us.total_created,
    us.total_likes_received,
    us.total_views_received,
    us.level
FROM auth.users u
JOIN user_stats us ON u.id = us.user_id
WHERE us.total_created > 0
ORDER BY us.total_likes_received DESC
LIMIT 100;

CREATE INDEX idx_top_creators_user ON top_creators(user_id);

-- Refresh function
CREATE OR REPLACE FUNCTION refresh_top_creators()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY top_creators;
END;
$$ LANGUAGE plpgsql;
```

---

## 🔄 Scheduled Jobs (pg_cron)

```sql
-- Update trending scores every 5 minutes
SELECT cron.schedule(
    'update-trending-scores',
    '*/5 * * * *',
    $$SELECT update_all_trending_scores()$$
);

-- Refresh top creators daily at 3 AM
SELECT cron.schedule(
    'refresh-top-creators',
    '0 3 * * *',
    $$SELECT refresh_top_creators()$$
);
```

---

This comprehensive database schema provides all the foundation needed for the social sharing system!

