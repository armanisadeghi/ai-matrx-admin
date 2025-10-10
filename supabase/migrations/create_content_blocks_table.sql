-- Create content_blocks table for storing dynamic content block templates
CREATE TABLE IF NOT EXISTS content_blocks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    block_id VARCHAR(100) UNIQUE NOT NULL, -- The original string ID like 'deep-thinking'
    label VARCHAR(255) NOT NULL,
    description TEXT,
    icon_name VARCHAR(100) NOT NULL, -- Lucide icon name like 'Brain', 'Clock'
    category VARCHAR(50) NOT NULL,
    subcategory VARCHAR(50), -- Optional subcategory for nesting
    template TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0, -- For custom ordering within categories
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes for performance
    CONSTRAINT valid_category CHECK (category IN ('structure', 'formatting', 'special', 'ai-prompts'))
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_content_blocks_category ON content_blocks(category);
CREATE INDEX IF NOT EXISTS idx_content_blocks_subcategory ON content_blocks(category, subcategory);
CREATE INDEX IF NOT EXISTS idx_content_blocks_active ON content_blocks(is_active);
CREATE INDEX IF NOT EXISTS idx_content_blocks_sort ON content_blocks(category, subcategory, sort_order);

-- Create category_configs table for storing menu structure configuration
CREATE TABLE IF NOT EXISTS category_configs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category_id VARCHAR(50) UNIQUE NOT NULL,
    label VARCHAR(255) NOT NULL,
    icon_name VARCHAR(100) NOT NULL,
    color VARCHAR(50) NOT NULL,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create subcategory_configs table for storing subcategory information
CREATE TABLE IF NOT EXISTS subcategory_configs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category_id VARCHAR(50) NOT NULL,
    subcategory_id VARCHAR(50) NOT NULL,
    label VARCHAR(255) NOT NULL,
    icon_name VARCHAR(100) NOT NULL,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key constraint
    FOREIGN KEY (category_id) REFERENCES category_configs(category_id) ON DELETE CASCADE,
    
    -- Unique constraint for category + subcategory combination
    UNIQUE(category_id, subcategory_id)
);

-- Create indexes for subcategory_configs
CREATE INDEX IF NOT EXISTS idx_subcategory_configs_category ON subcategory_configs(category_id);
CREATE INDEX IF NOT EXISTS idx_subcategory_configs_active ON subcategory_configs(is_active);
CREATE INDEX IF NOT EXISTS idx_subcategory_configs_sort ON subcategory_configs(category_id, sort_order);

-- Enable Row Level Security (RLS)
ALTER TABLE content_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcategory_configs ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users (adjust as needed for your auth setup)
CREATE POLICY "Allow authenticated users to read content blocks" ON content_blocks
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to manage content blocks" ON content_blocks
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read category configs" ON category_configs
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to manage category configs" ON category_configs
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read subcategory configs" ON subcategory_configs
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to manage subcategory configs" ON subcategory_configs
    FOR ALL TO authenticated USING (true);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_content_blocks_updated_at BEFORE UPDATE ON content_blocks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_category_configs_updated_at BEFORE UPDATE ON category_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subcategory_configs_updated_at BEFORE UPDATE ON subcategory_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
