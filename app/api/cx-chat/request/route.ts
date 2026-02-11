import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import {
    createCxConversation,
    updateCxConversation,
    deleteCxConversation,
    loadFullConversation,
} from '@/features/public-chat/services/cx-chat';

/**
 * GET /api/cx-chat/request?id=xxx
 *
 * Load a full conversation (conversation + messages).
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const conversationId = searchParams.get('id');

        if (!conversationId) {
            return NextResponse.json(
                { success: false, error: 'Missing conversation ID' },
                { status: 400 },
            );
        }

        const conversation = await loadFullConversation(conversationId);
        if (!conversation) {
            return NextResponse.json(
                { success: false, error: 'Conversation not found' },
                { status: 404 },
            );
        }

        return NextResponse.json({ success: true, data: conversation });
    } catch (error) {
        console.error('GET /api/cx-chat/request error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to load conversation' },
            { status: 500 },
        );
    }
}

/**
 * POST /api/cx-chat/request
 *
 * Create a new conversation.
 * Body: { title?, system_instruction?, ai_model_id?, config?, metadata? }
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { title, system_instruction, ai_model_id, config, metadata } = body;

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Authentication required' },
                { status: 401 },
            );
        }

        const newConversation = await createCxConversation({
            user_id: user.id,
            title: title || null,
            system_instruction: system_instruction || null,
            ai_model_id: ai_model_id || null,
            config: config || {},
            metadata: metadata || {},
        });

        if (!newConversation) {
            return NextResponse.json(
                { success: false, error: 'Failed to create conversation' },
                { status: 500 },
            );
        }

        return NextResponse.json({ success: true, data: newConversation }, { status: 201 });
    } catch (error) {
        console.error('POST /api/cx-chat/request error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create conversation' },
            { status: 500 },
        );
    }
}

/**
 * PATCH /api/cx-chat/request
 *
 * Update a conversation (rename, change status, etc.)
 * Body: { id, title?, status?, metadata? }
 */
export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { id, ...updates } = body;

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'Missing conversation ID' },
                { status: 400 },
            );
        }

        const updated = await updateCxConversation(id, updates);
        if (!updated) {
            return NextResponse.json(
                { success: false, error: 'Failed to update conversation' },
                { status: 500 },
            );
        }

        return NextResponse.json({ success: true, data: updated });
    } catch (error) {
        console.error('PATCH /api/cx-chat/request error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update conversation' },
            { status: 500 },
        );
    }
}

/**
 * DELETE /api/cx-chat/request?id=xxx
 *
 * Soft-delete a conversation.
 */
export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const conversationId = searchParams.get('id');

        if (!conversationId) {
            return NextResponse.json(
                { success: false, error: 'Missing conversation ID' },
                { status: 400 },
            );
        }

        const success = await deleteCxConversation(conversationId);
        if (!success) {
            return NextResponse.json(
                { success: false, error: 'Failed to delete conversation' },
                { status: 500 },
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('DELETE /api/cx-chat/request error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to delete conversation' },
            { status: 500 },
        );
    }
}
