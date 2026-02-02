"use client";

import { useEffect, useRef } from "react";
import { useAppSelector, useAppDispatch } from "@/lib/redux";
import { 
  setMessagingAvailable,
  setTotalUnreadCount,
} from "../redux/messagingSlice";
import { createClient } from "@/utils/supabase/client";

/**
 * MessagingInitializer - Sets up messaging availability and realtime subscriptions
 * 
 * Note: ConversationList now uses useConversations hook directly.
 * This component only handles:
 * - Marking messaging as available
 * - Global realtime subscriptions for unread counts
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

  // Subscribe to realtime updates for unread count badge in header
  useEffect(() => {
    if (!userId) return;

    const channel = supabase.channel(`dm_global:${userId}`);

    // Listen for new messages to update the global unread count
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'dm_messages',
      },
      async (payload) => {
        const newMessage = payload.new as { conversation_id: string; sender_id: string };
        
        // If message is from someone else, fetch updated unread count
        if (newMessage.sender_id !== userId) {
          console.log('[DM Global] New message from other user, updating unread count');
          // Fetch total unread count
          const { data } = await supabase
            .rpc('get_dm_conversations_with_details', { p_user_id: userId });
          
          if (data) {
            const total = data.reduce((sum: number, conv: { unread_count: number }) => 
              sum + (conv.unread_count || 0), 0
            );
            dispatch(setTotalUnreadCount(total));
          }
        }
      }
    );

    channel.subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        console.log('[DM Global] Subscribed to global DM updates');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('[DM Global] Channel error:', err);
      }
    });

    subscriptionRef.current = channel;

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [userId, supabase, dispatch]);

  return null;
}

export default MessagingInitializer;
