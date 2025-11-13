-- Create table for saved heatmaps
CREATE TABLE IF NOT EXISTS public.heatmap_saves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT, -- Nullable to allow guest users to save (if needed)
    title TEXT NOT NULL DEFAULT 'Untitled Heatmap',
    description TEXT,
    
    -- The actual data
    data JSONB NOT NULL, -- Array of {zipCode, count, displayLabel?, originalId?}
    
    -- View settings
    view_settings JSONB DEFAULT '{
        "viewMode": "zipCode",
        "scalingMethod": "linear",
        "colorScheme": "yellowRed"
    }'::jsonb,
    
    -- Privacy settings
    is_public BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_heatmap_saves_user_id ON public.heatmap_saves(user_id);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_heatmap_saves_created_at ON public.heatmap_saves(created_at DESC);

-- Create index on is_public for public listings
CREATE INDEX IF NOT EXISTS idx_heatmap_saves_is_public ON public.heatmap_saves(is_public) WHERE is_public = true;

-- Enable Row Level Security
ALTER TABLE public.heatmap_saves ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own heatmaps
CREATE POLICY "Users can view own heatmaps"
    ON public.heatmap_saves
    FOR SELECT
    USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub' OR is_public = true);

-- Policy: Users can insert their own heatmaps
CREATE POLICY "Users can insert own heatmaps"
    ON public.heatmap_saves
    FOR INSERT
    WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub' OR user_id IS NULL);

-- Policy: Users can update their own heatmaps
CREATE POLICY "Users can update own heatmaps"
    ON public.heatmap_saves
    FOR UPDATE
    USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Policy: Users can delete their own heatmaps
CREATE POLICY "Users can delete own heatmaps"
    ON public.heatmap_saves
    FOR DELETE
    USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_heatmap_saves_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER trigger_update_heatmap_saves_updated_at
    BEFORE UPDATE ON public.heatmap_saves
    FOR EACH ROW
    EXECUTE FUNCTION update_heatmap_saves_updated_at();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.heatmap_saves TO authenticated;
GRANT SELECT ON public.heatmap_saves TO anon; -- Allow anonymous users to view public heatmaps

