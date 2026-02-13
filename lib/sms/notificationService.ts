/**
 * SMS Notification Service
 *
 * High-level notification functions that mirror the email notification
 * service pattern (lib/email/notificationService.ts).
 * Each function checks user preferences before sending.
 */

import { sendNotificationSms } from './send';

interface NotificationResult {
  success: boolean;
  message: string;
  skipped?: boolean;
  error?: string;
}

/**
 * Send a DM notification via SMS (when user is offline).
 */
export async function sendDmNotificationSms(options: {
  recipientId: string;
  senderName: string;
  messagePreview: string;
  conversationId: string;
}): Promise<NotificationResult> {
  const { recipientId, senderName, messagePreview, conversationId } = options;

  const preview = messagePreview.length > 100
    ? messagePreview.substring(0, 100) + '...'
    : messagePreview;

  const result = await sendNotificationSms({
    userId: recipientId,
    body: `New message from ${senderName}: "${preview}"\n\nReply to this text or open the app to respond.`,
    notificationType: 'dm_notification',
    referenceType: 'dm_conversation',
    referenceId: conversationId,
    category: 'transactional',
  });

  if (result.success) {
    return { success: true, message: 'DM notification SMS sent' };
  }

  return {
    success: false,
    message: 'Failed to send DM notification SMS',
    error: result.error,
    skipped: result.error?.includes('not enabled') || result.error?.includes('not consented'),
  };
}

/**
 * Send a task assignment notification via SMS.
 */
export async function sendTaskAssignmentSms(options: {
  assigneeId: string;
  assignerName: string;
  taskTitle: string;
  taskId: string;
}): Promise<NotificationResult> {
  const { assigneeId, assignerName, taskTitle, taskId } = options;

  const result = await sendNotificationSms({
    userId: assigneeId,
    body: `${assignerName} assigned you a task: "${taskTitle}"\n\nOpen the app to view details.`,
    notificationType: 'task_assignment',
    referenceType: 'task',
    referenceId: taskId,
    category: 'transactional',
  });

  if (result.success) {
    return { success: true, message: 'Task assignment SMS sent' };
  }

  return {
    success: false,
    message: 'Failed to send task assignment SMS',
    error: result.error,
    skipped: result.error?.includes('not enabled') || result.error?.includes('not consented'),
  };
}

/**
 * Send a due date reminder via SMS.
 */
export async function sendDueDateReminderSms(options: {
  userId: string;
  taskTitle: string;
  taskId: string;
  dueDate: Date;
  urgency: 'upcoming' | 'due_today' | 'overdue';
}): Promise<NotificationResult> {
  const { userId, taskTitle, taskId, dueDate, urgency } = options;

  const urgencyLabel = {
    upcoming: 'is due soon',
    due_today: 'is due today',
    overdue: 'is overdue',
  }[urgency];

  const dateStr = dueDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  const result = await sendNotificationSms({
    userId,
    body: `Reminder: "${taskTitle}" ${urgencyLabel} (${dateStr}).\n\nOpen the app to take action.`,
    notificationType: 'task_due_date',
    referenceType: 'task',
    referenceId: taskId,
    category: 'transactional',
  });

  if (result.success) {
    return { success: true, message: 'Due date reminder SMS sent' };
  }

  return {
    success: false,
    message: 'Failed to send due date reminder SMS',
    error: result.error,
    skipped: result.error?.includes('not enabled') || result.error?.includes('not consented'),
  };
}

/**
 * Send a job completion notification via SMS.
 */
export async function sendJobCompletionSms(options: {
  userId: string;
  jobTitle: string;
  jobId: string;
  status: 'completed' | 'failed';
}): Promise<NotificationResult> {
  const { userId, jobTitle, jobId, status } = options;

  const statusText = status === 'completed'
    ? 'has completed successfully'
    : 'has failed';

  const result = await sendNotificationSms({
    userId,
    body: `Your job "${jobTitle}" ${statusText}.\n\nOpen the app to view results.`,
    notificationType: 'job_complete',
    referenceType: 'job',
    referenceId: jobId,
    category: 'transactional',
  });

  if (result.success) {
    return { success: true, message: 'Job completion SMS sent' };
  }

  return {
    success: false,
    message: 'Failed to send job completion SMS',
    error: result.error,
    skipped: result.error?.includes('not enabled') || result.error?.includes('not consented'),
  };
}

/**
 * Send a system alert via SMS (bypasses quiet hours for critical alerts).
 */
export async function sendSystemAlertSms(options: {
  userId: string;
  alertTitle: string;
  alertBody: string;
  alertId?: string;
}): Promise<NotificationResult> {
  const { userId, alertTitle, alertBody, alertId } = options;

  const result = await sendNotificationSms({
    userId,
    body: `[ALERT] ${alertTitle}\n\n${alertBody}`,
    notificationType: 'system_alert',
    referenceType: 'alert',
    referenceId: alertId,
    category: 'system',
  });

  if (result.success) {
    return { success: true, message: 'System alert SMS sent' };
  }

  return {
    success: false,
    message: 'Failed to send system alert SMS',
    error: result.error,
  };
}

/**
 * Send an admin message to a user via SMS.
 */
export async function sendAdminMessageSms(options: {
  userId: string;
  message: string;
  adminUserId: string;
}): Promise<NotificationResult> {
  const { userId, message, adminUserId } = options;

  const result = await sendNotificationSms({
    userId,
    body: `Message from AI Matrx team:\n\n${message}`,
    notificationType: 'admin_message',
    referenceType: 'admin_user',
    referenceId: adminUserId,
    category: 'transactional',
  });

  if (result.success) {
    return { success: true, message: 'Admin message SMS sent' };
  }

  return {
    success: false,
    message: 'Failed to send admin message SMS',
    error: result.error,
  };
}
