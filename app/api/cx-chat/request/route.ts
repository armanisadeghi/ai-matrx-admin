import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import {
    createCxRequest,
    updateCxRequest,
    deleteCxRequest,
    loadFullConversation,
    createCxUserRequest,
} from '@/features/public-chat/services/cx-chat';

/**
 * GET /api/cx-chat/request?id=xxx
 *
 * Load a full conversation (request + messages + media).
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const requestId = searchParams.get('id');

        if (!requestId) {
            return NextResponse.json(
                { success: false, error: 'Missing request ID' },
                { status: 400 }
            );
        }

        const conversation = await loadFullConversation(requestId);
        if (!conversation) {
            return NextResponse.json(
                { success: false, error: 'Conversation not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, data: conversation });
    } catch (error) {
        console.error('GET /api/cx-chat/request error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to load conversation' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/cx-chat/request
 *
 * Create a new chat request and link it to the user/guest.
 * Body: { conversation_id, prompt_id?, label?, fingerprint_id? }
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { conversation_id, prompt_id, label, fingerprint_id } = body;

        if (!conversation_id) {
            return NextResponse.json(
                { success: false, error: 'Missing conversation_id' },
                { status: 400 }
            );
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        const newRequest = await createCxRequest({
            conversation_id,
            prompt_id: prompt_id || null,
            label: label || null,
            user_id: user?.id || null,
            fingerprint_id: !user ? (fingerprint_id || null) : null,
            status: 'active',
        });

        if (!newRequest) {
            return NextResponse.json(
                { success: false, error: 'Failed to create request' },
                { status: 500 }
            );
        }

        // Create user-request link
        await createCxUserRequest({
            user_id: user?.id || null,
            fingerprint_id: !user ? (fingerprint_id || null) : null,
            request_id: newRequest.id,
        });

        return NextResponse.json({ success: true, data: newRequest }, { status: 201 });
    } catch (error) {
        console.error('POST /api/cx-chat/request error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create request' },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/cx-chat/request
 *
 * Update a request (rename, change status, etc.)
 * Body: { id, label?, status?, metadata? }
 */
export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { id, ...updates } = body;

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'Missing request ID' },
                { status: 400 }
            );
        }

        const updated = await updateCxRequest(id, updates);
        if (!updated) {
            return NextResponse.json(
                { success: false, error: 'Failed to update request' },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, data: updated });
    } catch (error) {
        console.error('PATCH /api/cx-chat/request error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update request' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/cx-chat/request?id=xxx
 *
 * Delete a chat request and all related data.
 */
export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const requestId = searchParams.get('id');

        if (!requestId) {
            return NextResponse.json(
                { success: false, error: 'Missing request ID' },
                { status: 400 }
            );
        }

        const success = await deleteCxRequest(requestId);
        if (!success) {
            return NextResponse.json(
                { success: false, error: 'Failed to delete request' },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('DELETE /api/cx-chat/request error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to delete request' },
            { status: 500 }
        );
    }
}
