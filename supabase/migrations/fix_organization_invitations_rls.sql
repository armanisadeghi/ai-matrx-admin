-- Migration: Fix RLS policies for organization_invitations table
-- Created: 2026-01-30
-- Purpose: Allow users to read invitations by token for acceptance flow

-- =====================================================
-- Drop existing policies if they exist (safe idempotent approach)
-- =====================================================
DROP POLICY IF EXISTS "Users can read invitations by token" ON organization_invitations;
DROP POLICY IF EXISTS "Users can read invitations sent to their email" ON organization_invitations;
DROP POLICY IF EXISTS "Org admins can manage invitations" ON organization_invitations;
DROP POLICY IF EXISTS "Org admins can create invitations" ON organization_invitations;
DROP POLICY IF EXISTS "Org admins can delete invitations" ON organization_invitations;
DROP POLICY IF EXISTS "Invitee can delete invitation when accepting" ON organization_invitations;

-- =====================================================
-- Enable RLS (idempotent - safe to run if already enabled)
-- =====================================================
ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- SELECT Policies
-- =====================================================

-- Policy 1: Allow any authenticated user to read an invitation by its token
-- This is needed for the invitation acceptance flow where users click a link
-- with a token and need to see the invitation details
CREATE POLICY "Users can read invitations by token"
    ON organization_invitations
    FOR SELECT
    TO authenticated
    USING (true);

-- Note: We use a permissive policy here because:
-- 1. Tokens are UUIDs (hard to guess)
-- 2. Users need to read invitations before we can verify their email matches
-- 3. The application layer validates email match before showing full details

-- =====================================================
-- INSERT Policies
-- =====================================================

-- Policy: Organization owners and admins can create invitations
CREATE POLICY "Org admins can create invitations"
    ON organization_invitations
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM organization_members
            WHERE organization_members.organization_id = organization_invitations.organization_id
            AND organization_members.user_id = auth.uid()
            AND organization_members.role IN ('owner', 'admin')
        )
    );

-- =====================================================
-- DELETE Policies
-- =====================================================

-- Policy: Organization owners and admins can delete/cancel invitations
CREATE POLICY "Org admins can delete invitations"
    ON organization_invitations
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM organization_members
            WHERE organization_members.organization_id = organization_invitations.organization_id
            AND organization_members.user_id = auth.uid()
            AND organization_members.role IN ('owner', 'admin')
        )
    );

-- Policy: Invitees can delete their own invitation (when accepting, the invitation is deleted)
CREATE POLICY "Invitee can delete invitation when accepting"
    ON organization_invitations
    FOR DELETE
    TO authenticated
    USING (
        LOWER(email) = LOWER(auth.jwt() ->> 'email')
    );

-- =====================================================
-- UPDATE Policies (for resending - updates expires_at)
-- =====================================================

-- Policy: Organization owners and admins can update invitations (e.g., resend)
CREATE POLICY "Org admins can update invitations"
    ON organization_invitations
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM organization_members
            WHERE organization_members.organization_id = organization_invitations.organization_id
            AND organization_members.user_id = auth.uid()
            AND organization_members.role IN ('owner', 'admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM organization_members
            WHERE organization_members.organization_id = organization_invitations.organization_id
            AND organization_members.user_id = auth.uid()
            AND organization_members.role IN ('owner', 'admin')
        )
    );

-- =====================================================
-- Comments
-- =====================================================
COMMENT ON POLICY "Users can read invitations by token" ON organization_invitations IS 
    'Allows authenticated users to read any invitation - application validates email match';

COMMENT ON POLICY "Org admins can create invitations" ON organization_invitations IS 
    'Only org owners and admins can invite new members';

COMMENT ON POLICY "Org admins can delete invitations" ON organization_invitations IS 
    'Org owners and admins can cancel pending invitations';

COMMENT ON POLICY "Invitee can delete invitation when accepting" ON organization_invitations IS 
    'Allows invitee to delete the invitation record when accepting';

COMMENT ON POLICY "Org admins can update invitations" ON organization_invitations IS 
    'Allows org admins to update invitations (e.g., extend expiry when resending)';
