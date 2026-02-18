/**
 * Tool Testing — Conversation API
 *
 * POST /api/tool-testing/conversation
 *   Creates a real placeholder conversation in the `conversations` table
 *   for use in tool testing. The authenticated user is set as both `created_by`
 *   and the sole participant.
 *
 *   Returns: { conversation_id: string, user_id: string }
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST() {
    try {
        const supabase = await createClient();

        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: 'auth_required', message: 'Not authenticated' },
                { status: 401 },
            );
        }

        const userId = user.id;

        // Create a placeholder conversation for tool testing
        const { data: conversation, error: convError } = await supabase
            .from('conversations')
            .insert({
                type: 'direct',
                name: `Tool Test — ${new Date().toISOString()}`,
                created_by: userId,
            })
            .select('id')
            .single();

        if (convError || !conversation) {
            console.error('[ToolTest] Failed to create conversation:', convError);
            return NextResponse.json(
                { error: 'db_error', message: convError?.message ?? 'Failed to create conversation' },
                { status: 500 },
            );
        }

        // Add the user as a participant
        const { error: participantError } = await supabase
            .from('conversation_participants')
            .insert({
                conversation_id: conversation.id,
                user_id: userId,
                role: 'owner',
            });

        if (participantError) {
            // Best-effort cleanup — don't block on failure
            await supabase.from('conversations').delete().eq('id', conversation.id);
            console.error('[ToolTest] Failed to add participant:', participantError);
            return NextResponse.json(
                { error: 'db_error', message: participantError.message },
                { status: 500 },
            );
        }

        return NextResponse.json({
            conversation_id: conversation.id,
            user_id: userId,
        });
    } catch (error) {
        console.error('[ToolTest] Unexpected error:', error);
        return NextResponse.json(
            { error: 'internal_error', message: 'Internal server error' },
            { status: 500 },
        );
    }
}
