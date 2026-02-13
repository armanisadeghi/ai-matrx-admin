/**
 * SMS Feature Types
 *
 * Client-side types for the SMS feature module.
 * Tables prefixed with sms_ to avoid conflicts.
 */

// ============================================
// Database Types (matching sms_ schema)
// ============================================

export type SmsDirection = 'inbound' | 'outbound';
export type SmsMessageStatus = 'queued' | 'accepted' | 'sending' | 'sent' | 'delivered' | 'undelivered' | 'failed' | 'received' | 'read';
export type SmsConversationType = 'user_initiated' | 'system_initiated' | 'ai_agent' | 'admin' | 'notification';
export type SmsConversationStatus = 'active' | 'closed' | 'blocked';
export type SmsSentByType = 'user' | 'system' | 'ai_agent' | 'admin' | 'notification' | 'auto_reply';
export type SmsConsentStatus = 'opted_in' | 'opted_out' | 'pending';
export type SmsNotificationType = 'dm_notification' | 'task_assignment' | 'task_due_date' | 'job_complete' | 'system_alert' | 'verification' | 'marketing' | 'ai_agent_response' | 'admin_message' | 'custom';

export interface SmsPhoneNumber {
  id: string;
  user_id: string | null;
  phone_number: string;
  twilio_sid: string;
  friendly_name: string | null;
  capabilities: { sms: boolean; mms: boolean; voice: boolean };
  number_type: 'local' | 'toll_free' | 'short_code';
  is_active: boolean;
  assigned_at: string | null;
  released_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface SmsConversation {
  id: string;
  user_id: string | null;
  external_phone_number: string;
  our_phone_number: string;
  status: SmsConversationStatus;
  conversation_type: SmsConversationType;
  ai_agent_id: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
  last_message_direction: SmsDirection | null;
  message_count: number;
  unread_count: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface SmsMessage {
  id: string;
  conversation_id: string;
  twilio_sid: string | null;
  direction: SmsDirection;
  from_number: string;
  to_number: string;
  body: string | null;
  status: SmsMessageStatus;
  error_code: string | null;
  error_message: string | null;
  num_segments: number;
  price: number | null;
  price_unit: string;
  num_media: number;
  media_urls: string[];
  media_content_types: string[];
  sent_by_user_id: string | null;
  sent_by_type: SmsSentByType;
  ai_processed: boolean;
  ai_response_id: string | null;
  ai_processing_status: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface SmsNotificationPreferences {
  id: string;
  user_id: string;
  phone_number: string | null;
  sms_enabled: boolean;
  dm_notifications: boolean;
  task_notifications: boolean;
  job_completion_notifications: boolean;
  system_alerts: boolean;
  marketing_messages: boolean;
  ai_agent_messages: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  timezone: string;
  max_messages_per_hour: number;
  max_messages_per_day: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ============================================
// API Request/Response Types
// ============================================

export interface SendSmsRequest {
  to: string;
  message: string;
  conversationId?: string;
  mediaUrl?: string[];
}

export interface SendSmsResponse {
  success: boolean;
  msg: string;
  data?: { sid: string; conversationId: string };
  error?: string;
}

export interface SmsConversationListResponse {
  success: boolean;
  msg: string;
  data: SmsConversation[];
  total: number;
}

export interface SmsMessageListResponse {
  success: boolean;
  msg: string;
  data: SmsMessage[];
  total: number;
}

export interface VerifyPhoneRequest {
  action: 'send' | 'check';
  phoneNumber: string;
  code?: string;
}

export interface UpdatePreferencesRequest {
  phone_number?: string;
  sms_enabled?: boolean;
  dm_notifications?: boolean;
  task_notifications?: boolean;
  job_completion_notifications?: boolean;
  system_alerts?: boolean;
  marketing_messages?: boolean;
  ai_agent_messages?: boolean;
  quiet_hours_enabled?: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  timezone?: string;
}

// ============================================
// UI State Types
// ============================================

export interface SmsState {
  conversations: SmsConversation[];
  currentConversationId: string | null;
  messages: Record<string, SmsMessage[]>;
  preferences: SmsNotificationPreferences | null;
  phoneNumbers: SmsPhoneNumber[];
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  totalConversations: number;
  unreadTotal: number;
}

// ============================================
// Admin Types
// ============================================

export interface SmsAnalytics {
  period_days: number;
  total_messages: number;
  inbound_messages: number;
  outbound_messages: number;
  failed_messages: number;
  active_conversations: number;
}

export interface AdminSendRequest {
  action: 'send_to_user' | 'send_to_number';
  userId?: string;
  phoneNumber?: string;
  message: string;
  conversationId?: string;
}
