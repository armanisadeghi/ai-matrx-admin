/**
 * Messages API Routes
 * 
 * GET /api/messages/[conversationId]/messages - List messages in conversation
 * POST /api/messages/[conversationId]/messages - Send a message
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { z } from 'zod';

// ============================================
// Validation Schemas
// ============================================

const sendMessageSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty').max(10000, 'Message too long'),
  message_type: z.enum(['text', 'image', 'video', 'audio', 'file', 'system']).default('text'),
  media_url: z.string().url().optional(),
  media_thumbnail_url: z.string().url().optional(),
  media_metadata: z.record(z.unknown()).optional(),
  reply_to_id: z.string().uuid().optional(),
  client_message_id: z.string().optional(),
});

// ============================================
// GET - List messages
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { conversationId } = await params;
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, msg: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get user's matrix_id
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('matrix_id')
      .eq('auth_id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { success: false, msg: 'User not found' },
        { status: 404 }
      );
    }

    const userId = userData.matrix_id;

    // Check if user is participant
    const { data: participation, error: participationError } = await supabase
      .from('conversation_participants')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .single();

    if (participationError || !participation) {
      return NextResponse.json(
        { success: false, msg: 'Not a participant in this conversation' },
        { status: 403 }
      );
    }

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const before = searchParams.get('before'); // ISO timestamp for pagination
    const after = searchParams.get('after'); // ISO timestamp for fetching new messages

    // Build query
    let query = supabase
      .from('messages')
      .select(`
        *,
        sender:users!messages_sender_id_fkey(
          matrix_id,
          first_name,
          last_name,
          full_name,
          email,
          picture,
          preferred_picture
        ),
        reply_to:messages!messages_reply_to_id_fkey(
          id,
          content,
          sender_id,
          message_type,
          created_at
        )
      `)
      .eq('conversation_id', conversationId)
      .is('deleted_at', null);

    // Apply pagination filters
    if (before) {
      query = query.lt('created_at', before);
    }
    if (after) {
      query = query.gt('created_at', after);
    }

    // Order and limit
    query = query
      .order('created_at', { ascending: !before }) // Descending when paginating back
      .limit(limit);

    const { data: messages, error: fetchError } = await query;

    if (fetchError) {
      console.error('[Messages API] Failed to fetch:', fetchError);
      return NextResponse.json(
        { success: false, msg: fetchError.message },
        { status: 500 }
      );
    }

    // If we queried in descending order (for pagination), reverse to get chronological
    const sortedMessages = before ? messages?.reverse() : messages;

    return NextResponse.json({
      success: true,
      data: sortedMessages || [],
      msg: 'Messages fetched successfully',
    });
  } catch (error) {
    console.error('[Messages API] GET Error:', error);
    return NextResponse.json(
      { success: false, msg: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================
// POST - Send message
// ============================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { conversationId } = await params;
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, msg: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get user's matrix_id
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('matrix_id')
      .eq('auth_id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { success: false, msg: 'User not found' },
        { status: 404 }
      );
    }

    const userId = userData.matrix_id;

    // Check if user is participant
    const { data: participation, error: participationError } = await supabase
      .from('conversation_participants')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .single();

    if (participationError || !participation) {
      return NextResponse.json(
        { success: false, msg: 'Not a participant in this conversation' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = sendMessageSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, msg: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const {
      content,
      message_type,
      media_url,
      media_thumbnail_url,
      media_metadata,
      reply_to_id,
      client_message_id,
    } = validation.data;

    // Check for duplicate message (idempotency)
    if (client_message_id) {
      const { data: existingMessage } = await supabase
        .from('messages')
        .select('*')
        .eq('client_message_id', client_message_id)
        .single();

      if (existingMessage) {
        return NextResponse.json({
          success: true,
          data: existingMessage,
          duplicate: true,
          msg: 'Message already exists',
        });
      }
    }

    // Verify reply_to message exists and is in this conversation
    if (reply_to_id) {
      const { data: replyToMessage } = await supabase
        .from('messages')
        .select('id')
        .eq('id', reply_to_id)
        .eq('conversation_id', conversationId)
        .single();

      if (!replyToMessage) {
        return NextResponse.json(
          { success: false, msg: 'Reply-to message not found' },
          { status: 400 }
        );
      }
    }

    // Insert message
    const { data: newMessage, error: insertError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: userId,
        content: content.trim(),
        message_type,
        media_url,
        media_thumbnail_url,
        media_metadata,
        reply_to_id,
        client_message_id,
        status: 'sent',
      })
      .select(`
        *,
        sender:users!messages_sender_id_fkey(
          matrix_id,
          first_name,
          last_name,
          full_name,
          email,
          picture,
          preferred_picture
        )
      `)
      .single();

    if (insertError) {
      console.error('[Messages API] Failed to send:', insertError);
      return NextResponse.json(
        { success: false, msg: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: newMessage,
      msg: 'Message sent successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('[Messages API] POST Error:', error);
    return NextResponse.json(
      { success: false, msg: 'Internal server error' },
      { status: 500 }
    );
  }
}
