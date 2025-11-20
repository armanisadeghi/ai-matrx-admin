-- Migration: Invitation System for AI Matrx
-- Created: 2024-11-20
-- Purpose: Simple invitation request and code management system

-- =====================================================
-- Table: invitation_requests
-- Purpose: Store user requests for platform access
-- =====================================================
CREATE TABLE IF NOT EXISTS invitation_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Step 1: Required Information
    full_name TEXT NOT NULL,
    company TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    use_case TEXT NOT NULL,
    user_type TEXT NOT NULL CHECK (
        user_type IN (
            'ai_prompt_engineer',
            'technical_lead',
            'product_manager',
            'business_executive',
            'research_scientist',
            'creative_professional',
            'consultant',
            'individual_hobbyist',
            'other'
        )
    ),
    user_type_other TEXT, -- For "Other" selection
    
    -- Step 2: Optional Information
    phone TEXT,
    biggest_obstacle TEXT,
    referral_source TEXT,
    current_ai_systems TEXT,
    recent_project TEXT,
    
    -- System Fields
    status TEXT NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'approved', 'rejected', 'invited', 'converted')
    ),
    step_completed INTEGER NOT NULL DEFAULT 1 CHECK (step_completed IN (1, 2)),
    notes TEXT, -- Admin notes
    reviewed_by UUID, -- Admin who reviewed
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_invitation_requests_email ON invitation_requests(email);
CREATE INDEX idx_invitation_requests_status ON invitation_requests(status);
CREATE INDEX idx_invitation_requests_created_at ON invitation_requests(created_at DESC);

-- =====================================================
-- Table: invitation_codes
-- Purpose: Store and manage invitation codes
-- =====================================================
CREATE TABLE IF NOT EXISTS invitation_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Code Information
    code TEXT NOT NULL UNIQUE,
    invitation_request_id UUID REFERENCES invitation_requests(id) ON DELETE SET NULL,
    
    -- Usage Tracking
    status TEXT NOT NULL DEFAULT 'active' CHECK (
        status IN ('active', 'used', 'expired', 'revoked')
    ),
    max_uses INTEGER NOT NULL DEFAULT 1,
    current_uses INTEGER NOT NULL DEFAULT 0,
    used_by_user_id UUID, -- auth.users ID when used
    used_at TIMESTAMPTZ,
    
    -- Metadata
    created_by UUID, -- Admin who created it
    expires_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_invitation_codes_code ON invitation_codes(code);
CREATE INDEX idx_invitation_codes_status ON invitation_codes(status);
CREATE INDEX idx_invitation_codes_request_id ON invitation_codes(invitation_request_id);

-- =====================================================
-- Function: Update updated_at timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION update_invitation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER trigger_invitation_requests_updated_at
    BEFORE UPDATE ON invitation_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_invitation_updated_at();

CREATE TRIGGER trigger_invitation_codes_updated_at
    BEFORE UPDATE ON invitation_codes
    FOR EACH ROW
    EXECUTE FUNCTION update_invitation_updated_at();

-- =====================================================
-- Row Level Security (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE invitation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitation_codes ENABLE ROW LEVEL SECURITY;

-- Policies for invitation_requests
-- Allow anonymous users to create requests
CREATE POLICY "Anyone can create invitation requests"
    ON invitation_requests
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Allow users to view their own requests
CREATE POLICY "Users can view their own requests"
    ON invitation_requests
    FOR SELECT
    TO authenticated
    USING (email = current_setting('request.jwt.claims', true)::json->>'email');

-- Allow users to update their own requests (for step 2)
CREATE POLICY "Users can update their own requests"
    ON invitation_requests
    FOR UPDATE
    TO authenticated
    USING (email = current_setting('request.jwt.claims', true)::json->>'email')
    WITH CHECK (email = current_setting('request.jwt.claims', true)::json->>'email');

-- Policies for invitation_codes
-- Allow anyone to check if a code is valid (read-only, limited fields)
CREATE POLICY "Anyone can validate invitation codes"
    ON invitation_codes
    FOR SELECT
    TO anon, authenticated
    USING (status = 'active' AND (expires_at IS NULL OR expires_at > NOW()));

-- =====================================================
-- Helper Functions
-- =====================================================

-- Function to generate a random invitation code
CREATE OR REPLACE FUNCTION generate_invitation_code()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Exclude similar chars (I, O, 0, 1)
    result TEXT := '';
    i INTEGER;
BEGIN
    -- Generate format: XXXX-XXXX-XXXX (12 characters, 3 groups of 4)
    FOR i IN 1..12 LOOP
        IF i % 4 = 1 AND i > 1 THEN
            result := result || '-';
        END IF;
        result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to mark invitation code as used
CREATE OR REPLACE FUNCTION mark_invitation_code_used(
    p_code TEXT,
    p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_code_id UUID;
    v_current_uses INTEGER;
    v_max_uses INTEGER;
BEGIN
    -- Get code info
    SELECT id, current_uses, max_uses INTO v_code_id, v_current_uses, v_max_uses
    FROM invitation_codes
    WHERE code = p_code 
        AND status = 'active'
        AND (expires_at IS NULL OR expires_at > NOW())
    FOR UPDATE; -- Lock the row

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Check if code can still be used
    IF v_current_uses >= v_max_uses THEN
        RETURN FALSE;
    END IF;

    -- Update the code
    UPDATE invitation_codes
    SET 
        current_uses = current_uses + 1,
        status = CASE 
            WHEN current_uses + 1 >= max_uses THEN 'used'::TEXT
            ELSE 'active'::TEXT
        END,
        used_by_user_id = p_user_id,
        used_at = NOW()
    WHERE id = v_code_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Comments
-- =====================================================
COMMENT ON TABLE invitation_requests IS 'Stores user requests for platform access';
COMMENT ON TABLE invitation_codes IS 'Manages invitation codes for signup';
COMMENT ON FUNCTION generate_invitation_code() IS 'Generates a random invitation code in format XXXX-XXXX-XXXX';
COMMENT ON FUNCTION mark_invitation_code_used(TEXT, UUID) IS 'Marks an invitation code as used by a specific user';

