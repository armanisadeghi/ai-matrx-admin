/**
 * Single Conversation API Routes
 * 
 * GET /api/messages/conversations/[id] - Get conversation details
 * PUT /api/messages/conversations/[id] - Update conversation settings
 * DELETE /api/messages/conversations/[id] - Leave or delete conversation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { z } from 'zod';

// ============================================
// Validation Schemas
// ============================================

const updateConversationSchema = z.object({
  is_muted: z.boolean().optional(),
  is_archived: z.boolean().optional(),
  group_name: z.string().optional(),
  group_image_url: z.string().url().optional(),
});

// ============================================
// GET - Get conversation details
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;
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
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .single();

    if (participationError || !participation) {
      return NextResponse.json(
        { success: false, msg: 'Not a participant in this conversation' },
        { status: 403 }
      );
    }

    // Get conversation with participants
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      return NextResponse.json(
        { success: false, msg: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Get all participants
    const { data: participants } = await supabase
      .from('conversation_participants')
      .select(`
        *,
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
      .eq('conversation_id', conversationId);

    // Update last_read_at for current user
    await supabase
      .from('conversation_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);

    return NextResponse.json({
      success: true,
      data: {
        ConversationID: conversation.id,
        Type: conversation.type,
        GroupName: conversation.group_name,
        GroupImage: conversation.group_image_url,
        CreatedBy: conversation.created_by,
        CreatedAt: conversation.created_at,
        UpdatedAt: conversation.updated_at,
        Participants: participants?.map((p) => ({
          UserID: p.user_id,
          DisplayName: (p.user as Record<string, unknown>)?.full_name || 
                      (p.user as Record<string, unknown>)?.email,
          FirstName: (p.user as Record<string, unknown>)?.first_name,
          LastName: (p.user as Record<string, unknown>)?.last_name,
          ProfileImage: (p.user as Record<string, unknown>)?.preferred_picture || 
                       (p.user as Record<string, unknown>)?.picture,
          Role: p.role,
          LastReadAt: p.last_read_at,
          IsMuted: p.is_muted,
        })) || [],
      },
      msg: 'Conversation fetched successfully',
    });
  } catch (error) {
    console.error('[Conversation API] GET Error:', error);
    return NextResponse.json(
      { success: false, msg: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================
// PUT - Update conversation settings
// ============================================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;
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
    const validation = updateConversationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, msg: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { is_muted, is_archived, group_name, group_image_url } = validation.data;

    // Check if user is participant
    const { data: participation, error: participationError } = await supabase
      .from('conversation_participants')
      .select('role')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .single();

    if (participationError || !participation) {
      return NextResponse.json(
        { success: false, msg: 'Not a participant in this conversation' },
        { status: 403 }
      );
    }

    // Update participant settings (mute, archive)
    if (is_muted !== undefined || is_archived !== undefined) {
      const participantUpdate: Record<string, boolean> = {};
      if (is_muted !== undefined) participantUpdate.is_muted = is_muted;
      if (is_archived !== undefined) participantUpdate.is_archived = is_archived;

      await supabase
        .from('conversation_participants')
        .update(participantUpdate)
        .eq('conversation_id', conversationId)
        .eq('user_id', userId);
    }

    // Update group settings (only owner/admin can do this)
    if (group_name !== undefined || group_image_url !== undefined) {
      // Check if conversation is a group
      const { data: conversation } = await supabase
        .from('conversations')
        .select('type, created_by')
        .eq('id', conversationId)
        .single();

      if (conversation?.type !== 'group') {
        return NextResponse.json(
          { success: false, msg: 'Cannot update group settings on a direct conversation' },
          { status: 400 }
        );
      }

      // Check if user is owner or admin
      if (conversation.created_by !== userId && participation.role !== 'admin') {
        return NextResponse.json(
          { success: false, msg: 'Not authorized to update group settings' },
          { status: 403 }
        );
      }

      const convUpdate: Record<string, string> = {};
      if (group_name !== undefined) convUpdate.group_name = group_name;
      if (group_image_url !== undefined) convUpdate.group_image_url = group_image_url;

      await supabase
        .from('conversations')
        .update(convUpdate)
        .eq('id', conversationId);
    }

    return NextResponse.json({
      success: true,
      data: { ConversationID: conversationId },
      msg: 'Conversation updated successfully',
    });
  } catch (error) {
    console.error('[Conversation API] PUT Error:', error);
    return NextResponse.json(
      { success: false, msg: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE - Leave or delete conversation
// ============================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;
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

    // Get conversation and participation info
    const { data: conversation } = await supabase
      .from('conversations')
      .select('type, created_by')
      .eq('id', conversationId)
      .single();

    if (!conversation) {
      return NextResponse.json(
        { success: false, msg: 'Conversation not found' },
        { status: 404 }
      );
    }

    // For group chats where user is owner, delete the entire conversation
    if (conversation.type === 'group' && conversation.created_by === userId) {
      await supabase.from('conversations').delete().eq('id', conversationId);
      return NextResponse.json({
        success: true,
        msg: 'Conversation deleted successfully',
      });
    }

    // Otherwise, just leave the conversation (archive it)
    await supabase
      .from('conversation_participants')
      .update({ is_archived: true })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);

    return NextResponse.json({
      success: true,
      msg: 'Left conversation successfully',
    });
  } catch (error) {
    console.error('[Conversation API] DELETE Error:', error);
    return NextResponse.json(
      { success: false, msg: 'Internal server error' },
      { status: 500 }
    );
  }
}
