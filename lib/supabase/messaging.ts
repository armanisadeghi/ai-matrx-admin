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
  private subscribingChannels = new Set<string>();
  private channelRefCount = new Map<string, number>();
  private subscribeCallbacks = new Map<string, Array<() => void>>();
  private messageHandlersAdded = new Set<string>();
  // Typing callback registry - allows updating callbacks without recreating channels
  private typingCallbacks = new Map<string, Map<string, TypingCallback>>();

  constructor() {
    this.supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.error('[DM] Auth error:', error);
      }
    });
  }

  /**
   * Subscribe to a channel (only once) and call callback when subscribed
   */
  private ensureChannelSubscribed(
    channelName: string,
    channel: RealtimeChannel,
    onSubscribed?: () => void
  ): void {
    // Increment ref count
    const currentCount = this.channelRefCount.get(channelName) || 0;
    this.channelRefCount.set(channelName, currentCount + 1);

    // Already subscribed - call callback immediately
    if (this.subscribedChannels.has(channelName)) {
      onSubscribed?.();
      return;
    }

    // Currently subscribing - queue the callback
    if (this.subscribingChannels.has(channelName)) {
      if (onSubscribed) {
        const callbacks = this.subscribeCallbacks.get(channelName) || [];
        callbacks.push(onSubscribed);
        this.subscribeCallbacks.set(channelName, callbacks);
      }
      return;
    }

    // Start subscribing
    this.subscribingChannels.add(channelName);
    
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        this.subscribedChannels.add(channelName);
        this.subscribingChannels.delete(channelName);
        
        // Call immediate callback
        onSubscribed?.();
        
        // Call all queued callbacks
        const callbacks = this.subscribeCallbacks.get(channelName) || [];
        callbacks.forEach(cb => cb());
        this.subscribeCallbacks.delete(channelName);
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.error(`[DM] Channel error: ${status}`);
        this.subscribedChannels.delete(channelName);
        this.subscribingChannels.delete(channelName);
        this.subscribeCallbacks.delete(channelName);
      }
      // Note: Don't handle CLOSED here - it's expected during cleanup
    });
  }

  /**
   * Decrement ref count and only remove channel when count reaches 0
   */
  private releaseChannel(conversationId: string): void {
    const channelName = `conversation:${conversationId}`;
    const currentCount = this.channelRefCount.get(channelName) || 0;
    
    if (currentCount <= 1) {
      // Last reference - actually remove the channel
      this.channelRefCount.delete(channelName);
      const channel = this.channels.get(channelName);
      if (channel) {
        this.supabase.removeChannel(channel);
        this.channels.delete(channelName);
        this.subscribedChannels.delete(channelName);
        this.subscribingChannels.delete(channelName);
      }
    } else {
      // Other references still exist - just decrement
      this.channelRefCount.set(channelName, currentCount - 1);
    }
  }

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
    const channelName = `conversation:${conversationId}`;

    if (this.channels.has(channelName)) {
      return this.channels.get(channelName)!;
    }

    // Create channel with presence config - REQUIRED for typing indicators
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
   * Remove all channels (call on logout)
   */
  removeAllChannels(): void {
    this.channels.forEach((channel) => {
      this.supabase.removeChannel(channel);
    });
    this.channels.clear();
    this.subscribedChannels.clear();
    this.subscribingChannels.clear();
    this.subscribeCallbacks.clear();
    this.channelRefCount.clear();
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
    const channelName = `conversation:${conversationId}`;
    const channel = this.getOrCreateChannel(conversationId);
    const handlersKey = `msg:${conversationId}`;

    // Prevent duplicate handlers - but still increment ref count
    if (this.messageHandlersAdded.has(handlersKey)) {
      const count = this.channelRefCount.get(channelName) || 0;
      this.channelRefCount.set(channelName, count + 1);
      return () => this.releaseChannel(conversationId);
    }

    this.messageHandlersAdded.add(handlersKey);

    // BROADCAST subscription (immediate delivery)
    channel.on('broadcast', { event: 'new_message' }, (payload) => {
      if (payload.payload) {
        const msg = payload.payload as Message;
        console.log(`[DM] 📥 Received message: "${msg.content?.substring(0, 30)}..."`);
        onMessage(msg);
      }
    });

    // POSTGRES_CHANGES for INSERT
    channel.on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'dm_messages',
      filter: `conversation_id=eq.${conversationId}`,
    }, (payload) => {
      const msg = payload.new as Message;
      console.log(`[DM] 📥 Received message (DB): "${msg.content?.substring(0, 30)}..."`);
      onMessage(msg);
    });

    // POSTGRES_CHANGES for UPDATE
    channel.on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'dm_messages',
      filter: `conversation_id=eq.${conversationId}`,
    }, (payload) => {
      onMessage(payload.new as Message);
    });

    // Subscribe channel
    this.ensureChannelSubscribed(channelName, channel);

    return () => {
      this.messageHandlersAdded.delete(handlersKey);
      this.releaseChannel(conversationId);
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

    console.log(`[DM] 📤 Sent message: "${content.substring(0, 30)}..."`);

    // BROADCAST to channel subscribers for immediate delivery
    const channelName = `conversation:${conversationId}`;
    const channel = this.channels.get(channelName);
    const isChannelSubscribed = this.subscribedChannels.has(channelName);

    if (channel && isChannelSubscribed) {
      try {
        await channel.send({
          type: 'broadcast',
          event: 'new_message',
          payload: data as Message,
        });
      } catch (err) {
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
   * Uses a DEDICATED presence channel to ensure handlers are attached before subscribe
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
    // Use a SEPARATE channel for presence to ensure handlers are attached before subscribe
    const presenceChannelName = `typing:${conversationId}`;
    let typingTimeout: ReturnType<typeof setTimeout> | null = null;
    
    // Generate a unique subscriber ID for this hook instance
    const subscriberId = `${currentUserId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    
    // Initialize callback registry for this channel if needed
    if (!this.typingCallbacks.has(presenceChannelName)) {
      this.typingCallbacks.set(presenceChannelName, new Map());
    }
    
    // Register this subscriber's callback
    this.typingCallbacks.get(presenceChannelName)!.set(subscriberId, onTypingUpdate);
    
    // Check if we already have this presence channel
    let presenceChannel = this.channels.get(presenceChannelName);
    
    if (!presenceChannel) {
      // Create a NEW channel specifically for presence
      presenceChannel = this.supabase.channel(presenceChannelName, {
        config: {
          presence: {
            key: conversationId,
          },
        },
      });
      this.channels.set(presenceChannelName, presenceChannel);
      
      // Attach handlers BEFORE subscribing (this is crucial!)
      // Use callback registry so all subscribers get updates
      presenceChannel.on('presence', { event: 'sync' }, () => {
        const presenceState = presenceChannel!.presenceState() as RealtimePresenceState<TypingUser>;
        const typingUsers: TypingUser[] = [];

        Object.values(presenceState).forEach((presences) => {
          (presences as TypingUser[]).forEach((presence) => {
            // Filter out own typing and check if recent
            if (presence.is_typing && presence.user_id !== currentUserId) {
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

        if (typingUsers.length > 0) {
          console.log(`[DM] ⌨️ Received typing: ${typingUsers.map(u => u.display_name).join(', ')}`);
        }

        // Call ALL registered callbacks for this channel
        const callbacks = this.typingCallbacks.get(presenceChannelName);
        if (callbacks) {
          callbacks.forEach((callback) => callback(typingUsers));
        }
      });

      // NOW subscribe (after handlers are attached)
      presenceChannel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track initial presence
          await presenceChannel!.track({
            user_id: currentUserId,
            display_name: displayName,
            is_typing: false,
            last_typed_at: Date.now(),
          });
        }
      });
    } else {
      // Channel exists, just track presence
      presenceChannel.track({
        user_id: currentUserId,
        display_name: displayName,
        is_typing: false,
        last_typed_at: Date.now(),
      });
    }

    // Function to broadcast typing status
    const channel = presenceChannel; // Capture reference
    const setTyping = async (isTyping: boolean) => {
      if (typingTimeout) {
        clearTimeout(typingTimeout);
        typingTimeout = null;
      }

      if (isTyping) {
        console.log(`[DM] ⌨️ Broadcasting typing...`);
      }

      await channel.track({
        user_id: currentUserId,
        display_name: displayName,
        is_typing: isTyping,
        last_typed_at: Date.now(),
      });

      // Auto-stop after 3 seconds
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

    return {
      setTyping,
      unsubscribe: () => {
        if (typingTimeout) {
          clearTimeout(typingTimeout);
        }
        // Set typing to false
        channel.track({
          user_id: currentUserId,
          display_name: displayName,
          is_typing: false,
          last_typed_at: Date.now(),
        });
        // Remove this subscriber's callback from the registry
        const callbacks = this.typingCallbacks.get(presenceChannelName);
        if (callbacks) {
          callbacks.delete(subscriberId);
          // Clean up empty callback maps
          if (callbacks.size === 0) {
            this.typingCallbacks.delete(presenceChannelName);
          }
        }
        // Note: Don't remove the channel here - other instances might be using it
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
    const channelName = `presence:${conversationId}`;
    
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
