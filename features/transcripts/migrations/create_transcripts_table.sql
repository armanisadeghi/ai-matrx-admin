-- Migration: Create transcripts table
-- Run this in your Supabase SQL Editor

-- Create transcripts table
CREATE TABLE IF NOT EXISTS transcripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'New Transcript',
    description TEXT DEFAULT '',
    segments JSONB NOT NULL DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    audio_file_path TEXT,
    video_file_path TEXT,
    source_type TEXT DEFAULT 'other' CHECK (source_type IN ('audio', 'video', 'meeting', 'interview', 'other')),
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    folder_name TEXT DEFAULT 'Transcripts',
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_transcripts_user_id ON transcripts(user_id);
CREATE INDEX IF NOT EXISTS idx_transcripts_folder_name ON transcripts(folder_name);
CREATE INDEX IF NOT EXISTS idx_transcripts_tags ON transcripts USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_transcripts_is_deleted ON transcripts(is_deleted);
CREATE INDEX IF NOT EXISTS idx_transcripts_created_at ON transcripts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transcripts_updated_at ON transcripts(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_transcripts_source_type ON transcripts(source_type);

-- Add full-text search index on title and description
CREATE INDEX IF NOT EXISTS idx_transcripts_search ON transcripts 
USING GIN (to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_transcripts_updated_at ON transcripts;
CREATE TRIGGER update_transcripts_updated_at
    BEFORE UPDATE ON transcripts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can view their own transcripts
CREATE POLICY "Users can view own transcripts"
    ON transcripts FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own transcripts
CREATE POLICY "Users can insert own transcripts"
    ON transcripts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own transcripts
CREATE POLICY "Users can update own transcripts"
    ON transcripts FOR UPDATE
    USING (auth.uid() = user_id);

-- Users can delete their own transcripts
CREATE POLICY "Users can delete own transcripts"
    ON transcripts FOR DELETE
    USING (auth.uid() = user_id);

-- Add comments for documentation
COMMENT ON TABLE transcripts IS 'Stores audio/video transcripts with segments, timestamps, and metadata';
COMMENT ON COLUMN transcripts.segments IS 'Array of transcript segments with timecodes and speaker info';
COMMENT ON COLUMN transcripts.metadata IS 'Additional metadata like duration, word count, speakers, etc.';
COMMENT ON COLUMN transcripts.audio_file_path IS 'Path to audio file in Supabase storage';
COMMENT ON COLUMN transcripts.video_file_path IS 'Path to video file in Supabase storage';
COMMENT ON COLUMN transcripts.source_type IS 'Type of source: audio, video, meeting, interview, or other';
COMMENT ON COLUMN transcripts.folder_name IS 'Folder/category for organization';
COMMENT ON COLUMN transcripts.is_deleted IS 'Soft delete flag';

