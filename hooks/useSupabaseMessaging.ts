/**
 * React Hooks for Supabase Direct Messaging
 * 
 * Uses dm_ prefixed tables and auth.users.id UUIDs
 * 
 * Provides hooks for:
 * - useMessages: Message state, loading, send, pagination
 * - useTypingIndicator: Who's typing + set typing
 * - useChat: Combined convenience hook
 * - useOnlinePresence: Track online users
 * - useConversations: List and manage conversations
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getMessagingService } from '@/lib/supabase/messaging';
import { createClient } from '@/utils/supabase/client';
import type {
  Message,
  MessageWithSender,
  ConversationWithDetails,
  UserBasicInfo,
  SendMessageRequest,
  UseMessagesReturn,
  UseTypingIndicatorReturn,
  UseChatReturn,
  UseConversationsReturn,
} from '@/features/messaging/types';

// ============================================
// useMessages Hook
// ============================================

interface UseMessagesOptions {
  initialPageSize?: number;
  autoMarkAsRead?: boolean;
}

export function useMessages(
  conversationId: string | null,
  userId: string | null,
  options: UseMessagesOptions = {}
): UseMessagesReturn {
  const { initialPageSize = 50, autoMarkAsRead = true } = options;
  
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  
  const mountedRef = useRef(true);
  const messagingService = getMessagingService();
  // Use ref to avoid recreating supabase client on every render
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  // Load initial messages
  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      setIsLoading(false);
      return;
    }

    mountedRef.current = true;
    let unsubscribe: (() => void) | null = null;

    const loadMessages = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch messages with sender info via RPC
        const { data, error: fetchError } = await supabase
          .from('dm_messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .is('deleted_at', null)
          .order('created_at', { ascending: true })
          .limit(initialPageSize);

        if (!mountedRef.current) return;

        if (fetchError) {
          setError(fetchError.message);
          return;
        }

        // Fetch sender info for each unique sender
        const senderIds = [...new Set((data || []).map((m) => m.sender_id))];
        const senderInfoMap = new Map<string, UserBasicInfo>();

        for (const senderId of senderIds) {
          const { data: userInfo } = await supabase
            .rpc('get_dm_user_info', { p_user_id: senderId });
          if (userInfo && userInfo[0]) {
            senderInfoMap.set(senderId, userInfo[0]);
          }
        }

        // Attach sender info to messages
        const messagesWithSender = (data || []).map((m) => ({
          ...m,
          sender: senderInfoMap.get(m.sender_id) || null,
        })) as MessageWithSender[];

        if (!mountedRef.current) return;

        setMessages(messagesWithSender);
        setHasMore(data?.length === initialPageSize);

        // Auto-mark as read
        if (autoMarkAsRead && userId && data?.length > 0) {
          await messagingService.markConversationAsRead(conversationId, userId);
        }
      } catch (err) {
        if (!mountedRef.current) return;
        setError(err instanceof Error ? err.message : 'Failed to load messages');
      } finally {
        if (mountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    loadMessages();

    // Subscribe to real-time messages
    const handleNewMessage = async (newMessage: Message) => {
      if (!mountedRef.current) return;

      // Fetch sender info for the new message
      let senderInfo: UserBasicInfo | undefined;
      const { data: userInfo } = await supabase
        .rpc('get_dm_user_info', { p_user_id: newMessage.sender_id });
      if (userInfo && userInfo[0]) {
        senderInfo = userInfo[0];
      }

      setMessages((prev) => {
        // Deduplication: Check by id and client_message_id
        const existsByMsgId = prev.some((m) => m.id === newMessage.id);
        const existsByClientId = newMessage.client_message_id && prev.some(
          (m) => m.client_message_id && m.client_message_id === newMessage.client_message_id
        );

        if (existsByMsgId || existsByClientId) {
          // Update existing message (might be status change)
          return prev.map((m) => {
            if (m.id === newMessage.id) {
              return { ...m, ...newMessage, sender: senderInfo || m.sender };
            }
            if (m.client_message_id && m.client_message_id === newMessage.client_message_id) {
              // Replace optimistic message with real one
              return { ...m, ...newMessage, id: newMessage.id, sender: senderInfo || m.sender };
            }
            return m;
          });
        }

        // Add new message
        return [...prev, { ...newMessage, sender: senderInfo } as MessageWithSender];
      });

      // Auto-mark as read when receiving messages
      if (autoMarkAsRead && userId && newMessage.sender_id !== userId) {
        messagingService.markConversationAsRead(conversationId, userId);
      }
    };

    unsubscribe = messagingService.subscribeToMessages(conversationId, handleNewMessage);

    return () => {
      mountedRef.current = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [conversationId, userId, initialPageSize, autoMarkAsRead, messagingService]);

  // Send message
  const sendMessage = useCallback(async (
    content: string,
    options?: Partial<SendMessageRequest>
  ) => {
    if (!conversationId || !userId || !content.trim()) return;

    const clientMessageId = options?.client_message_id ||
      `${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Optimistic update
    const optimisticMessage: MessageWithSender = {
      id: `optimistic-${clientMessageId}`,
      conversation_id: conversationId,
      sender_id: userId,
      content: content.trim(),
      message_type: options?.message_type || 'text',
      media_url: options?.media_url || null,
      media_thumbnail_url: options?.media_thumbnail_url || null,
      media_metadata: options?.media_metadata || null,
      status: 'sending',
      reply_to_id: options?.reply_to_id || null,
      deleted_at: null,
      deleted_for_everyone: false,
      created_at: new Date().toISOString(),
      edited_at: null,
      client_message_id: clientMessageId,
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setIsSending(true);
    setError(null);

    try {
      await messagingService.sendMessage(
        conversationId,
        userId,
        content,
        {
          messageType: options?.message_type,
          mediaUrl: options?.media_url,
          mediaThumbnailUrl: options?.media_thumbnail_url,
          mediaMetadata: options?.media_metadata,
          replyToId: options?.reply_to_id,
          clientMessageId,
        }
      );
    } catch (err) {
      // Update optimistic message to failed status
      setMessages((prev) =>
        prev.map((m) =>
          m.client_message_id === clientMessageId
            ? { ...m, status: 'failed' as const }
            : m
        )
      );
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  }, [conversationId, userId, messagingService]);

  // Load more messages (pagination)
  const loadMoreMessages = useCallback(async () => {
    if (!conversationId || !hasMore || isLoading) return;

    const oldestMessage = messages[0];
    if (!oldestMessage) return;

    setIsLoading(true);

    try {
      const { data, error: fetchError } = await supabase
        .from('dm_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .is('deleted_at', null)
        .lt('created_at', oldestMessage.created_at)
        .order('created_at', { ascending: false })
        .limit(initialPageSize);

      if (!mountedRef.current) return;

      if (fetchError) {
        setError(fetchError.message);
        return;
      }

      // Fetch sender info
      const senderIds = [...new Set((data || []).map((m) => m.sender_id))];
      const senderInfoMap = new Map<string, UserBasicInfo>();

      for (const senderId of senderIds) {
        const { data: userInfo } = await supabase
          .rpc('get_dm_user_info', { p_user_id: senderId });
        if (userInfo && userInfo[0]) {
          senderInfoMap.set(senderId, userInfo[0]);
        }
      }

      const messagesWithSender = (data || []).map((m) => ({
        ...m,
        sender: senderInfoMap.get(m.sender_id) || null,
      })) as MessageWithSender[];

      // Prepend older messages (reversed to maintain order)
      setMessages((prev) => [...messagesWithSender.reverse(), ...prev]);
      setHasMore(data?.length === initialPageSize);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : 'Failed to load more messages');
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [conversationId, hasMore, isLoading, messages, initialPageSize, supabase]);

  // Mark as read manually
  const markAsRead = useCallback(async () => {
    if (!conversationId || !userId) return;
    await messagingService.markConversationAsRead(conversationId, userId);
  }, [conversationId, userId, messagingService]);

  return {
    messages,
    isLoading,
    isSending,
    error,
    hasMore,
    sendMessage,
    loadMoreMessages,
    markAsRead,
  };
}

// ============================================
// useTypingIndicator Hook
// ============================================

export function useTypingIndicator(
  conversationId: string | null,
  userId: string | null,
  displayName: string
): UseTypingIndicatorReturn {
  const [typingUsers, setTypingUsers] = useState<UserBasicInfo[]>([]);
  const setTypingRef = useRef<((isTyping: boolean) => void) | null>(null);
  const messagingService = getMessagingService();

  useEffect(() => {
    if (!conversationId || !userId) {
      setTypingUsers([]);
      return;
    }

    const { setTyping, unsubscribe } = messagingService.subscribeToTyping(
      conversationId,
      userId,
      displayName,
      (typing) => {
        // Convert typing users to UserBasicInfo format
        const users: UserBasicInfo[] = typing.map((t) => ({
          user_id: t.user_id,
          email: null,
          display_name: t.display_name,
          avatar_url: null,
        }));
        setTypingUsers(users);
      }
    );

    setTypingRef.current = setTyping;

    return () => {
      unsubscribe();
      setTypingRef.current = null;
    };
  }, [conversationId, userId, displayName, messagingService]);

  const setTyping = useCallback((isTyping: boolean) => {
    if (setTypingRef.current) {
      setTypingRef.current(isTyping);
    }
  }, []);

  return {
    typingUsers,
    setTyping,
  };
}

// ============================================
// useOnlinePresence Hook
// ============================================

export function useOnlinePresence(
  conversationId: string | null,
  userId: string | null,
  displayName: string
): { onlineUsers: UserBasicInfo[] } {
  const [onlineUsers, setOnlineUsers] = useState<UserBasicInfo[]>([]);
  const messagingService = getMessagingService();

  useEffect(() => {
    if (!conversationId || !userId) {
      setOnlineUsers([]);
      return;
    }

    const unsubscribe = messagingService.subscribeToPresence(
      conversationId,
      userId,
      displayName,
      (online) => {
        const users: UserBasicInfo[] = online.map((o) => ({
          user_id: o.user_id,
          email: null,
          display_name: o.display_name,
          avatar_url: null,
        }));
        setOnlineUsers(users);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [conversationId, userId, displayName, messagingService]);

  return { onlineUsers };
}

// ============================================
// useChat Hook (Combined)
// ============================================

export function useChat(
  conversationId: string | null,
  userId: string | null,
  displayName: string,
  options?: UseMessagesOptions
): UseChatReturn {
  const messagesHook = useMessages(conversationId, userId, options);
  const typingHook = useTypingIndicator(conversationId, userId, displayName);
  const presenceHook = useOnlinePresence(conversationId, userId, displayName);

  return {
    ...messagesHook,
    ...typingHook,
    onlineUsers: presenceHook.onlineUsers,
  };
}

// ============================================
// useConversations Hook
// ============================================

export function useConversations(userId: string | null): UseConversationsReturn {
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);

  const mountedRef = useRef(true);
  // Use ref to avoid recreating supabase client on every render
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!userId) {
      console.log('[DM] useConversations: No userId, skipping load');
      setConversations([]);
      setIsLoading(false);
      return;
    }

    console.log('[DM] useConversations: Loading conversations for user:', userId);
    setIsLoading(true);
    setError(null);

    try {
      // Use the database function for efficient loading
      const { data, error: fetchError } = await supabase
        .rpc('get_dm_conversations_with_details', { p_user_id: userId });
      
      console.log('[DM] useConversations: RPC result:', { data, error: fetchError });

      if (!mountedRef.current) return;

      if (fetchError) {
        console.error('[DM] useConversations: Error fetching conversations:', fetchError);
        setError(fetchError.message);
        return;
      }

      console.log('[DM] useConversations: Processing', data?.length || 0, 'conversations');

      // Fetch participants for each conversation
      const conversationsWithParticipants = await Promise.all(
        (data || []).map(async (conv: Record<string, unknown>) => {
          const { data: participants } = await supabase
            .from('dm_conversation_participants')
            .select('*')
            .eq('conversation_id', conv.conversation_id);

          // Fetch user info for each participant
          const participantsWithUser = await Promise.all(
            (participants || []).map(async (p) => {
              const { data: userInfo } = await supabase
                .rpc('get_dm_user_info', { p_user_id: p.user_id });
              return {
                ...p,
                user: userInfo?.[0] || null,
              };
            })
          );

          // For direct chats, compute display name/image from the other participant
          const otherParticipant = participantsWithUser.find(
            (p) => p.user_id !== userId
          );

          return {
            id: conv.conversation_id,
            type: conv.conversation_type,
            group_name: conv.group_name,
            group_image_url: conv.group_image_url,
            created_by: null,
            created_at: conv.conversation_created_at,
            updated_at: conv.conversation_updated_at,
            participants: participantsWithUser || [],
            last_message: conv.last_message_content ? {
              id: '',
              conversation_id: conv.conversation_id as string,
              sender_id: conv.last_message_sender_id as string,
              content: conv.last_message_content as string,
              message_type: 'text' as const,
              media_url: null,
              media_thumbnail_url: null,
              media_metadata: null,
              status: 'sent' as const,
              reply_to_id: null,
              deleted_at: null,
              deleted_for_everyone: false,
              created_at: conv.last_message_at as string,
              edited_at: null,
              client_message_id: null,
            } : null,
            unread_count: conv.unread_count as number,
            display_name: conv.conversation_type === 'direct' && otherParticipant
              ? otherParticipant.user?.display_name || otherParticipant.user?.email || 'Unknown'
              : conv.group_name || 'Group Chat',
            display_image: conv.conversation_type === 'direct' && otherParticipant
              ? otherParticipant.user?.avatar_url
              : conv.group_image_url,
          } as ConversationWithDetails;
        })
      );

      if (!mountedRef.current) return;

      console.log('[DM] useConversations: Processed conversations:', conversationsWithParticipants);
      setConversations(conversationsWithParticipants);
      
      // Calculate total unread
      const total = conversationsWithParticipants.reduce(
        (sum, conv) => sum + (conv.unread_count || 0),
        0
      );
      setTotalUnreadCount(total);
      console.log('[DM] useConversations: Set', conversationsWithParticipants.length, 'conversations, total unread:', total);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : 'Failed to load conversations');
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [userId]); // supabase is a stable ref, no need to include

  // Initial load
  useEffect(() => {
    mountedRef.current = true;
    loadConversations();

    return () => {
      mountedRef.current = false;
    };
  }, [loadConversations]);

  // Create or find existing conversation
  const createConversation = useCallback(async (participantId: string): Promise<string> => {
    if (!userId) throw new Error('User not authenticated');

    // First check if conversation already exists
    const { data: existingConv } = await supabase
      .rpc('find_dm_direct_conversation', {
        p_user1_id: userId,
        p_user2_id: participantId,
      });

    if (existingConv) {
      return existingConv;
    }

    // Create new conversation
    const { data: newConv, error: createError } = await supabase
      .from('dm_conversations')
      .insert({
        type: 'direct',
        created_by: userId,
      })
      .select()
      .single();

    if (createError) throw createError;

    // Add both participants
    const { error: participantError } = await supabase
      .from('dm_conversation_participants')
      .insert([
        { conversation_id: newConv.id, user_id: userId, role: 'owner' },
        { conversation_id: newConv.id, user_id: participantId, role: 'member' },
      ]);

    if (participantError) throw participantError;

    // Refresh conversations list
    await loadConversations();

    return newConv.id;
  }, [userId, loadConversations]); // supabase is a stable ref

  return {
    conversations,
    isLoading,
    error,
    totalUnreadCount,
    createConversation,
    refreshConversations: loadConversations,
  };
}
