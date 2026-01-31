/**
 * Messaging System Types
 * 
 * Core types for the real-time messaging system.
 * Adapted for AI Matrx's users.matrix_id schema.
 */

// ============================================
// Database Types (matching migration schema)
// ============================================

export type ConversationType = 'direct' | 'group';
export type ParticipantRole = 'owner' | 'admin' | 'member';
export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'file' | 'system';
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface Conversation {
  id: string;
  type: ConversationType;
  group_name: string | null;
  group_image_url: string | null;
  created_by: string | null; // matrix_id
  created_at: string;
  updated_at: string;
}

export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  user_id: string; // matrix_id
  role: ParticipantRole;
  joined_at: string;
  last_read_at: string | null;
  is_muted: boolean;
  is_archived: boolean;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string; // matrix_id
  content: string;
  message_type: MessageType;
  media_url: string | null;
  media_thumbnail_url: string | null;
  media_metadata: Record<string, unknown> | null;
  status: MessageStatus;
  reply_to_id: string | null;
  deleted_at: string | null;
  deleted_for_everyone: boolean;
  created_at: string;
  edited_at: string | null;
  client_message_id: string | null;
}

// ============================================
// Extended Types with User Info
// ============================================

export interface UserBasicInfo {
  matrix_id: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  email: string | null;
  picture: string | null;
  preferred_picture: string | null;
}

export interface ConversationWithDetails extends Conversation {
  participants: ParticipantWithUser[];
  last_message?: MessageWithSender | null;
  unread_count: number;
  // Computed display values for direct chats
  display_name?: string;
  display_image?: string | null;
}

export interface ParticipantWithUser extends ConversationParticipant {
  user: UserBasicInfo;
}

export interface MessageWithSender extends Message {
  sender?: UserBasicInfo;
  reply_to?: Message | null;
}

// ============================================
// API Request/Response Types
// ============================================

export interface CreateConversationRequest {
  type?: ConversationType;
  participant_ids: string[]; // matrix_ids of other participants
  group_name?: string;
}

export interface CreateConversationResponse {
  success: boolean;
  data: { conversation_id: string };
  existing: boolean;
  msg: string;
}

export interface SendMessageRequest {
  conversation_id: string;
  content: string;
  message_type?: MessageType;
  media_url?: string;
  media_thumbnail_url?: string;
  media_metadata?: Record<string, unknown>;
  reply_to_id?: string;
  client_message_id: string;
}

export interface UpdateMessageRequest {
  content?: string;
  deleted?: boolean;
  deleted_for_everyone?: boolean;
}

export interface ConversationListResponse {
  success: boolean;
  data: ConversationWithDetails[];
  total: number;
  msg: string;
}

export interface MessagesListResponse {
  success: boolean;
  data: MessageWithSender[];
  msg: string;
}

// ============================================
// Real-time Event Types
// ============================================

export interface NewMessageEvent {
  type: 'new_message';
  message: Message;
}

export interface MessageUpdateEvent {
  type: 'message_update';
  message: Message;
}

export interface TypingEvent {
  user_id: string; // matrix_id
  conversation_id: string;
  is_typing: boolean;
  last_typed_at: number;
}

export interface PresenceState {
  [userId: string]: {
    online_at: string;
    user_id: string;
  }[];
}

// ============================================
// UI State Types
// ============================================

export interface MessagingState {
  isOpen: boolean;
  sheetWidth: number;
  currentConversationId: string | null;
  conversations: ConversationWithDetails[];
  unreadCounts: Record<string, number>;
  totalUnreadCount: number;
  isLoading: boolean;
  error: string | null;
}

export interface ChatState {
  messages: MessageWithSender[];
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  hasMore: boolean;
  typingUsers: string[]; // matrix_ids of users currently typing
  onlineUsers: string[]; // matrix_ids of users currently online
}

// ============================================
// Hook Return Types
// ============================================

export interface UseMessagesReturn {
  messages: MessageWithSender[];
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  hasMore: boolean;
  sendMessage: (content: string, options?: Partial<SendMessageRequest>) => Promise<void>;
  loadMoreMessages: () => Promise<void>;
  markAsRead: () => Promise<void>;
}

export interface UseTypingIndicatorReturn {
  typingUsers: UserBasicInfo[];
  setTyping: (isTyping: boolean) => void;
}

export interface UseChatReturn extends UseMessagesReturn, UseTypingIndicatorReturn {
  onlineUsers: UserBasicInfo[];
}

export interface UseConversationsReturn {
  conversations: ConversationWithDetails[];
  isLoading: boolean;
  error: string | null;
  totalUnreadCount: number;
  createConversation: (participantId: string) => Promise<string>;
  refreshConversations: () => Promise<void>;
}
