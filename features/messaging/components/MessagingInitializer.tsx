"use client";

import { useEffect, useRef, useCallback } from "react";
import { useAppSelector, useAppDispatch } from "@/lib/redux";
import { 
  setMessagingAvailable,
  setTotalUnreadCount,
} from "../redux/messagingSlice";
import { createClient } from "@/utils/supabase/client";

/**
 * MessagingInitializer - Sets up messaging availability and realtime subscriptions
 * 
 * Handles:
 * - Marking messaging as available
 * - Initial unread count fetch
 * - Real-time updates for unread count badge in header
 *   - New messages (INSERT on dm_messages)
 *   - Messages marked as read (UPDATE on dm_conversation_participants)
 */
export function MessagingInitializer() {
  const dispatch = useAppDispatch();
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Get user from Redux
  const user = useAppSelector((state) => state.user);
  const userId = user?.id;

  // Mark messaging as available
  useEffect(() => {
    dispatch(setMessagingAvailable(true));
    return () => {
      dispatch(setMessagingAvailable(false));
    };
  }, [dispatch]);

  // Fetch and update count of conversations with unread messages
  const updateUnreadCount = useCallback(async () => {
    if (!userId) return;

    try {
      const { data } = await supabase
        .rpc('get_dm_conversations_with_details', { p_user_id: userId });
      
      if (data) {
        // Count unique conversations that have at least 1 unread message
        const conversationsWithUnread = data.filter(
          (conv: { unread_count: number }) => conv.unread_count > 0
        ).length;
        dispatch(setTotalUnreadCount(conversationsWithUnread));
      }
    } catch (error) {
      console.error('[Messaging] Failed to update unread count:', error);
    }
  }, [userId, supabase, dispatch]);

  // Initial unread count fetch
  useEffect(() => {
    updateUnreadCount();
  }, [updateUnreadCount]);

  // Subscribe to realtime updates for unread count badge in header
  useEffect(() => {
    if (!userId) return;

    const channel = supabase.channel(`dm_global:${userId}`);

    // 1. Listen for NEW messages (increase unread count)
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'dm_messages',
      },
      async (payload) => {
        const newMessage = payload.new as { conversation_id: string; sender_id: string };
        
        // If message is from someone else, update unread count
        if (newMessage.sender_id !== userId) {
          await updateUnreadCount();
        }
      }
    );

    // 2. Listen for messages marked as READ (decrease unread count)
    channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'dm_conversation_participants',
        filter: `user_id=eq.${userId}`, // Only listen to current user's updates
      },
      async (payload) => {
        const oldData = payload.old as { last_read_at: string | null };
        const newData = payload.new as { last_read_at: string | null };
        
        // If last_read_at was updated (messages marked as read)
        if (oldData.last_read_at !== newData.last_read_at) {
          await updateUnreadCount();
        }
      }
    );

    channel.subscribe();

    subscriptionRef.current = channel;

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [userId, supabase, updateUnreadCount]);

  return null;
}

export default MessagingInitializer;
