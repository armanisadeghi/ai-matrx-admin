/**
 * MessagingService - Singleton service for real-time direct messaging
 * 
 * Handles:
 * - Channel management (creation, subscription, cleanup)
 * - Dual subscription: broadcast (immediate) + postgres_changes (reliable)
 * - Typing indicators via Presence API
 * - Online presence tracking
 * - Message sending with broadcast
 * 
 * Uses dm_ prefixed tables and auth.users.id UUIDs
 */

import { createClient } from '@/utils/supabase/client';
import type { RealtimeChannel, RealtimePresenceState } from '@supabase/supabase-js';
import type { Message, MessageType } from '@/features/messaging/types';

// ============================================
// Types
// ============================================

type MessageCallback = (message: Message) => void;
type TypingCallback = (typingUsers: TypingUser[]) => void;
type PresenceCallback = (onlineUsers: OnlineUser[]) => void;

interface TypingUser {
  user_id: string;
  display_name: string;
  is_typing: boolean;
  last_typed_at: number;
}

interface OnlineUser {
  user_id: string;
  display_name: string;
  online_at: number;
}

interface MessageInsert {
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type?: MessageType;
  media_url?: string;
  media_thumbnail_url?: string;
  media_metadata?: Record<string, unknown>;
  reply_to_id?: string;
  client_message_id?: string;
}

interface SendMessageOptions {
  messageType?: MessageType;
  mediaUrl?: string;
  mediaThumbnailUrl?: string;
  mediaMetadata?: Record<string, unknown>;
  replyToId?: string;
  clientMessageId?: string;
}

// ============================================
// MessagingService Class
// ============================================

export class MessagingService {
  private supabase = createClient();
  private channels = new Map<string, RealtimeChannel>();
  private subscribedChannels = new Set<string>();
  private messageHandlersAdded = new Set<string>();

  /**
   * Get supabase client (allows for refresh)
   */
  private getSupabase() {
    return this.supabase;
  }

  /**
   * Get or create a channel for a conversation
   * Reuses existing channels to avoid duplicate subscriptions
   */
  private getOrCreateChannel(conversationId: string): RealtimeChannel {
    const channelName = `dm:${conversationId}`;

    // Return existing channel if it exists
    if (this.channels.has(channelName)) {
      const existing = this.channels.get(channelName)!;
      console.log(`[DM] Reusing existing channel: ${channelName}`);
      return existing;
    }

    console.log(`[DM] Creating new channel: ${channelName}`);
    const channel = this.supabase.channel(channelName, {
      config: {
        presence: {
          key: conversationId,
        },
      },
    });

    this.channels.set(channelName, channel);
    return channel;
  }

  /**
   * Remove a channel and clean up all tracking
   */
  removeChannel(conversationId: string): void {
    const channelName = `dm:${conversationId}`;
    const channel = this.channels.get(channelName);

    if (channel) {
      const client = this.getSupabase();
      client.removeChannel(channel);
      this.channels.delete(channelName);
      this.subscribedChannels.delete(channelName);
      this.messageHandlersAdded.delete(`msg:${conversationId}`);
      console.log(`[DM] Removed channel: ${channelName}`);
    }
  }

  /**
   * Remove all channels (call on logout)
   */
  removeAllChannels(): void {
    const client = this.getSupabase();
    this.channels.forEach((channel, name) => {
      client.removeChannel(channel);
      console.log(`[DM] Removed channel: ${name}`);
    });
    this.channels.clear();
    this.subscribedChannels.clear();
    this.messageHandlersAdded.clear();
  }

  // ============================================
  // Message Subscription
  // ============================================

  /**
   * Subscribe to messages in a conversation
   * Uses dual subscription: broadcast (immediate) + postgres_changes (reliable)
   * 
   * @returns Unsubscribe function
   */
  subscribeToMessages(
    conversationId: string,
    onMessage: MessageCallback
  ): () => void {
    const channelName = `dm:${conversationId}`;
    const channel = this.getOrCreateChannel(conversationId);

    // Prevent duplicate handlers
    const handlersKey = `msg:${conversationId}`;
    if (this.messageHandlersAdded.has(handlersKey)) {
      console.log(`[DM] Message handlers already added for ${channelName}, skipping`);
      return () => {
        this.messageHandlersAdded.delete(handlersKey);
        this.removeChannel(conversationId);
      };
    }

    console.log(`[DM] Setting up message subscription for ${channelName}`);
   this.messageHandlersAdded.add(handlersKey);

    // Check if channel is already subscribed BEFORE adding handlers
    const isAlreadySubscribed = this.subscribedChannels.has(channelName);
    
    if (isAlreadySubscribed) {
      console.warn(`[DM] Channel ${channelName} already subscribed! This should not happen.`);
      // Don't add handlers to an already-subscribed channel
      return () => {
        this.messageHandlersAdded.delete(handlersKey);
        this.removeChannel(conversationId);
      };
    }

    // Add all handlers BEFORE subscribing
    // 1. BROADCAST subscription (immediate delivery from sender)
    channel.on(
      'broadcast',
      { event: 'new_message' },
      (payload) => {
        console.log(`[DM] Broadcast message received:`, payload.payload?.id);
        if (payload.payload) {
          onMessage(payload.payload as Message);
        }
      }
    );

    // 2. POSTGRES_CHANGES subscription for INSERT (messages from other participants)
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'dm_messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        console.log(`[DM] postgres_changes INSERT received:`, payload.new.id);
        onMessage(payload.new as Message);
      }
    );

    // 3. POSTGRES_CHANGES subscription for UPDATE (edits, deletes, status changes)
    channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'dm_messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        console.log(`[DM] postgres_changes UPDATE received:`, payload.new.id);
        onMessage(payload.new as Message);
      }
    );

    // Now subscribe (all handlers added above)
    console.log(`[DM] Subscribing to ${channelName}...`);
    channel.subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        console.log(`[DM] ✓ Successfully subscribed to ${channelName}`);
        this.subscribedChannels.add(channelName);
      } else if (status === 'CHANNEL_ERROR') {
        console.error(`[DM] ✗ Channel error for ${channelName}:`, err);
        this.subscribedChannels.delete(channelName);
      } else if (status === 'TIMED_OUT') {
        console.error(`[DM] ✗ Channel timed out for ${channelName}`);
        this.subscribedChannels.delete(channelName);
      } else if (status === 'CLOSED') {
        console.log(`[DM] Channel closed for ${channelName}`);
        this.subscribedChannels.delete(channelName);
      } else {
        console.log(`[DM] Channel status: ${status} for ${channelName}`);
      }
    });

    // Return unsubscribe function
    return () => {
      this.messageHandlersAdded.delete(handlersKey);
      this.removeChannel(conversationId);
    };
  }

  // ============================================
  // Send Message
  // ============================================

  /**
   * Send a message to a conversation
   * Inserts to database and broadcasts for immediate delivery
   */
  async sendMessage(
    conversationId: string,
    senderId: string,
    content: string,
    options?: SendMessageOptions
  ): Promise<Message> {
    // Generate client-side ID for deduplication if not provided
    const clientMessageId = options?.clientMessageId ||
      `${senderId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const messageData: MessageInsert = {
      conversation_id: conversationId,
      sender_id: senderId,
      content: content.trim(),
      message_type: options?.messageType || 'text',
      media_url: options?.mediaUrl,
      media_thumbnail_url: options?.mediaThumbnailUrl,
      media_metadata: options?.mediaMetadata,
      reply_to_id: options?.replyToId,
      client_message_id: clientMessageId,
    };

    // 1. INSERT to database
    const supabase = this.getSupabase();
    const { data, error } = await supabase
      .from('dm_messages')
      .insert(messageData)
      .select()
      .single();

    if (error) {
      console.error('[DM] Failed to send message:', error);
      throw error;
    }

    // 2. BROADCAST to channel subscribers for immediate delivery
    const channelName = `dm:${conversationId}`;
    const channel = this.channels.get(channelName);
    const isChannelSubscribed = this.subscribedChannels.has(channelName);

    if (channel && isChannelSubscribed) {
      try {
        const result = await channel.send({
          type: 'broadcast',
          event: 'new_message',
          payload: data as Message,
        });
        console.log(`[DM] Broadcast sent to ${channelName}, result:`, result);
      } catch (err) {
        console.error(`[DM] Broadcast failed for ${channelName}:`, err);
        // Don't throw - message is already saved in DB
      }
    }

    return data as Message;
  }

  // ============================================
  // Typing Indicators
  // ============================================

  /**
   * Subscribe to typing indicators in a conversation
   * Uses Presence API for real-time typing status
   */
  subscribeToTyping(
    conversationId: string,
    currentUserId: string,
    displayName: string,
    onTypingUpdate: TypingCallback
  ): {
    setTyping: (isTyping: boolean) => void;
    unsubscribe: () => void;
  } {
    const channelName = `dm:${conversationId}`;
    const channel = this.getOrCreateChannel(conversationId);
    let typingTimeout: ReturnType<typeof setTimeout> | null = null;

    console.log(`[DM] Setting up typing subscription for ${channelName}`);

    // Check if channel is already subscribed
    const isAlreadySubscribed = this.subscribedChannels.has(channelName);
    
    // Add presence handler (safe to add multiple times, Supabase deduplicates)
    channel.on('presence', { event: 'sync' }, () => {
      const presenceState = channel.presenceState() as RealtimePresenceState<TypingUser>;
      const typingUsers: TypingUser[] = [];

      // Extract typing users from presence state
      Object.values(presenceState).forEach((presences) => {
        presences.forEach((presence: TypingUser) => {
          if (presence.is_typing && presence.user_id !== currentUserId) {
            // Only show typing if it was recent (within 5 seconds)
            const isRecent = Date.now() - presence.last_typed_at < 5000;
            if (isRecent) {
              typingUsers.push({
                user_id: presence.user_id,
                display_name: presence.display_name,
                is_typing: true,
                last_typed_at: presence.last_typed_at,
              });
            }
          }
        });
      });

      onTypingUpdate(typingUsers);
    });

    // Subscribe if not already subscribed
    if (!isAlreadySubscribed) {
      console.log(`[DM] Subscribing to ${channelName} for typing...`);
      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[DM] ✓ Typing channel subscribed: ${channelName}`);
          this.subscribedChannels.add(channelName);
          // Track own presence (initially not typing)
          await channel.track({
            user_id: currentUserId,
            display_name: displayName,
            is_typing: false,
            last_typed_at: Date.now(),
          });
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`[DM] ✗ Typing channel error for ${channelName}`);
        } else if (status === 'TIMED_OUT') {
          console.error(`[DM] ✗ Typing channel timed out for ${channelName}`);
        }
      });
    } else {
      // Channel already subscribed, just track presence
      console.log(`[DM] Channel ${channelName} already subscribed, tracking presence only`);
      channel.track({
        user_id: currentUserId,
        display_name: displayName,
        is_typing: false,
        last_typed_at: Date.now(),
      });
    }

    // Function to update typing status
    const setTyping = async (isTyping: boolean) => {
      // Clear existing timeout
      if (typingTimeout) {
        clearTimeout(typingTimeout);
        typingTimeout = null;
      }

      // Update presence
      await channel.track({
        user_id: currentUserId,
        display_name: displayName,
        is_typing: isTyping,
        last_typed_at: Date.now(),
      });

      // Auto-stop typing after 3 seconds of no input
      if (isTyping) {
        typingTimeout = setTimeout(() => {
          channel.track({
            user_id: currentUserId,
            display_name: displayName,
            is_typing: false,
            last_typed_at: Date.now(),
          });
        }, 3000);
      }
    };

    // Return controls
    return {
      setTyping,
      unsubscribe: () => {
        if (typingTimeout) {
          clearTimeout(typingTimeout);
        }
        channel.track({
          user_id: currentUserId,
          display_name: displayName,
          is_typing: false,
          last_typed_at: Date.now(),
        });
      },
    };
  }

  // ============================================
  // Online Presence
  // ============================================

  /**
   * Subscribe to online presence in a conversation
   * Tracks who is currently viewing the conversation
   */
  subscribeToPresence(
    conversationId: string,
    currentUserId: string,
    displayName: string,
    onPresenceUpdate: PresenceCallback
  ): () => void {
    const channelName = `dm_presence:${conversationId}`;
    
    // Create a separate presence channel (not the message channel)
    let channel = this.channels.get(channelName);
    if (!channel) {
      channel = this.supabase.channel(channelName, {
        config: {
          presence: {
            key: currentUserId,
          },
        },
      });
      this.channels.set(channelName, channel);
    }

    // Listen to presence sync events
    channel.on('presence', { event: 'sync' }, () => {
      const presenceState = channel!.presenceState() as RealtimePresenceState<OnlineUser>;
      const onlineUsers: OnlineUser[] = [];

      Object.values(presenceState).forEach((presences) => {
        (presences as OnlineUser[]).forEach((presence) => {
          if (presence.user_id !== currentUserId) {
            onlineUsers.push({
              user_id: presence.user_id,
              display_name: presence.display_name,
              online_at: presence.online_at,
            });
          }
        });
      });

      onPresenceUpdate(onlineUsers);
    });

    // Subscribe and track presence
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        this.subscribedChannels.add(channelName);
        await channel!.track({
          user_id: currentUserId,
          display_name: displayName,
          online_at: Date.now(),
        });
      }
    });

    // Return unsubscribe function
    return () => {
      if (channel) {
        channel.untrack();
        this.getSupabase().removeChannel(channel);
        this.channels.delete(channelName);
        this.subscribedChannels.delete(channelName);
      }
    };
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Check if a channel is currently subscribed
   */
  isSubscribed(conversationId: string): boolean {
    const channelName = `dm:${conversationId}`;
    return this.subscribedChannels.has(channelName);
  }

  /**
   * Get all active channel names
   */
  getActiveChannels(): string[] {
    return Array.from(this.subscribedChannels);
  }

  /**
   * Mark conversation as read
   * Updates last_read_at in dm_conversation_participants
   */
  async markConversationAsRead(
    conversationId: string,
    userId: string
  ): Promise<void> {
    const supabase = this.getSupabase();
    const { error } = await supabase
      .from('dm_conversation_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);

    if (error) {
      console.error('[DM] Failed to mark conversation as read:', error);
      throw error;
    }
  }
}

// ============================================
// Singleton Instance
// ============================================

let messagingServiceInstance: MessagingService | null = null;

/**
 * Get the MessagingService singleton instance
 */
export function getMessagingService(): MessagingService {
  if (!messagingServiceInstance) {
    messagingServiceInstance = new MessagingService();
  }
  return messagingServiceInstance;
}

/**
 * Reset the MessagingService (call on logout)
 */
export function resetMessagingService(): void {
  if (messagingServiceInstance) {
    messagingServiceInstance.removeAllChannels();
    messagingServiceInstance = null;
  }
}
