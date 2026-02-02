import { Resend } from "resend";

// Lazy initialization to avoid build-time errors when API key is not available
let resend: Resend | null = null;

function getResendClient(): Resend {
  if (!resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY environment variable is not set");
    }
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

/**
 * Get the list of allowed email domains for sending
 * Uses EMAIL_ALLOWED_DOMAINS env var, or extracts domain from EMAIL_FROM
 */
export function getAllowedEmailDomains(): string[] {
  // If explicitly configured, use that
  if (process.env.EMAIL_ALLOWED_DOMAINS) {
    return process.env.EMAIL_ALLOWED_DOMAINS.split(",").map((d) => d.trim().toLowerCase());
  }
  
  // Otherwise, extract domain from EMAIL_FROM
  const emailFrom = process.env.EMAIL_FROM;
  if (emailFrom) {
    const match = emailFrom.match(/<([^>]+)>/) || emailFrom.match(/([^\s<>]+@[^\s<>]+)/);
    if (match) {
      const domain = match[1].split("@")[1];
      if (domain) return [domain.toLowerCase()];
    }
  }
  
  return [];
}

/**
 * Get the default from address
 */
export function getDefaultFromAddress(): string {
  return process.env.EMAIL_FROM || "";
}

/**
 * Validate that a from address uses an allowed domain
 */
export function isValidFromAddress(from: string): boolean {
  const allowedDomains = getAllowedEmailDomains();
  if (allowedDomains.length === 0) return true; // No restrictions if not configured
  
  // Extract email from "Name <email>" format or plain email
  const match = from.match(/<([^>]+)>/) || from.match(/([^\s<>]+@[^\s<>]+)/);
  if (!match) return false;
  
  const email = match[1].toLowerCase();
  const domain = email.split("@")[1];
  
  return allowedDomains.includes(domain);
}

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

/**
 * Send an email using Resend
 * Requires RESEND_API_KEY and EMAIL_FROM environment variables
 */
export async function sendEmail(options: SendEmailOptions) {
  const { to, subject, html, text, from, replyTo } = options;

  const senderAddress = from || process.env.EMAIL_FROM;
  
  if (!senderAddress) {
    console.error("EMAIL_FROM environment variable is not set");
    return { success: false, error: new Error("EMAIL_FROM is not configured") };
  }

  try {
    const client = getResendClient();
    const { data, error } = await client.emails.send({
      from: senderAddress,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text,
      replyTo,
    });

    if (error) {
      console.error("Email send error:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (err) {
    console.error("Email send exception:", err);
    return { success: false, error: err };
  }
}

// Email templates
export const emailTemplates = {
  welcome: (name: string) => ({
    subject: "Welcome to AI Matrx!",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3b82f6;">Welcome to AI Matrx, ${name}!</h1>
        <p>We're excited to have you join our platform for advanced AI prompt engineering and collaboration.</p>
        <p>Here's what you can do next:</p>
        <ul>
          <li>Explore our prompt library</li>
          <li>Create your first canvas</li>
          <li>Collaborate with your team</li>
          <li>Organize your work with collections</li>
        </ul>
        <p>If you have any questions, don't hesitate to reach out.</p>
        <p>Best regards,<br>The AI Matrx Team</p>
      </div>
    `,
  }),

  organizationInvitation: (
    organizationName: string,
    inviterName: string,
    invitationUrl: string,
    expiresAt: Date
  ) => ({
    subject: `You've been invited to join ${organizationName} on AI Matrx`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3b82f6;">Organization Invitation</h1>
        <p><strong>${inviterName}</strong> has invited you to join <strong>${organizationName}</strong> on AI Matrx.</p>
        <p>AI Matrx is a powerful platform for AI prompt engineering, canvas creation, and team collaboration.</p>
        <div style="margin: 24px 0;">
          <a href="${invitationUrl}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">Accept Invitation</a>
        </div>
        <p style="color: #666; font-size: 14px;">This invitation will expire on ${expiresAt.toLocaleDateString()}.</p>
        <p style="color: #666; font-size: 14px;">If you didn't expect this invitation, you can safely ignore this email.</p>
      </div>
    `,
  }),

  organizationInvitationReminder: (
    organizationName: string,
    inviterName: string,
    invitationUrl: string,
    expiresAt: Date
  ) => ({
    subject: `Reminder: Join ${organizationName} on AI Matrx`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #f59e0b;">Invitation Reminder</h1>
        <p>This is a reminder that <strong>${inviterName}</strong> has invited you to join <strong>${organizationName}</strong> on AI Matrx.</p>
        <p>AI Matrx is a powerful platform for AI prompt engineering, canvas creation, and team collaboration.</p>
        <div style="margin: 24px 0;">
          <a href="${invitationUrl}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">Accept Invitation</a>
        </div>
        <p style="color: #666; font-size: 14px;">This invitation has been extended and will now expire on ${expiresAt.toLocaleDateString()}.</p>
        <p style="color: #666; font-size: 14px;">If you're not interested, you can safely ignore this email.</p>
      </div>
    `,
  }),

  resourceShared: (
    sharerName: string,
    resourceType: string,
    resourceTitle: string,
    resourceUrl: string,
    message?: string
  ) => ({
    subject: `${sharerName} shared a ${resourceType} with you`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3b82f6;">Resource Shared</h1>
        <p><strong>${sharerName}</strong> has shared a ${resourceType} with you on AI Matrx.</p>
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0; font-weight: 600; color: #1f2937;">${resourceTitle}</p>
        </div>
        ${message ? `<p style="color: #4b5563; font-style: italic;">"${message}"</p>` : ""}
        <div style="margin: 24px 0;">
          <a href="${resourceUrl}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">View ${resourceType}</a>
        </div>
        <p style="color: #666; font-size: 14px;">Log in to AI Matrx to access this shared resource.</p>
      </div>
    `,
  }),

  invitationRequestApproved: (
    fullName: string,
    invitationCode: string,
    signupUrl: string
  ) => ({
    subject: "Your AI Matrx invitation request has been approved!",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #10b981;">Request Approved!</h1>
        <p>Great news, ${fullName}! Your request to join AI Matrx has been approved.</p>
        <p>Use the invitation code below to create your account:</p>
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0; text-align: center;">
          <p style="margin: 0; font-size: 24px; font-weight: 700; color: #1f2937; letter-spacing: 2px;">${invitationCode}</p>
        </div>
        <div style="margin: 24px 0;">
          <a href="${signupUrl}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">Create Your Account</a>
        </div>
        <p style="color: #666; font-size: 14px;">This invitation code can only be used once and may expire.</p>
        <p>Welcome to AI Matrx!</p>
        <p>Best regards,<br>The AI Matrx Team</p>
      </div>
    `,
  }),

  invitationRequestRejected: (
    fullName: string,
    reason?: string
  ) => ({
    subject: "Update on your AI Matrx invitation request",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3b82f6;">Invitation Request Update</h1>
        <p>Hello ${fullName},</p>
        <p>Thank you for your interest in AI Matrx. After reviewing your request, we're unable to approve your invitation at this time.</p>
        ${reason ? `<p style="color: #4b5563;">${reason}</p>` : ""}
        <p>You're welcome to submit a new request in the future as our platform evolves.</p>
        <p>Thank you for your understanding.</p>
        <p>Best regards,<br>The AI Matrx Team</p>
      </div>
    `,
  }),

  passwordReset: (resetUrl: string) => ({
    subject: "Reset Your Password",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3b82f6;">Password Reset Request</h1>
        <p>You requested to reset your password. Click the button below to proceed:</p>
        <div style="margin: 24px 0;">
          <a href="${resetUrl}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">Reset Password</a>
        </div>
        <p style="color: #666; font-size: 14px;">This link will expire in 1 hour.</p>
        <p style="color: #666; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  }),

  contactFormNotification: (
    name: string,
    email: string,
    subject: string,
    message: string,
    submissionId: string
  ) => ({
    subject: `New Contact Form Submission: ${subject}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3b82f6;">New Contact Form Submission</h1>
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 8px 0;"><strong>From:</strong> ${name}</p>
          <p style="margin: 8px 0;"><strong>Email:</strong> ${email}</p>
          <p style="margin: 8px 0;"><strong>Subject:</strong> ${subject}</p>
          <p style="margin: 8px 0;"><strong>Submission ID:</strong> ${submissionId}</p>
        </div>
        <div style="background: #ffffff; border: 1px solid #e5e7eb; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0; white-space: pre-wrap;">${message}</p>
        </div>
      </div>
    `,
  }),

  contactFormConfirmation: (name: string) => ({
    subject: "We received your message",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3b82f6;">Thank You for Contacting Us</h1>
        <p>Hi ${name},</p>
        <p>We've received your message and will get back to you as soon as possible.</p>
        <p>Our team typically responds within 24-48 hours during business days.</p>
        <p>Best regards,<br>The AI Matrx Team</p>
      </div>
    `,
  }),
};
