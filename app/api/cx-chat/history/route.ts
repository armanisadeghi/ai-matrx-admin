import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getUserChatHistory, getGuestChatHistory } from '@/features/public-chat/services/cx-chat';

/**
 * GET /api/cx-chat/history
 *
 * Returns chat history for the current user or guest.
 * Query params: ?limit=50&offset=0&fingerprint_id=xxx
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '50', 10);
        const offset = parseInt(searchParams.get('offset') || '0', 10);
        const fingerprintId = searchParams.get('fingerprint_id');

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        let history;
        if (user) {
            history = await getUserChatHistory(user.id, limit, offset);
        } else if (fingerprintId) {
            history = await getGuestChatHistory(fingerprintId, limit, offset);
        } else {
            return NextResponse.json({ success: true, data: [] });
        }

        return NextResponse.json({ success: true, data: history });
    } catch (error) {
        console.error('GET /api/cx-chat/history error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch chat history' },
            { status: 500 }
        );
    }
}
