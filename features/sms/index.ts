/**
 * SMS Feature - Barrel Exports
 *
 * SMS/MMS integration via Twilio.
 * Uses sms_ prefixed tables and auth.users.id (UUID).
 */

// Types
export type {
  SmsDirection,
  SmsMessageStatus,
  SmsConversationType,
  SmsConversationStatus,
  SmsSentByType,
  SmsConsentStatus,
  SmsNotificationType,
  SmsPhoneNumber,
  SmsConversation,
  SmsMessage,
  SmsNotificationPreferences,
  SendSmsRequest,
  SendSmsResponse,
  SmsConversationListResponse,
  SmsMessageListResponse,
  VerifyPhoneRequest,
  UpdatePreferencesRequest,
  SmsState,
  SmsAnalytics,
  AdminSendRequest,
} from './types';

// Redux Actions
export {
  setLoading,
  setSending,
  setError,
  setConversations,
  updateConversation,
  setCurrentConversation,
  markConversationRead,
  setMessages,
  appendMessage,
  updateMessageStatus,
  setPreferences,
  setPhoneNumbers,
  resetSms,
} from './redux/smsSlice';

// Redux Selectors
export {
  selectSmsConversations,
  selectSmsCurrentConversationId,
  selectSmsMessages,
  selectSmsPreferences,
  selectSmsPhoneNumbers,
  selectSmsIsLoading,
  selectSmsIsSending,
  selectSmsError,
  selectSmsTotalConversations,
  selectSmsUnreadTotal,
  selectSmsCurrentConversation,
} from './redux/smsSlice';
