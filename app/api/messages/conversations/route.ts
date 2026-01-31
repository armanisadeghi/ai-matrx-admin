/**
 * Conversations API Routes
 * 
 * GET /api/messages/conversations - List all conversations for current user
 * POST /api/messages/conversations - Create new conversation or return existing
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { z } from 'zod';

// ============================================
// Validation Schemas
// ============================================

const createConversationSchema = z.object({
  type: z.enum(['direct', 'group']).default('direct'),
  participant_ids: z.array(z.string()).min(1, 'At least one participant required'),
  group_name: z.string().optional(),
});

// ============================================
// GET - List conversations
// ============================================

export async function GET(request: NextRequest) {
  try {
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

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get conversations using the helper function
    const { data: conversations, error: fetchError } = await supabase
      .rpc('get_conversations_with_details', { p_user_matrix_id: userId });

    if (fetchError) {
      console.error('[Conversations API] Failed to fetch:', fetchError);
      return NextResponse.json(
        { success: false, msg: fetchError.message },
        { status: 500 }
      );
    }

    // Apply pagination
    const paginatedConversations = conversations?.slice(offset, offset + limit) || [];

    // Fetch participants for each conversation
    const conversationsWithParticipants = await Promise.all(
      paginatedConversations.map(async (conv: Record<string, unknown>) => {
        const { data: participants } = await supabase
          .from('conversation_participants')
          .select(`
            id,
            conversation_id,
            user_id,
            role,
            joined_at,
            last_read_at,
            is_muted,
            is_archived,
            user:users!conversation_participants_user_id_fkey(
              matrix_id,
              first_name,
              last_name,
              full_name,
              email,
              picture,
              preferred_picture
            )
          `)
          .eq('conversation_id', conv.conversation_id);

        // For direct chats, compute display name/image from the other participant
        const otherParticipant = participants?.find(
          (p) => p.user_id !== userId
        );

        return {
          ConversationID: conv.conversation_id,
          Type: conv.conversation_type,
          GroupName: conv.group_name,
          GroupImage: conv.group_image_url,
          CreatedAt: conv.created_at,
          UpdatedAt: conv.updated_at,
          DisplayName: conv.conversation_type === 'direct' && otherParticipant
            ? (otherParticipant.user as Record<string, unknown>)?.full_name || 
              (otherParticipant.user as Record<string, unknown>)?.email || 'Unknown'
            : conv.group_name || 'Group Chat',
          DisplayImage: conv.conversation_type === 'direct' && otherParticipant
            ? (otherParticipant.user as Record<string, unknown>)?.preferred_picture || 
              (otherParticipant.user as Record<string, unknown>)?.picture
            : conv.group_image_url,
          IsMuted: participants?.find((p) => p.user_id === userId)?.is_muted || false,
          LastReadAt: participants?.find((p) => p.user_id === userId)?.last_read_at,
          Participants: participants?.map((p) => ({
            UserID: p.user_id,
            DisplayName: (p.user as Record<string, unknown>)?.full_name || 
                        (p.user as Record<string, unknown>)?.email,
            FirstName: (p.user as Record<string, unknown>)?.first_name,
            LastName: (p.user as Record<string, unknown>)?.last_name,
            ProfileImage: (p.user as Record<string, unknown>)?.preferred_picture || 
                         (p.user as Record<string, unknown>)?.picture,
            Role: p.role,
          })) || [],
          LastMessage: conv.last_message_content ? {
            Content: conv.last_message_content,
            SenderID: conv.last_message_sender_id,
            CreatedAt: conv.last_message_at,
          } : null,
          UnreadCount: conv.unread_count,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: conversationsWithParticipants,
      total: conversations?.length || 0,
      msg: 'Conversations fetched successfully',
    });
  } catch (error) {
    console.error('[Conversations API] Error:', error);
    return NextResponse.json(
      { success: false, msg: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================
// POST - Create conversation
// ============================================

export async function POST(request: NextRequest) {
  try {
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

    // Parse and validate request body
    const body = await request.json();
    const validation = createConversationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, msg: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { type, participant_ids, group_name } = validation.data;

    // For direct chats, check if conversation already exists
    if (type === 'direct' && participant_ids.length === 1) {
      const otherUserId = participant_ids[0];

      // Use helper function to find existing conversation
      const { data: existingConvId } = await supabase
        .rpc('find_direct_conversation', {
          p_user1_matrix_id: userId,
          p_user2_matrix_id: otherUserId,
        });

      if (existingConvId) {
        return NextResponse.json({
          success: true,
          data: { ConversationID: existingConvId },
          existing: true,
          msg: 'Existing conversation found',
        });
      }
    }

    // Verify all participants exist
    const { data: validUsers, error: usersError } = await supabase
      .from('users')
      .select('matrix_id')
      .in('matrix_id', participant_ids);

    if (usersError) {
      return NextResponse.json(
        { success: false, msg: 'Failed to verify participants' },
        { status: 500 }
      );
    }

    const validUserIds = new Set(validUsers?.map((u) => u.matrix_id));
    const invalidUsers = participant_ids.filter((id) => !validUserIds.has(id));

    if (invalidUsers.length > 0) {
      return NextResponse.json(
        { success: false, msg: `Invalid participant IDs: ${invalidUsers.join(', ')}` },
        { status: 400 }
      );
    }

    // Create conversation
    const { data: newConversation, error: createError } = await supabase
      .from('conversations')
      .insert({
        type,
        group_name: type === 'group' ? group_name : null,
        created_by: userId,
      })
      .select()
      .single();

    if (createError) {
      console.error('[Conversations API] Failed to create:', createError);
      return NextResponse.json(
        { success: false, msg: createError.message },
        { status: 500 }
      );
    }

    // Add all participants (including creator)
    const allParticipants = [userId, ...participant_ids.filter((id) => id !== userId)];
    const participantRecords = allParticipants.map((participantId, index) => ({
      conversation_id: newConversation.id,
      user_id: participantId,
      role: index === 0 ? 'owner' : 'member', // Creator is owner
    }));

    const { error: participantsError } = await supabase
      .from('conversation_participants')
      .insert(participantRecords);

    if (participantsError) {
      // Rollback: delete the conversation
      await supabase.from('conversations').delete().eq('id', newConversation.id);
      console.error('[Conversations API] Failed to add participants:', participantsError);
      return NextResponse.json(
        { success: false, msg: participantsError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { ConversationID: newConversation.id },
      existing: false,
      msg: 'Conversation created successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('[Conversations API] Error:', error);
    return NextResponse.json(
      { success: false, msg: 'Internal server error' },
      { status: 500 }
    );
  }
}
