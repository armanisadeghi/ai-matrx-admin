-- ============================================================================
-- Dynamic Tool UI Components System
-- Run this migration against your Supabase database
-- ============================================================================

-- 1. Tool UI Components table
-- Stores the JSX/TSX code for dynamic tool renderers fetched at runtime
CREATE TABLE IF NOT EXISTS tool_ui_components (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tool_id         UUID REFERENCES tools(id) ON DELETE SET NULL,
    tool_name       TEXT NOT NULL UNIQUE,          -- matches mcp_input.name (e.g. "web_search_v1")
    display_name    TEXT NOT NULL,                  -- human-readable (e.g. "Web Search")
    results_label   TEXT,                           -- overlay tab label (e.g. "Search Results")

    -- Component code (TSX/JSX stored as text)
    inline_code     TEXT NOT NULL,                  -- required inline component code
    overlay_code    TEXT,                           -- optional overlay component code
    utility_code    TEXT,                           -- optional shared helpers/parsers
    header_extras_code   TEXT,                      -- optional: returns ReactNode for header
    header_subtitle_code TEXT,                      -- optional: returns string|null for subtitle

    -- Rendering config
    keep_expanded_on_stream BOOLEAN NOT NULL DEFAULT false,
    allowed_imports TEXT[] NOT NULL DEFAULT ARRAY[
        'react', 'lucide-react',
        '@/components/ui/badge', '@/components/ui/button', '@/components/ui/card',
        '@/components/ui/tabs', '@/components/ui/input', '@/components/ui/label',
        '@/components/ui/select', '@/components/ui/switch', '@/components/ui/slider',
        '@/components/ui/textarea', '@/lib/utils'
    ],
    language        TEXT NOT NULL DEFAULT 'tsx' CHECK (language IN ('tsx', 'jsx')),

    -- Status
    is_active       BOOLEAN NOT NULL DEFAULT true,
    version         TEXT NOT NULL DEFAULT '1.0.0',

    -- Metadata
    notes           TEXT,
    created_by      UUID,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookup by tool_name (the primary query path)
CREATE INDEX IF NOT EXISTS idx_tool_ui_components_tool_name
    ON tool_ui_components(tool_name)
    WHERE is_active = true;

-- Index for FK lookups
CREATE INDEX IF NOT EXISTS idx_tool_ui_components_tool_id
    ON tool_ui_components(tool_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_tool_ui_components_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tool_ui_components_updated_at ON tool_ui_components;
CREATE TRIGGER tool_ui_components_updated_at
    BEFORE UPDATE ON tool_ui_components
    FOR EACH ROW
    EXECUTE FUNCTION update_tool_ui_components_updated_at();


-- 2. Tool UI Incidents table
-- Tracks rendering errors from dynamic components for debugging
CREATE TABLE IF NOT EXISTS tool_ui_incidents (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tool_name           TEXT NOT NULL,
    component_id        UUID REFERENCES tool_ui_components(id) ON DELETE SET NULL,
    component_type      TEXT NOT NULL CHECK (component_type IN (
        'inline', 'overlay', 'header_extras', 'header_subtitle', 'utility', 'fetch'
    )),
    error_type          TEXT NOT NULL CHECK (error_type IN (
        'compilation', 'runtime', 'fetch', 'timeout', 'unknown'
    )),
    error_message       TEXT NOT NULL,
    error_stack         TEXT,
    tool_update_snapshot JSONB,                     -- the data that caused the error
    component_version   TEXT,
    browser_info        TEXT,
    session_id          TEXT,

    -- Resolution tracking
    resolved            BOOLEAN NOT NULL DEFAULT false,
    resolved_at         TIMESTAMPTZ,
    resolved_by         UUID,
    resolution_notes    TEXT,

    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for querying unresolved incidents by tool
CREATE INDEX IF NOT EXISTS idx_tool_ui_incidents_tool_name
    ON tool_ui_incidents(tool_name, resolved, created_at DESC);

-- Index for dashboard queries
CREATE INDEX IF NOT EXISTS idx_tool_ui_incidents_unresolved
    ON tool_ui_incidents(resolved, created_at DESC)
    WHERE resolved = false;

-- Auto-cleanup: keep only last 1000 resolved incidents per tool
-- (Run periodically or as a cron job)
-- DELETE FROM tool_ui_incidents
-- WHERE resolved = true
-- AND id NOT IN (
--     SELECT id FROM tool_ui_incidents
--     WHERE resolved = true
--     ORDER BY created_at DESC
--     LIMIT 1000
-- );


-- 3. RLS Policies
ALTER TABLE tool_ui_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_ui_incidents ENABLE ROW LEVEL SECURITY;

-- Public read access to active components (needed by client-side renderer)
CREATE POLICY "tool_ui_components_public_read" ON tool_ui_components
    FOR SELECT USING (is_active = true);

-- Authenticated users can read all components (admin)
CREATE POLICY "tool_ui_components_auth_read_all" ON tool_ui_components
    FOR SELECT TO authenticated USING (true);

-- Only authenticated users can insert/update/delete
CREATE POLICY "tool_ui_components_auth_write" ON tool_ui_components
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Anyone can insert incidents (error reporting from client)
CREATE POLICY "tool_ui_incidents_public_insert" ON tool_ui_incidents
    FOR INSERT WITH CHECK (true);

-- Authenticated users can read and manage incidents
CREATE POLICY "tool_ui_incidents_auth_all" ON tool_ui_incidents
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
