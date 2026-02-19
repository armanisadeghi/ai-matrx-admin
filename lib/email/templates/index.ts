/**
 * React Email Templates
 *
 * All email templates as React components. Use `renderTemplate()` from
 * `@/lib/email/render` to convert them to HTML for sending via Resend.
 */

export { BaseLayout } from "./BaseLayout";

// Onboarding
export { WelcomeEmail } from "./WelcomeEmail";

// Invitations
export {
  OrganizationInvitationEmail,
  ProjectInvitationEmail,
} from "./InvitationEmail";

// Notifications
export {
  TaskAssignedEmail,
  CommentAddedEmail,
  MessageReceivedEmail,
  DueDateReminderEmail,
} from "./NotificationEmail";

// Auth & Account
export {
  InvitationApprovedEmail,
  InvitationRejectedEmail,
  PasswordResetEmail,
} from "./AuthEmail";

// Sharing & Contact
export {
  ResourceSharedEmail,
  ContactFormNotificationEmail,
  ContactFormConfirmationEmail,
} from "./SharingEmail";

// Feedback System
export {
  FeedbackStatusEmail,
  FeedbackReviewEmail,
  FeedbackReplyEmail,
} from "./FeedbackEmail";
