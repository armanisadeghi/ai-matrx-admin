# React Email — Component-Based Email Templates

**Category:** Yes — This Project (ai-matrx-admin)
**Status:** Partially implemented — core templates done, remaining templates pending

---

## What's Done

- `@react-email/components` + `react-email` (CLI) installed
- `lib/email/templates/BaseLayout.tsx` — shared header/footer layout
- `lib/email/templates/WelcomeEmail.tsx`
- `lib/email/templates/InvitationEmail.tsx` — org + project invitations (+ reminders)
- `lib/email/templates/NotificationEmail.tsx` — task, comment, message, due date
- `lib/email/templates/AuthEmail.tsx` — invitation approved/rejected, password reset
- `lib/email/templates/SharingEmail.tsx` — resource shared, contact form
- `lib/email/templates/FeedbackEmail.tsx` — feedback status, review request, user reply
- `lib/email/templates/index.ts` — barrel exports for all 14 templates
- `lib/email/render.ts` — `renderTemplate()` utility
- `lib/email/notificationService.ts` — migrated all 4 send functions to React Email
- `package.json` — added `"email": "email dev ..."` preview script (run with `pnpm email`)

---

## Architecture

```
lib/email/
├── templates/
│   ├── BaseLayout.tsx       — shared brand header/footer
│   ├── WelcomeEmail.tsx
│   ├── InvitationEmail.tsx  — org + project (+ reminders)
│   ├── NotificationEmail.tsx — task, comment, message, due date
│   └── index.ts
├── render.ts                — renderTemplate() → HTML string
├── client.ts                — Resend API wrapper (unchanged)
├── notificationService.ts   — migrated to React Email ✅
└── exportService.ts         — still uses raw HTML (pending migration)
```

---

## How to Use

```typescript
import * as React from "react";
import { renderTemplate } from "@/lib/email/render";
import { WelcomeEmail } from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/client";

const html = await renderTemplate(
  React.createElement(WelcomeEmail, { name: "Arman" })
);

await sendEmail({
  to: "arman@example.com",
  subject: "Welcome to AI Matrx!",
  html,
});
```

---

## All Templates Built

| Template File | Components |
|---------------|-----------|
| `WelcomeEmail.tsx` | `WelcomeEmail` |
| `InvitationEmail.tsx` | `OrganizationInvitationEmail`, `ProjectInvitationEmail` (+ reminder variants) |
| `NotificationEmail.tsx` | `TaskAssignedEmail`, `CommentAddedEmail`, `MessageReceivedEmail`, `DueDateReminderEmail` |
| `AuthEmail.tsx` | `InvitationApprovedEmail`, `InvitationRejectedEmail`, `PasswordResetEmail` |
| `SharingEmail.tsx` | `ResourceSharedEmail`, `ContactFormNotificationEmail`, `ContactFormConfirmationEmail` |
| `FeedbackEmail.tsx` | `FeedbackStatusEmail`, `FeedbackReviewEmail`, `FeedbackReplyEmail` |

---

## Pending Tasks

### Preview & Review
- [ ] Run `pnpm email` to launch preview UI at `localhost:3001` — review all templates visually
- [ ] Add `PreviewProps` to templates that are missing them (for the preview UI)

### Wire Up Remaining Callers
The templates are built but these callers in `lib/email/client.ts` still use raw HTML strings:
- [ ] Invitation approved/rejected (used by admin invitation approval flow)
- [ ] Resource shared (used by sharing feature)
- [ ] Password reset (used by auth flow)
- [ ] Contact form notification + confirmation (used by `/api/contact`)
- [ ] Feedback status/review/reply emails (used by feedback MCP server)

### Testing
- [ ] Verify rendered HTML in Gmail, Outlook, Apple Mail (use [Litmus](https://litmus.com) or [Email on Acid](https://emailonacid.com))

### Clean Up
- [ ] Once all callers are updated, remove the raw HTML `emailTemplates` object from `client.ts`
- [ ] Remove `notificationTemplates` from `exportService.ts` (replaced by React Email)
