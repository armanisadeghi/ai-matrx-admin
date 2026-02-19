# Novu — Multi-Channel Notification Infrastructure

**Category:** Yes — But lives as a separate service / future platform project
**Status:** Not yet implemented — decision pending on scope

---

## Decision

You **already have** a solid email notification system in `lib/email/notificationService.ts` that handles:
- Task assignments, comment notifications, message notifications, due date reminders
- User preference checking per notification type
- Resend as the delivery mechanism

**Novu makes sense when you need to add:**
- SMS / WhatsApp notifications
- Push notifications (mobile app)
- In-app notification bell (real-time feed)
- Notification templates managed via a UI (non-developer edits)
- Routing logic: "if user prefers SMS, send SMS; if email, send email"

**Recommendation:** When the mobile app (`ai-matrx-mobile`) launches or when you add an in-app notification bell to the admin dashboard, migrate the notification system to Novu. Until then, the current email-only system is sufficient.

---

## Where Novu Should Live

**Option A — Self-hosted on Coolify** (recommended)
- Full data control, no per-notification pricing
- Novu's Docker Compose is well-maintained
- All services (Next.js, Python, mobile) connect via Novu's API

**Option B — Novu Cloud**
- Free tier: 30,000 events/month
- Simpler setup, managed infrastructure
- Good for getting started

---

## Architecture When You Build It

```
User action (task created, message sent, etc.)
        ↓
Next.js API route / Python endpoint
        ↓
Novu API (POST /v1/events/trigger)
        ↓
Novu routes based on user preferences:
  - Email → Resend (keep existing)
  - SMS → Twilio (already have Twilio in dependencies!)
  - Push → Expo Push Notifications
  - In-app → Novu real-time feed (WebSocket)
        ↓
User receives notification on preferred channel(s)
```

---

## Self-Host Setup on Coolify

```yaml
# docker-compose.yml additions
services:
  novu-api:
    image: ghcr.io/novuhq/novu/api:latest
    environment:
      NODE_ENV: production
      MONGO_URL: ${NOVU_MONGO_URL}
      REDIS_HOST: novu-redis
      JWT_SECRET: ${NOVU_JWT_SECRET}
      
  novu-web:
    image: ghcr.io/novuhq/novu/web:latest
    ports:
      - "4200:4200"
      
  novu-worker:
    image: ghcr.io/novuhq/novu/worker:latest
    
  novu-redis:
    image: redis:alpine
```

---

## Integration with Existing System

When you're ready to migrate:

### Replace `sendTaskAssignmentEmail` with Novu:

```typescript
// Before (email only)
await sendTaskAssignmentEmail({ assigneeId, assignerName, taskTitle, taskId });

// After (any channel based on user preference)
await novu.trigger('task-assigned', {
  to: { subscriberId: assigneeId },
  payload: { assignerName, taskTitle, taskUrl: `${BASE_URL}/tasks?task=${taskId}` }
});
```

### Migrate existing preferences to Novu subscriber preferences:

```typescript
// Sync Supabase user_email_preferences → Novu subscriber
await novu.subscribers.setPreference(userId, 'task-assigned', {
  channel: { email: prefs.task_notifications, sms: prefs.sms_notifications }
});
```

---

## Pending Tasks (For When You Build This)

### Infrastructure
- [ ] Decide: Novu Cloud vs self-hosted on Coolify
- [ ] If self-hosted: deploy Docker Compose to Coolify
- [ ] Configure Resend as email provider in Novu
- [ ] Configure Twilio as SMS provider in Novu (creds already exist)
- [ ] Configure Expo Push provider for mobile

### Notification Templates
- [ ] Create Novu notification workflows for each existing email type:
  - task-assigned
  - comment-added
  - message-received
  - due-date-reminder
  - organization-invitation
  - resource-shared

### Next.js Migration
- [ ] Install `@novu/node`
- [ ] Create `lib/notifications/novu.ts` replacing `lib/email/notificationService.ts`
- [ ] Add subscriber sync on user registration
- [ ] Migrate user preference UI to use Novu's preference endpoint

### Mobile (ai-matrx-mobile)
- [ ] Install `@novu/expo`
- [ ] Register push tokens on app launch
- [ ] In-app notification bell component

### In-App Notifications
- [ ] Install `@novu/react` for notification bell/feed component
- [ ] Add notification bell to admin header
