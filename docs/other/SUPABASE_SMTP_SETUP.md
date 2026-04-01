# Supabase Auth SMTP Configuration

This guide explains how to configure Supabase Auth to use Resend's SMTP for sending authentication emails (signup confirmations, password resets, etc.).

## Why Configure Custom SMTP?

By default, Supabase uses its own email service for authentication emails. Configuring custom SMTP allows you to:

- Use your own email domain for better branding
- Have consistent email styling across all emails (auth + application)
- Better email deliverability
- Full control over email sending

## Prerequisites

- Resend API key (get from https://resend.com/api-keys)
- Verified domain in Resend
- Admin access to Supabase Dashboard

## Configuration Steps

### 1. Get Your SMTP Credentials

From your Resend dashboard, note down:
- **API Key**: `re_xxxxxxxxxxxx`

Resend SMTP details (always the same):
- **Host**: `smtp.resend.com`
- **Port**: `465` (SSL/TLS)
- **Username**: `resend` (always "resend")
- **Password**: Your Resend API key (same as above)

### 2. Configure SMTP in Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **Authentication** → **SMTP Settings**
3. Enable **Custom SMTP**
4. Fill in the following details:

```
Sender name: AI Matrx
Sender email: noreply@aimatrx.com (or your verified domain)

Host: smtp.resend.com
Port: 465
Username: resend
Password: re_xxxxxxxxxxxx (your Resend API key)

Encryption: SSL/TLS
```

5. Click **Save**

### 3. Customize Email Templates

Still in the Authentication settings:

1. Go to **Email Templates**
2. Customize each template:
   - **Confirm signup**
   - **Invite user**
   - **Magic Link**
   - **Change Email Address**
   - **Reset Password**

#### Template Variables

Available variables in templates:
- `{{ .ConfirmationURL }}` - Confirmation link
- `{{ .Token }}` - Auth token
- `{{ .TokenHash }}` - Hashed token
- `{{ .SiteURL }}` - Your site URL
- `{{ .RedirectTo }}` - Redirect URL after confirmation

#### Example Template (Confirmation Email)

```html
<h2>Confirm your signup</h2>

<p>Welcome to AI Matrx! Please confirm your email address by clicking the link below:</p>

<p><a href="{{ .ConfirmationURL }}">Confirm your email</a></p>

<p>If you didn't request this, you can safely ignore this email.</p>

<p>Best regards,<br>The AI Matrx Team</p>
```

### 4. Update Redirect URLs

In **Authentication** → **URL Configuration**:

1. **Site URL**: `https://www.aimatrx.com` (production) or `http://localhost:3000` (development)
2. **Redirect URLs**: Add allowed redirect URLs:
   ```
   http://localhost:3000/**
   https://www.aimatrx.com/**
   ```

### 5. Test the Configuration

1. Send a test email from Supabase Dashboard:
   - Go to **Authentication** → **SMTP Settings**
   - Click **Send Test Email**
   - Check your inbox

2. Test signup flow:
   - Sign up with a new account
   - Check that confirmation email arrives
   - Verify email styling and links work

3. Test password reset:
   - Request password reset
   - Check that reset email arrives
   - Verify reset link works

## Troubleshooting

### Emails Not Sending

1. **Check SMTP credentials**: Ensure your Resend API key is correct
2. **Verify domain**: Make sure your sending domain is verified in Resend
3. **Check Supabase logs**: Go to Logs → Auth to see any errors
4. **Test Resend directly**: Use Resend's dashboard to send a test email

### Emails Going to Spam

1. **Set up SPF record**: Add SPF record to your domain DNS
2. **Set up DKIM**: Configure DKIM in Resend and add records to DNS
3. **Set up DMARC**: Add DMARC policy to your domain
4. **Warm up your domain**: Gradually increase sending volume

### Wrong Redirect URLs

1. **Check environment variables**: Ensure `NEXT_PUBLIC_SITE_URL` is correct
2. **Update Supabase settings**: Make sure Site URL and Redirect URLs are correct
3. **Clear cache**: Sometimes browser cache needs clearing

## Environment Variables

Make sure these are set in your `.env.local`:

```bash
# Resend API Key (used by custom SMTP)
RESEND_API_KEY=re_xxxxxxxxxxxx

# Email configuration
EMAIL_FROM=AI Matrx <noreply@aimatrx.com>

# Site URL (used for email links)
NEXT_PUBLIC_SITE_URL=https://www.aimatrx.com
```

## Vercel Configuration

If deploying to Vercel, add the environment variables in:

**Vercel Dashboard** → **Project** → **Settings** → **Environment Variables**

Add:
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `EMAIL_ALLOWED_DOMAINS`
- `ADMIN_EMAIL`
- `NEXT_PUBLIC_SITE_URL`

## Security Notes

- **Never commit** your Resend API key to version control
- **Use environment variables** for all sensitive data
- **Rotate keys** periodically for better security
- **Monitor usage** in Resend dashboard to detect any abuse

## Support

- **Resend docs**: https://resend.com/docs
- **Supabase auth docs**: https://supabase.com/docs/guides/auth/auth-smtp
- **Supabase SMTP guide**: https://supabase.com/docs/guides/auth/auth-smtp

## Checklist

- [ ] Resend account created and domain verified
- [ ] SMTP credentials configured in Supabase Dashboard
- [ ] Email templates customized with AI Matrx branding
- [ ] Site URL and redirect URLs configured
- [ ] Test email sent successfully
- [ ] Signup confirmation email tested
- [ ] Password reset email tested
- [ ] SPF/DKIM/DMARC configured for production
- [ ] Environment variables added to Vercel
