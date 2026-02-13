/**
 * SMS Service - Barrel Exports
 *
 * Server-side SMS service layer. Never import in client components.
 */

// Client
export { getTwilioClient, getMessagingServiceSid, getVerifyServiceSid, getAppBaseUrl } from './client';

// Types
export type {
  SendSmsOptions,
  SendSmsResult,
  InboundSmsPayload,
  StatusCallbackPayload,
  TwilioMediaAttachment,
  PhoneNumberPurchaseOptions,
  PhoneNumberInfo,
  VerificationResult,
  SmsDirection,
  SmsStatus,
  ConversationType,
  NotificationType,
} from './types';

// Sending
export { sendSms, sendAndLogSms, sendNotificationSms } from './send';

// Receiving
export { processInboundSms, findOrCreateConversation, extractMediaAttachments, isPhoneNumberOptedOut } from './receive';

// Verification
export { sendVerification, checkVerification } from './verify';

// Phone Numbers
export {
  searchAvailableNumbers,
  purchasePhoneNumber,
  assignPhoneNumberToUser,
  releasePhoneNumber,
  listPhoneNumbers,
  updateAllWebhookUrls,
} from './numbers';

// Validation
export { validateTwilioSignature, validateTwilioWebhook } from './validate';

// Notification Service
export {
  sendDmNotificationSms,
  sendTaskAssignmentSms,
  sendDueDateReminderSms,
  sendJobCompletionSms,
  sendSystemAlertSms,
  sendAdminMessageSms,
} from './notificationService';
