# Email System Documentation

> **Last Updated**: January 30, 2026  
> **Status**: ✅ Production Ready

Comprehensive email system for AI Matrx using Resend for reliable email delivery with full support for transactional emails, notifications, and authentication.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Features](#features)
4. [Setup](#setup)
5. [Usage](#usage)
6. [API Reference](#api-reference)
7. [Email Templates](#email-templates)
8. [Database Schema](#database-schema)
9. [Security](#security)
10. [Troubleshooting](#troubleshooting)
11. [Best Practices](#best-practices)

---

## Overview

The AI Matrx email system provides:

- **Transactional Emails**: Organization invitations, password resets, confirmations
- **Notification Emails**: Resource sharing, invitation requests, updates
- **Admin Portal**: Send emails to users with templates and logging
- **Contact Form**: Public contact form with email notifications
- **Email Preferences**: User-controlled notification settings
- **Webhook Support**: Handle incoming email events
- **Custom SMTP**: Branded authentication emails via Supabase Auth

### Technology Stack

- **Email Provider**: [Resend](https://resend.com)
- **SMTP Protocol**: For Supabase Auth integration
- **Database**: PostgreSQL (Supabase)
- **Templates**: React-style HTML emails
- **Authentication**: Supabase Auth with custom SMTP

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    AI Matrx Application                  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Organization │  │   Resource   │  │  Contact     │ │
│  │ Invitations  │  │   Sharing    │  │  Form        │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ │
│         │                  │                  │         │
│         └──────────────────┼──────────────────┘         │
│                            │                            │
│                    ┌───────▼────────┐                   │
│                    │  Email Client  │                   │
│                    │ (lib/email/)   │                   │
│                    └───────┬────────┘                   │
│                            │                            │
├────────────────────────────┼────────────────────────────┤
│                    ┌───────▼────────┐                   │
│                    │     Resend     │                   │
│                    │   API/SMTP     │                   │
│                    └───────┬────────┘                   │
│                            │                            │
└────────────────────────────┼────────────────────────────┘
                             │
                    ┌────────▼─────────┐
                    │   Email Delivery │
                    └──────────────────┘
```

### Data Flow

1. **Outgoing Emails**:
   - Application triggers email send
   - Email client validates and formats
   - Resend API sends email
   - Webhook confirms delivery
   - Database logs result

2. **Supabase Auth Emails**:
   - User triggers auth action (signup, reset)
   - Supabase Auth generates email
   - Sends via custom SMTP (Resend)
   - Uses AI Matrx branding

---

## Features

### 1. Organization Invitations

**Location**: `features/organizations/service.ts`

Automatically sends branded invitation emails when users are invited to organizations.

**Features**:
- Personalized with organization and inviter name
- Secure invitation links with tokens
- 7-day expiration
- Email tracking in database

**Usage**:
```typescript
import { inviteToOrganization } from '@/features/organizations/service';

const result = await inviteToOrganization({
  organizationId: 'org-id',
  email: 'user@example.com',
  role: 'member'
});
```

---

### 2. Resource Sharing Notifications

**Location**: `features/sharing/emailService.ts`

Notifies users when resources are shared with them.

**Features**:
- Respects user email preferences
- Includes sharer name and resource details
- Direct link to shared resource
- Optional custom message

**Usage**:
```typescript
import { sendSharingNotification } from '@/features/sharing/emailService';

await sendSharingNotification({
  recipientUserId: 'user-id',
  resourceType: 'prompt',
  resourceId: 'resource-id',
  sharerName: 'John Doe',
  message: 'Check this out!' // optional
});
```

---

### 3. Invitation Request Emails

**Location**: `features/invitations/emailService.ts`

Sends approval/rejection emails for invitation requests.

**Features**:
- Approval emails include invitation code
- Rejection emails with optional reason
- Professional tone and branding

**Usage**:
```typescript
// Approval
await sendInvitationRequestApprovalEmail({
  fullName: 'Jane Smith',
  email: 'jane@example.com',
  invitationCode: 'ABCD-1234-EFGH'
});

// Rejection
await sendInvitationRequestRejectionEmail({
  fullName: 'John Doe',
  email: 'john@example.com',
  reason: 'Platform capacity reached' // optional
});
```

---

### 4. Admin Email Portal

**Location**: `app/(authenticated)/admin/email/page.tsx`

Web interface for admins to send emails to users.

**Features**:
- Send to custom emails or selected users
- Email templates
- Custom sender address (domain-validated)
- Audit logging
- Success/failure tracking

**Access**: `/admin/email` (admin/moderator only)

---

### 5. Contact Form

**Location**: `app/(public)/contact/page.tsx`

Public contact form with email notifications.

**Features**:
- Public and authenticated submissions
- Saves to database
- Notifies admin
- Sends confirmation to submitter

**Access**: `/contact` (public)

---

### 6. Email Preferences

**Location**: `components/user-preferences/EmailPreferences.tsx`

User-controlled notification settings.

**Preferences**:
- Sharing notifications
- Organization invitations
- Resource updates
- Marketing emails
- Weekly digest

**API**: `/api/user/email-preferences`

---

### 7. Webhook Handler

**Location**: `app/api/webhooks/resend/route.ts`

Processes incoming email events from Resend.

**Events Handled**:
- `email.sent`
- `email.delivered`
- `email.bounced`
- `email.complained` (spam reports)
- `email.opened`
- `email.clicked`

**Setup**: Configure in Resend Dashboard  
**Endpoint**: `https://your-domain.com/api/webhooks/resend`

---

## Setup

### 1. Install Dependencies

The Resend package is already installed via:
```bash
pnpm add resend
```

### 2. Environment Variables

Add to `.env.local`:

```bash
# Resend API Key
RESEND_API_KEY=re_xxxxxxxxxxxx

# Email Configuration
EMAIL_FROM=AI Matrx <noreply@aimatrx.com>
EMAIL_ALLOWED_DOMAINS=aimatrx.com,updates.aimatrx.com
ADMIN_EMAIL=admin@aimatrx.com

# Site URL
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Webhook Secret (optional, for verification)
RESEND_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx
```

### 3. Database Migration

Run the email system migration:

```bash
# Apply migration
supabase db push

# Or manually run
psql -f supabase/migrations/20260130151643_email_system.sql
```

This creates:
- `admin_email_logs` - Email audit trail
- `contact_submissions` - Contact form submissions
- `user_email_preferences` - User notification settings
- Updates `organization_invitations` with email tracking

### 4. Resend Configuration

1. **Sign up**: https://resend.com
2. **Verify domain**:
   - Add DNS records (SPF, DKIM)
   - Wait for verification (usually < 1 hour)
3. **Get API key**:
   - Navigate to API Keys
   - Create new key
   - Add to `.env.local`

### 5. Supabase Auth SMTP (Optional)

To use custom SMTP for Supabase Auth emails:

1. Follow [SUPABASE_SMTP_SETUP.md](../../docs/SUPABASE_SMTP_SETUP.md)
2. Configure in Supabase Dashboard
3. Customize email templates

---

## Usage

### Sending Emails Programmatically

```typescript
import { sendEmail } from '@/lib/email/client';

const result = await sendEmail({
  to: 'user@example.com',
  subject: 'Welcome!',
  html: '<h1>Welcome to AI Matrx</h1>',
  text: 'Welcome to AI Matrx', // optional
  replyTo: 'support@aimatrx.com' // optional
});

if (result.success) {
  console.log('Email sent:', result.data);
} else {
  console.error('Email failed:', result.error);
}
```

### Using Email Templates

```typescript
import { emailTemplates } from '@/lib/email/client';

const template = emailTemplates.welcome('John Doe');

await sendEmail({
  to: 'john@example.com',
  subject: template.subject,
  html: template.html
});
```

### Checking User Preferences

```typescript
import { createClient } from '@/utils/supabase/client';

const supabase = createClient();

const { data } = await supabase
  .from('user_email_preferences')
  .select('sharing_notifications')
  .eq('user_id', userId)
  .single();

if (data?.sharing_notifications) {
  // Send email
}
```

---

## API Reference

### POST /api/email/send

Send email (authenticated users only).

**Request**:
```json
{
  "to": "user@example.com",
  "subject": "Test Email",
  "html": "<p>Hello!</p>",
  "text": "Hello!", // optional
  "replyTo": "reply@aimatrx.com" // optional
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "email-id"
  }
}
```

---

### POST /api/admin/email

Send email to multiple users (admin only).

**Request**:
```json
{
  "to": ["user1@example.com", "user2@example.com"],
  // OR
  "userIds": ["user-id-1", "user-id-2"],
  "subject": "Announcement",
  "message": "Important update...",
  "from": "AI Matrx <updates@aimatrx.com>" // optional
}
```

**Response**:
```json
{
  "success": true,
  "msg": "Email sent to 2 recipient(s)",
  "data": {
    "successful": 2,
    "failed": 0,
    "total": 2
  }
}
```

---

### POST /api/contact

Submit contact form.

**Request**:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "subject": "Question",
  "message": "I have a question..."
}
```

**Response**:
```json
{
  "success": true,
  "msg": "Thank you for your message. We'll get back to you soon!",
  "data": {
    "submissionId": "submission-id"
  }
}
```

---

### GET /api/user/email-preferences

Get user's email preferences (authenticated).

**Response**:
```json
{
  "success": true,
  "data": {
    "sharing_notifications": true,
    "organization_invitations": true,
    "resource_updates": true,
    "marketing_emails": false,
    "weekly_digest": true
  }
}
```

---

### PATCH /api/user/email-preferences

Update user's email preferences (authenticated).

**Request**:
```json
{
  "sharing_notifications": false,
  "marketing_emails": true
}
```

**Response**:
```json
{
  "success": true,
  "msg": "Preferences updated successfully"
}
```

---

## Email Templates

All templates in `lib/email/client.ts`:

### Available Templates

1. **welcome(name)**: Welcome email for new users
2. **organizationInvitation(orgName, inviterName, url, expiresAt)**: Org invite
3. **resourceShared(sharerName, resourceType, title, url, message?)**: Share notification
4. **invitationRequestApproved(name, code, signupUrl)**: Request approved
5. **invitationRequestRejected(name, reason?)**: Request rejected
6. **passwordReset(resetUrl)**: Password reset
7. **contactFormNotification(name, email, subject, message, id)**: Admin notification
8. **contactFormConfirmation(name)**: Submitter confirmation

### Template Structure

All templates follow this structure:
- AI Matrx branding
- Clear call-to-action
- Responsive HTML
- Professional styling
- Accessible content

### Custom Templates

To add a custom template:

```typescript
// In lib/email/client.ts
export const emailTemplates = {
  // ...existing templates
  
  myCustomTemplate: (param1: string, param2: string) => ({
    subject: `Custom Subject: ${param1}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3b82f6;">Custom Email</h1>
        <p>${param2}</p>
      </div>
    `,
  }),
};
```

---

## Database Schema

### admin_email_logs

Audit trail for admin-sent emails.

```sql
CREATE TABLE admin_email_logs (
  id UUID PRIMARY KEY,
  sent_by UUID REFERENCES auth.users(id),
  recipient_count INTEGER,
  subject TEXT,
  successful_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### contact_submissions

Contact form submissions.

```sql
CREATE TABLE contact_submissions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'new',
  admin_notes TEXT,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### user_email_preferences

User notification settings.

```sql
CREATE TABLE user_email_preferences (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) UNIQUE,
  sharing_notifications BOOLEAN DEFAULT true,
  organization_invitations BOOLEAN DEFAULT true,
  resource_updates BOOLEAN DEFAULT true,
  marketing_emails BOOLEAN DEFAULT false,
  weekly_digest BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Security

### Email Domain Validation

Custom sender addresses are validated against `EMAIL_ALLOWED_DOMAINS`:

```typescript
import { isValidFromAddress } from '@/lib/email/client';

if (!isValidFromAddress('updates@aimatrx.com')) {
  throw new Error('Invalid sender domain');
}
```

### Webhook Signature Verification

Webhooks are verified using HMAC signatures:

```typescript
// Set RESEND_WEBHOOK_SECRET in environment
// Verification happens automatically in webhook handler
```

### Rate Limiting

Implement rate limiting for public endpoints:

```typescript
// Consider using upstash/redis for rate limiting
// Or implement custom rate limiting logic
```

### RLS Policies

All tables have Row Level Security:
- Users can only view/edit their own preferences
- Admins can view all logs and submissions
- Service role has full access

---

## Troubleshooting

### Emails Not Sending

**Check**: Environment variables
```bash
echo $RESEND_API_KEY
echo $EMAIL_FROM
```

**Check**: Resend Dashboard logs
- Navigate to Logs
- Look for errors or bounces

**Check**: Domain verification
- Ensure SPF and DKIM records are set
- Domain status should be "Verified"

### Emails Going to Spam

**Solution**:
1. Configure SPF: `v=spf1 include:_spf.resend.com ~all`
2. Enable DKIM in Resend Dashboard
3. Add DMARC policy
4. Warm up domain gradually
5. Use spam testing tools

### Database Errors

**Check**: Migration applied
```bash
supabase db push
```

**Check**: RLS policies
- Verify user has correct role
- Test with service role key

### Webhook Not Working

**Check**: Endpoint accessible
```bash
curl https://your-domain.com/api/webhooks/resend
```

**Check**: Secret configured
- Set `RESEND_WEBHOOK_SECRET`
- Match value in Resend Dashboard

---

## Best Practices

### 1. Email Content

- ✅ Clear subject lines
- ✅ Concise messaging
- ✅ Strong call-to-action
- ✅ Mobile-responsive
- ✅ Plain text alternative
- ❌ Excessive images
- ❌ Spam trigger words
- ❌ ALL CAPS

### 2. Sending

- ✅ Respect user preferences
- ✅ Use batch sending for multiple recipients
- ✅ Log all sends for audit trail
- ✅ Handle failures gracefully
- ❌ Send unsolicited emails
- ❌ Ignore bounces
- ❌ Exceed rate limits

### 3. Templates

- ✅ Consistent branding
- ✅ Professional tone
- ✅ Include unsubscribe link (marketing)
- ✅ Test in multiple clients
- ❌ Inline CSS only
- ❌ Complex layouts
- ❌ Large file sizes

### 4. Monitoring

- ✅ Track delivery rates
- ✅ Monitor bounce rates
- ✅ Watch for spam complaints
- ✅ Set up alerts
- ❌ Ignore metrics
- ❌ Skip testing

---

## Performance

### Batch Sending

Use `Promise.allSettled()` for batch sends:

```typescript
const results = await Promise.allSettled(
  recipients.map(email => sendEmail({
    to: email,
    subject: 'Batch Email',
    html: '<p>Content</p>'
  }))
);

const successful = results.filter(r => r.status === 'fulfilled').length;
```

### Caching

Cache email templates and preferences:

```typescript
// Consider using Redis for caching
// Cache user preferences for 5 minutes
// Cache templates indefinitely
```

---

## Future Enhancements

Potential improvements:

- [ ] Email queueing system (Bull, BullMQ)
- [ ] Email scheduling
- [ ] A/B testing for templates
- [ ] Advanced analytics dashboard
- [ ] Email campaign management
- [ ] Automated welcome series
- [ ] Re-engagement campaigns
- [ ] SMS notifications integration

---

## Support & Resources

### Documentation

- [Supabase SMTP Setup](../../docs/SUPABASE_SMTP_SETUP.md)
- [Testing Guide](../../docs/EMAIL_TESTING_GUIDE.md)
- [.env.example](../../.env.example)

### External Resources

- [Resend Documentation](https://resend.com/docs)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Email Best Practices](https://www.sparkpost.com/resources/email-deliverability/)

### Internal Support

For questions or issues:
- Check existing documentation
- Review troubleshooting section
- Contact development team

---

**Built with ❤️ for AI Matrx**
