import { sendEmail } from './client';
import { notificationTemplates } from './exportService';
import { createAdminClient } from '@/utils/supabase/adminClient';

/**
 * Email Notification Service
 * Handles sending notification emails with preference checking
 */

interface NotificationResult {
  success: boolean;
  message: string;
  skipped?: boolean;
  error?: string;
}

/**
 * Get user's email preferences
 */
async function getUserEmailPreferences(userId: string): Promise<Record<string, boolean> | null> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('user_email_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      // If no preferences found, return defaults (all enabled except marketing)
      if (error.code === 'PGRST116') {
        return {
          sharing_notifications: true,
          organization_invitations: true,
          resource_updates: true,
          marketing_emails: false,
          weekly_digest: true,
          task_notifications: true,
          comment_notifications: true,
          message_notifications: true,
          message_digest: false,
        };
      }
      console.error('Error fetching email preferences:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Exception fetching email preferences:', error);
    return null;
  }
}

/**
 * Get user details (email, name)
 */
async function getUserDetails(userId: string): Promise<{ email: string; name: string } | null> {
  try {
    const supabase = createAdminClient();
    
    // First try to get from user_profiles
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('email, full_name, display_name')
      .eq('user_id', userId)
      .single();

    if (profile?.email) {
      return {
        email: profile.email,
        name: profile.display_name || profile.full_name || 'User',
      };
    }

    // Fallback to auth user
    const { data: { user } } = await supabase.auth.admin.getUserById(userId);
    
    if (user?.email) {
      return {
        email: user.email,
        name: user.user_metadata?.full_name || user.user_metadata?.name || 'User',
      };
    }

    return null;
  } catch (error) {
    console.error('Error fetching user details:', error);
    return null;
  }
}

/**
 * Send task assignment notification email
 */
export async function sendTaskAssignmentEmail(options: {
  assigneeId: string;
  assignerName: string;
  taskTitle: string;
  taskId: string;
  taskDescription?: string;
}): Promise<NotificationResult> {
  const { assigneeId, assignerName, taskTitle, taskId, taskDescription } = options;

  // Check user preferences
  const preferences = await getUserEmailPreferences(assigneeId);
  if (!preferences?.task_notifications) {
    return { success: true, message: 'User has disabled task notifications', skipped: true };
  }

  // Get assignee details
  const assignee = await getUserDetails(assigneeId);
  if (!assignee?.email) {
    return { success: false, message: 'Could not find assignee email' };
  }

  // Generate task URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://aimatrx.com';
  const taskUrl = `${baseUrl}/tasks?task=${taskId}`;

  // Get email content
  const emailContent = notificationTemplates.taskAssigned({
    taskTitle,
    assignerName,
    taskUrl,
    description: taskDescription,
  });

  // Send email
  const result = await sendEmail({
    to: assignee.email,
    subject: emailContent.subject,
    html: emailContent.html,
  });

  if (result.success) {
    return { success: true, message: 'Task assignment email sent' };
  }

  return {
    success: false,
    message: 'Failed to send task assignment email',
    error: result.error instanceof Error ? result.error.message : String(result.error),
  };
}

/**
 * Send comment notification email
 */
export async function sendCommentNotificationEmail(options: {
  resourceOwnerId: string;
  commenterName: string;
  commentText: string;
  resourceTitle: string;
  resourceType: 'task' | 'canvas' | 'note';
  resourceId: string;
}): Promise<NotificationResult> {
  const { resourceOwnerId, commenterName, commentText, resourceTitle, resourceType, resourceId } = options;

  // Check user preferences
  const preferences = await getUserEmailPreferences(resourceOwnerId);
  if (!preferences?.comment_notifications) {
    return { success: true, message: 'User has disabled comment notifications', skipped: true };
  }

  // Get resource owner details
  const owner = await getUserDetails(resourceOwnerId);
  if (!owner?.email) {
    return { success: false, message: 'Could not find resource owner email' };
  }

  // Generate resource URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://aimatrx.com';
  const resourceUrls: Record<string, string> = {
    task: `${baseUrl}/tasks?task=${resourceId}`,
    canvas: `${baseUrl}/canvas/${resourceId}`,
    note: `${baseUrl}/notes/${resourceId}`,
  };
  const resourceUrl = resourceUrls[resourceType] || `${baseUrl}/${resourceType}/${resourceId}`;

  // Get email content
  const emailContent = notificationTemplates.commentAdded({
    resourceTitle,
    commenterName,
    commentText: commentText.length > 200 ? commentText.substring(0, 200) + '...' : commentText,
    resourceUrl,
    resourceType,
  });

  // Send email
  const result = await sendEmail({
    to: owner.email,
    subject: emailContent.subject,
    html: emailContent.html,
  });

  if (result.success) {
    return { success: true, message: 'Comment notification email sent' };
  }

  return {
    success: false,
    message: 'Failed to send comment notification email',
    error: result.error instanceof Error ? result.error.message : String(result.error),
  };
}

/**
 * Send message notification email (for offline users)
 */
export async function sendMessageNotificationEmail(options: {
  recipientId: string;
  senderName: string;
  messagePreview: string;
  conversationId: string;
}): Promise<NotificationResult> {
  const { recipientId, senderName, messagePreview, conversationId } = options;

  // Check user preferences
  const preferences = await getUserEmailPreferences(recipientId);
  if (!preferences?.message_notifications) {
    return { success: true, message: 'User has disabled message notifications', skipped: true };
  }

  // Get recipient details
  const recipient = await getUserDetails(recipientId);
  if (!recipient?.email) {
    return { success: false, message: 'Could not find recipient email' };
  }

  // Generate conversation URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://aimatrx.com';
  const conversationUrl = `${baseUrl}/messages/${conversationId}`;

  // Get email content
  const emailContent = notificationTemplates.messageReceived({
    senderName,
    messagePreview: messagePreview.length > 150 ? messagePreview.substring(0, 150) + '...' : messagePreview,
    conversationUrl,
  });

  // Send email
  const result = await sendEmail({
    to: recipient.email,
    subject: emailContent.subject,
    html: emailContent.html,
  });

  if (result.success) {
    return { success: true, message: 'Message notification email sent' };
  }

  return {
    success: false,
    message: 'Failed to send message notification email',
    error: result.error instanceof Error ? result.error.message : String(result.error),
  };
}

/**
 * Send due date reminder email
 */
export async function sendDueDateReminderEmail(options: {
  userId: string;
  taskTitle: string;
  taskId: string;
  dueDate: Date;
  urgency: 'upcoming' | 'due_today' | 'overdue';
}): Promise<NotificationResult> {
  const { userId, taskTitle, taskId, dueDate, urgency } = options;

  // Check user preferences
  const preferences = await getUserEmailPreferences(userId);
  if (!preferences?.task_notifications) {
    return { success: true, message: 'User has disabled task notifications', skipped: true };
  }

  // Get user details
  const user = await getUserDetails(userId);
  if (!user?.email) {
    return { success: false, message: 'Could not find user email' };
  }

  // Generate task URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://aimatrx.com';
  const taskUrl = `${baseUrl}/tasks?task=${taskId}`;

  // Get email content
  const emailContent = notificationTemplates.dueDateReminder({
    taskTitle,
    dueDate: dueDate.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }),
    taskUrl,
    urgency,
  });

  // Send email
  const result = await sendEmail({
    to: user.email,
    subject: emailContent.subject,
    html: emailContent.html,
  });

  if (result.success) {
    return { success: true, message: 'Due date reminder email sent' };
  }

  return {
    success: false,
    message: 'Failed to send due date reminder email',
    error: result.error instanceof Error ? result.error.message : String(result.error),
  };
}
